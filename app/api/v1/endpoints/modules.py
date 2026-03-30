from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime
from app.db.session import get_db
from app.core.dependencies import RequestContext, ensure_path_tenant, get_current_context, require_permission
from app.models.models import User, Module, TenantModule, Subscription, FeatureToggle, Tenant
from app.schemas.schemas import (
    ModuleCreate, ModuleOut, EnableModuleRequest,
    SubscriptionCreate, SubscriptionOut,
    FeatureToggleCreate, FeatureToggleOut,
)
from app.services.audit_service import write_audit_log

router = APIRouter(tags=["Modules & Subscriptions"])


# ─── Modules (global) ─────────────────────────────────────────────────────────

@router.post("/modules", response_model=ModuleOut, status_code=201)
def create_module(
    request: Request,
    data: ModuleCreate,
    db: Session = Depends(get_db),
    _ctx: RequestContext = Depends(require_permission("module:manage")),
):
    m = Module(id=str(uuid.uuid4()), **data.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    write_audit_log(
        db=db,
        ctx=_ctx,
        request=request,
        action="module:create",
        resource=f"module:{m.id}",
        details={"name": m.name},
    )
    return m


@router.get("/modules", response_model=List[ModuleOut])
def list_modules(db: Session = Depends(get_db)):
    return db.query(Module).filter(Module.is_active == True).all()


# ─── Tenant Modules ───────────────────────────────────────────────────────────

@router.post("/tenants/{tenant_id}/modules", status_code=201)
def enable_module(
    request: Request,
    tenant_id: str,
    data: EnableModuleRequest,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(require_permission("module:manage")),
):
    ensure_path_tenant(tenant_id, ctx)
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    module = db.query(Module).filter(Module.id == data.module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    existing = db.query(TenantModule).filter(
        TenantModule.tenant_id == tenant_id, TenantModule.module_id == data.module_id
    ).first()
    if existing:
        existing.is_enabled = True
        db.commit()
        write_audit_log(
            db=db,
            ctx=ctx,
            request=request,
            action="module:enable",
            resource=f"tenant:{tenant_id}",
            details={"module_id": data.module_id, "re_enabled": True},
        )
        return {"message": "Module re-enabled"}
    tm = TenantModule(id=str(uuid.uuid4()), tenant_id=tenant_id, module_id=data.module_id)
    db.add(tm)
    db.commit()
    write_audit_log(
        db=db,
        ctx=ctx,
        request=request,
        action="module:enable",
        resource=f"tenant:{tenant_id}",
        details={"module_id": data.module_id, "re_enabled": False},
    )
    return {"message": "Module enabled for tenant"}


@router.get("/tenants/{tenant_id}/modules", response_model=List[ModuleOut])
def get_tenant_modules(
    tenant_id: str,
    ctx: RequestContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    ensure_path_tenant(tenant_id, ctx)
    tms = db.query(TenantModule).filter(
        TenantModule.tenant_id == tenant_id, TenantModule.is_enabled == True
    ).all()
    return [tm.module for tm in tms]


# ─── Subscriptions ────────────────────────────────────────────────────────────

@router.post("/tenants/{tenant_id}/subscriptions", response_model=SubscriptionOut, status_code=201)
def create_subscription(
    request: Request,
    tenant_id: str,
    data: SubscriptionCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(require_permission("tenant:manage")),
):
    ensure_path_tenant(tenant_id, ctx)
    # Deactivate old subscriptions
    db.query(Subscription).filter(Subscription.tenant_id == tenant_id).update({"is_active": False})
    sub = Subscription(id=str(uuid.uuid4()), tenant_id=tenant_id, **data.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    write_audit_log(
        db=db,
        ctx=ctx,
        request=request,
        action="subscription:set",
        resource=f"tenant:{tenant_id}",
        details={"plan": str(sub.plan), "expires_at": str(sub.expires_at) if sub.expires_at else None},
    )
    return sub


@router.get("/tenants/{tenant_id}/subscriptions", response_model=List[SubscriptionOut])
def get_subscriptions(
    tenant_id: str,
    ctx: RequestContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    ensure_path_tenant(tenant_id, ctx)
    return db.query(Subscription).filter(Subscription.tenant_id == tenant_id).all()


# ─── Feature Toggles ──────────────────────────────────────────────────────────

@router.post("/tenants/{tenant_id}/features", response_model=FeatureToggleOut, status_code=201)
def set_feature(
    request: Request,
    tenant_id: str,
    data: FeatureToggleCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(require_permission("tenant:manage")),
):
    ensure_path_tenant(tenant_id, ctx)
    existing = db.query(FeatureToggle).filter(
        FeatureToggle.tenant_id == tenant_id,
        FeatureToggle.feature_key == data.feature_key,
    ).first()
    if existing:
        existing.is_enabled = data.is_enabled
        db.commit()
        db.refresh(existing)
        write_audit_log(
            db=db,
            ctx=ctx,
            request=request,
            action="feature:set",
            resource=f"tenant:{tenant_id}",
            details={"feature_key": existing.feature_key, "is_enabled": existing.is_enabled},
        )
        return existing
    ft = FeatureToggle(id=str(uuid.uuid4()), tenant_id=tenant_id, **data.model_dump())
    db.add(ft)
    db.commit()
    db.refresh(ft)
    write_audit_log(
        db=db,
        ctx=ctx,
        request=request,
        action="feature:set",
        resource=f"tenant:{tenant_id}",
        details={"feature_key": ft.feature_key, "is_enabled": ft.is_enabled},
    )
    return ft


@router.get("/tenants/{tenant_id}/features", response_model=List[FeatureToggleOut])
def list_features(
    tenant_id: str,
    ctx: RequestContext = Depends(get_current_context),
    db: Session = Depends(get_db),
):
    ensure_path_tenant(tenant_id, ctx)
    return db.query(FeatureToggle).filter(FeatureToggle.tenant_id == tenant_id).all()