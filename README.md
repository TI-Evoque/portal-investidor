# Portal do Investidor Evoque

Projeto do portal do investidor com:

- **Frontend React + Vite** na porta **3020**
- **Backend FastAPI** na porta **8000**
- **MySQL Azure** como banco principal
- área **admin** e área **investidor**
- autenticação JWT, CORS configurável, upload seguro de PDF e autorização por perfil/unidade

## Estrutura

```bash
portalinvestidor-main/
  backend/
  frontend/
  README.md
```

## Banco de dados

Este projeto agora está preparado para usar o **Azure Database for MySQL** com as tabelas:

- `users`
- `units`
- `user_units`
- `files`
- `file_units`

Se o seu banco Azure já foi criado com o script SQL oficial, o backend vai apenas se conectar e usar a estrutura existente.

## Backend

### Instalação

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
# ou .venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Variáveis de ambiente principais

```env
DB_HOST=evoque-database.mysql.database.azure.com
DB_USER=infra
DB_PASSWORD=sua-senha
DB_NAME=portal-investidor
DB_PORT=3306
DB_SSL_ENABLED=true
```

### Observação importante

No Azure MySQL, o ideal é executar primeiro o script SQL de criação das tabelas. Depois disso, suba o backend.

## Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Fluxo já implementado

- cadastro de investidor pendente de aprovação
- login com JWT
- CRUD de unidades
- listagem e edição de usuários
- gerenciamento de permissões por unidade
- upload de PDFs vinculado a unidades
- listagem de arquivos com permissão por unidade
- dashboard com resumo de uploads, unidades e usuários
- página do investidor com unidades e arquivos liberados

## Observações

- Os uploads continuam sendo salvos em disco no servidor e apenas os metadados/permissões vão para o MySQL.
- O backend não injeta mais um admin artificial `admin@evoque.local`; ele respeita a base existente do Azure.
- Se o banco estiver vazio, o SQLAlchemy ainda consegue criar as tabelas mapeadas para facilitar a primeira subida.


## Esqueci minha senha

O fluxo de redefinição usa a tabela `password_reset_codes`.
Se o banco Azure já existia antes desta versão, execute o arquivo `backend/create_password_reset_codes_table.sql` uma vez no MySQL para criar a tabela manualmente.
