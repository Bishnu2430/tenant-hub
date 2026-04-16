import json
import uuid
from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.dependencies import RequestContext, ensure_path_tenant, get_current_context, require_permission
from app.db.session import get_db
from app.models.models import ERPRecord, ERPRecordHistory, User
from app.schemas.schemas import (
    ERPDashboardSummary,
    ERPModuleSummary,
    ERPRecordCreate,
    ERPRecordOut,
    ERPRecordTransitionRequest,
    ERPRecordUpdate,
)
from app.services.audit_service import write_audit_log

router = APIRouter(tags=["ERP"])

MODULE_PERMISSIONS: dict[str, dict[str, str]] = {
    "school": {"read": "attendance:read", "write": "attendance:write"},
    "hospital": {"read": "appointment:read", "write": "appointment:write"},
    "hrms": {"read": "employee:read", "write": "employee:write"},
    "ecommerce": {"read": "order:read", "write": "order:write"},
    "finance": {"read": "finance:read", "write": "finance:write"},
}

MODULE_ENTITY_RULES: dict[str, set[str]] = {
    "school": {"student", "class", "teacher", "attendance", "exam", "fee_invoice", "timetable", "announcement"},
    "hospital": {"patient", "doctor", "department", "appointment", "prescription", "lab_order", "billing_invoice"},
    "hrms": {"employee", "department", "team", "leave_request", "payroll_run", "timesheet", "performance_review"},
    "ecommerce": {"customer", "product", "warehouse", "sales_order", "shipment", "return_request", "inventory_move"},
    "finance": {"customer", "vendor", "account", "invoice", "payment", "expense", "budget", "ledger_entry"},
}

LINKED_ENTITY_RULES: dict[tuple[str, str], set[str]] = {
    ("school", "attendance"): {"student"},
    ("school", "exam"): {"class"},
    ("school", "fee_invoice"): {"student"},
    ("school", "timetable"): {"class", "teacher"},
    ("hospital", "appointment"): {"patient"},
    ("hospital", "prescription"): {"patient"},
    ("hospital", "lab_order"): {"patient"},
    ("hospital", "billing_invoice"): {"patient"},
    ("hrms", "leave_request"): {"employee"},
    ("hrms", "payroll_run"): {"employee"},
    ("hrms", "timesheet"): {"employee"},
    ("hrms", "performance_review"): {"employee"},
    ("ecommerce", "sales_order"): {"customer"},
    ("ecommerce", "shipment"): {"sales_order"},
    ("ecommerce", "return_request"): {"sales_order"},
    ("ecommerce", "inventory_move"): {"product"},
    ("finance", "invoice"): {"customer", "vendor"},
    ("finance", "payment"): {"invoice"},
    ("finance", "expense"): {"vendor"},
    ("finance", "ledger_entry"): {"account"},
}

DONE_STATUSES = {"done", "completed", "closed", "paid", "fulfilled"}
BLOCKED_STATUS = "blocked"
OPEN_STATUSES = {"draft", "open", "in_progress", "pending", "review"}

WORKFLOW_TRANSITIONS: dict[str, dict[str, set[str]]] = {
    "school": {
        "draft": {"open", "blocked"},
        "open": {"in_progress", "blocked", "completed"},
        "in_progress": {"review", "blocked", "completed"},
        "review": {"completed", "blocked"},
        "blocked": {"open", "in_progress"},
    },
    "hospital": {
        "draft": {"open", "blocked"},
        "open": {"in_progress", "blocked", "completed"},
        "in_progress": {"review", "blocked", "completed"},
        "review": {"completed", "blocked"},
        "blocked": {"open", "in_progress"},
    },
    "hrms": {
        "draft": {"open", "blocked"},
        "open": {"in_progress", "blocked", "completed"},
        "in_progress": {"review", "blocked", "completed"},
        "review": {"completed", "blocked"},
        "blocked": {"open", "in_progress"},
    },
    "ecommerce": {
        "draft": {"open", "blocked"},
        "open": {"in_progress", "blocked", "completed"},
        "in_progress": {"review", "blocked", "completed"},
        "review": {"completed", "blocked"},
        "blocked": {"open", "in_progress"},
    },
    "finance": {
        "draft": {"open", "blocked"},
        "open": {"in_progress", "blocked", "completed"},
        "in_progress": {"review", "blocked", "completed"},
        "review": {"completed", "blocked"},
        "blocked": {"open", "in_progress"},
    },
}

