from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.file import File, FileUnit
from app.models.unit import Unit
from app.utils.filenames import safe_filename


def read_pdf_bytes(upload: UploadFile) -> tuple[str, bytes]:
    suffix = (upload.filename or '').lower().rsplit('.', 1)
    if len(suffix) < 2 or f".{suffix[-1]}" != '.pdf':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Apenas PDF é permitido')
    target_name = safe_filename(upload.filename or 'arquivo.pdf')
    content = upload.file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Arquivo vazio')
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Arquivo excede o limite permitido')
    return target_name, content


def create_file_record(
    db: Session,
    *,
    titulo: str,
    tipo_arquivo: str,
    mes_referencia: str,
    ano_referencia: int,
    unit_ids: list[int],
    nome_arquivo: str,
    file_data: bytes,
    uploaded_by: int,
) -> File:
    units = db.query(Unit).filter(Unit.id.in_(unit_ids)).all() if unit_ids else []
    if not units:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Selecione ao menos uma unidade')

    record = File(
        titulo=titulo.strip(),
        tipo_arquivo=tipo_arquivo.strip(),
        mes_referencia=mes_referencia.strip(),
        ano_referencia=ano_referencia,
        nome_arquivo=nome_arquivo,
        caminho_arquivo='',
        file_data=file_data,
        uploaded_by=uploaded_by,
    )
    db.add(record)
    db.flush()
    for unit in units:
        db.add(FileUnit(file_id=record.id, unit_id=unit.id))
    db.commit()
    db.refresh(record)
    return record
