#!/usr/bin/env python3
"""Create idempotent sample data for dashboard/demo usage."""

import sys
import uuid
from datetime import datetime, timedelta

from app.core.permission_defaults import DEFAULT_MODULES, DEFAULT_PERMISSIONS
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.models import (
    AuditLog,
    FeatureToggle,
    Module,
    Permission,
    Role,
    RolePermission,
    Subscription,
    SubscriptionPlan,
    Tenant,
    TenantIndustry,
    TenantModule,
    User,
    UserTenant,
)

DEMO_PASSWORD = "Demo@1234"

DEMO_USERS = [
    ("demo-admin@example.com", "Demo Admin"),
    ("demo-manager@example.com", "Demo Manager"),
    ("demo-member@example.com", "Demo Member"),
    ("demo-viewer@example.com", "Demo Viewer"),
    ("demo-ops@example.com", "Demo Ops"),
    ("demo-sales@example.com", "Demo Sales"),
    ("demo-finance@example.com", "Demo Finance"),
    ("demo-support@example.com", "Demo Support"),
]

DEMO_TENANTS = [
    {
        "name": "Greenfield School",
        "slug": "greenfield-school",
        "industry": TenantIndustry.school,
        "country": "India",
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "language": "en",
        "plan": SubscriptionPlan.enterprise,
    },
    {
        "name": "Apollo Medical Center",
        "slug": "apollo-medical",
        "industry": TenantIndustry.hospital,
        "country": "India",
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "language": "en",
        "plan": SubscriptionPlan.pro,
    },
    {
        "name": "TechCorp HRMS",
        "slug": "techcorp-hrms",
        "industry": TenantIndustry.hrms,
        "country": "India",
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "language": "en",
        "plan": SubscriptionPlan.pro,
    },
    {
        "name": "SnapMart E-Commerce",
        "slug": "snapmart-ecom",
        "industry": TenantIndustry.ecommerce,
        "country": "India",
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "language": "en",
        "plan": SubscriptionPlan.basic,
    },
]

ROLE_NAMES = ["Admin", "Manager", "Member", "Viewer"]

FEATURES_BY_INDUSTRY = {
    TenantIndustry.school: ["attendance", "results", "timetable"],
    TenantIndustry.hospital: ["appointments", "prescriptions", "patients"],
    TenantIndustry.hrms: ["employee_directory", "leave_management", "payroll"],
    TenantIndustry.ecommerce: ["catalog", "orders", "inventory"],
}


def get_or_create_user(db, email: str, full_name: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.full_name = full_name
        user.is_active = True
        user.is_deleted = False
        return user

    user = User(
        id=str(uuid.uuid4()),
        email=email,
        full_name=full_name,
        hashed_password=hash_password(DEMO_PASSWORD),
        is_active=True,
    )
    db.add(user)
    return user


def get_or_create_tenant(db, payload: dict) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.slug == payload["slug"]).first()
    fields = ["name", "industry", "country", "currency", "timezone", "language"]

    if tenant:
        for field in fields:
            setattr(tenant, field, payload[field])
        tenant.is_active = True
        tenant.is_deleted = False
        return tenant

    tenant = Tenant(
        id=str(uuid.uuid4()),
        name=payload["name"],
        slug=payload["slug"],
        industry=payload["industry"],
        country=payload["country"],
        currency=payload["currency"],
        timezone=payload["timezone"],
        language=payload["language"],
        is_active=True,
        is_deleted=False,
    )
    db.add(tenant)
    return tenant


def ensure_permissions(db) -> dict[str, Permission]:
    perms: dict[str, Permission] = {}
    for name, description in DEFAULT_PERMISSIONS:
        perm = db.query(Permission).filter(Permission.name == name).first()
        if not perm:
            perm = Permission(id=str(uuid.uuid4()), name=name, description=description)
            db.add(perm)
        else:
            perm.description = description
        perms[name] = perm
    return perms


def ensure_modules(db) -> list[Module]:
    modules: list[Module] = []
    for item in DEFAULT_MODULES:
        module = db.query(Module).filter(Module.name == item["name"]).first()
        if not module:
            module = Module(
                id=str(uuid.uuid4()),
                name=item["name"],
                description=item["description"],
                is_active=True,
            )
            db.add(module)
        else:
            module.description = item["description"]
            module.is_active = True
        modules.append(module)
    return modules


def ensure_role(db, tenant_id: str, role_name: str) -> Role:
    role = db.query(Role).filter(Role.tenant_id == tenant_id, Role.name == role_name).first()
    if role:
        role.is_deleted = False
        return role

    role = Role(id=str(uuid.uuid4()), name=role_name, tenant_id=tenant_id, is_deleted=False)
    db.add(role)
    return role


def ensure_role_permissions(db, role: Role, permissions: dict[str, Permission]) -> None:
    if role.name == "Admin":
        allowed = set(permissions.keys())
    elif role.name == "Manager":
        allowed = {name for name, _ in DEFAULT_PERMISSIONS if name.endswith(":read")}
        allowed.update({"tenant:manage", "module:manage"})
    elif role.name == "Member":
        allowed = {name for name, _ in DEFAULT_PERMISSIONS if name.endswith(":read")}
        allowed.update({"attendance:write", "leave:write", "order:write"})
    else:
        allowed = {name for name, _ in DEFAULT_PERMISSIONS if name.endswith(":read")}

    for perm_name in allowed:
        perm = permissions.get(perm_name)
        if not perm:
            continue
        existing = db.query(RolePermission).filter(
            RolePermission.role_id == role.id,
            RolePermission.permission_id == perm.id,
        ).first()
        if not existing:
            db.add(
                RolePermission(
                    id=str(uuid.uuid4()),
                    role_id=role.id,
                    permission_id=perm.id,
                )
            )


