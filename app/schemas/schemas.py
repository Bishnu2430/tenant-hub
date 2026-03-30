from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.models import SubscriptionPlan, TenantIndustry


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class SwitchContextRequest(BaseModel):
    tenant_id: str

class SwitchContextResponse(BaseModel):
    access_token: str
    tenant_id: str
    role: str
    token_type: str = "bearer"


# ─── User ─────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Tenant ───────────────────────────────────────────────────────────────────

class TenantCreate(BaseModel):
    name: str
    slug: str
    industry: TenantIndustry
    country: Optional[str] = "India"
    currency: Optional[str] = "INR"
    timezone: Optional[str] = "Asia/Kolkata"
    language: Optional[str] = "en"

class TenantOut(BaseModel):
    id: str
    name: str
    slug: str
    industry: TenantIndustry
    country: str
    currency: str
    timezone: str
    language: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Role & Permission ────────────────────────────────────────────────────────

class RoleCreate(BaseModel):
    name: str
    tenant_id: Optional[str] = None

class RoleOut(BaseModel):
    id: str
    name: str
    tenant_id: Optional[str]

    class Config:
        from_attributes = True

class PermissionCreate(BaseModel):
    name: str
    description: Optional[str] = None

class PermissionOut(BaseModel):
    id: str
    name: str
    description: Optional[str]

    class Config:
        from_attributes = True

class AssignPermissionRequest(BaseModel):
    permission_id: str


# ─── Membership ───────────────────────────────────────────────────────────────

class AddMemberRequest(BaseModel):
    user_id: str
    role_id: Optional[str] = None
    role_name: Optional[str] = None

class MembershipOut(BaseModel):
    id: str
    user_id: str
    tenant_id: str
    role_id: str
    role_name: Optional[str] = None
    is_active: bool
    joined_at: datetime

    class Config:
        from_attributes = True


# ─── Module ───────────────────────────────────────────────────────────────────

class ModuleCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ModuleOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

class EnableModuleRequest(BaseModel):
    module_id: str


# ─── Subscription ─────────────────────────────────────────────────────────────

class SubscriptionCreate(BaseModel):
    plan: SubscriptionPlan
    expires_at: Optional[datetime] = None

class SubscriptionOut(BaseModel):
    id: str
    tenant_id: str
    plan: SubscriptionPlan
    is_active: bool
    started_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Feature Toggle ───────────────────────────────────────────────────────────

class FeatureToggleCreate(BaseModel):
    feature_key: str
    is_enabled: bool = True

class FeatureToggleOut(BaseModel):
    id: str
    tenant_id: str
    feature_key: str
    is_enabled: bool

    class Config:
        from_attributes = True


# ─── Audit Log ────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: str
    user_id: Optional[str]
    tenant_id: Optional[str]
    action: str
    resource: Optional[str]
    details: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True