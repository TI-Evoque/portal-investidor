#!/usr/bin/env python3
"""
Script para criar um usuário administrador no banco de dados.
Uso: python create_admin.py
"""

import os
import sys
from pathlib import Path

# Adiciona o diretório backend ao path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

from app.db.session import SessionLocal
from app.db.init_db import init_db
from app.models.user import User
from app.core.security import get_password_hash
from app.utils.validators import normalize_cpf
from sqlalchemy import or_


def generate_placeholder_cpf(db):
    """Gera um CPF placeholder único para admins criados sem CPF informado."""
    base = 90000000000
    while True:
        candidate = str(base)
        exists = db.query(User).filter(User.cpf == candidate).first()
        if not exists:
            return candidate
        base += 1


def create_admin():
    """Cria ou atualiza um usuário administrador interativamente."""
    # Inicializa o banco de dados (cria tabelas se não existirem)
    print("Inicializando banco de dados...")
    try:
        init_db()
    except Exception as e:
        print(f"❌ Erro ao inicializar banco de dados: {e}")
        return False

    print("\n" + "=" * 50)
    print("CRIAR USUÁRIO ADMINISTRADOR")
    print("=" * 50 + "\n")

    # Coleta informações do usuário
    nome = input("Nome completo do admin: ").strip()
    if not nome:
        print("❌ Nome não pode ser vazio!")
        return False

    email = input("Email do admin: ").strip().lower()
    if not email or "@" not in email:
        print("❌ Email inválido!")
        return False

    cpf_input = input("CPF do admin (opcional, pressione Enter para pular): ").strip()
    cpf = normalize_cpf(cpf_input) if cpf_input else None

    while True:
        password = input("Senha do admin (mínimo 8 caracteres): ").strip()
        if len(password) < 8:
            print("❌ Senha deve ter no mínimo 8 caracteres!")
            continue

        password_confirm = input("Confirme a senha: ").strip()
        if password != password_confirm:
            print("❌ Senhas não conferem!")
            continue

        break

    # Conecta ao banco de dados
    db = SessionLocal()
    try:
        # Se o email já existir, atualiza o registro para admin em vez de falhar.
        existing_by_email = db.query(User).filter(User.email == email).first()
        if existing_by_email:
            if cpf:
                cpf_owner = db.query(User).filter(User.cpf == cpf, User.id != existing_by_email.id).first()
                if cpf_owner:
                    print(f"❌ O CPF '{cpf}' já está vinculado a outro usuário.")
                    return False
                existing_by_email.cpf = cpf
            elif not existing_by_email.cpf:
                existing_by_email.cpf = generate_placeholder_cpf(db)

            existing_by_email.nome = nome
            existing_by_email.password_hash = get_password_hash(password)
            existing_by_email.role = 'admin'
            existing_by_email.is_active = True
            existing_by_email.is_authorized = True
            db.commit()
            db.refresh(existing_by_email)

            print("\n" + "=" * 50)
            print("✅ ADMIN ATUALIZADO COM SUCESSO!")
            print("=" * 50)
            print(f"Email: {existing_by_email.email}")
            print(f"Nome: {existing_by_email.nome}")
            print(f"CPF: {existing_by_email.cpf}")
            print("=" * 50 + "\n")
            return True

        # Se o CPF existir em outro usuário, evita conflito de unicidade.
        if cpf:
            existing_by_cpf = db.query(User).filter(User.cpf == cpf).first()
            if existing_by_cpf:
                print(f"❌ Já existe outro usuário com o CPF '{cpf}'.")
                return False
        else:
            cpf = generate_placeholder_cpf(db)

        # Cria o admin
        admin = User(
            nome=nome,
            cpf=cpf,
            email=email,
            password_hash=get_password_hash(password),
            role='admin',
            is_active=True,
            is_authorized=True,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("\n" + "=" * 50)
        print("✅ ADMIN CRIADO COM SUCESSO!")
        print("=" * 50)
        print(f"Email: {admin.email}")
        print(f"Nome: {admin.nome}")
        print(f"CPF: {admin.cpf}")
        print("=" * 50 + "\n")

        return True

    except Exception as e:
        db.rollback()
        print(f"\n❌ Erro ao criar admin: {e}\n")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    try:
        success = create_admin()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n❌ Operação cancelada pelo usuário.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro inesperado: {e}\n")
        sys.exit(1)
