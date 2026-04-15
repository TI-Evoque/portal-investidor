from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

ALGORITHM = 'HS256'

# Novo padrão: pbkdf2_sha256.
# Mantemos compatibilidade com hashes bcrypt legados já gravados no banco.
pwd_context = CryptContext(
    schemes=['pbkdf2_sha256', 'bcrypt'],
    default='pbkdf2_sha256',
    deprecated=['bcrypt'],
)


def _is_bcrypt_hash(hashed_password: str) -> bool:
    return hashed_password.startswith(('$2a$', '$2b$', '$2y$'))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica a senha com fallback robusto para hashes bcrypt legados.

    Em alguns ambientes, passlib + bcrypt 4.x pode falhar silenciosamente ou
    quebrar a verificação de hashes antigos. Quando detectamos um hash bcrypt,
    usamos a própria lib bcrypt diretamente como fallback.
    """
    if not hashed_password:
        return False

    if _is_bcrypt_hash(hashed_password):
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            # Fallback final: tenta pelo passlib caso o hash legado tenha outro formato.
            try:
                return pwd_context.verify(plain_password, hashed_password)
            except Exception:
                return False

    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False



def get_password_hash(password: str) -> str:
    """Gera hash no formato atual e estável do projeto."""
    return pwd_context.hash(password)



def password_needs_rehash(hashed_password: str) -> bool:
    if not hashed_password:
        return True

    if _is_bcrypt_hash(hashed_password):
        return True

    try:
        return pwd_context.needs_update(hashed_password)
    except Exception:
        return True



def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {'sub': subject, 'exp': expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)



def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get('sub')
        if not sub:
            raise ValueError('Token inválido')
        return sub
    except JWTError as exc:
        raise ValueError('Token inválido') from exc
