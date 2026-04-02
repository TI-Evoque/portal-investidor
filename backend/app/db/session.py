import ssl
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings


def _build_connect_args() -> dict:
    if settings.DB_SSL_ENABLED:
        context = ssl.create_default_context()
        return {"ssl": context}
    return {}


engine = create_engine(
    settings.DATABASE_URL,
    connect_args=_build_connect_args(),
    pool_pre_ping=True,
    pool_recycle=1800,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
