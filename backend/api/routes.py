"""API Router for SIH-80 Operational Forecast, District Decision Support, and Scientific Verification."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
from fastapi import APIRouter, HTTPException

from backend.config import settings
from backend.schemas.common import (
    SystemStatusResponse,
    ModelInfoResponse,
    ProvenanceResponse,
    ForecasterOverrideRequest,
)
from ml.decision.district_engine import DistrictDecisionEngine
from ml.decision.forecaster_audit import ForecasterReviewManager
from ml.correction.tail_model import ExtremeRainfallTailModel
from scripts.generate_district_advisories import generate_operational_scenario

router = APIRouter()

# Singleton instances
district_engine = DistrictDecisionEngine()
review_manager = ForecasterReviewManager()

# Cached operational forecast
_CACHED_SCENARIO = None


def get_or_create_scenario():
    global _CACHED_SCENARIO
    if _CACHED_SCENARIO is None:
        lats, lons, q50, q90, q99, tail_probs, regime_probs = generate_operational_scenario()
        advisories = district_engine.aggregate_district_forecasts(
            lats=lats,
            lons=lons,
            q50_grid=q50,
            q90_grid=q90,
            q99_grid=q99,
            p_heavy_grid=tail_probs["P_gt_64_5mm"],
            p_very_heavy_grid=tail_probs["P_gt_115_6mm"],
            p_extreme_grid=tail_probs["P_gt_204_5mm"],
            regime_probabilities=regime_probs,
        )
        _CACHED_SCENARIO = {
            "lats": lats.tolist(),
            "lons": lons.tolist(),
            "q50_mean": float(np.mean(q50)),
            "q50_max": float(np.max(q50)),
            "q90_max": float(np.max(q90)),
            "q99_max": float(np.max(q99)),
            "regime_probabilities": regime_probs,
            "dominant_regime": max(regime_probs.items(), key=lambda kv: kv[1])[0],
            "advisories": advisories,
        }
    return _CACHED_SCENARIO


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
    )


@router.get("/model-info", response_model=ModelInfoResponse, summary="Architecture and Model Metadata")
async def get_model_info() -> ModelInfoResponse:
    """Return model architecture details, foundation backbone settings, and operational regimes."""
    model_cfg = settings.system_config.get("model", {})
    return ModelInfoResponse(
        system_name=settings.project_info.get("name", "RegimeRain-AI"),
        version=settings.project_info.get("version", "0.1.0"),
        architecture="Soft-Gated Mixture-of-Experts with Foundation Atmospheric Backbone",
        foundation_backbone=model_cfg.get("foundation_backbone", {}),
        bias_correction=model_cfg.get("bias_correction", {}),
        regimes=settings.regimes,
        quantiles=model_cfg.get("bias_correction", {}).get("quantiles", []),
        critical_thresholds_mm=settings.critical_thresholds,
        verification_frameworks=["pySTEPS", "xsdba", "scipy"],
        disclaimer=(
            "Prototype Meteorological Decision-Support System for SIH 2026. "
            "Does not issue official warnings; all advisories require certified human forecaster review."
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
async def get_forecast_prediction() -> Dict[str, Any]:
    """Return operational regime prediction, uncertainty quantiles, and alert summary."""
    import numpy as np
    scenario = get_or_create_scenario()

    # Alert counts
    counts = {"RED": 0, "ORANGE": 0, "YELLOW": 0, "GREEN": 0}
    for a in scenario["advisories"]:
        counts[a["advisory"]["color_code"]] += 1

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dominant_regime": scenario["dominant_regime"],
        "regime_probabilities": scenario["regime_probabilities"],
        "domain_stats": {
            "mean_q50_mm": round(scenario["q50_mean"], 1),
            "peak_q50_mm": round(scenario["q50_max"], 1),
            "peak_q90_mm": round(scenario["q90_max"], 1),
            "peak_q99_mm": round(scenario["q99_max"], 1),
        },
        "district_alert_counts": counts,
        "total_districts": len(scenario["advisories"]),
        "model_version": "JointRegimeAware-v0.1.0",
    }


@router.get("/forecast/districts", summary="Get All District Advisories & IMD Color Alerts")
async def get_district_advisories() -> List[Dict[str, Any]]:
    """Return all districts with real-time IMD color codes, rainfall statistics, and action texts."""
    import numpy as np
    scenario = get_or_create_scenario()
    return scenario["advisories"]


@router.post("/forecast/override", summary="Forecaster Manual Alert Override")
async def override_district_advisory(req: ForecasterOverrideRequest) -> Dict[str, Any]:
    """Apply an operational meteorologist override to a district alert with provenance tracking."""
    import numpy as np
    scenario = get_or_create_scenario()
    target_advisory = None
    target_idx = -1

    for idx, a in enumerate(scenario["advisories"]):
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

    scenario["advisories"][target_idx] = updated
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
            return json.load(f)
    raise HTTPException(status_code=404, detail="Benchmark results not yet generated.")


@router.get("/verification/ablation", summary="Get Architectural Ablation Results")
async def get_ablation_results() -> Dict[str, Any]:
    """Return 5-way architectural ablation study results."""
    path = Path("artifacts/experiments/ablation_study_results.json")
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Ablation results not yet generated.")


@router.get("/verification/leaderboard", summary="Get Extended 6-Model Leaderboard")
async def get_leaderboard_results() -> Dict[str, Any]:
    """Return extended multi-model baseline comparison leaderboard."""
    path = Path("artifacts/experiments/extended_baseline_results.json")
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Leaderboard results not yet generated.")
