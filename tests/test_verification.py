"""Unit and integration test suite for Scientific Verification and pySTEPS Spatial Metrics."""

import numpy as np
import pytest

from ml.verification.contingency import compute_contingency_table, compute_categorical_scores
from ml.verification.spatial import compute_fss, compute_multi_scale_fss, compute_fss_fallback
from ml.verification.probabilistic import (
    compute_crps_quantiles,
    compute_brier_skill_score,
    compute_reliability_curve,
)
from ml.verification.engine import ScientificVerificationEngine


class TestCategoricalVerification:
    """Test suite for 2x2 contingency table and categorical metrics."""

    def test_contingency_table_exact_counts(self):
        # 4 pixels: (f, o) = [(10, 10), (10, 0), (0, 10), (0, 0)] with threshold = 5.0
        forecast = np.array([[10.0, 10.0], [0.0, 0.0]])
        observed = np.array([[10.0, 0.0], [10.0, 0.0]])
        table = compute_contingency_table(forecast, observed, threshold=5.0)

        assert table["H"] == 1
        assert table["F"] == 1
        assert table["M"] == 1
        assert table["C"] == 1
        assert table["total"] == 4

    def test_categorical_scores_mathematics(self):
        forecast = np.array([[10.0, 10.0], [0.0, 0.0]])
        observed = np.array([[10.0, 0.0], [10.0, 0.0]])
        scores = compute_categorical_scores(forecast, observed, threshold=5.0)

        # POD = 1 / (1 + 1) = 0.5
        assert scores["POD"] == 0.5
        # FAR = 1 / (1 + 1) = 0.5
        assert scores["FAR"] == 0.5
        # CSI = 1 / (1 + 1 + 1) = 0.3333
        assert pytest.approx(scores["CSI"], rel=1e-2) == 0.3333
        # BIAS = (1 + 1) / (1 + 1) = 1.0
        assert scores["BIAS"] == 1.0


class TestSpatialVerification:
    """Test suite for Fractions Skill Score (FSS)."""

    def test_fss_perfect_forecast(self):
        arr = np.random.RandomState(42).uniform(0, 100, size=(20, 20))
        fss = compute_fss(arr, arr, threshold=50.0, scale=3)
        assert pytest.approx(fss, abs=1e-3) == 1.0

    def test_fss_completely_wrong_forecast(self):
        f = np.zeros((20, 20))
        o = np.full((20, 20), 100.0)
        fss = compute_fss(f, o, threshold=50.0, scale=3)
        assert fss == 0.0

    def test_fss_increases_with_spatial_scale(self):
        """Displaced storms must have higher skill at larger neighborhood scales (Roberts & Lean 2008)."""
        f = np.zeros((40, 40))
        o = np.zeros((40, 40))
        # Displaced rain centers with no initial overlap at scale 1
        f[10:15, 10:15] = 80.0
        o[20:25, 20:25] = 80.0

        fss_s1 = compute_fss(f, o, threshold=50.0, scale=1)
        fss_s11 = compute_fss(f, o, threshold=50.0, scale=11)
        fss_s21 = compute_fss(f, o, threshold=50.0, scale=21)

        assert fss_s1 == 0.0  # Zero grid-box overlap at scale 1
        assert fss_s11 > fss_s1
        assert fss_s21 > fss_s11

    def test_multi_scale_fss_structure(self):
        f = np.random.rand(25, 25) * 80.0
        o = np.random.rand(25, 25) * 80.0
        matrix = compute_multi_scale_fss(f, o, thresholds=[15.6, 64.5], scales=[1, 3, 5])

        assert "thresh_15.6mm" in matrix
        assert "thresh_64.5mm" in matrix
        assert "scale_1x1" in matrix["thresh_15.6mm"]
        assert "scale_3x3" in matrix["thresh_15.6mm"]
        assert "fss_useful_threshold" in matrix["thresh_15.6mm"]


class TestProbabilisticVerification:
    """Test suite for CRPS, Brier Skill Score, and Reliability Curves."""

    def test_crps_quantiles(self):
        # Perfect forecast where observation matches median q50
        obs = np.array([50.0, 50.0])
        # 7 quantiles bracketed around 50
        quantiles = np.array([
            [40.0, 40.0],
            [45.0, 45.0],
            [50.0, 50.0],
            [55.0, 55.0],
            [60.0, 60.0],
            [65.0, 65.0],
            [70.0, 70.0],
        ])
        crps = compute_crps_quantiles(quantiles, obs)
        assert crps > 0.0

        # Displaced quantiles far away should produce higher CRPS
        quantiles_displaced = quantiles + 100.0
        crps_displaced = compute_crps_quantiles(quantiles_displaced, obs)
        assert crps_displaced > crps

    def test_brier_skill_score(self):
        obs = np.array([10.0, 20.0, 80.0, 100.0])
        # Perfect probabilities for threshold 64.5: [0, 0, 1, 1]
        probs = np.array([0.0, 0.0, 1.0, 1.0])
        bss_res = compute_brier_skill_score(probs, obs, threshold=64.5)

        assert bss_res["brier_score"] == 0.0
        assert bss_res["brier_skill_score"] == 1.0

    def test_reliability_curve(self):
        obs = np.random.rand(100) * 100.0
        probs = np.random.rand(100)
        rel = compute_reliability_curve(probs, obs, threshold=50.0, n_bins=5)

        assert len(rel["bin_centers"]) == 5
        assert len(rel["mean_forecast_probs"]) == 5
        assert len(rel["observed_frequencies"]) == 5
        assert sum(rel["sample_counts"]) == 100


class TestScientificVerificationEngine:
    """Test suite for unified verification engine."""

    def test_compare_forecasts_complete(self):
        H, W = 15, 15
        obs = np.random.exponential(10.0, size=(H, W))
        raw = obs * 0.70
        qm = obs * 0.85
        moe = obs * 0.98

        engine = ScientificVerificationEngine(
            critical_thresholds=[2.5, 64.5],
            spatial_scales=[1, 3],
        )

        comparison = engine.compare_forecasts(
            raw_nwp=raw,
            qm_corrected=qm,
            moe_median=moe,
            obs=obs,
        )

        assert "continuous_metrics" in comparison
        assert "categorical_metrics" in comparison
        assert "spatial_fss" in comparison
        assert comparison["continuous_metrics"]["moe_rmse_gain_vs_raw_pct"] > 0
