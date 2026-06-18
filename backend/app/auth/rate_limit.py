"""Rate limiting via Redis for expensive endpoints."""

import os
import logging

import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, status

from app.auth.dependencies import get_current_user

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
GENERATE_RATE_LIMIT = 10
GENERATE_RATE_WINDOW = 60


async def rate_limit_generate(user: dict = Depends(get_current_user)) -> dict:
    """Allow max 10 generation requests per user per 60-second window."""
    key = f"ratelimit:generate:{user['id']}"
    try:
        r = aioredis.from_url(REDIS_URL)
        try:
            current = await r.incr(key)
            if current == 1:
                await r.expire(key, GENERATE_RATE_WINDOW)
            if current > GENERATE_RATE_LIMIT:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Max 10 generation requests per minute.",
                )
        finally:
            await r.aclose()
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Rate limit check failed (allowing request): {e}")
    return user
