from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class File(Base):
    __tablename__ = 'files'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    nome_arquivo: Mapped[str] = mapped_column(String(255), nullable=False)
    caminho_arquivo: Mapped[str] = mapped_column(String(255), nullable=False, default='')
    file_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    tipo_arquivo: Mapped[str] = mapped_column(String(100), default='DRE')
    mes_referencia: Mapped[str] = mapped_column(String(40), default='')
    ano_referencia: Mapped[int] = mapped_column(default=2026)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    units = relationship('FileUnit', back_populates='file', cascade='all, delete-orphan')


class FileUnit(Base):
    __tablename__ = 'file_units'
    __table_args__ = (UniqueConstraint('file_id', 'unit_id', name='uq_file_unit'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    file_id: Mapped[int] = mapped_column(ForeignKey('files.id', ondelete='CASCADE'))
    unit_id: Mapped[int] = mapped_column(ForeignKey('units.id', ondelete='CASCADE'))

    file = relationship('File', back_populates='units')
    unit = relationship('Unit', back_populates='files')
