"""
Run this ONCE after the DB tables are created to seed default data.
Usage: python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import SessionLocal
from app.models.models import Module, Permission
import uuid

db = SessionLocal()

# ─── Default Modules ─────────────────────────────────────────────────────────
DEFAULT_MODULES = [
    {"name": "school",    "description": "School Management – attendance, results, timetable"},
    {"name": "hospital",  "description": "Hospital Management – appointments, prescriptions"},
    {"name": "hrms",      "description": "HR Management – payroll, leave, employees"},
    {"name": "ecommerce", "description": "E-Commerce – products, orders, inventory"},
]

for m in DEFAULT_MODULES:
    if not db.query(Module).filter(Module.name == m["name"]).first():
        db.add(Module(id=str(uuid.uuid4()), **m))
        print(f"  ✅ Module: {m['name']}")
    else:
        print(f"  ⏭️  Module exists: {m['name']}")

# ─── Default Permissions ─────────────────────────────────────────────────────
DEFAULT_PERMISSIONS = [
    # Auth / general
    "user:read", "user:write",
    # School
    "attendance:read", "attendance:write",
    "results:read", "results:write",
    "timetable:read", "timetable:write",
    "announcement:read", "announcement:write",
    # Hospital
    "appointment:read", "appointment:write",
    "prescription:read", "prescription:write",
    "patient:read", "patient:write",
    # HRMS
    "employee:read", "employee:write",
    "leave:read", "leave:write",
    "payroll:read", "payroll:write",
    # E-Commerce
    "product:read", "product:write",
    "order:read", "order:write",
    "inventory:read", "inventory:write",
    # Admin
    "tenant:manage", "module:manage", "role:manage",
]

for pname in DEFAULT_PERMISSIONS:
    if not db.query(Permission).filter(Permission.name == pname).first():
        db.add(Permission(id=str(uuid.uuid4()), name=pname))
        print(f"  ✅ Permission: {pname}")
    else:
        print(f"  ⏭️  Permission exists: {pname}")

db.commit()
db.close()
print("\n🎉 Seed complete!")