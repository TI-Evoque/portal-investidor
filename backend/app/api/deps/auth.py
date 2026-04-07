from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

bearer = HTTPBearer(auto_error=False)
STAFF_ROLES = {'admin', 'super_admin'}


def is_super_admin(user: User | None) -> bool:
    return bool(user and user.role == 'super_admin')


def is_staff(user: User | None) -> bool:
    return bool(user and user.role in STAFF_ROLES)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Nao autenticado')
    email = decode_token(credentials.credentials)
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Usuario invalido')
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not is_staff(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Acesso restrito ao admin')
    return current_user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if not is_super_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Acesso restrito ao super admin')
    return current_user


def require_authorized_user(current_user: User = Depends(get_current_user)) -> User:
    if not is_staff(current_user) and not current_user.is_authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Usuario pendente de aprovacao')
    return current_user
