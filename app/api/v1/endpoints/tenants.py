from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from app.db.session import get_db
from app.core.dependencies import RequestContext, ensure_path_tenant, get_current_user, get_current_context, require_permission
from app.models.models import User, Tenant, UserTenant, Role
from app.schemas.schemas import TenantCreate, TenantOut, AddMemberRequest, MembershipOut

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.post("", response_model=TenantOut, status_code=201)
def create_tenant(
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
    membership = UserTenant(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        tenant_id=tenant.id,
        role_id=admin_role.id,
    )
    db.add(membership)
    db.commit()
    db.refresh(tenant)
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
    tenant_id: str,
    data: AddMemberRequest,
    ctx: RequestContext = Depends(require_permission("tenant:manage")),
    db: Session = Depends(get_db),
):
    ensure_path_tenant(tenant_id, ctx)
    # Check caller is admin of this tenant
    caller = db.query(UserTenant).join(Role).filter(
        UserTenant.user_id == ctx.user.id,
        UserTenant.tenant_id == tenant_id,
        Role.name == "Admin",
    ).first()
    if not caller:
        raise HTTPException(status_code=403, detail="Only Admin can add members")
    membership = UserTenant(
        id=str(uuid.uuid4()),
        user_id=data.user_id,
        tenant_id=tenant_id,
        role_id=data.role_id,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
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