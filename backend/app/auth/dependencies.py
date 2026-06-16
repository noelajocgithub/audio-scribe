"""FastAPI auth dependencies: session validation + role guards (checkRole)."""

import logging

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.auth.security import decode_access_token
from app.services.user_service import UserService

logger = logging.getLogger(__name__)

# Reads the "Authorization: Bearer <token>" header. tokenUrl powers Swagger's
# "Authorize" button so the docs can exercise protected routes.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

_CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Validate the session token and load the current, active user.

    Rejects invalid/expired tokens and any user whose account is not 'active'
    (e.g. still pending approval, or disabled).
    """
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise _CREDENTIALS_ERROR
    except jwt.PyJWTError:
        raise _CREDENTIALS_ERROR

    user = await UserService.get_by_id(int(user_id))
    if user is None:
        raise _CREDENTIALS_ERROR

    if user["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user['status']}",
        )

    return user


def require_role(*allowed_roles: str):
    """Dependency factory that authorizes a request by role — i.e. checkRole('admin').

    Usage:
        @router.delete("/files/{id}")
        async def delete(id: int, user=Depends(require_role("admin"))): ...

    Pass multiple roles for "any of": require_role("manager", "admin").
    """
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this action",
            )
        return user

    return checker


# Convenience guards for the three roles in this system.
require_admin = require_role("admin")
require_manager = require_role("manager", "admin")  # admins inherit manager rights
require_user = require_role("user", "manager", "admin")  # any authenticated, active user
