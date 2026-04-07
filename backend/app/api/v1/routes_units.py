import base64
from binascii import Error as BinasciiError

from fastapi import APIRouter, Depends, File as FastFile, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps.auth import require_admin, require_authorized_user
from app.db.session import get_db
from app.models.file import File, FileUnit
from app.models.unit import Unit
from app.models.user import User
from app.models.user_unit import UserUnit
from app.schemas.file import FileOut
from app.schemas.unit import UnitCreate, UnitOut, UnitUpdate
from app.schemas.user import UserOut
from app.services.file_service import create_file_record, read_pdf_bytes
from app.services.user_service import get_unit_ids_map, serialize_user

router = APIRouter(prefix='/units', tags=['units'])


def _photo_url(unit: Unit) -> str:
    if unit.foto_data:
        return f'/units/{unit.id}/photo'
    return unit.foto_url or ''


def _serialize_unit(unit: Unit) -> UnitOut:
    return UnitOut.model_validate(
        {
            'id': unit.id,
            'nome': unit.nome,
            'endereco': unit.endereco,
            'cidade': unit.cidade,
            'estado': unit.estado,
            'cep': unit.cep,
            'status_texto': unit.status_texto,
            'foto_url': _photo_url(unit),
            'created_at': unit.created_at,
        }
    )


def _decode_data_url(data_url: str) -> bytes:
    if ',' not in data_url:
        raise HTTPException(status_code=400, detail='Imagem invalida')
    _, encoded = data_url.split(',', 1)
    try:
        return base64.b64decode(encoded, validate=True)
    except (ValueError, BinasciiError):
        raise HTTPException(status_code=400, detail='Imagem invalida')


def _guess_image_type(content: bytes) -> str:
    if content.startswith(b'\xff\xd8\xff'):
        return 'image/jpeg'
    if content.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'image/png'
    if content[:6] in (b'GIF87a', b'GIF89a'):
        return 'image/gif'
    if content.startswith(b'RIFF') and content[8:12] == b'WEBP':
        return 'image/webp'
    return 'application/octet-stream'


def _apply_unit_payload(unit: Unit, payload: UnitCreate | UnitUpdate) -> None:
    updates = payload.model_dump(exclude_none=True)
    foto_value = updates.pop('foto_url', None)

    for key, value in updates.items():
        setattr(unit, key, value)

    if foto_value is not None:
        normalized = foto_value.strip()
        if not normalized:
            unit.foto_data = None
            unit.foto_url = ''
        elif normalized.startswith('data:image/'):
            unit.foto_data = _decode_data_url(normalized)
            unit.foto_url = ''
        else:
            unit.foto_data = None
            unit.foto_url = normalized


@router.get('', response_model=list[UnitOut])
def list_units(db: Session = Depends(get_db), current_user: User = Depends(require_authorized_user)):
    query = db.query(Unit).order_by(Unit.nome.asc())
    if current_user.role != 'admin':
        query = query.join(UserUnit, UserUnit.unit_id == Unit.id).filter(UserUnit.user_id == current_user.id)
    return [_serialize_unit(unit) for unit in query.all()]


@router.post('', response_model=UnitOut)
def create_unit(payload: UnitCreate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    exists = db.query(Unit).filter(Unit.nome == payload.nome).first()
    if exists:
        raise HTTPException(status_code=409, detail='Unidade ja cadastrada')
    unit = Unit()
    _apply_unit_payload(unit, payload)
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return _serialize_unit(unit)


@router.patch('/{unit_id}', response_model=UnitOut)
def update_unit(unit_id: int, payload: UnitUpdate, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail='Unidade nao encontrada')
    _apply_unit_payload(unit, payload)
    db.commit()
    db.refresh(unit)
    return _serialize_unit(unit)


@router.post('/{unit_id}/photo', response_model=UnitOut)
async def upload_unit_photo(
    unit_id: int,
    foto: UploadFile = FastFile(...),
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail='Unidade nao encontrada')
    if not (foto.content_type or '').startswith('image/'):
        raise HTTPException(status_code=400, detail='Selecione uma imagem valida')

    content = await foto.read()
    if not content:
        raise HTTPException(status_code=400, detail='Imagem vazia')
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail='A imagem nao pode ultrapassar 5MB')

    unit.foto_data = content
    unit.foto_url = ''
    db.commit()
    db.refresh(unit)
    return _serialize_unit(unit)


@router.get('/{unit_id}/photo')
def get_unit_photo(unit_id: int, db: Session = Depends(get_db)):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit or not unit.foto_data:
        raise HTTPException(status_code=404, detail='Foto nao encontrada')
    return Response(unit.foto_data, media_type=_guess_image_type(unit.foto_data))


@router.delete('/{unit_id}/photo', response_model=UnitOut)
def delete_unit_photo(unit_id: int, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail='Unidade nao encontrada')
    unit.foto_data = None
    unit.foto_url = ''
    db.commit()
    db.refresh(unit)
    return _serialize_unit(unit)


@router.delete('/{unit_id}')
def delete_unit(unit_id: int, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail='Unidade nao encontrada')
    db.delete(unit)
    db.commit()
    return {'message': 'Unidade removida com sucesso'}


@router.get('/{unit_id}/users', response_model=list[UserOut])
def list_unit_users(unit_id: int, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail='Unidade nao encontrada')

    users = (
        db.query(User)
        .join(UserUnit, UserUnit.user_id == User.id)
        .filter(UserUnit.unit_id == unit_id)
        .order_by(User.nome.asc())
        .all()
    )
    unit_map = get_unit_ids_map(db, [user.id for user in users])
    return [serialize_user(user, unit_map.get(user.id, [])) for user in users]


@router.get('/{unit_id}/files', response_model=list[FileOut])
def list_unit_files(unit_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_authorized_user)):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail='Unidade nao encontrada')

    if current_user.role != 'admin':
        has_access = db.query(UserUnit).filter(UserUnit.user_id == current_user.id, UserUnit.unit_id == unit_id).first()
        if not has_access:
            raise HTTPException(status_code=403, detail='Sem permissao para esta unidade')

    records = (
        db.query(File)
        .join(FileUnit, FileUnit.file_id == File.id)
        .filter(FileUnit.unit_id == unit_id)
        .order_by(File.created_at.desc())
        .all()
    )
    return [
        FileOut.model_validate({
            **record.__dict__,
            'unit_ids': [rel.unit_id for rel in record.units],
            'unit_names': [rel.unit.nome for rel in record.units],
        })
        for record in records
    ]


@router.post('/{unit_id}/files', response_model=FileOut)
def upload_unit_file(
    unit_id: int,
    titulo: str = Form(...),
    tipo_arquivo: str = Form(...),
    mes_referencia: str = Form(...),
    ano_referencia: int = Form(...),
    upload: UploadFile = FastFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail='Unidade nao encontrada')

    filename, file_bytes = read_pdf_bytes(upload)
    record = create_file_record(
        db,
        titulo=titulo,
        tipo_arquivo=tipo_arquivo,
        mes_referencia=mes_referencia,
        ano_referencia=ano_referencia,
        unit_ids=[unit_id],
        nome_arquivo=filename,
        file_data=file_bytes,
        uploaded_by=current_user.id,
    )
    return FileOut.model_validate({
        **record.__dict__,
        'unit_ids': [rel.unit_id for rel in record.units],
        'unit_names': [rel.unit.nome for rel in record.units],
    })
