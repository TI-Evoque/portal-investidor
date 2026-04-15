from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.api.deps.auth import is_staff, require_authorized_user
from app.db.session import get_db, get_expansao_db
from app.models.file import File
from app.models.file import FileUnit
from app.models.unit import Unit
from app.models.user import User
from app.models.user_unit import UserUnit

router = APIRouter(prefix='/dashboard', tags=['dashboard'])
DASHBOARD_CACHE_TTL = timedelta(seconds=90)
_dashboard_cache: dict[tuple[int, tuple[int, ...]], tuple[datetime, dict]] = {}
EXPANSAO_UNAVAILABLE_MESSAGE = (
    'Os indicadores de ativos, inadimplentes e agregadores nao foram carregados '
    'porque a conexao com o banco expansao nao esta configurada.'
)


@router.get('/summary')
def dashboard_summary(db: Session = Depends(get_db), _: object = Depends(require_authorized_user)):
    return {
        'uploads': db.query(File).count(),
        'units': db.query(Unit).count(),
        'users': db.query(User).count(),
    }


@router.get('/analytics')
def dashboard_analytics(
    db: Session = Depends(get_db),
    expansao_db: Session | None = Depends(get_expansao_db),
    current_user: User = Depends(require_authorized_user),
    unit_ids: str | None = Query(default=None),
):
    cache_key = None
    if is_staff(current_user):
        available_units = db.query(Unit).order_by(Unit.nome.asc()).all()
    else:
        available_units = (
            db.query(Unit)
            .join(UserUnit, UserUnit.unit_id == Unit.id)
            .filter(UserUnit.user_id == current_user.id)
            .order_by(Unit.nome.asc())
            .all()
        )

    available_unit_ids = [unit.id for unit in available_units]
    if not available_unit_ids:
        return {
            'overview': {
                'portal_units': 0,
                'portal_users': 0,
                'portal_files': 0,
                'ativos_total': 0,
                'adimplentes_total': 0,
                'inadimplentes_total': 0,
                'agregadores_total': 0,
            },
            'unit_grid': [],
            'available_units': [],
            'selected_unit_ids': [],
            'metrics_status': 'ok',
            'metrics_message': '',
        }

    if is_staff(current_user):
        requested_ids = []
        if unit_ids:
            requested_ids = [int(item) for item in unit_ids.split(',') if item.strip().isdigit()]
        selected_unit_ids = [unit_id for unit_id in requested_ids if unit_id in available_unit_ids]
        if not selected_unit_ids:
            selected_unit_ids = available_unit_ids
    else:
        selected_unit_ids = available_unit_ids

    cache_key = (current_user.id, tuple(sorted(selected_unit_ids)))
    cached_entry = _dashboard_cache.get(cache_key)
    if cached_entry and (datetime.utcnow() - cached_entry[0]) < DASHBOARD_CACHE_TTL:
        return cached_entry[1]

    expanding_ids = bindparam('unit_ids', expanding=True)

    if expansao_db is None:
        ativos_rows = []
        inadimplentes_rows = []
        agregadores_rows = []
        metrics_status = 'unavailable'
        metrics_message = EXPANSAO_UNAVAILABLE_MESSAGE
    else:
        metrics_status = 'ok'
        metrics_message = ''
        try:
            ativos_rows = expansao_db.execute(
                text('SELECT UNIDADE, ATIVOS FROM ativos WHERE UNIDADE IN :unit_ids').bindparams(expanding_ids),
                {'unit_ids': selected_unit_ids},
            ).mappings().all()

            inadimplentes_rows = expansao_db.execute(
                text('SELECT UNIDADE, INADIMPLENTES FROM inadimplentes WHERE UNIDADE IN :unit_ids').bindparams(expanding_ids),
                {'unit_ids': selected_unit_ids},
            ).mappings().all()

            agregadores_rows = expansao_db.execute(
                text('SELECT UNIDADE, GYMPASS, TOTALPASS FROM agregadores WHERE UNIDADE IN :unit_ids').bindparams(expanding_ids),
                {'unit_ids': selected_unit_ids},
            ).mappings().all()
        except Exception as exc:
            ativos_rows = []
            inadimplentes_rows = []
            agregadores_rows = []
            metrics_status = 'unavailable'
            metrics_message = f'As unidades foram carregadas, mas os indicadores do banco expansao nao puderam ser consultados: {exc}'

    ativos_map = {int(row['UNIDADE']): int(row['ATIVOS'] or 0) for row in ativos_rows}
    inadimplentes_map = {int(row['UNIDADE']): int(row['INADIMPLENTES'] or 0) for row in inadimplentes_rows}
    agregadores_map = {
        int(row['UNIDADE']): int(row['GYMPASS'] or 0) + int(row['TOTALPASS'] or 0)
        for row in agregadores_rows
    }

    selected_units = [unit for unit in available_units if unit.id in selected_unit_ids]
    unit_grid = []
    for unit in selected_units:
        ativos = ativos_map.get(unit.id, 0)
        inadimplentes = inadimplentes_map.get(unit.id, 0)
        adimplentes = max(ativos - inadimplentes, 0)
        agregadores = agregadores_map.get(unit.id, 0)
        unit_grid.append(
            {
                'unit_id': unit.id,
                'unit_name': unit.nome,
                'ativos': ativos,
                'adimplentes': adimplentes,
                'inadimplentes': inadimplentes,
                'agregadores': agregadores,
            }
        )

    response = {
        'overview': {
            'portal_units': len(selected_unit_ids),
            'portal_users': (
                db.query(User.id)
                .join(UserUnit, UserUnit.user_id == User.id)
                .filter(UserUnit.unit_id.in_(selected_unit_ids))
                .distinct()
                .count()
            ),
            'portal_files': (
                db.query(File.id)
                .join(FileUnit, FileUnit.file_id == File.id)
                .filter(FileUnit.unit_id.in_(selected_unit_ids))
                .distinct()
                .count()
            ),
            'ativos_total': sum(item['ativos'] for item in unit_grid),
            'adimplentes_total': sum(item['adimplentes'] for item in unit_grid),
            'inadimplentes_total': sum(item['inadimplentes'] for item in unit_grid),
            'agregadores_total': sum(item['agregadores'] for item in unit_grid),
        },
        'unit_grid': unit_grid,
        'available_units': [
            {
                'id': unit.id,
                'label': unit.nome,
                'hint': ' - '.join(part for part in [unit.cidade, unit.estado] if part),
            }
            for unit in available_units
        ],
        'selected_unit_ids': selected_unit_ids,
        'metrics_status': metrics_status,
        'metrics_message': metrics_message,
    }
    _dashboard_cache[cache_key] = (datetime.utcnow(), response)
    return response
