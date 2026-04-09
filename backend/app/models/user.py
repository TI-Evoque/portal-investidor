from datetime import datetime
from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    sobrenome: Mapped[str | None] = mapped_column(String(150), nullable=True)
    cpf: Mapped[str | None] = mapped_column(String(14), unique=True, index=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default='investor')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_authorized: Mapped[bool] = mapped_column(Boolean, default=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    temp_password_pending: Mapped[bool] = mapped_column(Boolean, default=False)
    force_logout_pending: Mapped[bool] = mapped_column(Boolean, default=False)
    admin_message: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    units = relationship('UserUnit', back_populates='user', cascade='all, delete-orphan')
    password_reset_codes = relationship('PasswordResetCode', back_populates='user', cascade='all, delete-orphan')
