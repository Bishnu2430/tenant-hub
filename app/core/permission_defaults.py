from __future__ import annotations

DEFAULT_MODULES: list[dict[str, str]] = [
    {
        "name": "school",
        "description": "School Management – attendance, results, timetable",
    },
    {
        "name": "hospital",
        "description": "Hospital Management – appointments, prescriptions",
    },
    {
        "name": "hrms",
        "description": "HR Management – payroll, leave, employees",
    },
    {
        "name": "ecommerce",
        "description": "E-Commerce – products, orders, inventory",
    },
]


DEFAULT_PERMISSIONS: list[tuple[str, str]] = [
    # Auth / general
    ("user:read", "Read users"),
    ("user:write", "Create/update users"),
    # School
    ("attendance:read", "Read attendance"),
    ("attendance:write", "Write attendance"),
    ("results:read", "Read results"),
    ("results:write", "Write results"),
    ("timetable:read", "Read timetable"),
    ("timetable:write", "Write timetable"),
    ("announcement:read", "Read announcements"),
    ("announcement:write", "Write announcements"),
    # Hospital
    ("appointment:read", "Read appointments"),
    ("appointment:write", "Write appointments"),
    ("prescription:read", "Read prescriptions"),
    ("prescription:write", "Write prescriptions"),
    ("patient:read", "Read patients"),
    ("patient:write", "Write patients"),
    # HRMS
    ("employee:read", "Read employees"),
    ("employee:write", "Write employees"),
    ("leave:read", "Read leave"),
    ("leave:write", "Write leave"),
    ("payroll:read", "Read payroll"),
    ("payroll:write", "Write payroll"),
    # E-Commerce
    ("product:read", "Read products"),
    ("product:write", "Write products"),
    ("order:read", "Read orders"),
    ("order:write", "Write orders"),
    ("inventory:read", "Read inventory"),
    ("inventory:write", "Write inventory"),
    # Admin
    ("tenant:manage", "Manage tenant members and settings"),
    ("module:manage", "Manage tenant modules and subscriptions"),
    ("role:manage", "Manage roles and permissions"),
]