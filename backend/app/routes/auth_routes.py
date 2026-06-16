"""Authentication routes: registration, login, and current-user lookup."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.models import RegisterRequest, LoginRequest, TokenResponse, UserOut
from app.auth.security import hash_password, verify_password, create_access_token
from app.auth.dependencies import get_current_user
from app.services.user_service import UserService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    """Self-service registration. Creates a 'user' that is PENDING until a
    manager/admin approves it — pending accounts cannot log in."""
    if await UserService.email_or_username_taken(payload.email, payload.username):
        # Generic message — don't reveal which field already exists.
        raise HTTPException(status_code=409, detail="Email or username already registered")

    await UserService.create_user(
        email=payload.email,
        username=payload.username,
        password_hash=hash_password(payload.password),
        role="user",
        status="pending",
    )
    logger.info(f"📝 Registration pending approval: {payload.email}")
    return {"message": "Registration received. An administrator or manager must approve your account."}


@router.post("/auth/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    """Authenticate (by username or email) and issue a JWT session token."""
    user = await UserService.get_by_identifier(payload.identifier)

    # Keep the error generic so we don't leak which accounts exist.
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username/email or password")

    if user["status"] == "pending":
        raise HTTPException(status_code=403, detail="Account is awaiting approval")
    if user["status"] == "disabled":
        raise HTTPException(status_code=403, detail="Account has been disabled")

    token = create_access_token(subject=user["id"], role=user["role"])
    public = await UserService.get_by_id(user["id"])
    logger.info(f"🔓 Login: {user['email']} ({user['role']})")
    return TokenResponse(access_token=token, user=UserOut(**public))


@router.get("/auth/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user (validates the session token)."""
    return UserOut(**current_user)
