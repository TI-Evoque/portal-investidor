from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserOut(BaseModel):
    id: int
    nome: str
    sobrenome: str | None = None
    cpf: str | None = None
    email: str
    telefone: str | None = None
    role: str
    permission_group_id: int | None = None
    permission_group_name: str | None = None
    is_active: bool
    is_authorized: bool
    must_change_password: bool = False
    last_seen_at: datetime | None = None
    is_online: bool = False
    created_at: datetime
    updated_at: datetime | None = None
    unit_ids: list[int] = Field(default_factory=list)

    model_config = {'from_attributes': True}


class UserUpdateRequest(BaseModel):
    nome: str | None = None
    sobrenome: str | None = None
    email: EmailStr | None = None
    cpf: str | None = None
    telefone: str | None = None
    is_active: bool | None = None
    is_authorized: bool | None = None
    role: str | None = None
    permission_group_id: int | None = None
    must_change_password: bool | None = None
    unit_ids: list[int] | None = None


class UserUnitsUpdateRequest(BaseModel):
    unit_ids: list[int] = Field(default_factory=list)


class AdminMessageRequest(BaseModel):
    message: str = Field(min_length=3, max_length=1000)


class AdminCreateUserRequest(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    sobrenome: str = Field(min_length=1, max_length=150)
    cpf: str = Field(min_length=11, max_length=14)
    email: EmailStr
    telefone: str = Field(min_length=8, max_length=30)
    must_change_password: bool = True
    role: str = 'investor'
    permission_group_id: int | None = None
    is_authorized: bool = True
    unit_ids: list[int] = Field(default_factory=list)


class AdminCreateUserResponse(BaseModel):
    message: str
    generated_password: str
    user: UserOut
