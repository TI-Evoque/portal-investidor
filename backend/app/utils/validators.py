import re
from fastapi import HTTPException, status


def normalize_cpf(value: str) -> str:
    digits = re.sub(r'\D', '', value)
    if len(digits) != 11:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='CPF inválido')
    return digits


def validate_password_strength(password: str) -> None:
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(not c.isalnum() for c in password)
    if len(password) < 8 or not all([has_upper, has_lower, has_digit, has_special]):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='A senha deve ter 8+ caracteres, maiúscula, minúscula, número e símbolo.',
        )
