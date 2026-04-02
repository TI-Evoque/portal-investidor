from fastapi import APIRouter, Depends, File as FastFile, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.api.deps.auth import require_admin, require_authorized_user
from app.db.session import get_db
from app.models.file import File, FileUnit
from app.models.unit import Unit
from app.models.user_unit import UserUnit
from app.schemas.file import FileOut, FileUpdateIn
from app.services.file_service import create_file_record, read_pdf_bytes

router = APIRouter(prefix='/files', tags=['files'])


def _serialize_file(record: File) -> FileOut:
    return FileOut.model_validate(
        {
            **record.__dict__,
            'unit_ids': [rel.unit_id for rel in record.units],
            'unit_names': [rel.unit.nome for rel in record.units],
        }
    )


@router.get('', response_model=list[FileOut])
def list_files(db: Session = Depends(get_db), current_user=Depends(require_authorized_user)):
    query = db.query(File)
    if current_user.role != 'admin':
        allowed_units = db.query(UserUnit.unit_id).filter(UserUnit.user_id == current_user.id)
        query = query.join(FileUnit).filter(FileUnit.unit_id.in_(allowed_units))
    records = query.order_by(File.created_at.desc()).distinct().all()
    return [_serialize_file(record) for record in records]


@router.post('/upload', response_model=FileOut)
def upload_file(
    titulo: str = Form(...),
    tipo_arquivo: str = Form(...),
    mes_referencia: str = Form(...),
    ano_referencia: int = Form(...),
    unit_ids: str = Form(...),
    upload: UploadFile = FastFile(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    filename, file_bytes = read_pdf_bytes(upload)
    ids = [int(item) for item in unit_ids.split(',') if item.strip().isdigit()]
    record = create_file_record(
        db,
        titulo=titulo,
        tipo_arquivo=tipo_arquivo,
        mes_referencia=mes_referencia,
        ano_referencia=ano_referencia,
        unit_ids=ids,
        nome_arquivo=filename,
        file_data=file_bytes,
        uploaded_by=current_user.id,
    )
    return _serialize_file(record)


@router.get('/{file_id}/download')
def download_file(file_id: int, db: Session = Depends(get_db), current_user=Depends(require_authorized_user)):
    record = db.query(File).filter(File.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Arquivo não encontrado')
    if current_user.role != 'admin':
        allowed_unit_ids = {rel.unit_id for rel in current_user.units}
        record_unit_ids = {rel.unit_id for rel in record.units}
        if not allowed_unit_ids.intersection(record_unit_ids):
            raise HTTPException(status_code=403, detail='Sem permissão para este arquivo')
    if not record.file_data:
        raise HTTPException(status_code=404, detail='Arquivo não encontrado no banco')
    return Response(
        record.file_data,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="{record.nome_arquivo}"'}
    )


@router.delete('/{file_id}')
def delete_file(file_id: int, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    record = db.query(File).filter(File.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Arquivo não encontrado')
    db.delete(record)
    db.commit()
    return {'message': 'Arquivo removido com sucesso'}


@router.patch('/{file_id}', response_model=FileOut)
def update_file(
    file_id: int,
    payload: FileUpdateIn,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    record = db.query(File).filter(File.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Arquivo não encontrado')

    clean_unit_ids = []
    for unit_id in payload.unit_ids:
        if isinstance(unit_id, int) and unit_id not in clean_unit_ids:
            clean_unit_ids.append(unit_id)

    if not clean_unit_ids:
        raise HTTPException(status_code=400, detail='Selecione pelo menos uma unidade')

    units = db.query(Unit).filter(Unit.id.in_(clean_unit_ids)).all()
    if len(units) != len(clean_unit_ids):
        raise HTTPException(status_code=400, detail='Uma ou mais unidades são inválidas')

    record.titulo = payload.titulo.strip()
    record.tipo_arquivo = payload.tipo_arquivo.strip()
    record.mes_referencia = payload.mes_referencia.strip()
    record.ano_referencia = payload.ano_referencia

    db.query(FileUnit).filter(FileUnit.file_id == record.id).delete(synchronize_session=False)
    db.flush()
    for unit_id in clean_unit_ids:
        db.add(FileUnit(file_id=record.id, unit_id=unit_id))

    db.commit()
    db.refresh(record)
    return _serialize_file(record)
