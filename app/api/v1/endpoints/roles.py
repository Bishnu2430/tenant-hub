from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Role, Permission, RolePermission
from app.schemas.schemas import RoleCreate, RoleOut, PermissionCreate, PermissionOut, AssignPermissionRequest

router = APIRouter(tags=["Roles & Permissions"])


# ─── Roles ────────────────────────────────────────────────────────────────────

@router.post("/roles", response_model=RoleOut, status_code=201)
def create_role(data: RoleCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    role = Role(id=str(uuid.uuid4()), **data.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.get("/roles", response_model=List[RoleOut])
def list_roles(tenant_id: str = None, db: Session = Depends(get_db)):
    q = db.query(Role).filter(Role.is_deleted == False)
    if tenant_id:
        q = q.filter(Role.tenant_id == tenant_id)
    return q.all()


@router.post("/roles/{role_id}/permissions", status_code=201)
def assign_permission(
    role_id: str,
    data: AssignPermissionRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
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
    return {"message": "Permission assigned"}


@router.get("/roles/{role_id}/permissions", response_model=List[PermissionOut])
def get_role_permissions(role_id: str, db: Session = Depends(get_db)):
    rps = db.query(RolePermission).filter(RolePermission.role_id == role_id).all()
    return [rp.permission for rp in rps]


# ─── Permissions ──────────────────────────────────────────────────────────────

@router.post("/permissions", response_model=PermissionOut, status_code=201)
def create_permission(data: PermissionCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if db.query(Permission).filter(Permission.name == data.name).first():
        raise HTTPException(status_code=400, detail="Permission already exists")
    perm = Permission(id=str(uuid.uuid4()), **data.model_dump())
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm


@router.get("/permissions", response_model=List[PermissionOut])
def list_permissions(db: Session = Depends(get_db)):
    return db.query(Permission).all()