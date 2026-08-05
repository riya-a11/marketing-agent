from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import auth, interview, brand, content, campaigns, video

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for AI Marketing Operating System",
    version="4.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(interview.router, prefix="/api/v1")
app.include_router(brand.router, prefix="/api/v1")
app.include_router(content.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(video.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "app": "AI Marketing Operating System API",
        "architecture": "Workflow Engine + Lightweight State Manager + Hybrid Knowledge Layer",
        "environment": settings.ENVIRONMENT,
        "min_quality_score": settings.MIN_QUALITY_SCORE
    }
