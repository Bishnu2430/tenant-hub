import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey,
    Text, Integer, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base
import enum


def gen_uuid():
    return str(uuid.uuid4())


# ─── Enums ────────────────────────────────────────────────────────────────────

class SubscriptionPlan(str, enum.Enum):
    basic = "basic"
    pro = "pro"
    enterprise = "enterprise"

class TenantIndustry(str, enum.Enum):
    school = "school"
    hospital = "hospital"
    hrms = "hrms"
    ecommerce = "ecommerce"


# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    token_version = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    memberships = relationship("UserTenant", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")


# ─── Tenant ───────────────────────────────────────────────────────────────────

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    industry = Column(SAEnum(TenantIndustry), nullable=False)
    country = Column(String, default="India")
    currency = Column(String, default="INR")
    timezone = Column(String, default="Asia/Kolkata")
    language = Column(String, default="en")
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    memberships = relationship("UserTenant", back_populates="tenant")
    modules = relationship("TenantModule", back_populates="tenant")
    subscriptions = relationship("Subscription", back_populates="tenant")
    feature_toggles = relationship("FeatureToggle", back_populates="tenant")


# ─── Role ─────────────────────────────────────────────────────────────────────

class Role(Base):
    __tablename__ = "roles"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True)  # null = global role
    is_deleted = Column(Boolean, default=False)

    permissions = relationship("RolePermission", back_populates="role")
    memberships = relationship("UserTenant", back_populates="role")


# ─── Permission ───────────────────────────────────────────────────────────────

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, nullable=False)   # e.g. "attendance:write"
    description = Column(String, nullable=True)

    role_permissions = relationship("RolePermission", back_populates="permission")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(String, primary_key=True, default=gen_uuid)
    role_id = Column(String, ForeignKey("roles.id"), nullable=False)
    permission_id = Column(String, ForeignKey("permissions.id"), nullable=False)

    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="role_permissions")


# ─── UserTenant (Membership) ──────────────────────────────────────────────────

class UserTenant(Base):
    __tablename__ = "user_tenants"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    role_id = Column(String, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="memberships")
    tenant = relationship("Tenant", back_populates="memberships")
    role = relationship("Role", back_populates="memberships")

    @property
    def role_name(self) -> str | None:
        return self.role.name if self.role else None


# ─── Module ───────────────────────────────────────────────────────────────────

class Module(Base):
    __tablename__ = "modules"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, nullable=False)   # e.g. "school", "hrms"
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    tenant_modules = relationship("TenantModule", back_populates="module")


class TenantModule(Base):
    __tablename__ = "tenant_modules"

    id = Column(String, primary_key=True, default=gen_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    module_id = Column(String, ForeignKey("modules.id"), nullable=False)
    is_enabled = Column(Boolean, default=True)
    enabled_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="modules")
    module = relationship("Module", back_populates="tenant_modules")


# ─── Subscription ─────────────────────────────────────────────────────────────

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, default=gen_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    plan = Column(SAEnum(SubscriptionPlan), default=SubscriptionPlan.basic)
    is_active = Column(Boolean, default=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    tenant = relationship("Tenant", back_populates="subscriptions")


# ─── FeatureToggle ────────────────────────────────────────────────────────────

class FeatureToggle(Base):
    __tablename__ = "feature_toggles"

    id = Column(String, primary_key=True, default=gen_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    feature_key = Column(String, nullable=False)   # e.g. "attendance", "exams"
    is_enabled = Column(Boolean, default=True)

    tenant = relationship("Tenant", back_populates="feature_toggles")


# ─── AuditLog ─────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    tenant_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    resource = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")