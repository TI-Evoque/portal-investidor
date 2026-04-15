#!/bin/bash
set -e

APP_ROOT=/root/portal-investidor-main
BACKEND_DIR=$APP_ROOT/backend
FRONTEND_DIR=$APP_ROOT/frontend

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
WorkingDirectory=/root/portal-investidor-main/backend
EnvironmentFile=/root/portal-investidor-main/backend/.env
ExecStart=/root/portal-investidor-main/backend/.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "==> Instalando Nginx"
cat > /etc/nginx/sites-available/portal-investidor <<'EOF'
server {
    listen 80;
    server_name 147.93.70.206;

    root /root/portal-investidor-main/frontend/dist;
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

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/portal-investidor /etc/nginx/sites-enabled/portal-investidor

echo "==> Ajustando frontend para proxy Nginx"
cat > $FRONTEND_DIR/.env.production <<'EOF'
VITE_API_URL=/api/v1
EOF

cd $FRONTEND_DIR
npm run build

echo "==> Subindo servicos"
systemctl daemon-reload
systemctl enable portal-backend
systemctl restart portal-backend

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "==> Deploy concluido"
echo "Backend: http://147.93.70.206/api/v1/docs"
echo "Frontend: http://147.93.70.206"
