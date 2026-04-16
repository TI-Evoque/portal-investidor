from datetime import datetime

from pydantic import BaseModel, Field


RuleMatrix = dict[str, dict[str, bool]]


class PermissionActionOut(BaseModel):
    key: str
    label: str


class PermissionModuleOut(BaseModel):
    key: str
    label: str
    description: str
    actions: list[PermissionActionOut]


class PermissionCatalogOut(BaseModel):
    modules: list[PermissionModuleOut]


class PermissionGroupBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=255)
    rules: RuleMatrix = Field(default_factory=dict)


class PermissionGroupCreate(PermissionGroupBase):
    pass


class PermissionGroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=255)
    rules: RuleMatrix | None = None


class PermissionGroupOut(PermissionGroupBase):
    id: int
    slug: str
    is_system: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {'from_attributes': True}
