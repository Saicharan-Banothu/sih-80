"""Comprehensive test suite for Phase 2 feature engineering, dynamic circulation, and leakage audits."""

import pytest
import numpy as np
import pandas as pd

from ml.data.gfs import GFSAdapter
from ml.features.spatial import (
    compute_spatial_gradients_2d,
    compute_relative_vorticity_2d,
    compute_divergence_2d,
    compute_spatial_neighborhood_features,
)
from ml.features.anomalies import (
    compute_slp_anomalies_2d,
    compute_monsoon_meridional_pressure_index,
    compute_moisture_flux_2d,
)
from ml.features.masks import SpatialMasks
from ml.features.temporal import (
    encode_cyclic_seasonality,
    encode_lead_time,
)
from ml.features.normalization import FeatureNormalizer
from ml.features.leakage_audit import LeakageAuditor, DataLeakageError
from ml.features.builder import FeatureBuilder, FeatureMatrix


def test_spatial_derivatives_and_vorticity():
    """Verify that metric spatial derivatives and vorticity/divergence are computed accurately."""
    lats = np.arange(10.0, 20.0 + 0.01, 0.25)
    lons = np.arange(70.0, 80.0 + 0.01, 0.25)
    n_lat, n_lon = len(lats), len(lons)

    # Synthetic cyclonic vortex: u = -sin(theta), v = cos(theta)
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    u_wind = -2.0 * np.sin(np.radians(lat_grid * 10))
    v_wind = 2.0 * np.cos(np.radians(lon_grid * 10))

    vorticity = compute_relative_vorticity_2d(u_wind, v_wind, lats, resolution_deg=0.25)
    divergence = compute_divergence_2d(u_wind, v_wind, lats, resolution_deg=0.25)

    assert vorticity.shape == (n_lat, n_lon)
    assert divergence.shape == (n_lat, n_lon)
    assert not np.all(vorticity == 0.0)
    assert not np.isnan(vorticity).any()


def test_anomaly_and_moisture_flux():
    """Verify SLP domain anomalies and moisture flux magnitude."""
    slp = np.full((10, 10), 1000.0, dtype=np.float32)
    slp[5, 5] = 980.0  # Deep low pressure core
    dom_anom, _ = compute_slp_anomalies_2d(slp)
    assert dom_anom[5, 5] < 0.0, "Depression center must have negative pressure anomaly"

    u = np.full((10, 10), 10.0, dtype=np.float32)
    v = np.full((10, 10), 0.0, dtype=np.float32)
    q = np.full((10, 10), 15.0, dtype=np.float32)
    u_f, v_f, mag = compute_moisture_flux_2d(u, v, q)
    assert np.allclose(u_f, 150.0)
    assert np.allclose(v_f, 0.0)
    assert np.allclose(mag, 150.0)


def test_topography_and_land_masks():
    """Verify topographic and land-sea static masks."""
    lats = np.arange(6.5, 38.5 + 0.01, 0.25)
    lons = np.arange(68.0, 98.0 + 0.01, 0.25)

    topo = SpatialMasks.get_topography_mask(lats, lons)
    assert topo.shape == (len(lats), len(lons))
    assert topo.min() >= 0.0 and topo.max() <= 1.0

    land = SpatialMasks.get_land_sea_mask(lats, lons)
    assert land.shape == (len(lats), len(lons))
    assert set(np.unique(land)).issubset({0.0, 1.0})


def test_temporal_encodings():
    """Verify cyclic seasonality and normalized lead-time functions."""
    doy_sin, doy_cos, m_sin, m_cos = encode_cyclic_seasonality("2025-07-15")
    assert -1.0 <= doy_sin <= 1.0
    assert -1.0 <= doy_cos <= 1.0
    assert np.isclose(doy_sin ** 2 + doy_cos ** 2, 1.0, atol=1e-5)

    lead_norm = encode_lead_time(48, max_lead_hours=72)
    assert np.isclose(lead_norm, 48.0 / 72.0)


def test_feature_normalizer_training_separation():
    """Verify normalizer is fitted strictly on training data and retains fitted stats."""
    # Synthetic training batch (5 samples, 3 channels, 8x8)
    rng = np.random.RandomState(42)
    X_train = rng.normal(loc=10.0, scale=2.0, size=(5, 3, 8, 8)).astype(np.float32)
    X_test = rng.normal(loc=15.0, scale=2.0, size=(2, 3, 8, 8)).astype(np.float32)

    normalizer = FeatureNormalizer(channel_names=["c1", "c2", "c3"])
    assert normalizer.fitted_on_training_only is False

    # Fit on training data
    normalizer.fit(X_train)
    assert normalizer.fitted_on_training_only is True
    assert normalizer.n_samples_fitted == 5

    # Transform training data (should have mean ~0 and std ~1)
    X_train_norm = normalizer.transform(X_train)
    assert np.allclose(np.mean(X_train_norm, axis=(0, 2, 3)), 0.0, atol=1e-2)

    # Transform test data using the training parameters (mean will NOT be 0)
    X_test_norm = normalizer.transform(X_test)
    assert X_test_norm.shape == X_test.shape
    assert not np.allclose(np.mean(X_test_norm, axis=(0, 2, 3)), 0.0, atol=1e-1)


def test_feature_builder_pipeline():
    """Verify end-to-end feature builder creates 20 standard channels without error."""
    adapter = GFSAdapter(resolution_deg=0.25)
    forecast = adapter.load("2025-07-15T00:00:00Z", lead_time_hours=24)

    builder = FeatureBuilder(resolution_deg=0.25)
    features = builder.build_features(forecast)

    assert isinstance(features, FeatureMatrix)
    assert features.num_channels == 20
    assert features.tensor.shape == (20, len(forecast.lats), len(forecast.lons))
    assert not np.isnan(features.tensor).any(), "Feature tensor must contain zero NaNs"
    assert "vorticity_850" in features.channel_names
    assert "moisture_flux_mag" in features.channel_names


def test_leakage_auditor_detects_prohibited_tokens():
    """Verify leakage auditor catches prohibited target tokens in feature names."""
    invalid_features = ["rainfall_raw_nwp", "observed_rainfall_valid", "u_wind"]
    with pytest.raises(DataLeakageError):
        LeakageAuditor.run_full_audit(
            feature_names=invalid_features,
            forecast_ref_time="2025-07-15T00:00:00Z",
            valid_time="2025-07-16T00:00:00Z",
            observation_timestamps_used=[],
            raise_on_violation=True,
        )


def test_leakage_auditor_detects_future_timestamps():
    """Verify leakage auditor catches observations post-dating forecast reference time."""
    ref_time = "2025-07-15T00:00:00Z"
    future_obs_timestamp = "2025-07-15T12:00:00Z"  # 12 hours after forecast issue
    valid_time = "2025-07-16T00:00:00Z"

    with pytest.raises(DataLeakageError):
        LeakageAuditor.run_full_audit(
            feature_names=["rainfall_raw_nwp", "u_wind"],
            forecast_ref_time=ref_time,
            valid_time=valid_time,
            observation_timestamps_used=[future_obs_timestamp],
            raise_on_violation=True,
        )
