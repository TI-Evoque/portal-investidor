from datetime import datetime
from pydantic import BaseModel, Field


class UnitBase(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    endereco: str = ''
    cidade: str = ''
    estado: str = ''
    cep: str = ''
    status_texto: str = 'Unidade inaugurada'
    foto_url: str = ''


class UnitCreate(UnitBase):
    pass


class UnitUpdate(BaseModel):
    nome: str | None = None
    endereco: str | None = None
    cidade: str | None = None
    estado: str | None = None
    cep: str | None = None
    status_texto: str | None = None
    foto_url: str | None = None


class UnitOut(UnitBase):
    id: int
    created_at: datetime

    model_config = {'from_attributes': True}
