from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from app.config import settings
from app.api import auth, interview, brand, content, campaigns, video, chat, media, social_auth, calendar, approvals, worker_api, system_api

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Auto-initializes SQLite database tables and migrations on boot for fresh clones."""
    try:
        from app.storage.db import init_db
        init_db()
        logging.getLogger("uvicorn").info("Marketing OS local SQLite database auto-initialized successfully.")
    except Exception as e:
        logging.getLogger("uvicorn").error(f"Failed to auto-initialize database on startup: {e}")
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for AI Marketing Operating System",
    version="4.0.0",
    lifespan=lifespan
)

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi import Request, Response

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)

from fastapi.staticfiles import StaticFiles
from pathlib import Path

STATIC_DIR = Path(__file__).parent.parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Public User REST API Gateway (/v1/...)
app.include_router(auth.router, prefix="/v1")
app.include_router(interview.router, prefix="/v1")
app.include_router(brand.router, prefix="/v1")
app.include_router(content.router, prefix="/v1")
app.include_router(campaigns.router, prefix="/v1")
app.include_router(video.router, prefix="/v1")
app.include_router(chat.router, prefix="/v1")
app.include_router(media.router, prefix="/v1")
app.include_router(social_auth.router, prefix="/v1")
app.include_router(calendar.router, prefix="/v1")
app.include_router(approvals.router, prefix="/v1")

# Internal Worker Control Plane (/internal/v1/...)
app.include_router(worker_api.router, prefix="/internal/v1")

# System Reaper Administration (/system/v1/...)
app.include_router(system_api.router, prefix="/system/v1")

# Alias /api/v1 for backwards compatibility if needed
app.include_router(auth.router, prefix="/api/v1")
app.include_router(interview.router, prefix="/api/v1")
app.include_router(brand.router, prefix="/api/v1")
app.include_router(content.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(video.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(media.router, prefix="/api/v1")
app.include_router(social_auth.router, prefix="/api/v1")
app.include_router(calendar.router, prefix="/api/v1")
app.include_router(approvals.router, prefix="/api/v1")

@app.get("/")
@app.get("/health")
def read_root():
    """Pure liveness probe - verifies process is alive without external dependencies."""
    return {
        "status": "healthy",
        "app": "AI Marketing Operating System API",
        "architecture": "Workflow Engine + Lightweight State Manager + Hybrid Knowledge Layer",
        "environment": settings.ENVIRONMENT,
        "min_quality_score": settings.MIN_QUALITY_SCORE
    }

@app.get("/ready")
def readiness_probe():
    """Readiness probe - verifies database and required configuration before accepting traffic."""
    try:
        from app.storage.db import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
        db_status = "connected"
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": str(e), "environment": settings.ENVIRONMENT}
        )

    return {
        "status": "ready",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
        "allowed_origins": settings.ALLOWED_ORIGINS
    }
