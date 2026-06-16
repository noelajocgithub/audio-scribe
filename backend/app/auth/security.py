"""Password hashing (bcrypt) and stateless session tokens (JWT)."""

import os
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt  # PyJWT

logger = logging.getLogger(__name__)

# --- JWT configuration -------------------------------------------------------
# The secret MUST be supplied in production. We fall back to a random per-process
# secret in dev (which invalidates tokens on restart) and log a loud warning so a
# missing secret is never silently shipped.
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    JWT_SECRET = secrets.token_urlsafe(48)
    logger.warning(
        "⚠️ JWT_SECRET not set — using an ephemeral random secret. "
        "Set JWT_SECRET in the environment for stable, secure sessions."
    )

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))


# --- Password hashing --------------------------------------------------------
def hash_password(password: str) -> str:
    """Hash a plaintext password with a unique per-password bcrypt salt."""
    # bcrypt has a 72-byte input limit; encode and let bcrypt salt+hash.
    pw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw, bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time verification of a plaintext password against its hash."""
    try:
        return bcrypt.checkpw(
            password.encode("utf-8")[:72],
            password_hash.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


# --- Tokens ------------------------------------------------------------------
def create_access_token(subject: str, role: str, extra: Optional[dict] = None) -> str:
    """Create a signed JWT for a session. `subject` is the user id (as a string)."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode & verify a JWT. Raises jwt.PyJWTError (incl. expiry) if invalid."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
