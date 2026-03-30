"""
Run this ONCE after the DB tables are created to seed default data.
Usage: python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.permission_defaults import DEFAULT_MODULES, DEFAULT_PERMISSIONS
from app.db.session import SessionLocal
from app.models.models import Module, Permission
import uuid

db = SessionLocal()

for m in DEFAULT_MODULES:
    if not db.query(Module).filter(Module.name == m["name"]).first():
        db.add(Module(id=str(uuid.uuid4()), **m))
        print(f"  ✅ Module: {m['name']}")
    else:
        print(f"  ⏭️  Module exists: {m['name']}")

for pname, pdesc in DEFAULT_PERMISSIONS:
    if not db.query(Permission).filter(Permission.name == pname).first():
        db.add(Permission(id=str(uuid.uuid4()), name=pname, description=pdesc))
        print(f"  ✅ Permission: {pname}")
    else:
        print(f"  ⏭️  Permission exists: {pname}")

db.commit()
db.close()
print("\n🎉 Seed complete!")