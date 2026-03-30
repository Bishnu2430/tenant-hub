from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import AuditLog
from app.schemas.schemas import AuditLogOut

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogOut])
def get_audit_logs(
    tenant_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if tenant_id:
        q = q.filter(AuditLog.tenant_id == tenant_id)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    return q.limit(limit).all()