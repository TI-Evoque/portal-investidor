from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps.auth import require_super_admin
from app.db.session import get_db
from app.models.permission_group import PermissionGroup
from app.schemas.permission_group import PermissionCatalogOut, PermissionGroupCreate, PermissionGroupOut, PermissionGroupUpdate
from app.services.permission_group_service import (
    PERMISSION_CATALOG,
    ensure_default_permission_groups,
    serialize_group,
    serialize_rules,
    unique_slug,
)

router = APIRouter(prefix='/permission-groups', tags=['permission-groups'])


@router.get('/catalog', response_model=PermissionCatalogOut)
def get_permission_catalog(_: object = Depends(require_super_admin)):
    return {'modules': PERMISSION_CATALOG}


@router.get('', response_model=list[PermissionGroupOut])
def list_permission_groups(db: Session = Depends(get_db), _: object = Depends(require_super_admin)):
    ensure_default_permission_groups(db)
    groups = db.query(PermissionGroup).order_by(PermissionGroup.is_system.desc(), PermissionGroup.name.asc()).all()
    return [serialize_group(group) for group in groups]


@router.post('', response_model=PermissionGroupOut, status_code=status.HTTP_201_CREATED)
def create_permission_group(
    payload: PermissionGroupCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_super_admin),
):
    ensure_default_permission_groups(db)
    group = PermissionGroup(
        name=payload.name.strip(),
        slug=unique_slug(db, payload.name),
        description=(payload.description or '').strip() or None,
        is_system=False,
        rules_json=serialize_rules(payload.rules),
    )

    try:
        db.add(group)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao criar grupo de permissao: {exc}')

    db.refresh(group)
    return serialize_group(group)


@router.patch('/{group_id}', response_model=PermissionGroupOut)
def update_permission_group(
    group_id: int,
    payload: PermissionGroupUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_super_admin),
):
    ensure_default_permission_groups(db)
    group = db.query(PermissionGroup).filter(PermissionGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail='Grupo de permissao nao encontrado')

    data = payload.model_dump(exclude_unset=True)
    if 'name' in data and data['name'] is not None:
        group.name = data['name'].strip()
        if not group.is_system:
            group.slug = unique_slug(db, group.name, group.id)
    if 'description' in data:
        group.description = (data.get('description') or '').strip() or None
    if 'rules' in data and data['rules'] is not None:
        group.rules_json = serialize_rules(data['rules'])

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao atualizar grupo de permissao: {exc}')

    db.refresh(group)
    return serialize_group(group)


@router.delete('/{group_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_permission_group(
    group_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_super_admin),
):
    group = db.query(PermissionGroup).filter(PermissionGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail='Grupo de permissao nao encontrado')
    if group.is_system:
        raise HTTPException(status_code=400, detail='Grupos padrao do sistema nao podem ser excluidos')

    try:
        db.delete(group)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f'Erro ao excluir grupo de permissao: {exc}')