PRIORITY_ORDER = {"low": 0, "normal": 1, "high": 2, "critical": 3}


def _normalize_module(module_name: str) -> str:
    normalized = (module_name or "").strip().lower()
    if normalized not in MODULE_ENTITY_RULES:
        raise HTTPException(status_code=400, detail=f"Unsupported module: {module_name}")
    return normalized


def _assert_entity_allowed(module_name: str, entity_name: str) -> str:
    normalized_entity = (entity_name or "").strip().lower()
    if not normalized_entity:
        raise HTTPException(status_code=400, detail="entity_name is required")
    if normalized_entity not in MODULE_ENTITY_RULES[module_name]:
        raise HTTPException(
            status_code=400,
            detail=f"Entity '{entity_name}' is not valid for module '{module_name}'",
        )
    return normalized_entity


    def _validate_linked_record(
        db: Session,
        tenant_id: str,
        module_name: str,
        entity_name: str,
        linked_record_id: str | None,
    ) -> tuple[str | None, str | None]:
        if not linked_record_id:
            return None, None

        linked_record = (
            db.query(ERPRecord)
            .filter(
                ERPRecord.id == linked_record_id,
                ERPRecord.tenant_id == tenant_id,
            )
            .first()
        )
        if not linked_record:
            raise HTTPException(status_code=404, detail="Linked ERP record not found")

        allowed_entities = LINKED_ENTITY_RULES.get((module_name, entity_name))
        if allowed_entities and linked_record.entity_name not in allowed_entities:
            raise HTTPException(
                status_code=400,
                detail=f"'{entity_name}' can only link to: {', '.join(sorted(allowed_entities))}",
            )

        return linked_record.id, linked_record.title


def _check_module_permission(
    module_name: str,
    mode: str,
    db: Session,
    ctx: RequestContext,
) -> None:
    permission_name = MODULE_PERMISSIONS.get(module_name, {}).get(mode)
    if not permission_name:
        raise HTTPException(status_code=403, detail="Permission configuration missing")

    checker = require_permission(permission_name)
    checker(ctx=ctx, db=db)


def _to_module_summary(module_name: str, records: list[ERPRecord]) -> ERPModuleSummary:
    total_records = len(records)
    done_records = sum(1 for r in records if (r.status or "").strip().lower() in DONE_STATUSES)
    open_records = total_records - done_records
    blocked_records = sum(1 for r in records if (r.status or "").strip().lower() == BLOCKED_STATUS)
    overdue_records = sum(
        1
        for r in records
        if r.due_at and r.due_at < datetime.utcnow() and (r.status or "").strip().lower() not in DONE_STATUSES
    )
    total_amount_cents = sum(r.amount_cents or 0 for r in records)
    entities = sorted({r.entity_name for r in records})

    return ERPModuleSummary(
        module_name=module_name,
        total_records=total_records,
        open_records=open_records,
        done_records=done_records,
        blocked_records=blocked_records,
        overdue_records=overdue_records,
        total_amount_cents=total_amount_cents,
        entities=entities,
    )


def _write_history(
    db: Session,
    *,
    record: ERPRecord,
    ctx: RequestContext,
    to_status: str,
    note: str | None = None,
) -> None:
    db.add(
        ERPRecordHistory(
            id=str(uuid.uuid4()),
            record_id=record.id,
            tenant_id=record.tenant_id,
            module_name=record.module_name,
            entity_name=record.entity_name,
            from_status=record.status,
            to_status=to_status,
            note=note,
            action_user_id=ctx.user.id,
        )
    )


def _allowed_transitions(module_name: str, status: str) -> set[str]:
    return WORKFLOW_TRANSITIONS.get(module_name, {}).get((status or "").strip().lower(), {"open", "done", "blocked"})


