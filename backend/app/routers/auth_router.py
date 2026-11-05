from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, BusinessSettings
from app.schemas import Token, LoginRequest, UserCreate, UserResponse
from app.auth import verify_password, get_password_hash, create_access_token, get_current_user
from app.audit import log_audit

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    settings = db.query(BusinessSettings).first()
    if settings and settings.require_mfa:
        if not request.pin or (user.pin_code and user.pin_code != request.pin):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid second-factor verification PIN code"
            )

    token = create_access_token(data={"sub": user.username, "role": user.role})
    log_audit(db, action="USER_LOGIN", entity_type="User", entity_id=str(user.id), user_name=user.username, details="Login successful")
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/setup-admin", response_model=UserResponse)
def setup_initial_admin(user_in: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_pw = get_password_hash(user_in.password)
    user = User(
        username=user_in.username,
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=hashed_pw,
        role="admin",
        pin_code=user_in.pin_code or "1234",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit(db, action="ADMIN_CREATED", entity_type="User", entity_id=str(user.id), user_name=user.username)
    db.commit()
    return user

