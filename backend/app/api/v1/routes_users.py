from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from app.api.deps.auth import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import AdminCreateUserRequest, AdminCreateUserResponse, UserOut, UserUpdateRequest
from app.services.auth_service import generate_placeholder_cpf, generate_temporary_password
from app.services.user_service import get_unit_ids_map, serialize_user, sync_user_units
from app.services.email_service import send_password_changed_email
from app.core.security import get_password_hash

router = APIRouter(prefix='/users', tags=['users'])


@router.get('', response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: object = Depends(require_admin)):
    try:
        users = db.query(User).order_by(User.id.desc()).all()
        unit_map = get_unit_ids_map(db, [user.id for user in users])
        return [serialize_user(user, unit_map.get(user.id, [])) for user in users]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Não foi possível carregar os usuários: {exc}')


@router.post('', response_model=AdminCreateUserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: AdminCreateUserRequest, db: Session = Depends(get_db), _: object = Depends(require_admin)):
    normalized_email = payload.email.strip().lower()
    nome = payload.nome.strip()
    sobrenome = payload.sobrenome.strip()
    telefone = payload.telefone.strip()
    if payload.role not in ('admin', 'investor'):
        raise HTTPException(status_code=422, detail='Perfil inválido')

    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=409, detail='Já existe um usuário com esse e-mail')

    generated_password = generate_temporary_password(6)
    user = User(
        nome=nome,
        sobrenome=sobrenome or None,
        cpf=generate_placeholder_cpf(db),
        email=normalized_email,
        telefone=telefone or None,
        password_hash=get_password_hash(generated_password),
        role=payload.role,
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
        raise HTTPException(status_code=409, detail=f'Erro de integridade ao criar usuário: {exc.orig}')
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao salvar usuário no banco: {exc}')

    created_user = db.query(User).filter(User.id == user.id).first()
    if not created_user:
        raise HTTPException(status_code=500, detail='Usuário não foi localizado na tabela users após o commit')

    unit_map = get_unit_ids_map(db, [created_user.id])
    return AdminCreateUserResponse(
        message='Usuário criado com sucesso',
        generated_password=generated_password,
        user=serialize_user(created_user, unit_map.get(created_user.id, [])),
    )


@router.patch('/{user_id}', response_model=UserOut)
def update_user(user_id: int, payload: UserUpdateRequest, db: Session = Depends(get_db), current_admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')

    data = payload.model_dump(exclude_none=True)
    unit_ids = data.pop('unit_ids', None)
    role = data.get('role')
    if role not in (None, 'admin', 'investor'):
        raise HTTPException(status_code=422, detail='Perfil inválido')
    if user.id == current_admin.id and data.get('is_active') is False:
        raise HTTPException(status_code=400, detail='Você não pode bloquear o próprio usuário')
    for key, value in data.items():
        setattr(user, key, value)
    try:
        if unit_ids is not None:
            sync_user_units(db, user, unit_ids)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao atualizar usuário: {exc}')
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
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail='Você não pode resetar a própria senha por esta tela')

    generated_password = generate_temporary_password(6)
    user.password_hash = get_password_hash(generated_password)
    user.must_change_password = bool(force_change_on_first_access)
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao resetar senha: {exc}')
    db.refresh(user)

    # Envia e-mail com a nova senha temporária
    try:
        send_password_changed_email(
            to_email=user.email,
            user_name=(user.nome or '').strip() or 'investidor',
            new_password=generated_password,
        )
    except Exception:
        pass  # Não bloqueia o reset se o e-mail falhar

    unit_map = get_unit_ids_map(db, [user.id])
    return {
        'message': 'Senha redefinida com sucesso',
        'generated_password': generated_password,
        'must_change_password': bool(user.must_change_password),
        'user': serialize_user(user, unit_map.get(user.id, [])),
    }

@router.delete('/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail='Você não pode excluir o próprio usuário')
    try:
        db.delete(user)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao excluir usuário: {exc}')
