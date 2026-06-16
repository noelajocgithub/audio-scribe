"""User-management & RBAC routes — every route is role-guarded via require_role."""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.models import UserOut, AdminCreateUserRequest, RoleUpdateRequest
from app.auth.security import hash_password
from app.auth.dependencies import require_admin, require_manager
from app.services.user_service import UserService

logger = logging.getLogger(__name__)
router = APIRouter()


# ---- Approvals: Manager OR Admin -------------------------------------------
@router.get("/users/pending", response_model=list[UserOut])
async def list_pending(_: dict = Depends(require_manager)):
    """List registrations awaiting approval (Manager or Admin)."""
    return [UserOut(**u) for u in await UserService.list_pending()]


@router.post("/users/{user_id}/approve", response_model=UserOut)
async def approve_user(user_id: int, approver: dict = Depends(require_manager)):
    """Approve a pending registration (Manager or Admin)."""
    target = await UserService.get_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["status"] != "pending":
        raise HTTPException(status_code=409, detail=f"User is already '{target['status']}'")

    await UserService.approve_user(user_id, approver["id"])
    logger.info(f"✅ {approver['email']} approved user {user_id}")
    return UserOut(**await UserService.get_by_id(user_id))


# ---- Full user administration: Admin only ----------------------------------
@router.get("/users", response_model=list[UserOut])
async def list_users(_: dict = Depends(require_admin)):
    """List all users (Admin only)."""
    return [UserOut(**u) for u in await UserService.list_users()]


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(payload: AdminCreateUserRequest, _: dict = Depends(require_admin)):
    """Manually create a user with any role/status (Admin only)."""
    if await UserService.email_or_username_taken(payload.email, payload.username):
        raise HTTPException(status_code=409, detail="Email or username already registered")

    user_id = await UserService.create_user(
        email=payload.email,
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status=payload.status,
    )
    logger.info(f"👤 Admin created user {payload.email} ({payload.role})")
    return UserOut(**await UserService.get_by_id(user_id))


@router.patch("/users/{user_id}/role", response_model=UserOut)
async def update_role(user_id: int, payload: RoleUpdateRequest, admin: dict = Depends(require_admin)):
    """Change a user's role (Admin only)."""
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot change your own role")
    if not await UserService.get_by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    await UserService.set_role(user_id, payload.role)
    return UserOut(**await UserService.get_by_id(user_id))


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin: dict = Depends(require_admin)):
    """Delete a user (Admin only). Cannot delete yourself."""
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    if not await UserService.get_by_id(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    await UserService.delete_user(user_id)
    logger.info(f"🗑️ Admin {admin['email']} deleted user {user_id}")
    return {"message": "User deleted", "user_id": user_id}


# ---- System settings: Admin only (example of an admin-gated resource) -------
@router.get("/admin/settings")
async def get_settings(_: dict = Depends(require_admin)):
    """Read system settings (Admin only) — placeholder for real settings."""
    return {"settings": {"max_upload_mb": 500, "whisper_model": "large-v3-turbo"}}
