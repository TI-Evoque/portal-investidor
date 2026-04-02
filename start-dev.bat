@echo off
chcp 65001 > nul
echo =====================================================
echo   Portal do Investidor Evoque - Desenvolvimento
echo =====================================================
echo.
echo IMPORTANTE: O frontend se conecta ao backend via proxy
echo local (sem depender de IP de rede). Funciona em qualquer
echo maquina sem precisar mudar .env.
echo.
echo Backend  : http://localhost:8000
echo API Docs : http://localhost:8000/docs
echo Frontend : http://localhost:3020
echo.
echo Login padrao do admin:
echo   E-mail : admin@evoque.com.br
echo   Senha  : Evoque@2026
echo.

REM Instala/atualiza dependencias do backend
echo [0/2] Instalando dependencias do backend...
cd backend
pip install -r requirements.txt --quiet
cd ..

REM Inicia o Backend
echo [1/2] Iniciando Backend na porta 8000...
start cmd /k "cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak > nul

REM Inicia o Frontend
echo [2/2] Iniciando Frontend na porta 3020...
start cmd /k "cd frontend && npm run dev"

echo.
echo Pronto! Acesse http://localhost:3020
echo.
pause
