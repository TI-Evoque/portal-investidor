from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.schemas.auth import ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, ResetPasswordWithCodeRequest
from app.services.auth_service import change_user_password, login_user, request_password_reset, reset_password_with_code

router = APIRouter(prefix='/auth', tags=['auth'])
LAST_SEEN_WRITE_INTERVAL = timedelta(seconds=60)


def _touch_last_seen(db: Session, current_user) -> None:
    now = datetime.utcnow()
    if current_user.last_seen_at and (now - current_user.last_seen_at) < LAST_SEEN_WRITE_INTERVAL:
        return
    current_user.last_seen_at = now
    db.add(current_user)
    db.commit()


@router.post('/login', dependencies=[Depends(rate_limit(10, 60))])
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db, email=payload.email, password=payload.password)


@router.post('/change-password')
def change_password(payload: ChangePasswordRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return change_user_password(db, user=current_user, current_password=payload.current_password, new_password=payload.new_password)


@router.get('/me')
def me(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    _touch_last_seen(db, current_user)
    return {
        'id': current_user.id,
        'nome': current_user.nome,
        'sobrenome': current_user.sobrenome,
        'email': current_user.email,
        'telefone': current_user.telefone,
        'role': current_user.role,
        'is_authorized': current_user.is_authorized,
        'must_change_password': bool(current_user.must_change_password),
        'admin_message': current_user.admin_message,
    }


@router.post('/heartbeat')
def heartbeat(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    _touch_last_seen(db, current_user)
    return {'ok': True, 'admin_message': current_user.admin_message}


@router.post('/acknowledge-message')
def acknowledge_message(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    current_user.admin_message = None
    db.add(current_user)
    db.commit()
    return {'ok': True}


@router.post('/forgot-password', dependencies=[Depends(rate_limit(5, 300))])
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return request_password_reset(db, email_or_cpf=payload.email_or_cpf)


@router.post('/reset-password-with-code', dependencies=[Depends(rate_limit(10, 300))])
def reset_password_code(payload: ResetPasswordWithCodeRequest, db: Session = Depends(get_db)):
    return reset_password_with_code(
        db,
        email_or_cpf=payload.email_or_cpf,
        code=payload.code,
        new_password=payload.new_password,
    )
