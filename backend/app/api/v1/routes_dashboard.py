from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps.auth import require_admin
from app.db.session import get_db
from app.models.file import File
from app.models.unit import Unit
from app.models.user import User

router = APIRouter(prefix='/dashboard', tags=['dashboard'])


@router.get('/summary')
def dashboard_summary(db: Session = Depends(get_db), _: object = Depends(require_admin)):
    return {
        'uploads': db.query(File).count(),
        'units': db.query(Unit).count(),
        'users': db.query(User).count(),
    }
