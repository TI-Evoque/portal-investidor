import json
from urllib import parse, request

from fastapi import HTTPException, status

from app.core.config import settings


def _ensure_graph_configured() -> None:
    missing = [
        name
        for name, value in {
            "GRAPH_CLIENT_ID": settings.GRAPH_CLIENT_ID,
            "GRAPH_CLIENT_SECRET": settings.GRAPH_CLIENT_SECRET,
            "GRAPH_TENANT_ID": settings.GRAPH_TENANT_ID,
            "GRAPH_USER_ID": settings.GRAPH_USER_ID,
        }.items()
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuração de e-mail ausente: {', '.join(missing)}",
        )


def _fetch_graph_token() -> str:
    _ensure_graph_configured()
    token_url = f"https://login.microsoftonline.com/{settings.GRAPH_TENANT_ID}/oauth2/v2.0/token"
    payload = parse.urlencode({
        "client_id": settings.GRAPH_CLIENT_ID,
        "client_secret": settings.GRAPH_CLIENT_SECRET,
        "scope": "https://graph.microsoft.com/.default",
        "grant_type": "client_credentials",
    }).encode("utf-8")
    req = request.Request(token_url, data=payload, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with request.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
            token = data.get("access_token")
            if not token:
                raise ValueError("access_token ausente")
            return token
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Não foi possível autenticar no Microsoft Graph: {exc}",
        ) from exc


def send_password_reset_email(*, to_email: str, user_name: str, code: str) -> None:
    token = _fetch_graph_token()
    endpoint = f"https://graph.microsoft.com/v1.0/users/{parse.quote(settings.GRAPH_USER_ID)}/sendMail"
    body = {
        "message": {
            "subject": "Portal do Investidor Evoque - Código para redefinir sua senha",
            "body": {
                "contentType": "HTML",
                "content": f"""
                <div style='font-family:Arial,sans-serif;color:#2f2f2f;'>
                  <h2 style='color:#ff5a00;'>Redefinição de senha</h2>
                  <p>Olá, {user_name or 'investidor'}.</p>
                  <p>Seu código de redefinição é:</p>
                  <p style='font-size:32px;font-weight:700;letter-spacing:8px;color:#ff5a00;margin:18px 0;'>{code}</p>
                  <p>Esse código expira em {settings.PASSWORD_RESET_CODE_EXPIRE_MINUTES} minutos.</p>
                  <p>Se você não solicitou a redefinição, pode ignorar este e-mail.</p>
                </div>
                """,
            },
            "toRecipients": [{"emailAddress": {"address": to_email}}],
        },
        "saveToSentItems": "false",
    }
    req = request.Request(endpoint, data=json.dumps(body).encode("utf-8"), method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with request.urlopen(req, timeout=20):
            return
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Não foi possível enviar o e-mail de redefinição: {exc}",
        ) from exc

def send_password_changed_email(*, to_email: str, user_name: str, new_password: str) -> None:
    token = _fetch_graph_token()
    endpoint = f"https://graph.microsoft.com/v1.0/users/{parse.quote(settings.GRAPH_USER_ID)}/sendMail"
    body = {
        "message": {
            "subject": "Portal do Investidor Evoque - Sua senha foi alterada",
            "body": {
                "contentType": "HTML",
                "content": f"""
                <div style='font-family:Arial,sans-serif;color:#2f2f2f;'>
                  <h2 style='color:#ff5a00;'>Senha alterada</h2>
                  <p>Olá, {user_name or 'investidor'}.</p>
                  <p>Sua senha no Portal do Investidor Evoque foi alterada com sucesso.</p>
                  <p>Sua nova senha temporária é:</p>
                  <p style='font-size:28px;font-weight:700;letter-spacing:6px;color:#ff5a00;margin:18px 0;'>{new_password}</p>
                  <p>Por segurança, recomendamos que você altere essa senha assim que fizer login.</p>
                  <p>Se você não solicitou essa alteração, entre em contato com o administrador imediatamente.</p>
                </div>
                """,
            },
            "toRecipients": [{"emailAddress": {"address": to_email}}],
        },
        "saveToSentItems": "false",
    }
    req = request.Request(endpoint, data=json.dumps(body).encode("utf-8"), method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with request.urlopen(req, timeout=20):
            return
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Não foi possível enviar o e-mail de confirmação: {exc}",
        ) from exc