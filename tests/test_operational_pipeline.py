"""Unit and integration tests for the OperationalInferencePipeline and enhanced API endpoints."""

from __future__ import annotations

import pytest
import numpy as np
from starlette.testclient import TestClient

from backend.main import app
from ml.joint.inference_pipeline import OperationalInferencePipeline


@pytest.fixture(scope="module")
def pipeline():
    return OperationalInferencePipeline.get_instance()


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


class TestOperationalInferencePipeline:
    def test_inference_execution_and_structure(self, pipeline):
        res = pipeline.run_inference(lead_hours=24)
        assert res["mode"] == "DEMONSTRATION"
        assert "DEMONSTRATION MODE" in res["mode_label"]
        assert res["data_integrity_policy"] == "ABSOLUTE_INTEGRITY_NO_FABRICATION"
        assert res["total_districts"] == 17
        assert len(res["districts"]) == 17

    def test_regime_probabilities_sum_to_one(self, pipeline):
        res = pipeline.run_inference(lead_hours=24)
        probs = res["regime_probabilities"]
        assert len(probs) == 6
        total = sum(probs.values())
        assert abs(total - 1.0) < 1e-4
        for k, v in probs.items():
            assert 0.0 <= v <= 1.0

    def test_quantile_monotonicity(self, pipeline):
        res = pipeline.run_inference(lead_hours=24)
        for dist in res["districts"]:
            q = dist["forecast"]["quantiles"]
            assert q["q10"] <= q["q25"] <= q["q50"] <= q["q75"] <= q["q90"] <= q["q95"] <= q["q99"], (
                f"Quantile crossing in district {dist['name']}: {q}"
            )

    def test_exceedance_probabilities_ordering(self, pipeline):
        res = pipeline.run_inference(lead_hours=24)
        for dist in res["districts"]:
            fc = dist["forecast"]
            assert fc["prob_heavy_64_5mm"] >= fc["prob_very_heavy_115_6mm"] >= fc["prob_extreme_204_5mm"], (
                f"Exceedance ordering violated in {dist['name']}"
            )

    def test_district_comparisons_and_explanation(self, pipeline):
        res = pipeline.run_inference(lead_hours=24)
        for dist in res["districts"]:
            comp = dist["comparison"]
            assert "raw_nwp_median_mm" in comp
            assert "global_qm_median_mm" in comp
            assert "moe_corrected_median_mm" in comp
            assert "correction_delta_mm" in comp

            expl = dist["explanation"]
            assert "summary" in expl
            assert len(expl["summary"]) > 10
            assert "synoptic_regime" in expl

            timeline = dist["timeline"]
            assert len(timeline) == 3
            assert timeline[0]["lead_hours"] == 24
            assert timeline[1]["lead_hours"] == 48
            assert timeline[2]["lead_hours"] == 72


class TestEnhancedAPIEndpoints:
    def test_forecast_predict_endpoint(self, client):
        resp = client.get("/api/v1/forecast/predict?lead_hours=24")
        assert resp.status_code == 200
        data = resp.json()
        assert data["mode"] == "DEMONSTRATION"
        assert abs(sum(data["regime_probabilities"].values()) - 1.0) < 1e-4
        assert "domain_stats" in data
        assert "district_alert_counts" in data

    def test_forecast_districts_endpoint(self, client):
        resp = client.get("/api/v1/forecast/districts?lead_hours=24")
        assert resp.status_code == 200
        districts = resp.json()
        assert len(districts) == 17
        first = districts[0]
        assert "name" in first
        assert "forecast" in first
        assert "comparison" in first
        assert "explanation" in first
        assert "timeline" in first

    def test_single_district_endpoint(self, client):
        resp = client.get("/api/v1/forecast/district/KL_WAY?lead_hours=24")
        assert resp.status_code == 200
        data = resp.json()
        assert data["district_id"] == "KL_WAY"
        assert data["name"] == "Wayanad"
        assert data["state"] == "Kerala"

        # Invalid district
        resp_404 = client.get("/api/v1/forecast/district/INVALID_XYZ")
        assert resp_404.status_code == 404

    def test_forecast_map_endpoint(self, client):
        resp = client.get("/api/v1/forecast/map?lead_hours=24")
        assert resp.status_code == 200
        data = resp.json()
        assert "spatial_grid" in data
        grid = data["spatial_grid"]
        assert "lats" in grid
        assert "lons" in grid
        assert "q50" in grid
        assert "p_heavy" in grid
        assert len(grid["lats"]) > 0
        assert len(grid["lons"]) > 0
