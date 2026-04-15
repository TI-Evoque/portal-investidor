from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from app.api.v1 import routes_auth, routes_dashboard, routes_files, routes_investor, routes_units, routes_users
from app.core.config import settings
from app.core.security import decode_token
from app.core.middleware import SecurityHeadersMiddleware
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.user import User
from pathlib import Path

# Swagger local (sem CDN externo que seria bloqueado pela CSP)
app = FastAPI(title=settings.APP_NAME, version='1.0.0', docs_url=None, redoc_url=None)
app.openapi_version = '3.0.3'

# Com o proxy do Vite, o frontend fala com o backend via localhost.
# Não há problema de IP hardcoded nem de CORS em produção dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type'],
)
app.add_middleware(SecurityHeadersMiddleware)

STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.middleware('http')
async def inject_admin_message(request: Request, call_next):
    response = await call_next(request)

    if request.url.path.endswith('/auth/acknowledge-message'):
        return response

    authorization = request.headers.get('authorization', '')
    if not authorization.startswith('Bearer '):
        return response

    token = authorization.replace('Bearer ', '', 1).strip()
    if not token:
        return response

    db = SessionLocal()
    try:
        try:
            email = decode_token(token)
        except Exception:
            return response

        user = db.query(User).filter(User.email == email).first()
        if user and user.admin_message:
            response.headers['X-Admin-Message'] = user.admin_message
    finally:
        db.close()

    return response


@app.get("/docs", include_in_schema=False)
async def swagger_ui_local() -> HTMLResponse:
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=f"{settings.APP_NAME} - Docs",
        swagger_js_url="/static/swagger-ui/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-ui/swagger-ui.css",
        swagger_favicon_url="/static/swagger-ui/favicon-32x32.png",
        oauth2_redirect_url="/static/swagger-ui/oauth2-redirect.html",
    )


@app.get("/redoc", include_in_schema=False)
async def redoc_ui() -> HTMLResponse:
    return get_redoc_html(
        openapi_url="/openapi.json",
        title=f"{settings.APP_NAME} - ReDoc",
    )


app.include_router(routes_auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(routes_users.router, prefix=settings.API_V1_PREFIX)
app.include_router(routes_users.router)

app.include_router(routes_units.router, prefix=settings.API_V1_PREFIX)
app.include_router(routes_files.router, prefix=settings.API_V1_PREFIX)
app.include_router(routes_dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(routes_investor.router, prefix=settings.API_V1_PREFIX)


@app.on_event('startup')
def startup_event():
    init_db()




@app.get('/health')
def health():
    return {'status': 'ok', 'api_prefix': settings.API_V1_PREFIX, 'users_routes': ['/users', f"{settings.API_V1_PREFIX}/users"]}

@app.get('/')
def root():
    return {'message': f'{settings.APP_NAME} online'}
