"""API Router for SIH-80 Operational Forecast, District Decision Support, and Scientific Verification.

Directly invokes the real OperationalInferencePipeline:
  20-Channel Synoptic Tensor -> JointRegimeAwareModel -> Calibrated Probabilities -> Soft MoE Quantiles
  -> Continuous Tail Inversion -> District Decision Support -> Natural-Language Explainability.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
from fastapi import APIRouter, HTTPException, Query

from backend.config import settings
from backend.schemas.common import (
    SystemStatusResponse,
    ModelInfoResponse,
    ProvenanceResponse,
    ForecasterOverrideRequest,
)
from ml.decision.forecaster_audit import ForecasterReviewManager
from ml.joint.inference_pipeline import OperationalInferencePipeline

router = APIRouter()

# Singleton instances
pipeline = OperationalInferencePipeline.get_instance()
review_manager = ForecasterReviewManager()


# -------------------------------------------------------------
# System Information & Provenance Endpoints
# -------------------------------------------------------------

@router.get("/status", response_model=SystemStatusResponse, summary="System Operational Status")
async def get_system_status() -> SystemStatusResponse:
    """Return runtime system status, active data sources, and configuration summary."""
    active_sources = settings.active_data_sources
    return SystemStatusResponse(
        service=settings.project_info.get("name", "RegimeRain-AI"),
        version=settings.project_info.get("version", "0.1.0"),
        status="OPERATIONAL",
        timestamp=datetime.now(timezone.utc).isoformat(),
        nwp_source=active_sources.get("nwp_mode", "GFS_FALLBACK"),
        atmospheric_source=active_sources.get("atmospheric_mode", "ERA5_FALLBACK"),
        ground_truth_source=active_sources.get("ground_truth", {}).get("name", "IMD-0.25-GRIDDED"),
        regimes_active=settings.regime_names,
        thresholds_mm=settings.critical_thresholds,
        provenance_policy=settings.source_registry.get("data_policy", "ABSOLUTE_INTEGRITY_NO_FABRICATION"),
    )


@router.get("/provenance", response_model=ProvenanceResponse, summary="Data Provenance Registry")
async def get_provenance() -> ProvenanceResponse:
    """Return explicit data source provenance, fallbacks, licenses, and access policies."""
    registry = settings.source_registry
    return ProvenanceResponse(
        registry_version=registry.get("registry_version", "1.0.0"),
        data_policy=registry.get("data_policy", "ABSOLUTE_INTEGRITY_NO_FABRICATION"),
        last_updated=registry.get("last_updated", "2026-09-29T22:15:00Z"),
        sources=registry.get("sources", {}),
        environment_status=settings.environment_status,
    )


@router.get("/model-info", response_model=ModelInfoResponse, summary="Architecture and Model Metadata")
async def get_model_info() -> ModelInfoResponse:
    """Return model architecture details, foundation backbone settings, and operational regimes."""
    model_cfg = settings.system_config.get("model", {})
    return ModelInfoResponse(
        system_name=settings.project_info.get("name", "RegimeRain-AI"),
        version=settings.project_info.get("version", "0.1.0"),
        architecture="Soft-Gated Mixture-of-Experts with Foundation Atmospheric Backbone",
        foundation_backbone={
            "name": "LightweightSpatialEncoder (Fallback)",
            "status": "FALLBACK_ACTIVE",
            "full_target": "microsoft/climax",
            "note": "ClimaX ViT weights not loaded in local environment; executing high-capacity residual CNN fallback.",
        },
        bias_correction=model_cfg.get("bias_correction", {}),
        regimes=settings.regimes,
        quantiles=model_cfg.get("bias_correction", {}).get("quantiles", []),
        critical_thresholds_mm=settings.critical_thresholds,
        verification_frameworks=["pySTEPS", "xsdba", "scipy"],
        disclaimer=(
            "Decision-Support System for SIH 2026 Problem Statement 80. "
            "Does not issue official statutory warnings; all advisories require certified human forecaster review."
        ),
    )


@router.get("/regimes", summary="List Operational Weather Regimes")
async def get_regimes() -> List[Dict[str, Any]]:
    return settings.regimes


@router.get("/thresholds", summary="Rainfall and Warning Thresholds")
async def get_thresholds() -> Dict[str, Any]:
    return settings.thresholds


# -------------------------------------------------------------
# Operational Forecast & District Decision Support Endpoints
# -------------------------------------------------------------

@router.get("/forecast/predict", summary="Run Operational Forecast Inference")
async def get_forecast_prediction(
    lead_hours: int = Query(24, description="Forecast lead time in hours (24, 48, or 72)")
) -> Dict[str, Any]:
    """Execute real neural model inference and return regime probabilities and domain summaries."""
    if lead_hours not in (24, 48, 72):
        lead_hours = 24
    inference_result = pipeline.run_inference(lead_hours=lead_hours)

    return {
        "timestamp": inference_result["forecast_valid_time"],
        "lead_time_hours": inference_result["lead_time_hours"],
        "mode": inference_result["mode"],
        "mode_label": inference_result["mode_label"],
        "data_source_status": inference_result["data_source_status"],
        "data_integrity_policy": inference_result["data_integrity_policy"],
        "dominant_regime": inference_result["dominant_regime"],
        "regime_probabilities": inference_result["regime_probabilities"],
        "domain_stats": inference_result["domain_stats"],
        "district_alert_counts": inference_result["district_alert_counts"],
        "total_districts": inference_result["total_districts"],
        "model_metadata": inference_result["model_metadata"],
    }


@router.get("/forecast/districts", summary="Get All District Advisories & IMD Color Alerts")
async def get_district_advisories(
    lead_hours: int = Query(24, description="Forecast lead time in hours (24, 48, or 72)")
) -> List[Dict[str, Any]]:
    """Return all districts with real-time IMD color codes, rainfall statistics, explanations, and action texts."""
    if lead_hours not in (24, 48, 72):
        lead_hours = 24
    inference_result = pipeline.run_inference(lead_hours=lead_hours)
    return inference_result["districts"]


@router.get("/forecast/district/{district_id}", summary="Get Single District Deep Intelligence")
async def get_single_district_forecast(
    district_id: str,
    lead_hours: int = Query(24, description="Forecast lead time in hours (24, 48, or 72)")
) -> Dict[str, Any]:
    """Return detailed intelligence, quantiles, exceedances, timeline, and explanation for a specific district."""
    if lead_hours not in (24, 48, 72):
        lead_hours = 24
    inference_result = pipeline.run_inference(lead_hours=lead_hours)
    for dist in inference_result["districts"]:
        if dist["district_id"].upper() == district_id.upper():
            return dist
    raise HTTPException(status_code=404, detail=f"District '{district_id}' not found.")


@router.get("/forecast/map", summary="Get Geospatial Grids for Map Layers")
async def get_map_layers(
    lead_hours: int = Query(24, description="Forecast lead time in hours (24, 48, or 72)")
) -> Dict[str, Any]:
    """Return gridded fields (median rainfall, heavy rain probability, very heavy probability, and raw NWP) for map rendering."""
    if lead_hours not in (24, 48, 72):
        lead_hours = 24
    inference_result = pipeline.run_inference(lead_hours=lead_hours)
    return {
        "lead_time_hours": lead_hours,
        "mode": inference_result["mode"],
        "dominant_regime": inference_result["dominant_regime"],
        "spatial_grid": inference_result["spatial_grid"],
    }


@router.post("/forecast/override", summary="Forecaster Manual Alert Override")
async def override_district_advisory(req: ForecasterOverrideRequest) -> Dict[str, Any]:
    """Apply an operational meteorologist override to a district alert with provenance tracking."""
    inference_result = pipeline.run_inference(lead_hours=24)
    target_advisory = None
    target_idx = -1

    for idx, a in enumerate(inference_result["districts"]):
        if a["district_id"].upper() == req.district_id.upper():
            target_advisory = a
            target_idx = idx
            break

    if target_advisory is None:
        raise HTTPException(status_code=404, detail=f"District '{req.district_id}' not found.")

    updated = review_manager.apply_override(
        district_advisory=target_advisory,
        forecaster_id=req.forecaster_id,
        overridden_color=req.overridden_color,
        scaling_multiplier=req.scaling_multiplier,
        justification_reason=req.justification_reason,
    )

    inference_result["districts"][target_idx] = updated
    return {
        "status": "SUCCESS",
        "message": f"District {req.district_id} updated by {req.forecaster_id}.",
        "updated_advisory": updated,
    }


@router.get("/forecast/overrides", summary="Get Forecaster Override Provenance Audit History")
async def get_override_history() -> List[Dict[str, Any]]:
    """Return immutable history of all forecaster overrides."""
    return review_manager.get_audit_history()


# -------------------------------------------------------------
# Scientific Verification & Experiment Endpoints
# -------------------------------------------------------------

@router.get("/verification/benchmark", summary="Get Core Comparative Experiment Results")
async def get_benchmark_results() -> Dict[str, Any]:
    """Return Core 3-Way Experiment (Raw NWP vs Global QM vs Soft MoE) results and block-bootstrap stats."""
    path = Path("artifacts/experiments/core_experiment_results.json")
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            data["verification_status"] = "SYNTHETIC VALIDATION / METHODOLOGY DEMONSTRATION"
            data["validation_note"] = (
                "Evaluated using Paired Stationary Block-Bootstrap on reproducible synthetic synoptic chronologies (N=40). "
                "Demonstrates multi-scale FSS and extreme quantile verification methodology."
            )
            return data
    raise HTTPException(status_code=404, detail="Benchmark results not yet generated.")


@router.get("/verification/ablation", summary="Get Architectural Ablation Results")
async def get_ablation_results() -> Dict[str, Any]:
    """Return 5-way architectural ablation study results."""
    path = Path("artifacts/experiments/ablation_study_results.json")
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            data["verification_status"] = "SYNTHETIC VALIDATION / METHODOLOGY DEMONSTRATION"
            return data
    raise HTTPException(status_code=404, detail="Ablation results not yet generated.")


@router.get("/verification/leaderboard", summary="Get Extended 6-Model Leaderboard")
async def get_leaderboard_results() -> Dict[str, Any]:
    """Return extended multi-model baseline comparison leaderboard."""
    path = Path("artifacts/experiments/extended_baseline_results.json")
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            data["verification_status"] = "SYNTHETIC VALIDATION / METHODOLOGY DEMONSTRATION"
            return data
    raise HTTPException(status_code=404, detail="Leaderboard results not yet generated.")


# -------------------------------------------------------------
# Demonstration Authentication & Session Management Endpoints
# -------------------------------------------------------------

DEMO_USERS: Dict[str, Dict[str, Any]] = {
    "district.officer@demo.regimerain": {
        "user_id": "usr_dist_01",
        "email": "district.officer@demo.regimerain",
        "name": "Dr. A. Verma",
        "role": "District Officer",
        "role_key": "district_officer",
        "organization": "Odisha Disaster Management Authority (OSDMA)",
        "assigned_districts": ["OD_PUR", "KL_WAY"],
        "capabilities": [
            "view_forecast",
            "view_districts",
            "view_alerts",
            "manage_watchlist",
            "district_intelligence",
        ],
    },
    "forecaster@demo.regimerain": {
        "user_id": "usr_fcst_01",
        "email": "forecaster@demo.regimerain",
        "name": "S. Banerjee",
        "role": "Forecast Analyst",
        "role_key": "forecaster",
        "organization": "India Meteorological Department (IMD)",
        "assigned_districts": ["ALL"],
        "capabilities": [
            "view_forecast",
            "view_districts",
            "view_alerts",
            "manage_watchlist",
            "view_regimes",
            "view_diagnostics",
            "forecaster_override",
            "view_audit_trail",
        ],
    },
    "disaster.manager@demo.regimerain": {
        "user_id": "usr_ndrf_01",
        "email": "disaster.manager@demo.regimerain",
        "name": "R. K. Meena",
        "role": "Disaster Management",
        "role_key": "disaster_manager",
        "organization": "National Disaster Response Force (NDRF)",
        "assigned_districts": ["ALL"],
        "capabilities": [
            "view_forecast",
            "view_districts",
            "view_alerts",
            "manage_watchlist",
            "national_overview",
            "priority_dispatch",
            "multi_horizon_outlook",
        ],
    },
    "policy@demo.regimerain": {
        "user_id": "usr_moes_01",
        "email": "policy@demo.regimerain",
        "name": "P. Iyer",
        "role": "Policy / Administration",
        "role_key": "policy",
        "organization": "Ministry of Earth Sciences (MoES)",
        "assigned_districts": ["ALL"],
        "capabilities": [
            "view_forecast",
            "view_districts",
            "view_alerts",
            "state_summaries",
            "national_risk_overview",
        ],
    },
    "research@demo.regimerain": {
        "user_id": "usr_res_01",
        "email": "research@demo.regimerain",
        "name": "Dr. K. Swaminathan",
        "role": "Research User",
        "role_key": "research",
        "organization": "Indian Institute of Tropical Meteorology (IITM)",
        "assigned_districts": ["ALL"],
        "capabilities": [
            "view_forecast",
            "view_districts",
            "view_alerts",
            "view_regimes",
            "view_verification",
            "model_diagnostics",
            "ablation_benchmarks",
        ],
    },
}

DEMO_PASSWORD = "demo2026"

# In-memory demo watchlists per user
USER_WATCHLISTS: Dict[str, List[str]] = {
    "district.officer@demo.regimerain": ["OD_PUR", "KL_WAY"],
    "forecaster@demo.regimerain": ["OD_PUR", "MH_MUM", "KL_WAY"],
    "disaster.manager@demo.regimerain": ["OD_PUR", "KL_WAY", "MH_RAT", "AP_VSK"],
    "policy@demo.regimerain": ["OD_PUR", "MH_MUM", "DL_DEL"],
    "research@demo.regimerain": ["OD_PUR", "WB_KOL", "KL_WAY"],
}


from backend.schemas.common import (
    LoginRequest,
    LoginResponse,
    UserProfile,
    WatchlistRequest,
    WatchlistResponse,
    AlertItem,
    AlertsResponse,
)


@router.post("/auth/login", response_model=LoginResponse, summary="Demonstration User Authentication")
async def login(req: LoginRequest) -> LoginResponse:
    """Authenticate demonstration users with institutional roles.
    
    Seed Accounts:
      - district.officer@demo.regimerain (District Officer)
      - forecaster@demo.regimerain (Forecast Analyst)
      - disaster.manager@demo.regimerain (Disaster Management)
      - policy@demo.regimerain (Policy / Administration)
      - research@demo.regimerain (Research User)
    Password for all demo accounts: demo2026
    """
    email = req.email.strip().lower()
    if email not in DEMO_USERS or req.password != DEMO_PASSWORD:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials. For demonstration, select a seeded role or use password 'demo2026'."
        )

    user_dict = DEMO_USERS[email]
    # Simple simulated token for demonstration environment
    token = f"demo_jwt_{user_dict['user_id']}_{int(datetime.now(timezone.utc).timestamp())}"

    return LoginResponse(
        token=token,
        user=UserProfile(**user_dict),
        message=f"Authenticated as {user_dict['role']} ({user_dict['name']})"
    )


@router.get("/auth/me", response_model=UserProfile, summary="Get Current Authenticated User")
async def get_current_user(email: str = Query("district.officer@demo.regimerain")) -> UserProfile:
    """Return user profile and capabilities for current active session."""
    email_clean = email.strip().lower()
    if email_clean in DEMO_USERS:
        return UserProfile(**DEMO_USERS[email_clean])
    # Fallback to district officer
    return UserProfile(**DEMO_USERS["district.officer@demo.regimerain"])


@router.post("/auth/logout", summary="End User Session")
async def logout() -> Dict[str, str]:
    """Logout current demonstration session."""
    return {"status": "SUCCESS", "message": "Session terminated"}


# -------------------------------------------------------------
# Watchlist Endpoints
# -------------------------------------------------------------

@router.get("/watchlist", response_model=WatchlistResponse, summary="Get User District Watchlist")
async def get_watchlist(user_email: str = Query("district.officer@demo.regimerain")) -> WatchlistResponse:
    """Return watched district identifiers for the current user."""
    email = user_email.strip().lower()
    items = USER_WATCHLISTS.get(email, ["OD_PUR", "KL_WAY"])
    return WatchlistResponse(
        watchlist=items,
        count=len(items),
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/watchlist", response_model=WatchlistResponse, summary="Add District to Watchlist")
async def add_to_watchlist(
    req: WatchlistRequest,
    user_email: str = Query("district.officer@demo.regimerain")
) -> WatchlistResponse:
    """Add a district to user's persistent watchlist."""
    email = user_email.strip().lower()
    if email not in USER_WATCHLISTS:
        USER_WATCHLISTS[email] = ["OD_PUR", "KL_WAY"]

    d_id = req.district_id.upper()
    if d_id not in USER_WATCHLISTS[email]:
        USER_WATCHLISTS[email].append(d_id)

    return WatchlistResponse(
        watchlist=USER_WATCHLISTS[email],
        count=len(USER_WATCHLISTS[email]),
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.delete("/watchlist/{district_id}", response_model=WatchlistResponse, summary="Remove District from Watchlist")
async def remove_from_watchlist(
    district_id: str,
    user_email: str = Query("district.officer@demo.regimerain")
) -> WatchlistResponse:
    """Remove a district from user's persistent watchlist."""
    email = user_email.strip().lower()
    if email not in USER_WATCHLISTS:
        USER_WATCHLISTS[email] = ["OD_PUR", "KL_WAY"]

    d_id = district_id.upper()
    if d_id in USER_WATCHLISTS[email]:
        USER_WATCHLISTS[email].remove(d_id)

    return WatchlistResponse(
        watchlist=USER_WATCHLISTS[email],
        count=len(USER_WATCHLISTS[email]),
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


# -------------------------------------------------------------
# Alerts & Warning Center Endpoints
# -------------------------------------------------------------

@router.get("/alerts", response_model=AlertsResponse, summary="Get Active District Alerts and Warnings")
async def get_alerts(lead_hours: int = Query(24, description="Forecast lead time in hours (24, 48, 72)")) -> AlertsResponse:
    """Return all active district alerts categorized by IMD color code (RED, ORANGE, YELLOW) derived from neural inference."""
    if lead_hours not in (24, 48, 72):
        lead_hours = 24
    inference_result = pipeline.run_inference(lead_hours=lead_hours)

    alerts: List[AlertItem] = []
    red_count = 0
    orange_count = 0
    yellow_count = 0

    valid_window = f"Valid next {lead_hours} hours (until {inference_result['forecast_valid_time']})"

    for dist in inference_result["districts"]:
        color = dist["advisory"]["color_code"].upper()
        if color == "RED":
            red_count += 1
            severity_label = "Warning (Take Action)"
        elif color == "ORANGE":
            orange_count += 1
            severity_label = "Alert (Be Prepared)"
        elif color == "YELLOW":
            yellow_count += 1
            severity_label = "Watch (Be Updated)"
        else:
            continue  # GREEN does not produce an active alert card

        why = dist.get("explanation", {}).get("summary", "")
        if not why:
            regime = dist["advisory"]["dominant_regime"].replace("_", " ").title()
            why = f"Elevated extreme rainfall probability under {regime} regime influence."

        alerts.append(
            AlertItem(
                alert_id=f"ALT_{dist['district_id']}_{lead_hours}H",
                district_id=dist["district_id"],
                district_name=dist["name"],
                state_name=dist["state"],
                severity=color,
                severity_label=severity_label,
                expected_rainfall_mm=dist["forecast"]["mean_q50_mm"],
                likely_range_mm=dist["forecast"]["likely_range_q25_q75"],
                prob_heavy=dist["forecast"]["prob_heavy_64_5mm"],
                prob_very_heavy=dist["forecast"]["prob_very_heavy_115_6mm"],
                prob_extreme=dist["forecast"]["prob_extreme_204_5mm"],
                dominant_regime=dist["advisory"]["dominant_regime"],
                confidence=dist["forecast"].get("confidence", "High"),
                valid_window=valid_window,
                why_highlighted=why,
                recommended_action=dist["advisory"]["action_text"],
                issued_at=inference_result["forecast_valid_time"],
            )
        )

    # Sort alerts: RED first, then ORANGE, then YELLOW, then highest rainfall
    severity_order = {"RED": 0, "ORANGE": 1, "YELLOW": 2}
    alerts.sort(key=lambda a: (severity_order.get(a.severity, 99), -a.expected_rainfall_mm))

    return AlertsResponse(
        total_alerts=len(alerts),
        red_count=red_count,
        orange_count=orange_count,
        yellow_count=yellow_count,
        lead_hours=lead_hours,
        alerts=alerts,
    )

