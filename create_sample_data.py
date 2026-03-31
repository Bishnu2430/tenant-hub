#!/usr/bin/env python3
"""
Create sample data for the multi-tenant system.
Run this after the database is initialized with alembic.
"""

import sys
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.models import (
    User, Tenant, Role, Permission, RolePermission,
    UserTenant, Module, TenantModule, AuditLog,
    SubscriptionPlan, Subscription, FeatureToggle,
    TenantIndustry
)
from app.core.security import hash_password
from app.core.permission_defaults import DEFAULT_PERMISSIONS


def create_sample_data():
    """Create sample tenants, users, roles, and audit logs."""
    db = SessionLocal()
    try:
        # Skip if data already exists
        existing_users = db.query(User).filter(User.email.like("demo%")).count()
        if existing_users > 0:
            print("Sample data already exists. Skipping...")
            return

        print("Creating sample data...")

        # Create sample users
        users = []
        user_emails = [
            ("demo-admin@example.com", "Admin User", True),
            ("demo-manager@example.com", "Manager User", True),
            ("demo-member@example.com", "Member User", True),
            ("demo-viewer@example.com", "Viewer User", True),
        ]

        for email, full_name, _ in user_emails:
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                full_name=full_name,
                hashed_password=hash_password("Demo@1234"),  # Demo password
                is_active=True,
            )
            db.add(user)
            users.append(user)
        
        db.flush()

        # Create permissions
        permissions = {}
        for perm_name, perm_desc in DEFAULT_PERMISSIONS:
            perm = db.query(Permission).filter(Permission.name == perm_name).first()
            if not perm:
                perm = Permission(
                    id=str(uuid.uuid4()),
                    name=perm_name,
                    description=perm_desc
                )
                db.add(perm)
            permissions[perm_name] = perm
        
        db.flush()

        # Create sample modules
        modules_data = [
            ("Attendance", "Track attendance and leave management"),
            ("Payroll", "Manage salaries and payroll processing"),
            ("Reports", "Generate analytics and reports"),
            ("Settings", "Configure tenant settings"),
            ("Notifications", "Email and push notifications"),
        ]

        modules = []
        for name, description in modules_data:
            module = db.query(Module).filter(Module.name == name).first()
            if not module:
                module = Module(
                    id=str(uuid.uuid4()),
                    name=name,
                    description=description,
                    is_active=True
                )
                db.add(module)
            modules.append(module)
        
        db.flush()

        # Create sample tenants with different industries
        tenants_data = [
            {
                "name": "Greenfield School",
                "slug": "greenfield-school",
                "industry": TenantIndustry.school,
                "country": "India",
                "currency": "INR",
                "timezone": "Asia/Kolkata",
                "language": "en"
            },
            {
                "name": "Apollo Medical Center",
                "slug": "apollo-medical",
                "industry": TenantIndustry.hospital,
                "country": "India",
                "currency": "INR",
                "timezone": "Asia/Kolkata",
                "language": "en"
            },
            {
                "name": "TechCorp HRMS",
                "slug": "techcorp-hrms",
                "industry": TenantIndustry.hrms,
                "country": "India",
                "currency": "INR",
                "timezone": "Asia/Kolkata",
                "language": "en"
            },
            {
                "name": "SnapMart E-Commerce",
                "slug": "snapmart-ecom",
                "industry": TenantIndustry.ecommerce,
                "country": "India",
                "currency": "INR",
                "timezone": "Asia/Kolkata",
                "language": "en"
            },
        ]

        tenants = []
        for tenant_data in tenants_data:
            tenant = Tenant(id=str(uuid.uuid4()), **tenant_data)
            db.add(tenant)
            tenants.append(tenant)
        
        db.flush()

        # Create roles and assign permissions
        role_names = ["Admin", "Manager", "Member", "Viewer"]
        
        for tenant in tenants:
            tenant_roles = {}
            for role_name in role_names:
                role = Role(
                    id=str(uuid.uuid4()),
                    name=role_name,
                    tenant_id=tenant.id
                )
                db.add(role)
                db.flush()
                tenant_roles[role_name] = role

                # Assign permissions based on role
                if role_name == "Admin":
                    perms_to_assign = permissions.values()
                elif role_name == "Manager":
                    perms_to_assign = [permissions.get(p) for p in ["tenant:manage", "tenant:view"] if permissions.get(p)]
                elif role_name == "Member":
                    perms_to_assign = [permissions.get(p) for p in ["tenant:view"] if permissions.get(p)]
                else:  # Viewer
                    perms_to_assign = [permissions.get(p) for p in ["tenant:view"] if permissions.get(p)]

                for perm in perms_to_assign:
                    if perm:
                        rp = RolePermission(
                            id=str(uuid.uuid4()),
                            role_id=role.id,
                            permission_id=perm.id
                        )
                        db.add(rp)

            # Assign users to tenant with different roles
            for idx, user in enumerate(users):
                role = tenant_roles[role_names[idx % len(role_names)]]
                membership = UserTenant(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    tenant_id=tenant.id,
                    role_id=role.id,
                    is_active=True
                )
                db.add(membership)

            # Enable modules for tenant
            for module in modules:
                tm = TenantModule(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant.id,
                    module_id=module.id,
                    is_enabled=True
                )
                db.add(tm)

            # Create a subscription
            subscription = Subscription(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                plan=SubscriptionPlan.pro,
                is_active=True,
                started_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=365)
            )
            db.add(subscription)

            # Create feature toggles
            for feature_key in ["advanced_reports", "api_access", "custom_branding"]:
                toggle = FeatureToggle(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant.id,
                    feature_key=feature_key,
                    is_enabled=True
                )
                db.add(toggle)

            # Create sample audit logs
            actions = [
                ("tenant:create", f"tenant:{tenant.id}"),
                ("role:create", f"role:{list(tenant_roles.values())[0].id}"),
                ("module:enable", f"tenant:{tenant.id}"),
                ("tenant:manage", f"tenant:{tenant.id}"),
            ]

            now = datetime.utcnow()
            for idx, (action, resource) in enumerate(actions):
                audit_log = AuditLog(
                    id=str(uuid.uuid4()),
                    user_id=users[0].id if users else None,
                    tenant_id=tenant.id,
                    action=action,
                    resource=resource,
                    details='{"status": "success"}',
                    created_at=now - timedelta(hours=len(actions) - idx)
                )
                db.add(audit_log)

        db.commit()
        print("✓ Sample data created successfully!")
        print("\nDefault credentials:")
        for email, _, _ in user_emails[:1]:
            print(f"  Email: {email}")
            print(f"  Password: Demo@1234")
        print("\nSample tenants created:")
        for tenant_data in tenants_data:
            print(f"  • {tenant_data['name']} (@{tenant_data['slug']})")

    except Exception as e:
        db.rollback()
        print(f"✗ Error creating sample data: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    create_sample_data()
