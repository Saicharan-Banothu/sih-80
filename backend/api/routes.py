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
