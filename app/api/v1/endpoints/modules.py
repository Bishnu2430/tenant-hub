from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Module, TenantModule, Subscription, FeatureToggle, Tenant
from app.schemas.schemas import (
    ModuleCreate, ModuleOut, EnableModuleRequest,
    SubscriptionCreate, SubscriptionOut,
    FeatureToggleCreate, FeatureToggleOut,
)

router = APIRouter(tags=["Modules & Subscriptions"])


# ─── Modules (global) ─────────────────────────────────────────────────────────

@router.post("/modules", response_model=ModuleOut, status_code=201)
def create_module(data: ModuleCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    m = Module(id=str(uuid.uuid4()), **data.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.get("/modules", response_model=List[ModuleOut])
def list_modules(db: Session = Depends(get_db)):
    return db.query(Module).filter(Module.is_active == True).all()


# ─── Tenant Modules ───────────────────────────────────────────────────────────

@router.post("/tenants/{tenant_id}/modules", status_code=201)
def enable_module(
    tenant_id: str,
    data: EnableModuleRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
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
        return {"message": "Module re-enabled"}
    tm = TenantModule(id=str(uuid.uuid4()), tenant_id=tenant_id, module_id=data.module_id)
    db.add(tm)
    db.commit()
    return {"message": "Module enabled for tenant"}


@router.get("/tenants/{tenant_id}/modules", response_model=List[ModuleOut])
def get_tenant_modules(tenant_id: str, db: Session = Depends(get_db)):
    tms = db.query(TenantModule).filter(
        TenantModule.tenant_id == tenant_id, TenantModule.is_enabled == True
    ).all()
    return [tm.module for tm in tms]


# ─── Subscriptions ────────────────────────────────────────────────────────────

@router.post("/tenants/{tenant_id}/subscriptions", response_model=SubscriptionOut, status_code=201)
def create_subscription(
    tenant_id: str,
    data: SubscriptionCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    # Deactivate old subscriptions
    db.query(Subscription).filter(Subscription.tenant_id == tenant_id).update({"is_active": False})
    sub = Subscription(id=str(uuid.uuid4()), tenant_id=tenant_id, **data.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/tenants/{tenant_id}/subscriptions", response_model=List[SubscriptionOut])
def get_subscriptions(tenant_id: str, db: Session = Depends(get_db)):
    return db.query(Subscription).filter(Subscription.tenant_id == tenant_id).all()


# ─── Feature Toggles ──────────────────────────────────────────────────────────

@router.post("/tenants/{tenant_id}/features", response_model=FeatureToggleOut, status_code=201)
def set_feature(
    tenant_id: str,
    data: FeatureToggleCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    existing = db.query(FeatureToggle).filter(
        FeatureToggle.tenant_id == tenant_id,
        FeatureToggle.feature_key == data.feature_key,
    ).first()
    if existing:
        existing.is_enabled = data.is_enabled
        db.commit()
        db.refresh(existing)
        return existing
    ft = FeatureToggle(id=str(uuid.uuid4()), tenant_id=tenant_id, **data.model_dump())
    db.add(ft)
    db.commit()
    db.refresh(ft)
    return ft


@router.get("/tenants/{tenant_id}/features", response_model=List[FeatureToggleOut])
def list_features(tenant_id: str, db: Session = Depends(get_db)):
    return db.query(FeatureToggle).filter(FeatureToggle.tenant_id == tenant_id).all()