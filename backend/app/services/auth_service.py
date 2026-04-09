import random
import string
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, password_needs_rehash, verify_password
from app.models.password_reset_code import PasswordResetCode
from app.models.user import User
from app.services.email_service import send_password_reset_email, send_password_changed_email
from app.utils.validators import normalize_cpf, validate_password_strength


PASSWORD_CHARS = string.ascii_letters + string.digits
INVESTOR_TEMP_PASSWORD = ' '


def generate_temporary_password(length: int = 6) -> str:
    return ''.join(random.SystemRandom().choice(PASSWORD_CHARS) for _ in range(length))


def generate_placeholder_cpf(db: Session) -> str:
    base = 90000000000
    while True:
        candidate = str(base)
        exists = db.query(User).filter(User.cpf == candidate).first()
        if not exists:
            return candidate
        base += 1


def register_user(db: Session, *, nome: str, cpf: str, email: str, password: str) -> dict:
    cpf = normalize_cpf(cpf)
    validate_password_strength(password)

    exists = db.query(User).filter((User.email == email.lower()) | (User.cpf == cpf)).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Usuário já cadastrado')

    user = User(
        nome=nome,
        cpf=cpf,
        email=email.lower(),
        password_hash=get_password_hash(password),
        role='investor',
        is_active=True,
        is_authorized=False,
        must_change_password=False,
        temp_password_pending=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        'message': 'Cadastro realizado com sucesso. Aguardando aprovação do administrador.',
        'user_id': user.id,
    }


def login_user(db: Session, *, email: str, password: str) -> dict:
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Credenciais inválidas'
        )

    # ✅ Verifica bloqueio ANTES de emitir o token
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Sua conta está desativada. Entre em contato com o administrador.'
        )

    if not user.is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Sua conta está bloqueada. Entre em contato com o administrador.'
        )

    if password_needs_rehash(user.password_hash):
        user.password_hash = get_password_hash(password)
    user.last_seen_at = datetime.utcnow()
    user.force_logout_pending = False
    db.commit()
    db.refresh(user)

    token = create_access_token(user.email)
    return {
        'access_token': token,
        'token_type': 'bearer',
        'must_change_password': bool(user.must_change_password),
        'user': {
            'id': user.id,
            'nome': user.nome,
            'sobrenome': user.sobrenome,
            'email': user.email,
            'telefone': user.telefone,
            'role': user.role,
            'is_authorized': user.is_authorized,
            'must_change_password': bool(user.must_change_password),
        },
    }


def change_user_password(db: Session, *, user: User, current_password: str, new_password: str) -> dict:
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Senha atual inválida')

    validate_password_strength(new_password)
    user.password_hash = get_password_hash(new_password)
    user.must_change_password = False
    user.temp_password_pending = False
    db.commit()
    db.refresh(user)

    # Notifica o usuário por e-mail com a nova senha
    try:
        send_password_changed_email(
            to_email=user.email,
            user_name=(user.nome or '').strip() or 'investidor',
            new_password=new_password,
        )
    except Exception:
        pass  # Não bloqueia a operação se o e-mail falhar

    return {'message': 'Senha atualizada com sucesso'}


RESET_CODE_CHARS = string.digits


def generate_reset_code(length: int = 6) -> str:
    return ''.join(random.SystemRandom().choice(RESET_CODE_CHARS) for _ in range(length))


def _find_user_for_password_reset(db: Session, identifier: str) -> User | None:
    normalized = identifier.strip()
    normalized_cpf = ''
    try:
        normalized_cpf = normalize_cpf(normalized)
    except HTTPException:
        normalized_cpf = ''
    return db.query(User).filter((User.email == normalized.lower()) | (User.cpf == normalized_cpf)).first()


def request_password_reset(db: Session, *, email_or_cpf: str) -> dict:
    user = _find_user_for_password_reset(db, email_or_cpf)
    generic_message = {'message': 'Se o usuário existir, enviaremos um código de 6 dígitos para o e-mail cadastrado.'}

    if not user or not user.email:
        return generic_message

    now = datetime.utcnow()
    (
        db.query(PasswordResetCode)
        .filter(PasswordResetCode.user_id == user.id, PasswordResetCode.used_at.is_(None))
        .update({'used_at': now}, synchronize_session=False)
    )

    code = generate_reset_code(6)
    reset_code = PasswordResetCode(
        user_id=user.id,
        code=code,
        expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_CODE_EXPIRE_MINUTES),
    )
    db.add(reset_code)
    db.commit()

    send_password_reset_email(
        to_email=user.email,
        user_name=(user.nome or '').strip() or 'investidor',
        code=code,
    )
    return generic_message


def reset_password_with_code(db: Session, *, email_or_cpf: str, code: str, new_password: str) -> dict:
    user = _find_user_for_password_reset(db, email_or_cpf)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Usuário não encontrado')

    validate_password_strength(new_password)
    now = datetime.utcnow()
    reset_code = (
        db.query(PasswordResetCode)
        .filter(
            PasswordResetCode.user_id == user.id,
            PasswordResetCode.code == code.strip(),
            PasswordResetCode.used_at.is_(None),
            PasswordResetCode.expires_at >= now,
        )
        .order_by(PasswordResetCode.created_at.desc())
        .first()
    )
    if not reset_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Código inválido ou expirado')

    user.password_hash = get_password_hash(new_password)
    user.must_change_password = False
    user.temp_password_pending = False
    reset_code.used_at = now
    db.commit()
    return {'message': 'Senha redefinida com sucesso'}
