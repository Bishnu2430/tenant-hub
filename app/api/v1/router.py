from fastapi import APIRouter
from app.api.v1.endpoints import auth, tenants, roles, modules, audit

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(tenants.router)
router.include_router(roles.router)
router.include_router(modules.router)
router.include_router(audit.router)