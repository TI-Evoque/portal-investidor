#!/bin/bash
set -e

APP_ROOT=${APP_ROOT:-/opt/portal-investidor/portal-investidor}
BACKEND_DIR=$APP_ROOT/backend
FRONTEND_DIR=$APP_ROOT/frontend
SERVER_NAME=${SERVER_NAME:-147.93.70.206}

echo "==> Atualizando pacotes"
apt update

echo "==> Instalando dependencias do servidor"
apt install -y python3 python3-venv python3-pip nodejs npm nginx

echo "==> Preparando backend"
cd $BACKEND_DIR
python3 -m venv .venv || true
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Preparando frontend"
cat > $FRONTEND_DIR/.env.production <<'EOF'
VITE_API_URL=/api/v1
EOF

cd $FRONTEND_DIR
npm install
npm run build

echo "==> Instalando service do backend"
cat > /etc/systemd/system/portal-backend.service <<'EOF'
[Unit]
Description=Portal Investidor Backend
After=network.target

[Service]
User=root
WorkingDirectory=__BACKEND_DIR__
EnvironmentFile=__BACKEND_DIR__/.env
ExecStart=__BACKEND_DIR__/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sed -i "s#__BACKEND_DIR__#$BACKEND_DIR#g" /etc/systemd/system/portal-backend.service

echo "==> Instalando Nginx"
cat > /etc/nginx/sites-available/portal-investidor <<'EOF'
server {
    listen 80;
    server_name __SERVER_NAME__;

    root __FRONTEND_DIR__/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sed -i "s#__SERVER_NAME__#$SERVER_NAME#g" /etc/nginx/sites-available/portal-investidor
sed -i "s#__FRONTEND_DIR__#$FRONTEND_DIR#g" /etc/nginx/sites-available/portal-investidor

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/portal-investidor /etc/nginx/sites-enabled/portal-investidor

echo "==> Subindo servicos"
systemctl daemon-reload
systemctl enable portal-backend
systemctl restart portal-backend

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "==> Deploy concluido"
echo "Backend: http://$SERVER_NAME/api/v1/docs"
echo "Frontend: http://$SERVER_NAME"
