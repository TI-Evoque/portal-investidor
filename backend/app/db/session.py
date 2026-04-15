import ssl

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def _build_connect_args(ssl_enabled: bool) -> dict:
    if ssl_enabled:
        context = ssl.create_default_context()
        return {'ssl': context}
    return {}


engine = create_engine(
    settings.DATABASE_URL,
    connect_args=_build_connect_args(settings.DB_SSL_ENABLED),
    pool_pre_ping=True,
    pool_recycle=1800,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

expansao_engine = None
ExpansaoSessionLocal = None
if settings.EXPANSAO_DATABASE_URL:
    expansao_engine = create_engine(
        settings.EXPANSAO_DATABASE_URL,
        connect_args=_build_connect_args(settings.EXPANSAO_DB_SSL_ENABLED),
        pool_pre_ping=True,
        pool_recycle=1800,
    )
    ExpansaoSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=expansao_engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_expansao_db():
    if ExpansaoSessionLocal is None:
        raise RuntimeError('Conexao do banco expansao nao configurada.')
    db = ExpansaoSessionLocal()
    try:
        yield db
    finally:
        db.close()
