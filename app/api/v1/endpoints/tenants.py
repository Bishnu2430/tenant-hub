from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
import uuid
from app.db.session import get_db
from app.core.dependencies import RequestContext, ensure_path_tenant, get_current_user, get_current_context, require_permission
from app.models.models import Permission, RolePermission, User, Tenant, UserTenant, Role
from app.core.permission_defaults import DEFAULT_PERMISSIONS
from app.schemas.schemas import TenantCreate, TenantOut, AddMemberRequest, MembershipOut
from app.services.audit_service import write_audit_log

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.post("", response_model=TenantOut, status_code=201)
def create_tenant(
    request: Request,
    data: TenantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.query(Tenant).filter(Tenant.slug == data.slug).first():
        raise HTTPException(status_code=400, detail="Slug already taken")
    tenant = Tenant(id=str(uuid.uuid4()), **data.model_dump())
    db.add(tenant)
    # Auto-create Admin role for this tenant and assign to creator
    admin_role = Role(id=str(uuid.uuid4()), name="Admin", tenant_id=tenant.id)
    db.add(admin_role)
    db.flush()

    # Ensure default permissions exist and grant them to the Admin role.
    # (Admin is already treated as superuser, but this makes the permission model complete and
    # enables UI-friendly role/permission listings without needing to run seed.py first.)
    for perm_name, perm_desc in DEFAULT_PERMISSIONS:
        perm = db.query(Permission).filter(Permission.name == perm_name).first()
        if not perm:
            perm = Permission(id=str(uuid.uuid4()), name=perm_name, description=perm_desc)
            db.add(perm)
            db.flush()

        already_granted = db.query(RolePermission).filter(
            RolePermission.role_id == admin_role.id,
            RolePermission.permission_id == perm.id,
        ).first()
        if not already_granted:
            db.add(
                RolePermission(
                    id=str(uuid.uuid4()),
                    role_id=admin_role.id,
                    permission_id=perm.id,
                )
            )
    membership = UserTenant(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        tenant_id=tenant.id,
        role_id=admin_role.id,
    )
    db.add(membership)
    db.commit()
    db.refresh(tenant)
    # Not tenant-scoped yet, but record under the created tenant.
    audit_ctx = RequestContext(user=current_user, tenant_id=tenant.id, role=admin_role)
    write_audit_log(
        db=db,
        ctx=audit_ctx,
        request=request,
        action="tenant:create",
        resource=f"tenant:{tenant.id}",
        details={"slug": tenant.slug, "industry": str(tenant.industry)},
    )
    return tenant


@router.get("", response_model=List[TenantOut])
def list_my_tenants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memberships = db.query(UserTenant).filter(
        UserTenant.user_id == current_user.id, UserTenant.is_active == True
    ).all()
    return [m.tenant for m in memberships]


@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(
    tenant_id: str,
    ctx: RequestContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    ensure_path_tenant(tenant_id, ctx)
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.is_deleted == False).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.post("/{tenant_id}/members", response_model=MembershipOut, status_code=201)
def add_member(
    request: Request,
    tenant_id: str,
    data: AddMemberRequest,
    ctx: RequestContext = Depends(require_permission("tenant:manage")),
    db: Session = Depends(get_db),
):
    ensure_path_tenant(tenant_id, ctx)
    # Any role with tenant:manage may add members (Admin is automatically allowed).
    effective_user_id: str | None = data.user_id
    if not effective_user_id and data.user_email:
        user = (
            db.query(User)
            .filter(func.lower(User.email) == str(data.user_email).lower(), User.is_deleted == False)
            .first()
        )
        if not user or not user.is_active:
            raise HTTPException(status_code=404, detail="User not found")
        effective_user_id = user.id

    if not effective_user_id:
        raise HTTPException(status_code=400, detail="Provide user_id or user_email")

    role_id = data.role_id
    if data.role_name:
        role = (
            db.query(Role)
            .filter(Role.tenant_id == tenant_id, Role.name == data.role_name, Role.is_deleted == False)
            .first()
        )
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        role_id = role.id

    if not role_id:
        raise HTTPException(status_code=400, detail="Provide role_id or role_name")

    existing = db.query(UserTenant).filter(
        UserTenant.tenant_id == tenant_id,
        UserTenant.user_id == effective_user_id,
    ).first()

    if existing and existing.is_active:
        raise HTTPException(status_code=400, detail="User is already a member")

    if existing and not existing.is_active:
        existing.is_active = True
        existing.role_id = role_id
        membership = existing
    else:
        membership = UserTenant(
            id=str(uuid.uuid4()),
            user_id=effective_user_id,
            tenant_id=tenant_id,
            role_id=role_id,
        )
        db.add(membership)

    db.commit()
    db.refresh(membership)
    write_audit_log(
        db=db,
        ctx=ctx,
        request=request,
        action="member:add",
        resource=f"tenant:{tenant_id}",
        details={
            "user_id": membership.user_id,
            "user_email": membership.user_email,
            "role_id": membership.role_id,
            "role_name": membership.role_name,
        },
    )
    return membership


@router.get("/{tenant_id}/members", response_model=List[MembershipOut])
def list_members(
    tenant_id: str,
    ctx: RequestContext = Depends(require_permission("tenant:manage")),
    db: Session = Depends(get_db),
):
    ensure_path_tenant(tenant_id, ctx)
    return db.query(UserTenant).filter(
        UserTenant.tenant_id == tenant_id, UserTenant.is_active == True
    ).all()