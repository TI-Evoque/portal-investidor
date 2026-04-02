from sqlalchemy import inspect
from app.db.base import Base
from app.db.session import engine

# Garantir registro de todos os models
from app.models.user import User  # noqa: F401
from app.models.unit import Unit  # noqa: F401
from app.models.user_unit import UserUnit  # noqa: F401
from app.models.file import File, FileUnit  # noqa: F401
from app.models.password_reset_code import PasswordResetCode  # noqa: F401


def init_db() -> None:
    """
    Garante que as tabelas existam, mas sem inserir seeds extras.
    O ambiente Azure já possui um script SQL oficial com a estrutura
    e o admin inicial.
    """
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    required_tables = {'users', 'units', 'user_units', 'files', 'file_units', 'password_reset_codes'}

    # Se o banco ainda estiver vazio, cria as tabelas mapeadas pelos models.
    if not required_tables.issubset(existing_tables):
        Base.metadata.create_all(bind=engine)
