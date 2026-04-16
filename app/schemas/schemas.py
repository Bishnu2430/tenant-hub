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


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8)
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str

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
    user_id: Optional[str] = None
    user_email: Optional[EmailStr] = None
    role_id: Optional[str] = None
    role_name: Optional[str] = None

class MembershipOut(BaseModel):
    id: str
    user_id: str
    user_email: Optional[str] = None
    user_full_name: Optional[str] = None
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


# ─── ERP ──────────────────────────────────────────────────────────────────────

class ERPRecordCreate(BaseModel):
    entity_name: str
    title: str
    status: Optional[str] = "draft"
    priority: Optional[str] = "normal"
    amount_cents: Optional[int] = None
    due_at: Optional[datetime] = None
    payload: Optional[dict] = None
    assigned_to_user_id: Optional[str] = None
    linked_record_id: Optional[str] = None


class ERPRecordUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    amount_cents: Optional[int] = None
    due_at: Optional[datetime] = None
    payload: Optional[dict] = None
    assigned_to_user_id: Optional[str] = None
    blocked_reason: Optional[str] = None
    linked_record_id: Optional[str] = None


class ERPRecordTransitionRequest(BaseModel):
    to_status: str
    note: Optional[str] = None


class ERPRecordOut(BaseModel):
    id: str
    tenant_id: str
    module_name: str
    entity_name: str
    title: str
    status: str
    priority: str
    assigned_to_user_id: Optional[str]
    linked_record_id: Optional[str]
    linked_record_title: Optional[str]
    amount_cents: Optional[int]
    owner_user_id: Optional[str]
    due_at: Optional[datetime]
    blocked_at: Optional[datetime]
    blocked_reason: Optional[str]
    payload_json: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ERPModuleSummary(BaseModel):
    module_name: str
    total_records: int
    open_records: int
    done_records: int
    blocked_records: int
    overdue_records: int
    total_amount_cents: int
    entities: List[str]


class ERPDashboardSummary(BaseModel):
    tenant_id: str
    total_records: int
    open_records: int
    done_records: int
    blocked_records: int
    overdue_records: int
    total_amount_cents: int
    modules: List[ERPModuleSummary]


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