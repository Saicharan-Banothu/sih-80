"""Comprehensive test suite for Phase 4 Global Quantile Mapping baseline and tail behavior."""

import pytest
import numpy as np
import xarray as xr

from ml.correction.wet_day import WetDayFrequencyAdjuster
from ml.correction.tail_handling import TailExtrapolationEngine
from ml.correction.baseline_global_qm import GlobalQuantileMappingBaseline


def test_wet_day_frequency_adjuster():
    """Verify drizzle thresholding and zero-rainfall frequency matching."""
    # Synthetic NWP with excessive light drizzle (many 0.05 - 0.5 mm values)
    rng = np.random.RandomState(42)
    nwp_rain = rng.gamma(shape=0.8, scale=3.0, size=500).astype(np.float32)
    # Observed rainfall with fewer wet days
    obs_rain = nwp_rain.copy()
    obs_rain[obs_rain < 1.0] = 0.0

    adjuster = WetDayFrequencyAdjuster(wet_threshold_mm=0.1)
    adjuster.fit(nwp_rain, obs_rain)

    assert adjuster.is_fitted is True
    assert adjuster.nwp_drizzle_threshold >= 0.1

    adjusted = adjuster.apply(nwp_rain)
    assert np.all(adjusted >= 0.0)
    assert np.all(adjusted[adjusted < adjuster.nwp_drizzle_threshold] == 0.0)


def test_tail_extrapolation_engine():
    """Verify tail extrapolation handles unseen extreme rainfall beyond training max."""
    rng = np.random.RandomState(42)
    nwp_train = rng.gamma(2.0, 5.0, size=1000).astype(np.float32)
    obs_train = nwp_train * 1.3  # Systematically higher observed extremes

    tail_engine = TailExtrapolationEngine(policy="CONSTANT_DELTA")
    tail_engine.fit(nwp_train, obs_train)

    assert tail_engine.is_fitted is True
    assert tail_engine.nwp_max_train > 0.0
    assert tail_engine.obs_max_train > tail_engine.nwp_max_train

    # Test extrapolation on an unprecedented extreme event (exceeding training max)
    unseen_extreme_nwp = np.array([tail_engine.nwp_max_train + 50.0])
    mapped_val = np.array([tail_engine.obs_max_train])

    extrapolated = tail_engine.extrapolate_tail(unseen_extreme_nwp, mapped_val)
    assert extrapolated[0] > tail_engine.obs_max_train, "Extrapolated value must exceed training maximum"
    assert extrapolated[0] <= 1500.0, "Must respect physical ceiling"


def test_global_quantile_mapping_baseline_fit_and_predict():
    """Verify Global Quantile Mapping baseline corrects bias without future leakage."""
    rng = np.random.RandomState(42)
    n_train = 2000
    n_test = 500

    # True rainfall distribution
    true_train = rng.gamma(shape=1.5, scale=12.0, size=n_train).astype(np.float32)
    true_test = rng.gamma(shape=1.5, scale=12.0, size=n_test).astype(np.float32)

    # Biased NWP forecast: underpredicts mean by 20% and has excessive drizzle
    nwp_train = true_train * 0.80 + rng.uniform(0.0, 1.5, size=n_train)
    nwp_test = true_test * 0.80 + rng.uniform(0.0, 1.5, size=n_test)

    baseline = GlobalQuantileMappingBaseline(n_quantiles=100)
    assert baseline.is_fitted is False

    # Fit strictly on training set
    baseline.fit(nwp_train, true_train)
    assert baseline.is_fitted is True
    assert baseline.fitted_on_training_only is True

    # Predict on held-out test set
    corrected_test = baseline.predict(nwp_test)

    assert corrected_test.shape == nwp_test.shape
    assert np.all(corrected_test >= 0.0), "Corrected rainfall must be non-negative"

    # Evaluate bias reduction on test set
    report = baseline.evaluate_bias_reduction(nwp_test, true_test, corrected_test)

    assert report["qm_rmse_mm"] < report["raw_rmse_mm"], "QM should reduce RMSE on test set"
    assert abs(report["qm_mean_bias_mm"]) < abs(report["raw_mean_bias_mm"]), "QM should reduce mean bias"
    assert report["rmse_improvement_pct"] > 0.0
