from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import User, UserTenant
from app.core.security import hash_password, verify_password, create_access_token, validate_bcrypt_password_length
from app.schemas.schemas import RegisterRequest, LoginRequest, SwitchContextRequest
import uuid


def register_user(data: RegisterRequest, db: Session) -> User:
    try:
        validate_bcrypt_password_length(data.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_user(data: LoginRequest, db: Session) -> dict:
    try:
        validate_bcrypt_password_length(data.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = db.query(User).filter(User.email == data.email, User.is_deleted == False).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": user.id, "ver": user.token_version})
    # Fetch tenant memberships to return in response
    memberships = db.query(UserTenant).filter(UserTenant.user_id == user.id, UserTenant.is_active == True).all()
    tenants = [{"tenant_id": m.tenant_id, "role_id": m.role_id, "role_name": m.role_name} for m in memberships]
    return {"access_token": token, "token_type": "bearer", "tenants": tenants}


def switch_context(data: SwitchContextRequest, user: User, db: Session) -> dict:
    membership = db.query(UserTenant).filter(
        UserTenant.user_id == user.id,
        UserTenant.tenant_id == data.tenant_id,
        UserTenant.is_active == True,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="No access to this tenant")
    role_name = membership.role.name if membership.role else "unknown"
    token = create_access_token({
        "sub": user.id,
        "ver": user.token_version,
        "tenant_id": data.tenant_id,
        "role": role_name,
    })
    return {"access_token": token, "tenant_id": data.tenant_id, "role": role_name, "token_type": "bearer"}


def revoke_tokens(user: User, db: Session) -> None:
    user.token_version = (user.token_version or 0) + 1
    db.add(user)
    db.commit()


def change_password(user: User, current_password: str, new_password: str, db: Session) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    try:
        validate_bcrypt_password_length(new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user.hashed_password = hash_password(new_password)
    user.token_version = (user.token_version or 0) + 1
    db.add(user)
    db.commit()