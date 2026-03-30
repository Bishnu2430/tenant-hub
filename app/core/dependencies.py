from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_token
from app.models.models import Permission, Role, RolePermission, User, UserTenant

bearer_scheme = HTTPBearer()


@dataclass(frozen=True)
class RequestContext:
    user: User
    tenant_id: str
    role: Role

    @property
    def role_name(self) -> str:
        return self.role.name

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user = db.query(User).filter(User.id == user_id, User.is_active == True, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def get_current_context(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> RequestContext:
    """Tenant-scoped auth dependency.

    Requires a context-switched token (issued by /auth/switch-context) containing tenant_id.
    Also validates the user is still an active member of that tenant.
    """
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    tenant_id = payload.get("tenant_id")
    if not user_id or not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenant context in token. Use /auth/switch-context first.",
        )

    user = (
        db.query(User)
        .filter(User.id == user_id, User.is_active == True, User.is_deleted == False)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    membership = (
        db.query(UserTenant)
        .join(Role)
        .filter(
            UserTenant.user_id == user_id,
            UserTenant.tenant_id == tenant_id,
            UserTenant.is_active == True,
            Role.is_deleted == False,
        )
        .first()
    )
    if not membership or not membership.role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to this tenant")

    return RequestContext(user=user, tenant_id=tenant_id, role=membership.role)


def require_permission(permission_name: str):
    """RBAC dependency: checks if current context role has the named permission.

    Special-case: a role named 'Admin' is treated as tenant superuser.
    """

    def _checker(
        ctx: RequestContext = Depends(get_current_context),
        db: Session = Depends(get_db),
    ) -> RequestContext:
        if ctx.role_name == "Admin":
            return ctx

        allowed = (
            db.query(RolePermission)
            .join(Permission)
            .filter(RolePermission.role_id == ctx.role.id, Permission.name == permission_name)
            .first()
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission_name}",
            )
        return ctx

    return _checker


def ensure_path_tenant(tenant_id: str, ctx: RequestContext) -> None:
    if tenant_id != ctx.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Wrong tenant context")


# Backwards-compatible alias (avoid breaking imports)
def get_current_user_with_tenant(
    ctx: RequestContext = Depends(get_current_context),
) -> dict:
    return {"user": ctx.user, "tenant_id": ctx.tenant_id, "role": ctx.role_name}