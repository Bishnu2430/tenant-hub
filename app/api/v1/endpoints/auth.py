from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.schemas import RegisterRequest, LoginRequest, SwitchContextRequest, UserOut, SwitchContextResponse
from app.services.auth_service import register_user, login_user, switch_context
from app.core.dependencies import get_current_user
from app.models.models import User

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    return register_user(data, db)


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return login_user(data, db)


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