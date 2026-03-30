from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.dependencies import RequestContext
from app.models.models import AuditLog


def _safe_json(details: Any) -> str:
    try:
        return json.dumps(details, ensure_ascii=False, default=str)
    except Exception:
        return str(details)


def write_audit_log(
    *,
    db: Session,
    ctx: RequestContext,
    request: Request,
    action: str,
    resource: Optional[str] = None,
    details: Any = None,
) -> None:
    ip_address = None
    if request.client:
        ip_address = request.client.host

    user_agent = request.headers.get("user-agent")
    request_id = request.headers.get("x-request-id") or getattr(request.state, "request_id", None)

    payload = {
        "details": details,
        "request_id": request_id,
        "user_agent": user_agent,
    }

    row = AuditLog(
        user_id=ctx.user.id,
        tenant_id=ctx.tenant_id,
        action=action,
        resource=resource,
        details=_safe_json(payload) if details is not None or request_id or user_agent else None,
        ip_address=ip_address,
    )

    db.add(row)
    db.commit()
