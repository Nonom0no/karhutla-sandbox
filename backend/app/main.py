"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router, register_exception_handlers
from app.config import settings

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)

# Register exception handlers for uniform error envelope
register_exception_handlers(app)

# Include API routes
app.include_router(api_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "version": settings.version,
    }
