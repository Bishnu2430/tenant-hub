from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
import uuid
from app.db.session import get_db
from app.core.permission_defaults import DEFAULT_PERMISSIONS
from app.core.dependencies import RequestContext, ensure_path_tenant, get_current_context, require_permission
from app.models.models import User, Role, Permission, RolePermission
from app.schemas.schemas import RoleCreate, RoleOut, PermissionCreate, PermissionOut, AssignPermissionRequest
from app.services.audit_service import write_audit_log

router = APIRouter(tags=["Roles & Permissions"])

DEFAULT_TENANT_ROLES = ("Admin", "Manager", "Member", "Viewer")


def _ensure_default_roles_for_tenant(db: Session, tenant_id: str) -> None:
    permission_index = {p.name: p for p in db.query(Permission).all()}
    for perm_name, perm_desc in DEFAULT_PERMISSIONS:
        if perm_name in permission_index:
            continue
        perm = Permission(id=str(uuid.uuid4()), name=perm_name, description=perm_desc)
        db.add(perm)
        db.flush()
        permission_index[perm_name] = perm

    read_permissions = {name for name, _ in DEFAULT_PERMISSIONS if name.endswith(":read")}
    role_permissions: dict[str, set[str]] = {
        "Admin": set(permission_index.keys()),
        "Manager": read_permissions | {"tenant:manage", "module:manage"},
        "Member": read_permissions | {"attendance:write", "leave:write", "order:write"},
        "Viewer": read_permissions,
    }

    for role_name in DEFAULT_TENANT_ROLES:
        role = (
            db.query(Role)
            .filter(Role.tenant_id == tenant_id, Role.name == role_name)
            .first()
        )
        if not role:
            role = Role(id=str(uuid.uuid4()), name=role_name, tenant_id=tenant_id)
            db.add(role)
            db.flush()
        role.is_deleted = False

        expected = role_permissions.get(role_name, set())
        existing_permission_ids = {
            rp.permission_id
            for rp in db.query(RolePermission).filter(RolePermission.role_id == role.id).all()
        }
        for permission_name in expected:
            perm = permission_index.get(permission_name)
            if not perm or perm.id in existing_permission_ids:
                continue
            db.add(
                RolePermission(
                    id=str(uuid.uuid4()),
                    role_id=role.id,
                    permission_id=perm.id,
                )
            )


# ─── Roles ────────────────────────────────────────────────────────────────────

@router.post("/roles", response_model=RoleOut, status_code=201)
def create_role(
    request: Request,
    data: RoleCreate,
    ctx: RequestContext = Depends(require_permission("role:manage")),
    db: Session = Depends(get_db),
):
    if data.tenant_id is not None:
        ensure_path_tenant(data.tenant_id, ctx)
    role = Role(id=str(uuid.uuid4()), **data.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)
    if role.tenant_id:
        write_audit_log(
            db=db,
            ctx=ctx,
            request=request,
            action="role:create",
            resource=f"role:{role.id}",
            details={"name": role.name, "tenant_id": role.tenant_id},
        )
    return role


@router.get("/roles", response_model=List[RoleOut])
def list_roles(
    tenant_id: str = None,
    ctx: RequestContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    effective_tenant_id = tenant_id or ctx.tenant_id
    ensure_path_tenant(effective_tenant_id, ctx)
    _ensure_default_roles_for_tenant(db, effective_tenant_id)
    db.commit()
    return (
        db.query(Role)
        .filter(Role.is_deleted == False, Role.tenant_id == effective_tenant_id)
        .all()
    )


@router.post("/roles/{role_id}/permissions", status_code=201)
def assign_permission(
    request: Request,
    role_id: str,
    data: AssignPermissionRequest,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(require_permission("role:manage")),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.tenant_id:
        ensure_path_tenant(role.tenant_id, ctx)
    perm = db.query(Permission).filter(Permission.id == data.permission_id).first()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")
    existing = db.query(RolePermission).filter(
        RolePermission.role_id == role_id, RolePermission.permission_id == data.permission_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Permission already assigned")
    rp = RolePermission(id=str(uuid.uuid4()), role_id=role_id, permission_id=data.permission_id)
    db.add(rp)
    db.commit()
    write_audit_log(
        db=db,
        ctx=ctx,
        request=request,
        action="role:assign-permission",
        resource=f"role:{role_id}",
        details={"permission_id": data.permission_id},
    )
    return {"message": "Permission assigned"}


@router.get("/roles/{role_id}/permissions", response_model=List[PermissionOut])
def get_role_permissions(
    role_id: str,
    ctx: RequestContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    role = db.query(Role).filter(Role.id == role_id, Role.is_deleted == False).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.tenant_id:
        ensure_path_tenant(role.tenant_id, ctx)
    rps = db.query(RolePermission).filter(RolePermission.role_id == role_id).all()
    return [rp.permission for rp in rps]


# ─── Permissions ──────────────────────────────────────────────────────────────

@router.post("/permissions", response_model=PermissionOut, status_code=201)
def create_permission(
    request: Request,
    data: PermissionCreate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require_permission("role:manage")),
):
    if db.query(Permission).filter(Permission.name == data.name).first():
        raise HTTPException(status_code=400, detail="Permission already exists")
    perm = Permission(id=str(uuid.uuid4()), **data.model_dump())
    db.add(perm)
    db.commit()
    db.refresh(perm)
    # Global permission registry: tenant_id may not apply.
    write_audit_log(
        db=db,
        ctx=_ctx,
        request=request,
        action="permission:create",
        resource=f"permission:{perm.id}",
        details={"name": perm.name},
    )
    return perm


@router.get("/permissions", response_model=List[PermissionOut])
def list_permissions(
    _ctx: RequestContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    return db.query(Permission).all()