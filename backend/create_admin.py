#!/usr/bin/env python3
"""
Script para criar ou atualizar um usuário admin no banco configurado.
Use: python create_admin.py
"""
import sys
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal, engine
from app.models.user import User
from app.db.base import Base

# Criar tabelas se não existirem
Base.metadata.create_all(bind=engine)


def create_admin():
    db: Session = SessionLocal()
    try:
        # Dados do admin (você pode alterar conforme necessário)
        admin_email = 'admin@evoque.com.br'
        admin_password = 'Admin@123456'  # Altere para uma senha segura
        admin_nome = 'Administrador'

        # Verificar se o admin já existe
        existing_admin = db.query(User).filter(User.email == admin_email.lower()).first()

        if existing_admin:
            print(f'✓ Admin já existe: {admin_email}')
            print('  Para atualizar a senha, continue...')
            # Atualizar a senha
            existing_admin.password_hash = get_password_hash(admin_password)
            existing_admin.updated_at = datetime.utcnow()
            db.commit()
            print('✓ Senha atualizada com sucesso!')
        else:
            # Criar novo admin
            admin_user = User(
                nome=admin_nome,
                email=admin_email.lower(),
                password_hash=get_password_hash(admin_password),
                role='admin',
                is_active=True,
                is_authorized=True,
                must_change_password=False,
                cpf=None,
                sobrenome=None,
                telefone=None,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(admin_user)
            db.commit()
            print(f'✓ Admin criado com sucesso!')
            print(f'  Email: {admin_email}')
            print(f'  Senha: {admin_password}')
            print('\n⚠️  IMPORTANTE: Mude a senha após o primeiro login!')

        db.refresh(existing_admin or admin_user)
        print(f'\n✓ Usuário no banco de dados:')
        user = existing_admin or admin_user
        print(f'  ID: {user.id}')
        print(f'  Email: {user.email}')
        print(f'  Nome: {user.nome}')
        print(f'  Role: {user.role}')
        print(f'  Ativo: {user.is_active}')
        print(f'  Autorizado: {user.is_authorized}')

    except Exception as e:
        print(f'✗ Erro ao criar admin: {e}')
        sys.exit(1)
    finally:
        db.close()


if __name__ == '__main__':
    print('Conectando ao banco de dados...')
    print(f'Host: {settings.DB_HOST}')
    print(f'Database: {settings.DB_NAME}')
    print(f'User: {settings.DB_USER}')
    print()

    try:
        create_admin()
        print('\n✓ Operação concluída!')
    except Exception as e:
        print(f'✗ Erro de conexão: {e}')
        sys.exit(1)
