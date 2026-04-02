from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class UserUnit(Base):
    __tablename__ = 'user_units'
    __table_args__ = (UniqueConstraint('user_id', 'unit_id', name='uq_user_unit'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    unit_id: Mapped[int] = mapped_column(ForeignKey('units.id', ondelete='CASCADE'))

    user = relationship('User', back_populates='units')
    unit = relationship('Unit', back_populates='users')
