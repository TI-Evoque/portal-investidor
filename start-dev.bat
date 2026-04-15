@echo off
setlocal
chcp 65001 > nul
cd /d "%~dp0"
set "ROOT=%~dp0"
title Portal do Investidor - Inicializador

echo =====================================================
echo   Portal do Investidor Evoque - Inicializador
echo =====================================================
echo.
echo Este arquivo sobe backend e frontend com um clique.
echo.
echo Backend  : http://localhost:8000
echo API Docs : http://localhost:8000/docs
echo Frontend : http://localhost:3020
echo.

if not exist "backend" (
  echo [ERRO] Pasta "backend" nao encontrada.
  pause
  exit /b 1
)

if not exist "frontend" (
  echo [ERRO] Pasta "frontend" nao encontrada.
  pause
  exit /b 1
)

where python > nul 2>&1
if errorlevel 1 (
  echo [ERRO] Python nao foi encontrado no PATH.
  echo Instale o Python e tente novamente.
  pause
  exit /b 1
)

where npm > nul 2>&1
if errorlevel 1 (
  echo [ERRO] npm nao foi encontrado no PATH.
  echo Instale o Node.js e tente novamente.
  pause
  exit /b 1
)

echo [1/4] Validando dependencias do backend...
if not exist "backend\requirements.txt" (
  echo [ERRO] Arquivo backend\requirements.txt nao encontrado.
  pause
  exit /b 1
)

if not exist "backend\.env" (
  if exist "backend\.env.example" (
    copy /y "backend\.env.example" "backend\.env" > nul
    echo Arquivo backend\.env criado a partir do modelo.
    echo.
    echo [ACAO NECESSARIA] Preencha o arquivo backend\.env com os dados do MySQL/Azure.
    echo Depois execute este .bat novamente.
    pause
    exit /b 1
  ) else (
    echo [ERRO] Arquivo backend\.env nao encontrado e nao existe backend\.env.example para servir de modelo.
    pause
    exit /b 1
  )
)

findstr /b /c:"DATABASE_URL=mysql" "backend\.env" > nul
if errorlevel 1 (
  findstr /r /c:"^DB_HOST=." "backend\.env" > nul
  if errorlevel 1 (
    echo [ACAO NECESSARIA] Configure o banco em backend\.env antes de iniciar o projeto.
    echo Preencha DATABASE_URL ou DB_HOST, DB_USER, DB_PASSWORD e DB_NAME.
    pause
    exit /b 1
  )
  findstr /r /c:"^DB_USER=." "backend\.env" > nul
  if errorlevel 1 (
    echo [ACAO NECESSARIA] Falta definir DB_USER em backend\.env.
    pause
    exit /b 1
  )
  findstr /r /c:"^DB_PASSWORD=." "backend\.env" > nul
  if errorlevel 1 (
    echo [ACAO NECESSARIA] Falta definir DB_PASSWORD em backend\.env.
    pause
    exit /b 1
  )
  findstr /r /c:"^DB_NAME=." "backend\.env" > nul
  if errorlevel 1 (
    echo [ACAO NECESSARIA] Falta definir DB_NAME em backend\.env.
    pause
    exit /b 1
  )

  findstr /b /c:"DB_PASSWORD=troque-aqui" "backend\.env" > nul
  if not errorlevel 1 (
    echo [ACAO NECESSARIA] Atualize DB_PASSWORD em backend\.env com a senha real do MySQL/Azure.
    echo O valor atual ^("troque-aqui"^) e apenas um placeholder.
    pause
    exit /b 1
  )

  findstr /b /c:"DB_PASSWORD=sua-senha-aqui" "backend\.env" > nul
  if not errorlevel 1 (
    echo [ACAO NECESSARIA] Atualize DB_PASSWORD em backend\.env com a senha real do MySQL/Azure.
    echo O valor atual ^("sua-senha-aqui"^) e apenas um placeholder.
    pause
    exit /b 1
  )
)

echo [2/4] Instalando/atualizando dependencias do backend...
pushd backend
python -m pip install -r requirements.txt
if errorlevel 1 (
  popd
  echo.
  echo [ERRO] Falha ao instalar as dependencias do backend.
  pause
  exit /b 1
)
popd

echo [3/4] Validando dependencias do frontend...
if not exist "frontend\node_modules" (
  echo node_modules nao encontrado. Instalando dependencias do frontend...
  pushd frontend
  npm install
  if errorlevel 1 (
    popd
    echo.
    echo [ERRO] Falha ao instalar as dependencias do frontend.
    pause
    exit /b 1
  )
  popd
)

echo.
echo Login padrao do admin:
echo   E-mail : admin@evoque.com.br
echo   Senha  : Evoque@2026
echo.
echo Observacao: o banco "expansao" e opcional em dev. Se nao estiver configurado,
echo o backend inicia normalmente e o dashboard usa metricas zeradas dessa integracao.
echo.

echo [4/4] Iniciando servicos...
start "Portal Backend" cmd /k "cd /d ""%ROOT%backend"" && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak > nul

start "Portal Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm run dev"

echo.
echo Pronto. O projeto foi iniciado em duas janelas separadas.
echo Acesse: http://localhost:3020
echo.
pause
