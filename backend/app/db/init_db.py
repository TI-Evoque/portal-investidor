from sqlalchemy import inspect, text

from app.db.base import Base
from app.db.session import SessionLocal, engine

# Garantir registro de todos os models
from app.models.user import User  # noqa: F401
from app.models.unit import Unit  # noqa: F401
from app.models.user_unit import UserUnit  # noqa: F401
from app.models.file import File, FileUnit  # noqa: F401
from app.models.password_reset_code import PasswordResetCode  # noqa: F401
from app.models.permission_group import PermissionGroup  # noqa: F401
from app.core.security import get_password_hash
from app.services.auth_service import INVESTOR_TEMP_PASSWORD
from app.services.permission_group_service import ensure_default_permission_groups


def init_db() -> None:
    """
    Garante que as tabelas existam, mas sem inserir seeds extras.
    O ambiente Azure já possui um script SQL oficial com a estrutura
    e o admin inicial.
    """
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    required_tables = {'users', 'units', 'user_units', 'files', 'file_units', 'password_reset_codes', 'permission_groups'}

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
    added_temp_password_pending = False
    if 'users' in existing_tables and 'temp_password_pending' not in user_columns:
        with engine.begin() as connection:
            connection.execute(text('ALTER TABLE users ADD COLUMN temp_password_pending BOOLEAN NOT NULL DEFAULT 0'))
        added_temp_password_pending = True
    if 'users' in existing_tables and 'permission_group_id' not in user_columns:
        with engine.begin() as connection:
            connection.execute(text('ALTER TABLE users ADD COLUMN permission_group_id INTEGER NULL'))

    db = SessionLocal()
    try:
        if added_temp_password_pending:
            investor_password_hash = get_password_hash(INVESTOR_TEMP_PASSWORD)
            db.query(User).filter(User.role == 'investor').update(
                {
                    'password_hash': investor_password_hash,
                    'must_change_password': True,
                    'temp_password_pending': True,
                },
                synchronize_session=False,
            )
            db.commit()

        has_super_admin = db.query(User).filter(User.role == 'super_admin').first()
        if not has_super_admin:
            db.query(User).filter(User.role == 'admin').update({'role': 'super_admin'}, synchronize_session=False)
            db.commit()

        ensure_default_permission_groups(db)
    finally:
        db.close()
