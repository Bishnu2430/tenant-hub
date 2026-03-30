from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    SwitchContextRequest,
    SwitchContextResponse,
    UserOut,
)
from app.services.auth_service import change_password, login_user, register_user, revoke_tokens, switch_context
from app.core.dependencies import get_current_user
from app.models.models import User
from app.core.rate_limit import rate_limiter

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(request: Request, data: RegisterRequest, db: Session = Depends(get_db)):
    key = f"register:{request.client.host if request.client else 'unknown'}:{data.email.lower()}"
    if not rate_limiter.allow(key, limit=5, window_seconds=300):
        raise HTTPException(status_code=429, detail="Too many requests, try again later")
    return register_user(data, db)


@router.post("/login")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    key = f"login:{request.client.host if request.client else 'unknown'}:{data.email.lower()}"
    if not rate_limiter.allow(key, limit=10, window_seconds=300):
        raise HTTPException(status_code=429, detail="Too many requests, try again later")
    try:
        result = login_user(data, db)
        rate_limiter.reset(key)
        return result
    except HTTPException as e:
        # keep limiter state on failures
        raise e


@router.post("/switch-context", response_model=SwitchContextResponse)
def switch(
    data: SwitchContextRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return switch_context(data, current_user, db)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout", response_model=MessageResponse)
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    revoke_tokens(current_user, db)
    return {"message": "Logged out"}


@router.post("/change-password", response_model=MessageResponse)
def change_my_password(
    request: Request,
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    key = f"change-password:{request.client.host if request.client else 'unknown'}:{current_user.id}"
    if not rate_limiter.allow(key, limit=10, window_seconds=600):
        raise HTTPException(status_code=429, detail="Too many requests, try again later")
    change_password(current_user, data.current_password, data.new_password, db)
    return {"message": "Password changed"}