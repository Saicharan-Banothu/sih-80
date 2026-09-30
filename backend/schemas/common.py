"""Common Pydantic data schemas for API requests and responses."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Service health state")
    service: str = Field(default="RegimeRain-AI", description="Service name")
    version: str = Field(default="0.1.0", description="API version")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Response timestamp UTC"
    )
    regimes_configured: int = Field(default=6, description="Number of operational regimes")
    environment: str = Field(default="development", description="Execution mode")


class SystemStatusResponse(BaseModel):
    service: str
    version: str
    status: str
    timestamp: str
    nwp_source: str
    atmospheric_source: str
    ground_truth_source: str
    regimes_active: List[str]
    thresholds_mm: Dict[str, float]
    provenance_policy: str


class ModelInfoResponse(BaseModel):
    system_name: str
    version: str
    architecture: str
    foundation_backbone: Dict[str, Any]
    bias_correction: Dict[str, Any]
    regimes: List[Dict[str, Any]]
    quantiles: List[float]
    critical_thresholds_mm: Dict[str, float]
    verification_frameworks: List[str]
    disclaimer: str


class ProvenanceResponse(BaseModel):
    registry_version: str
    data_policy: str
    last_updated: str
    sources: Dict[str, Any]
    environment_status: Optional[Dict[str, Any]] = None


class ForecasterOverrideRequest(BaseModel):
    district_id: str
    forecaster_id: str
    overridden_color: Optional[str] = None
    scaling_multiplier: Optional[float] = None
    justification_reason: str = Field(default="Duty meteorologist synoptic adjustment")


# -------------------------------------------------------------
# Authentication & User Management Schemas
# -------------------------------------------------------------

class UserProfile(BaseModel):
    user_id: str
    email: str
    name: str
    role: str  # "District Officer" | "Forecast Analyst" | "Disaster Management" | "Policy / Administration" | "Research User"
    role_key: str  # "district_officer" | "forecaster" | "disaster_manager" | "policy" | "research"
    organization: str
    assigned_districts: List[str] = []
    capabilities: List[str] = []


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: UserProfile
    message: str = "Authentication successful"


class WatchlistRequest(BaseModel):
    district_id: str


class WatchlistResponse(BaseModel):
    watchlist: List[str]
    count: int
    updated_at: str


class AlertItem(BaseModel):
    alert_id: str
    district_id: str
    district_name: str
    state_name: str
    severity: str  # "RED" | "ORANGE" | "YELLOW" | "GREEN"
    severity_label: str  # "Warning" | "Alert" | "Watch" | "No Warning"
    expected_rainfall_mm: float
    likely_range_mm: List[float]
    prob_heavy: float
    prob_very_heavy: float
    prob_extreme: float
    dominant_regime: str
    confidence: str
    valid_window: str
    why_highlighted: str
    recommended_action: str
    issued_at: str


class AlertsResponse(BaseModel):
    total_alerts: int
    red_count: int
    orange_count: int
    yellow_count: int
    lead_hours: int
    alerts: List[AlertItem]

