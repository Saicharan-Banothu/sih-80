"""Unit and integration tests for Extreme Rainfall Tail Model and stratified evaluation."""

import numpy as np
import pytest

from ml.correction.quantiles import OPERATIONAL_QUANTILES
from ml.correction.tail_model import ExtremeRainfallTailModel, IMD_THRESHOLDS, IMD_BINS
from ml.correction.tail_evaluation import evaluate_tail_performance


class TestExtremeRainfallTailModel:
    """Test suite for ExtremeRainfallTailModel."""

    @pytest.fixture
    def tail_model(self):
        return ExtremeRainfallTailModel(pareto_scale_prior=25.0)

    def test_exceedance_probabilities_shape_and_keys_3d(self, tail_model):
        H, W = 10, 12
        # Synthetic monotonic quantiles: shape (7, H, W)
        base = np.linspace(5.0, 120.0, 7)
        quantiles = np.zeros((7, H, W), dtype=np.float32)
        for i in range(7):
            quantiles[i, :, :] = base[i]

        probs = tail_model.compute_exceedance_probabilities(quantiles)
        assert "P_gt_64_5mm" in probs
        assert "P_gt_115_6mm" in probs
        assert "P_gt_204_5mm" in probs

        assert probs["P_gt_64_5mm"].shape == (H, W)
        assert probs["P_gt_115_6mm"].shape == (H, W)
        assert probs["P_gt_204_5mm"].shape == (H, W)

    def test_exceedance_probabilities_shape_and_keys_4d(self, tail_model):
        B, H, W = 2, 8, 8
        base = np.linspace(2.0, 80.0, 7)
        quantiles = np.zeros((B, 7, H, W), dtype=np.float32)
        for b in range(B):
            for i in range(7):
                quantiles[b, i, :, :] = base[i] * (b + 1)

        probs = tail_model.compute_exceedance_probabilities(quantiles)
        assert probs["P_gt_64_5mm"].shape == (B, H, W)
        assert probs["P_gt_115_6mm"].shape == (B, H, W)
        assert probs["P_gt_204_5mm"].shape == (B, H, W)

    def test_bounds_and_monotonicity(self, tail_model):
        """Probability of exceeding higher thresholds must never exceed that of lower thresholds."""
        np.random.seed(42)
        B, H, W = 3, 15, 15
        # Generate random monotonic quantiles
        increments = np.random.uniform(0.1, 30.0, size=(B, 7, H, W)).astype(np.float32)
        quantiles = np.cumsum(increments, axis=1)

        probs = tail_model.compute_exceedance_probabilities(quantiles)
        p64 = probs["P_gt_64_5mm"]
        p115 = probs["P_gt_115_6mm"]
        p204 = probs["P_gt_204_5mm"]

        # Strict [0, 1] bounds
        assert np.all(p64 >= 0.0) and np.all(p64 <= 1.0)
        assert np.all(p115 >= 0.0) and np.all(p115 <= 1.0)
        assert np.all(p204 >= 0.0) and np.all(p204 <= 1.0)

        # Monotonicity: P(>64.5) >= P(>115.6) >= P(>204.5)
        assert np.all(p64 >= p115 - 1e-6)
        assert np.all(p115 >= p204 - 1e-6)

    def test_threshold_below_q10(self, tail_model):
        """When forecast quantiles are very high, exceedance probabilities should be high."""
        # q10 = 100 mm, all quantiles well above 64.5 mm
        quantiles = np.full((1, 7, 5, 5), 100.0, dtype=np.float32)
        quantiles[:, 1, :, :] = 120.0
        quantiles[:, 6, :, :] = 300.0

        probs = tail_model.compute_exceedance_probabilities(quantiles)
        # Since threshold 64.5 <= q10 (100.0), exceedance is > 0.90
        assert np.all(probs["P_gt_64_5mm"] >= 0.90)

    def test_threshold_above_q99(self, tail_model):
        """When forecast quantiles are dry/low, exceedance probabilities should decay exponentially."""
        # Entire quantile distribution below 10 mm
        quantiles = np.zeros((1, 7, 4, 4), dtype=np.float32)
        for i in range(7):
            quantiles[:, i, :, :] = 1.0 + i * 1.0  # max q99 = 7 mm

        probs = tail_model.compute_exceedance_probabilities(quantiles)
        # All thresholds are far above q99 (7 mm), so exceedance should be <= 0.01
        assert np.all(probs["P_gt_64_5mm"] <= 0.01)
        assert np.all(probs["P_gt_115_6mm"] <= 0.01)
        assert np.all(probs["P_gt_204_5mm"] <= 0.01)

    def test_classify_rainfall_intensity(self, tail_model):
        rain = np.array([0.0, 1.5, 10.0, 45.0, 75.0, 150.0, 250.0])
        labels = tail_model.classify_rainfall_intensity(rain)
        expected = [
            "NO_RAIN_TRACE",
            "NO_RAIN_TRACE",
            "LIGHT",
            "MODERATE",
            "HEAVY",
            "VERY_HEAVY",
            "EXTREMELY_HEAVY",
        ]
        assert list(labels) == expected


class TestTailEvaluation:
    """Test suite for evaluate_tail_performance."""

    def test_evaluate_tail_performance_stratification(self):
        np.random.seed(123)
        N = 200
        # Create diverse rainfall values covering all IMD bins
        obs = np.array(
            [0.5] * 50 + [10.0] * 50 + [35.0] * 40 + [80.0] * 30 + [150.0] * 20 + [250.0] * 10,
            dtype=np.float32,
        )
        raw = obs + np.random.normal(0, 10, size=len(obs)).astype(np.float32)
        qm = obs + np.random.normal(0, 6, size=len(obs)).astype(np.float32)
        moe = obs + np.random.normal(0, 3, size=len(obs)).astype(np.float32)

        # Extreme probabilities
        p_heavy = (obs >= 64.5).astype(np.float32)
        p_very_heavy = (obs >= 115.6).astype(np.float32)
        p_extreme = (obs >= 204.5).astype(np.float32)

        results = evaluate_tail_performance(
            obs=obs,
            raw_nwp=raw,
            qm_corrected=qm,
            moe_median=moe,
            moe_p_heavy=p_heavy,
            moe_p_very_heavy=p_very_heavy,
            moe_p_extreme=p_extreme,
        )

        assert "overall" in results
        assert "stratified_by_intensity" in results
        assert "probabilistic_brier_scores" in results

        strat = results["stratified_by_intensity"]
        assert "HEAVY" in strat
        assert "VERY_HEAVY" in strat
        assert "EXTREMELY_HEAVY" in strat

        assert strat["HEAVY"]["count"] == 30
        assert strat["VERY_HEAVY"]["count"] == 20
        assert strat["EXTREMELY_HEAVY"]["count"] == 10

        brier = results["probabilistic_brier_scores"]
        assert brier["brier_heavy_64_5mm"] == 0.0  # Perfect probabilities
        assert brier["brier_very_heavy_115_6mm"] == 0.0
        assert brier["brier_extreme_204_5mm"] == 0.0