def ensure_membership(db, user: User, tenant: Tenant, role: Role) -> None:
    membership = db.query(UserTenant).filter(
        UserTenant.user_id == user.id,
        UserTenant.tenant_id == tenant.id,
    ).first()
    if membership:
        membership.role_id = role.id
        membership.is_active = True
        return

    db.add(
        UserTenant(
            id=str(uuid.uuid4()),
            user_id=user.id,
            tenant_id=tenant.id,
            role_id=role.id,
            is_active=True,
        )
    )


def ensure_tenant_modules(db, tenant: Tenant, modules: list[Module]) -> None:
    for module in modules:
        tenant_module = db.query(TenantModule).filter(
            TenantModule.tenant_id == tenant.id,
            TenantModule.module_id == module.id,
        ).first()
        if tenant_module:
            tenant_module.is_enabled = True
        else:
            db.add(
                TenantModule(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant.id,
                    module_id=module.id,
                    is_enabled=True,
                )
            )


def ensure_subscription(db, tenant: Tenant, plan: SubscriptionPlan) -> None:
    active_sub = db.query(Subscription).filter(
        Subscription.tenant_id == tenant.id,
        Subscription.is_active == True,
    ).first()

    if active_sub:
        active_sub.plan = plan
        active_sub.started_at = active_sub.started_at or datetime.utcnow()
        active_sub.expires_at = datetime.utcnow() + timedelta(days=365)
        return

    db.add(
        Subscription(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            plan=plan,
            is_active=True,
            started_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=365),
        )
    )


def ensure_features(db, tenant: Tenant) -> None:
    keys = FEATURES_BY_INDUSTRY.get(tenant.industry, [])
    for key in keys:
        feature = db.query(FeatureToggle).filter(
            FeatureToggle.tenant_id == tenant.id,
            FeatureToggle.feature_key == key,
        ).first()
        if feature:
            feature.is_enabled = True
        else:
            db.add(
                FeatureToggle(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant.id,
                    feature_key=key,
                    is_enabled=True,
                )
            )


def ensure_audit_logs(db, tenant: Tenant, user: User) -> None:
    actions = [
        ("tenant:create", f"tenant:{tenant.id}", '{"status":"ok","source":"seed"}'),
        ("member:add", f"tenant:{tenant.id}", '{"count":8,"source":"seed"}'),
        ("module:enable", f"tenant:{tenant.id}", '{"all":true,"source":"seed"}'),
        ("subscription:set", f"tenant:{tenant.id}", '{"status":"active","source":"seed"}'),
        ("feature:set", f"tenant:{tenant.id}", '{"industry_specific":true,"source":"seed"}'),
    ]

    now = datetime.utcnow()
    for idx, (action, resource, details) in enumerate(actions):
        exists = db.query(AuditLog).filter(
            AuditLog.tenant_id == tenant.id,
            AuditLog.action == action,
            AuditLog.resource == resource,
            AuditLog.details == details,
        ).first()
        if exists:
            continue

        db.add(
            AuditLog(
                id=str(uuid.uuid4()),
                user_id=user.id,
                tenant_id=tenant.id,
                action=action,
                resource=resource,
                details=details,
                ip_address="127.0.0.1",
                created_at=now - timedelta(minutes=(len(actions) - idx) * 7),
            )
        )


def create_sample_data() -> None:
    db = SessionLocal()
    try:
        print("Seeding demo data...")

        permissions = ensure_permissions(db)
        modules = ensure_modules(db)

        users = [get_or_create_user(db, email, full_name) for email, full_name in DEMO_USERS]
        db.flush()

        tenants: list[Tenant] = []
        for payload in DEMO_TENANTS:
            tenant = get_or_create_tenant(db, payload)
            tenants.append(tenant)

        db.flush()

        for tenant in tenants:
            roles = {name: ensure_role(db, tenant.id, name) for name in ROLE_NAMES}
            db.flush()

            for role in roles.values():
                ensure_role_permissions(db, role, permissions)

            for index, user in enumerate(users):
                role = roles[ROLE_NAMES[index % len(ROLE_NAMES)]]
                ensure_membership(db, user, tenant, role)

            ensure_tenant_modules(db, tenant, modules)
            plan = next(item["plan"] for item in DEMO_TENANTS if item["slug"] == tenant.slug)
            ensure_subscription(db, tenant, plan)
            ensure_features(db, tenant)
            ensure_audit_logs(db, tenant, users[0])

        db.commit()

        print("Demo data seed complete.")
        print("Login with:")
        print("  email: demo-admin@example.com")
        print(f"  password: {DEMO_PASSWORD}")
        print("Tenants available:")
        for tenant in tenants:
            print(f"  - {tenant.name} ({tenant.slug})")

    except Exception as exc:
        db.rollback()
        print(f"Failed to seed demo data: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    create_sample_data()
