from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    nome: str = Field(min_length=3, max_length=150)
    cpf: str = Field(min_length=11, max_length=14)
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=6, max_length=64)
    new_password: str = Field(min_length=8, max_length=64)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    must_change_password: bool = False
    user: dict


class ForgotPasswordRequest(BaseModel):
    email_or_cpf: str = Field(min_length=3, max_length=255)


class ResetPasswordWithCodeRequest(BaseModel):
    email_or_cpf: str = Field(min_length=3, max_length=255)
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=64)
