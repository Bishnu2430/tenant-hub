"""HTTP smoke test for the API.

Usage:
  python scripts/smoke_test_http.py http://127.0.0.1:8000

Notes:
- This script expects the API server to already be running (either via `uvicorn` or `docker compose`).
- It creates random users/tenant names to be re-runnable.
"""

from __future__ import annotations

import json
import sys
import time
import uuid
import urllib.error
import urllib.request


def _json(obj: object) -> bytes:
    return json.dumps(obj).encode("utf-8")


class Api:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/") + "/api/v1"

    def post(self, path: str, payload: dict, token: str | None = None) -> tuple[int, dict | list | None]:
        req = urllib.request.Request(self.base_url + path, data=_json(payload), method="POST")
        req.add_header("Content-Type", "application/json")
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        return self._send(req)

    def get(self, path: str, token: str | None = None) -> tuple[int, dict | list | None]:
        req = urllib.request.Request(self.base_url + path, method="GET")
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        return self._send(req)

    def _send(self, req: urllib.request.Request) -> tuple[int, dict | list | None]:
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                body = resp.read().decode("utf-8")
                return resp.status, (json.loads(body) if body else None)
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            try:
                parsed = json.loads(body) if body else None
            except Exception:
                parsed = {"raw": body}
            raise RuntimeError(f"HTTP {e.code} {req.method} {req.full_url}: {parsed}") from None


def wait_for_health(base_url: str, timeout_s: int = 60) -> None:
    deadline = time.time() + timeout_s
    url = base_url.rstrip("/") + "/health"
    last_err: str | None = None

    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                if resp.status == 200:
                    return
        except Exception as e:
            last_err = str(e)
        time.sleep(1)

    raise RuntimeError(f"API did not become healthy at {url}. Last error: {last_err}")


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/smoke_test_http.py http://127.0.0.1:8000")
        return 2

    base_url = sys.argv[1].rstrip("/")
    wait_for_health(base_url)
    api = Api(base_url)

    run_id = uuid.uuid4().hex[:10]
    admin_email = f"admin_{run_id}@example.com"
    manager_email = f"manager_{run_id}@example.com"
    user2_email = f"user2_{run_id}@example.com"

    password = "Passw0rd!"

    # Register + login admin
    api.post("/auth/register", {"email": admin_email, "password": password, "full_name": "Admin"})
    _, admin_login = api.post("/auth/login", {"email": admin_email, "password": password})
    admin_access = admin_login["access_token"]

    # Create tenant
    _, tenant = api.post(
        "/tenants",
        {"name": f"Acme {run_id}", "slug": f"acme-{run_id}", "industry": "school"},
        token=admin_access,
    )
    tenant_id = tenant["id"]

    # Switch context as admin
    _, admin_ctx_token = api.post("/auth/switch-context", {"tenant_id": tenant_id}, token=admin_access)
    admin_ctx = admin_ctx_token["access_token"]

    # Create role Manager
    _, manager_role = api.post("/roles", {"name": "Manager", "tenant_id": tenant_id}, token=admin_ctx)
    manager_role_id = manager_role["id"]

    # Ensure tenant:manage exists and assign to Manager
    _, perms = api.get("/permissions", token=admin_ctx)
    tenant_manage = next(p for p in perms if p["name"] == "tenant:manage")
    api.post(f"/roles/{manager_role_id}/permissions", {"permission_id": tenant_manage["id"]}, token=admin_ctx)

    # Register + login manager user
    api.post("/auth/register", {"email": manager_email, "password": password, "full_name": "Manager"})
    _, manager_login = api.post("/auth/login", {"email": manager_email, "password": password})
    manager_access = manager_login["access_token"]
    _, manager_me = api.get("/auth/me", token=manager_access)

    # Admin adds manager as a member with Manager role
    api.post(
        f"/tenants/{tenant_id}/members",
        {"user_email": manager_email, "role_name": "Manager"},
        token=admin_ctx,
    )

    # Switch context as manager
    _, manager_ctx_token = api.post("/auth/switch-context", {"tenant_id": tenant_id}, token=manager_access)
    manager_ctx = manager_ctx_token["access_token"]

    # Manager can list members
    st, members = api.get(f"/tenants/{tenant_id}/members", token=manager_ctx)
    assert st == 200
    assert isinstance(members, list)

    # Manager can add another member (delegated RBAC)
    api.post("/auth/register", {"email": user2_email, "password": password, "full_name": "User2"})
    _, user2_login = api.post("/auth/login", {"email": user2_email, "password": password})
    user2_access = user2_login["access_token"]
    _, user2_me = api.get("/auth/me", token=user2_access)

    st, membership = api.post(
        f"/tenants/{tenant_id}/members",
        {"user_email": user2_email, "role_name": "Manager"},
        token=manager_ctx,
    )
    assert st == 201
    assert membership.get("role_name") == "Manager"

    print("✅ Smoke test passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
