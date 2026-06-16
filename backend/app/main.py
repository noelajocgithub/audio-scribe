"""FastAPI application initialization"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os

from app.database import init_db, close_db, run_migrations
from app.routes import audio_routes, transcription_routes

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    logger.info("🚀 Starting application...")
    await init_db()

    try:
        await run_migrations()
    except Exception as e:
        logger.warning(f"⚠️ Migration warning: {e}")
    
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


app.include_router(audio_routes.router, prefix="/api", tags=["audio"])
app.include_router(transcription_routes.router, prefix="/api", tags=["transcription"])


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
