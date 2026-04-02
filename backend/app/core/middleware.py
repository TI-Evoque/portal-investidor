from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

# Rotas usadas pelo Swagger UI / ReDoc — não aplicar headers restritivos
DOCS_PATHS = {'/docs', '/redoc', '/openapi.json'}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Docs / Swagger: não aplicar nenhum header restritivo
        if request.url.path in DOCS_PATHS or request.url.path.startswith('/static/'):
            return response

        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'same-origin'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "img-src 'self' data: https:; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self' 'unsafe-inline'; "
            "connect-src *;"
        )
        return response