def _normalize_priority(priority: str | None) -> str:
    normalized = (priority or "normal").strip().lower()
    if normalized not in PRIORITY_ORDER:
        raise HTTPException(status_code=400, detail="Invalid priority")
    return normalized


def _sync_blocked_fields(record: ERPRecord) -> None:
    if (record.status or "").strip().lower() == BLOCKED_STATUS:
        record.blocked_at = record.blocked_at or datetime.utcnow()
    else:
        record.blocked_at = None
        record.blocked_reason = None


@router.post("/tenants/{tenant_id}/erp/{module_name}/records", response_model=ERPRecordOut, status_code=201)
def create_erp_record(
    request: Request,
    tenant_id: str,
    module_name: str,
    data: ERPRecordCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(get_current_context),
):
    ensure_path_tenant(tenant_id, ctx)
    module_name = _normalize_module(module_name)
    _check_module_permission(module_name, "write", db, ctx)
    entity_name = _assert_entity_allowed(module_name, data.entity_name)
    linked_record_id, linked_record_title = _validate_linked_record(
        db,
        tenant_id,
        module_name,
        entity_name,
        data.linked_record_id,
    )

    payload_text = json.dumps(data.payload or {}, ensure_ascii=True)

    record = ERPRecord(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        module_name=module_name,
        entity_name=entity_name,
        title=data.title.strip(),
        status=(data.status or "draft").strip().lower(),
        priority=_normalize_priority(data.priority),
        assigned_to_user_id=data.assigned_to_user_id,
        linked_record_id=linked_record_id,
        linked_record_title=linked_record_title,
        amount_cents=data.amount_cents,
        owner_user_id=ctx.user.id,
        due_at=data.due_at,
        payload_json=payload_text,
        blocked_reason=None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    write_audit_log(
        db=db,
        ctx=ctx,
        request=request,
        action="erp:record:create",
        resource=f"erp:{module_name}:{record.id}",
        details={
            "entity_name": record.entity_name,
            "status": record.status,
            "amount_cents": record.amount_cents,
            "priority": record.priority,
        },
    )
    return record


@router.get("/tenants/{tenant_id}/erp/{module_name}/records", response_model=list[ERPRecordOut])
def list_erp_records(
    tenant_id: str,
    module_name: str,
    entity_name: str | None = Query(None),
    limit: int = Query(50, ge=1, le=300),
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(get_current_context),
):
    ensure_path_tenant(tenant_id, ctx)
    module_name = _normalize_module(module_name)
    _check_module_permission(module_name, "read", db, ctx)

    query = (
        db.query(ERPRecord)
        .filter(ERPRecord.tenant_id == tenant_id, ERPRecord.module_name == module_name)
        .order_by(ERPRecord.updated_at.desc())
    )
    if entity_name:
        normalized_entity = _assert_entity_allowed(module_name, entity_name)
        query = query.filter(ERPRecord.entity_name == normalized_entity)

    return query.limit(limit).all()


@router.patch("/tenants/{tenant_id}/erp/records/{record_id}", response_model=ERPRecordOut)
def update_erp_record(
    request: Request,
    tenant_id: str,
    record_id: str,
    data: ERPRecordUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(get_current_context),
):
    ensure_path_tenant(tenant_id, ctx)
    record = (
        db.query(ERPRecord)
        .filter(ERPRecord.id == record_id, ERPRecord.tenant_id == tenant_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="ERP record not found")

    _check_module_permission(record.module_name, "write", db, ctx)

    if data.title is not None:
        record.title = data.title.strip()
    if data.status is not None:
        candidate = data.status.strip().lower()
        allowed = _allowed_transitions(record.module_name, record.status)
        if candidate not in allowed and candidate != record.status:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from '{record.status}' to '{candidate}'",
            )
        record.status = data.status.strip().lower()
        _sync_blocked_fields(record)
    if data.priority is not None:
        record.priority = _normalize_priority(data.priority)
    if data.amount_cents is not None:
        record.amount_cents = data.amount_cents
    if data.due_at is not None:
        record.due_at = data.due_at
    if data.payload is not None:
        record.payload_json = json.dumps(data.payload, ensure_ascii=True)
    if data.assigned_to_user_id is not None:
        if data.assigned_to_user_id:
            assignee = db.query(User).filter(User.id == data.assigned_to_user_id).first()
            if not assignee:
                raise HTTPException(status_code=404, detail="Assigned user not found")
        record.assigned_to_user_id = data.assigned_to_user_id
    if data.blocked_reason is not None:
        record.blocked_reason = data.blocked_reason.strip() or None
        if record.blocked_reason:
            record.status = BLOCKED_STATUS
            _sync_blocked_fields(record)
    if data.linked_record_id is not None:
        linked_record_id, linked_record_title = _validate_linked_record(
            db,
            tenant_id,
            record.module_name,
            record.entity_name,
            data.linked_record_id,
        )
        record.linked_record_id = linked_record_id
        record.linked_record_title = linked_record_title

    db.commit()
    db.refresh(record)

    write_audit_log(
        db=db,
        ctx=ctx,
        request=request,
        action="erp:record:update",
        resource=f"erp:{record.module_name}:{record.id}",
        details={"status": record.status, "amount_cents": record.amount_cents},
    )
    return record


@router.post("/tenants/{tenant_id}/erp/records/{record_id}/transition", response_model=ERPRecordOut)
def transition_erp_record(
    request: Request,
    tenant_id: str,
    record_id: str,
    data: ERPRecordTransitionRequest,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(get_current_context),
):
    ensure_path_tenant(tenant_id, ctx)
    record = (
        db.query(ERPRecord)
        .filter(ERPRecord.id == record_id, ERPRecord.tenant_id == tenant_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="ERP record not found")

    _check_module_permission(record.module_name, "write", db, ctx)
    next_status = data.to_status.strip().lower()
    allowed = _allowed_transitions(record.module_name, record.status)
    if next_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from '{record.status}' to '{next_status}'",
        )

    previous_status = record.status
    _write_history(db, record=record, ctx=ctx, to_status=next_status, note=data.note)
    record.status = next_status
    if next_status == BLOCKED_STATUS and data.note:
        record.blocked_reason = data.note.strip() or record.blocked_reason
    _sync_blocked_fields(record)
    db.commit()
    db.refresh(record)

    write_audit_log(
        db=db,
        ctx=ctx,
        request=request,
        action="erp:record:transition",
        resource=f"erp:{record.module_name}:{record.id}",
        details={"from": previous_status, "to": next_status, "note": data.note},
    )
    return record


@router.get("/tenants/{tenant_id}/erp/dashboard", response_model=ERPDashboardSummary)
def get_erp_dashboard_summary(
    tenant_id: str,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(get_current_context),
):
    ensure_path_tenant(tenant_id, ctx)

    records = (
        db.query(ERPRecord)
        .filter(ERPRecord.tenant_id == tenant_id)
        .order_by(ERPRecord.updated_at.desc())
        .all()
    )

    by_module: dict[str, list[ERPRecord]] = defaultdict(list)
    for record in records:
        by_module[record.module_name].append(record)

    module_summaries = [
        _to_module_summary(module_name, module_records)
        for module_name, module_records in sorted(by_module.items())
    ]

    total_records = len(records)
    done_records = sum(1 for r in records if (r.status or "").strip().lower() in DONE_STATUSES)
    open_records = total_records - done_records
    blocked_records = sum(1 for r in records if (r.status or "").strip().lower() == BLOCKED_STATUS)
    overdue_records = sum(
        1
        for r in records
        if r.due_at and r.due_at < datetime.utcnow() and (r.status or "").strip().lower() not in DONE_STATUSES
    )
    total_amount_cents = sum(r.amount_cents or 0 for r in records)

    return ERPDashboardSummary(
        tenant_id=tenant_id,
        total_records=total_records,
        open_records=open_records,
        done_records=done_records,
        blocked_records=blocked_records,
        overdue_records=overdue_records,
        total_amount_cents=total_amount_cents,
        modules=module_summaries,
    )
