"""Test suite for Phase 12 & 13 District Decision Engine and Forecaster Review System."""

import tempfile
from pathlib import Path
import numpy as np
import pytest

from ml.decision.district_engine import DistrictDecisionEngine
from ml.decision.forecaster_audit import ForecasterReviewManager


class TestDistrictDecisionEngine:
    """Test suite for district-level aggregation and IMD color codes."""

    @pytest.fixture
    def engine(self):
        return DistrictDecisionEngine()

    def test_determine_advisory_tiers(self, engine):
        # Tier 4: Red Warning
        c, a, s = engine.determine_advisory(mean_q50=150.0, max_q90=220.0, peak_q99=260.0, p_heavy=0.95, p_very_heavy=0.85, p_extreme=0.45)
        assert c == "RED"
        assert s == 4

        # Tier 3: Orange Alert
        c, a, s = engine.determine_advisory(mean_q50=80.0, max_q90=130.0, peak_q99=180.0, p_heavy=0.80, p_very_heavy=0.50, p_extreme=0.10)
        assert c == "ORANGE"
        assert s == 3

        # Tier 2: Yellow Watch
        c, a, s = engine.determine_advisory(mean_q50=30.0, max_q90=75.0, peak_q99=100.0, p_heavy=0.35, p_very_heavy=0.15, p_extreme=0.01)
        assert c == "YELLOW"
        assert s == 2

        # Tier 1: Green No Warning
        c, a, s = engine.determine_advisory(mean_q50=5.0, max_q90=12.0, peak_q99=18.0, p_heavy=0.02, p_very_heavy=0.0, p_extreme=0.0)
        assert c == "GREEN"
        assert s == 1

    def test_aggregate_district_forecasts_shape_and_keys(self, engine):
        lats = np.linspace(8.0, 36.0, 30)
        lons = np.linspace(68.0, 98.0, 30)
        H, W = len(lats), len(lons)

        q50 = np.full((H, W), 40.0)
        q90 = np.full((H, W), 70.0)
        q99 = np.full((H, W), 120.0)
        p_heavy = np.full((H, W), 0.40)
        p_very_heavy = np.full((H, W), 0.15)
        p_extreme = np.full((H, W), 0.02)

        advisories = engine.aggregate_district_forecasts(
            lats=lats,
            lons=lons,
            q50_grid=q50,
            q90_grid=q90,
            q99_grid=q99,
            p_heavy_grid=p_heavy,
            p_very_heavy_grid=p_very_heavy,
            p_extreme_grid=p_extreme,
        )

        assert len(advisories) > 0
        first = advisories[0]
        assert "district_id" in first
        assert "forecast" in first
        assert "advisory" in first
        assert "color_code" in first["advisory"]
        assert first["advisory"]["color_code"] in ["GREEN", "YELLOW", "ORANGE", "RED"]


class TestForecasterAudit:
    """Test suite for ForecasterReviewManager."""

    def test_apply_override_and_audit_trail(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            audit_file = Path(tmp_dir) / "test_overrides.jsonl"
            mgr = ForecasterReviewManager(audit_file_path=audit_file)

            sample_advisory = {
                "district_id": "KL_WAY",
                "name": "Wayanad",
                "forecast": {
                    "mean_q50_mm": 50.0,
                    "max_q90_mm": 80.0,
                    "peak_q99_mm": 110.0,
                },
                "advisory": {
                    "color_code": "YELLOW",
                    "severity": 2,
                    "action_text": "Be Updated",
                },
            }

            updated = mgr.apply_override(
                district_advisory=sample_advisory,
                forecaster_id="MET_OFFICER_04",
                overridden_color="ORANGE",
                scaling_multiplier=1.2,
                justification_reason="Doppler radar indicates severe mesoscale convection approaching",
            )

            assert updated["advisory"]["color_code"] == "ORANGE"
            assert updated["advisory"]["severity"] == 3
            assert updated["forecast"]["mean_q50_mm"] == 60.0  # 50.0 * 1.2
            assert "forecaster_override" in updated

            # Check audit log
            history = mgr.get_audit_history()
            assert len(history) == 1
            assert history[0]["forecaster_id"] == "MET_OFFICER_04"
            assert history[0]["original_color"] == "YELLOW"
            assert history[0]["overridden_color"] == "ORANGE"
            assert audit_file.exists()
