"""Main FastAPI application entry point for SIH-80 Rainfall Correction System."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.schemas.common import HealthResponse
from backend.api.routes import router as api_v1_router

# Configure structured logging
logging.basicConfig(
    level=settings.server_settings.get("log_level", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("regimerain.backend")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for startup validation and shutdown cleanup."""
    logger.info("Initializing RegimeRain-AI System (SIH 2026 Problem Statement 80)...")
    logger.info(f"Loaded {len(settings.regimes)} operational weather regimes: {', '.join(settings.regime_names)}")
    active_sources = settings.active_data_sources
    logger.info(f"Active NWP Source: {active_sources['nwp_mode']}")
    logger.info(f"Active Atmospheric Source: {active_sources['atmospheric_mode']}")
    logger.info(f"Ground Truth Reference: {active_sources['ground_truth'].get('name')}")
    logger.info("Data Policy: ABSOLUTE_INTEGRITY_NO_FABRICATION enforced.")
    yield
    logger.info("RegimeRain-AI System shutting down gracefully.")


app = FastAPI(
    title=settings.project_info.get("name", "Regime-Aware Rainfall Forecast Correction"),
    version=settings.project_info.get("version", "0.1.0"),
    description=(
        "Research and operational prototype for weather-regime conditioned "
        "NWP rainfall post-processing, soft Mixture-of-Experts bias correction, "
        "and district-level heavy rainfall exceedance decision support."
    ),
    lifespan=lifespan,
)

# CORS Middleware Configuration
cors_origins = settings.server_settings.get("cors_origins", ["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router under /api/v1 prefix
api_prefix = settings.server_settings.get("api_prefix", "/api/v1")
app.include_router(api_v1_router, prefix=api_prefix)


@app.get("/health", response_model=HealthResponse, tags=["Health"], summary="System Health Check")
async def health_check() -> HealthResponse:
    """Core health check endpoint returning service status, timestamp, and active regime count."""
    return HealthResponse(
        status="healthy",
        service=settings.project_info.get("short_name", "RegimeRain-AI"),
        version=settings.project_info.get("version", "0.1.0"),
        regimes_configured=len(settings.regimes),
        environment=settings.project_info.get("environment", "development"),
    )


@app.get("/", tags=["Root"], summary="Root Service Information")
async def root():
    """Root endpoint welcoming clients and directing them to OpenAPI documentation."""
    return {
        "service": settings.project_info.get("name"),
        "version": settings.project_info.get("version"),
        "docs_url": "/docs",
        "health_url": "/health",
        "api_v1_status": f"{api_prefix}/status",
    }


if __name__ == "__main__":
    import uvicorn
    host = settings.server_settings.get("host", "127.0.0.1")
    port = settings.server_settings.get("port", 8000)
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
