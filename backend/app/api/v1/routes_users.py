from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps.auth import is_super_admin, require_admin, require_super_admin
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import AdminCreateUserRequest, AdminCreateUserResponse, AdminMessageRequest, UserOut, UserUpdateRequest
from app.services.auth_service import generate_temporary_password
from app.services.email_service import send_password_changed_email
from app.services.user_service import ONLINE_WINDOW, get_unit_ids_map, serialize_user, sync_user_units
from app.utils.validators import normalize_cpf

router = APIRouter(prefix='/users', tags=['users'])
ALLOWED_ROLES = {'investor', 'admin', 'super_admin'}


def _ensure_manageable_role(current_admin: User, target_role: str) -> None:
    if target_role not in ALLOWED_ROLES:
        raise HTTPException(status_code=422, detail='Perfil invalido')
    if target_role in {'admin', 'super_admin'} and not is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail='Apenas o super admin pode conceder perfis administrativos')


def _ensure_manageable_user(current_admin: User, target_user: User) -> None:
    if target_user.id == current_admin.id:
        raise HTTPException(status_code=400, detail='Voce nao pode derrubar o proprio acesso')
    if target_user.role == 'super_admin' and not is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail='O admin nao pode executar essa acao em um super admin')


@router.get('', response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: object = Depends(require_admin)):
    try:
        users = db.query(User).order_by(User.id.desc()).all()
        unit_map = get_unit_ids_map(db, [user.id for user in users])
        return [serialize_user(user, unit_map.get(user.id, [])) for user in users]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Nao foi possivel carregar os usuarios: {exc}')


@router.get('/online', response_model=list[UserOut])
def list_online_users(db: Session = Depends(get_db), current_admin: User = Depends(require_admin)):
    try:
        cutoff = datetime.utcnow() - ONLINE_WINDOW
        query = db.query(User).filter(
            User.is_active.is_(True),
            User.last_seen_at.is_not(None),
            User.last_seen_at >= cutoff,
        )
        if not is_super_admin(current_admin):
            query = query.filter(User.role != 'super_admin')

        users = query.order_by(User.last_seen_at.desc(), User.id.desc()).all()
        unit_map = get_unit_ids_map(db, [user.id for user in users])
        return [serialize_user(user, unit_map.get(user.id, [])) for user in users]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Nao foi possivel carregar os usuarios online: {exc}')


