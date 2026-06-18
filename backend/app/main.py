"""FastAPI application initialization"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os

from app.database import init_db, close_db, run_migrations
from app.routes import audio_routes, transcription_routes, auth_routes, user_routes, prompt_routes, generation_routes
from app.services.user_service import UserService
from app.auth.security import hash_password

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def seed_admin():
    """Create the first administrator if no users exist yet (bootstrap)."""
    try:
        if await UserService.count_users() > 0:
            return
        email = os.getenv("ADMIN_EMAIL", "admin@example.com")
        username = os.getenv("ADMIN_USERNAME", "admin")
        password = os.getenv("ADMIN_PASSWORD", "noel1999")
        await UserService.create_user(
            email=email,
            username=username,
            password_hash=hash_password(password),
            role="admin",
            status="active",
        )
        logger.info(f"👑 Seeded initial admin: {email} (set ADMIN_PASSWORD env to override)")
    except Exception as e:
        logger.warning(f"⚠️ Admin seed skipped: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    logger.info("🚀 Starting application...")
    await init_db()

    try:
        await run_migrations()
    except Exception as e:
        logger.warning(f"⚠️ Migration warning: {e}")

    await seed_admin()

    yield
    
    logger.info("🛑 Shutting down application...")
    await close_db()


app = FastAPI(
    title="Audio Scribe API",
    description="Advanced audio transcription API",
    version="0.0.1",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_routes.router, prefix="/api", tags=["auth"])
app.include_router(user_routes.router, prefix="/api", tags=["users"])
app.include_router(audio_routes.router, prefix="/api", tags=["audio"])
app.include_router(transcription_routes.router, prefix="/api", tags=["transcription"])
app.include_router(prompt_routes.router, prefix="/api", tags=["prompts"])
app.include_router(generation_routes.router, prefix="/api", tags=["generation"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "0.0.1"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "application": "Audio Scribe API",
        "version": "0.0.1",
        "docs": "/docs"
    }


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc):
    """Global exception handler"""
    logger.error(f"❌ Unhandled exception: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
