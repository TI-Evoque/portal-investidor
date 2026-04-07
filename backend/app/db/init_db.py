from sqlalchemy import inspect, text

from app.db.base import Base
from app.db.session import SessionLocal, engine

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

    user_columns = {column['name'] for column in inspector.get_columns('users')} if 'users' in inspector.get_table_names() else set()
    if 'users' in existing_tables and 'last_seen_at' not in user_columns:
        with engine.begin() as connection:
            connection.execute(text('ALTER TABLE users ADD COLUMN last_seen_at DATETIME NULL'))
    if 'users' in existing_tables and 'force_logout_pending' not in user_columns:
        with engine.begin() as connection:
            connection.execute(text('ALTER TABLE users ADD COLUMN force_logout_pending BOOLEAN NOT NULL DEFAULT 0'))
    if 'users' in existing_tables and 'admin_message' not in user_columns:
        with engine.begin() as connection:
            connection.execute(text('ALTER TABLE users ADD COLUMN admin_message VARCHAR(1000) NULL'))

    db = SessionLocal()
    try:
        has_super_admin = db.query(User).filter(User.role == 'super_admin').first()
        if not has_super_admin:
            db.query(User).filter(User.role == 'admin').update({'role': 'super_admin'}, synchronize_session=False)
            db.commit()
    finally:
        db.close()
