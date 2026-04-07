from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps.auth import is_staff, require_authorized_user
from app.core.config import settings
from app.db.session import get_db
from app.models.unit import Unit
from app.models.user_unit import UserUnit

router = APIRouter(prefix='/investor', tags=['investor'])


def _serialize_unit(unit: Unit) -> dict:
    foto_url = f"{settings.API_V1_PREFIX}/units/{unit.id}/photo" if unit.foto_data else (unit.foto_url or '')
    return {
        'id': unit.id,
        'nome': unit.nome,
        'endereco': unit.endereco,
        'cidade': unit.cidade,
        'estado': unit.estado,
        'cep': unit.cep,
        'status_texto': unit.status_texto,
        'foto_url': foto_url,
        'created_at': unit.created_at,
    }


@router.get('/units')
def my_units(db: Session = Depends(get_db), current_user=Depends(require_authorized_user)):
    if is_staff(current_user):
        units = db.query(Unit).all()
    else:
        units = (
            db.query(Unit)
            .join(UserUnit, UserUnit.unit_id == Unit.id)
            .filter(UserUnit.user_id == current_user.id)
            .order_by(Unit.nome.asc())
            .all()
        )
    return [_serialize_unit(unit) for unit in units]
