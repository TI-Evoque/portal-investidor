from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / '.env'


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_FILE), env_file_encoding='utf-8', extra='ignore')

    APP_NAME: str = 'Portal do Investidor Evoque'
    ENV: str = 'development'
    API_V1_PREFIX: str = '/api/v1'
    SECRET_KEY: str = 'change-me'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    FRONTEND_URL: str = 'http://localhost:3020'
    CORS_EXTRA_ORIGINS: str = ''

    # Banco de dados
    DATABASE_URL: str | None = None
    DB_HOST: str = ''
    DB_USER: str = ''
    DB_PASSWORD: str = ''
    DB_NAME: str = ''
    DB_PORT: int = 3306
    DB_SSL_ENABLED: bool = True

    STORAGE_DIR: str = 'storage/pdfs'
    MAX_FILE_SIZE_MB: int = 10

    GRAPH_CLIENT_ID: str = ''
    GRAPH_CLIENT_SECRET: str = ''
    GRAPH_TENANT_ID: str = ''
    GRAPH_USER_ID: str = ''
    PASSWORD_RESET_CODE_EXPIRE_MINUTES: int = 15

    @property
    def cors_origins(self) -> list[str]:
        origins = {
            'http://localhost:3020',
            'http://127.0.0.1:3020',
            self.FRONTEND_URL,
        }
        if self.CORS_EXTRA_ORIGINS:
            for origin in self.CORS_EXTRA_ORIGINS.split(','):
                origin = origin.strip()
                if origin:
                    origins.add(origin)
        return list(origins)

    @property
    def is_mysql(self) -> bool:
        return bool(self.DATABASE_URL and self.DATABASE_URL.startswith('mysql'))

    def _build_mysql_url(self) -> str | None:
        if not all([self.DB_HOST, self.DB_USER, self.DB_PASSWORD, self.DB_NAME]):
            return None
        user = quote_plus(self.DB_USER)
        password = quote_plus(self.DB_PASSWORD)
        host = self.DB_HOST.strip()
        db_name = quote_plus(self.DB_NAME)
        return f'mysql+pymysql://{user}:{password}@{host}:{self.DB_PORT}/{db_name}?charset=utf8mb4'

    def model_post_init(self, __context) -> None:
        database_url = (self.DATABASE_URL or '').strip()
        if database_url:
            self.DATABASE_URL = database_url
        else:
            mysql_url = self._build_mysql_url()
            if not mysql_url:
                raise ValueError(
                    'Configuração do banco ausente. Defina DATABASE_URL ou DB_HOST/DB_USER/DB_PASSWORD/DB_NAME para Azure MySQL.'
                )
            self.DATABASE_URL = mysql_url

        if not self.is_mysql:
            raise ValueError('Este projeto está configurado para operar apenas com MySQL/Azure Database.')

        storage_path = Path(self.STORAGE_DIR)
        if not storage_path.is_absolute():
            self.STORAGE_DIR = str((BASE_DIR / storage_path).resolve())


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
