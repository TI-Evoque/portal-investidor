from datetime import datetime
from sqlalchemy import DateTime, String, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Unit(Base):
    __tablename__ = 'units'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    endereco: Mapped[str] = mapped_column(String(255), default='')
    cidade: Mapped[str] = mapped_column(String(120), default='')
    estado: Mapped[str] = mapped_column(String(2), default='')
    cep: Mapped[str] = mapped_column(String(20), default='')
    status_texto: Mapped[str] = mapped_column(String(100), default='Unidade inaugurada')
    foto_url: Mapped[str] = mapped_column(String(255), default='')
    foto_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship('UserUnit', back_populates='unit', cascade='all, delete-orphan')
    files = relationship('FileUnit', back_populates='unit', cascade='all, delete-orphan')
