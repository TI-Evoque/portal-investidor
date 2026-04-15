from datetime import datetime
from pydantic import BaseModel


class FileOut(BaseModel):
    id: int
    titulo: str
    nome_arquivo: str
    tipo_arquivo: str
    mes_referencia: str
    ano_referencia: int
    created_at: datetime
    unit_ids: list[int] = []
    unit_names: list[str] = []

    model_config = {'from_attributes': True}


class FileUpdateIn(BaseModel):
    titulo: str
    tipo_arquivo: str
    mes_referencia: str
    ano_referencia: int
    unit_ids: list[int] = []
