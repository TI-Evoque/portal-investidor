from collections import defaultdict
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.user_unit import UserUnit
from app.schemas.user import UserOut


def sync_user_units(db: Session, user: User, unit_ids: list[int]) -> None:
    db.query(UserUnit).filter(UserUnit.user_id == user.id).delete(synchronize_session=False)
    for unit_id in sorted({int(unit_id) for unit_id in unit_ids}):
        db.add(UserUnit(user_id=user.id, unit_id=unit_id))
    db.flush()


def get_unit_ids_map(db: Session, user_ids: list[int]) -> dict[int, list[int]]:
    if not user_ids:
        return {}
    rows = (
        db.query(UserUnit.user_id, UserUnit.unit_id)
        .filter(UserUnit.user_id.in_(user_ids))
        .order_by(UserUnit.user_id.asc(), UserUnit.unit_id.asc())
        .all()
    )
    mapping: dict[int, list[int]] = defaultdict(list)
    for user_id, unit_id in rows:
        mapping[int(user_id)].append(int(unit_id))
    return dict(mapping)


def serialize_user(user: User, unit_ids: list[int] | None = None) -> UserOut:
    created_at = user.created_at or datetime.utcnow()
    return UserOut.model_validate({
        'id': int(user.id),
        'nome': (user.nome or '').strip(),
        'sobrenome': user.sobrenome,
        'cpf': user.cpf,
        'email': (user.email or '').strip(),
        'telefone': user.telefone,
        'role': (user.role or 'investor').strip(),
        'is_active': bool(user.is_active),
        'is_authorized': bool(user.is_authorized),
        'must_change_password': bool(user.must_change_password),
        'created_at': created_at,
        'updated_at': user.updated_at,
        'unit_ids': unit_ids or [],
    })