@router.post('/{user_id}/kick-access')
def kick_user_access(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuario nao encontrado')

    _ensure_manageable_user(current_admin, user)
    user.force_logout_pending = True
    user.last_seen_at = None

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao derrubar acesso do usuario: {exc}')

    return {'message': 'Acesso derrubado com sucesso'}


@router.post('/{user_id}/admin-message')
def send_admin_message(
    user_id: int,
    payload: AdminMessageRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuario nao encontrado')

    _ensure_manageable_user(current_admin, user)
    user.admin_message = payload.message.strip()

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao enviar mensagem ao usuario: {exc}')

    return {'message': 'Mensagem enviada com sucesso'}


@router.post('', response_model=AdminCreateUserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: AdminCreateUserRequest, db: Session = Depends(get_db), current_admin: User = Depends(require_admin)):
    normalized_email = payload.email.strip().lower()
    nome = payload.nome.strip()
    sobrenome = payload.sobrenome.strip()
    cpf = normalize_cpf(payload.cpf)
    telefone = payload.telefone.strip()
    requested_role = (payload.role or 'investor').strip()
    _ensure_manageable_role(current_admin, requested_role)

    existing = db.query(User).filter((User.email == normalized_email) | (User.cpf == cpf)).first()
    if existing:
        raise HTTPException(status_code=409, detail='Ja existe um usuario com esse e-mail ou CPF')

    generated_password = generate_temporary_password(6)
    user = User(
        nome=nome,
        sobrenome=sobrenome or None,
        cpf=cpf,
        email=normalized_email,
        telefone=telefone or None,
        password_hash=get_password_hash(generated_password),
        role=requested_role,
        is_active=True,
        is_authorized=bool(payload.is_authorized),
        must_change_password=bool(payload.must_change_password),
    )

    try:
        db.add(user)
        db.flush()

        if payload.unit_ids:
            sync_user_units(db, user, payload.unit_ids)

        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=f'Erro de integridade ao criar usuario: {exc.orig}')
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao salvar usuario no banco: {exc}')

    created_user = db.query(User).filter(User.id == user.id).first()
    if not created_user:
        raise HTTPException(status_code=500, detail='Usuario nao foi localizado na tabela users apos o commit')

    unit_map = get_unit_ids_map(db, [created_user.id])
    return AdminCreateUserResponse(
        message='Usuario criado com sucesso',
        generated_password=generated_password,
        user=serialize_user(created_user, unit_map.get(created_user.id, [])),
    )


@router.patch('/{user_id}', response_model=UserOut)
def update_user(user_id: int, payload: UserUpdateRequest, db: Session = Depends(get_db), current_admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuario nao encontrado')

    data = payload.model_dump(exclude_none=True)
    unit_ids = data.pop('unit_ids', None)
    requested_role = data.get('role')
    cpf_value = data.get('cpf')

    if user.id == current_admin.id and data.get('is_active') is False:
        raise HTTPException(status_code=400, detail='Voce nao pode bloquear o proprio usuario')

    if requested_role is not None:
        _ensure_manageable_role(current_admin, requested_role)
        if not is_super_admin(current_admin):
          raise HTTPException(status_code=403, detail='Apenas o super admin pode alterar o perfil do usuario')
        if user.id == current_admin.id and requested_role != 'super_admin':
            raise HTTPException(status_code=400, detail='Voce nao pode remover o proprio perfil de super admin')

    if cpf_value is not None:
        normalized_cpf = normalize_cpf(cpf_value)
        existing_cpf = db.query(User).filter(User.cpf == normalized_cpf, User.id != user.id).first()
        if existing_cpf:
            raise HTTPException(status_code=409, detail='Ja existe um usuario com esse CPF')
        data['cpf'] = normalized_cpf

    if not is_super_admin(current_admin):
        forbidden_fields = {'nome', 'sobrenome', 'cpf', 'telefone', 'must_change_password'}
        attempted = forbidden_fields.intersection(data.keys())
        if attempted:
            raise HTTPException(status_code=403, detail='O admin pode apenas bloquear, liberar acesso ou criar usuarios')
        if unit_ids is not None:
            raise HTTPException(status_code=403, detail='O admin nao pode editar unidades vinculadas por esta tela')

    for key, value in data.items():
        setattr(user, key, value)

    try:
        if unit_ids is not None:
            sync_user_units(db, user, unit_ids)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao atualizar usuario: {exc}')

    db.refresh(user)
    unit_map = get_unit_ids_map(db, [user.id])
    return serialize_user(user, unit_map.get(user.id, []))


@router.post('/{user_id}/reset-password')
def reset_user_password(
    user_id: int,
    force_change_on_first_access: bool = True,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    if not is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail='Apenas o super admin pode resetar senhas por esta tela')

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuario nao encontrado')
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail='Voce nao pode resetar a propria senha por esta tela')

    generated_password = generate_temporary_password(6)
    user.password_hash = get_password_hash(generated_password)
    user.must_change_password = bool(force_change_on_first_access)
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao resetar senha: {exc}')

    db.refresh(user)

    try:
        send_password_changed_email(
            to_email=user.email,
            user_name=(user.nome or '').strip() or 'investidor',
            new_password=generated_password,
        )
    except Exception:
        pass

    unit_map = get_unit_ids_map(db, [user.id])
    return {
        'message': 'Senha redefinida com sucesso',
        'generated_password': generated_password,
        'must_change_password': bool(user.must_change_password),
        'user': serialize_user(user, unit_map.get(user.id, [])),
    }


@router.delete('/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(require_admin)):
    if not is_super_admin(current_admin):
        raise HTTPException(status_code=403, detail='Apenas o super admin pode excluir usuarios')

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuario nao encontrado')
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail='Voce nao pode excluir o proprio usuario')
    try:
        db.delete(user)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao excluir usuario: {exc}')
