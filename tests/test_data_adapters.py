"""Comprehensive test suite for Phase 1 meteorological data adapters and provenance."""

import pytest
import numpy as np
import pandas as pd
import xarray as xr

from ml.data.base import BaseDataAdapter, GriddedForecastDataset
from ml.data.gfs import GFSAdapter
from ml.data.ncum import NCUMAdapter
from ml.data.era5 import ERA5Adapter
from ml.data.imdaa import IMDAAAdapter
from ml.data.imd_rainfall import IMDRainfallAdapter
from ml.data.regime_seeds import RautRegimeSeedsAdapter
from ml.data.districts import DistrictBoundaryAdapter
from ml.data.provenance import ProvenanceTracker
from ml.data.validation import validate_gridded_dataset


def test_gfs_adapter_load_and_units():
    """Verify GFS adapter produces normalized coordinates and valid physical units."""
    adapter = GFSAdapter(resolution_deg=0.25)
    dataset = adapter.load("2025-07-15T00:00:00Z", lead_time_hours=24)

    # 1. Coordinate checks
    assert "lat" in dataset.ds.coords
    assert "lon" in dataset.ds.coords
    assert np.all(np.diff(dataset.lats) > 0), "Latitudes must be monotonically increasing"
    assert np.all(np.diff(dataset.lons) > 0), "Longitudes must be monotonically increasing"
    assert dataset.lats.min() >= 6.5
    assert dataset.lats.max() <= 38.5
    assert dataset.lons.min() >= 68.0
    assert dataset.lons.max() <= 98.0

    # 2. Variable checks
    for v in ["rainfall", "u_wind", "v_wind", "slp", "moisture"]:
        assert v in dataset.ds.data_vars, f"Variable {v} missing in GFS dataset"

    # 3. Rainfall non-negativity
    rf = dataset.rainfall.values
    assert np.all(rf >= 0.0), "Rainfall must be strictly non-negative"

    # 4. Provenance
    assert dataset.receipt.data_source == "NOAA-GFS"
    assert dataset.receipt.lead_time_hours == 24


def test_ncum_adapter_fallback():
    """Verify NCUM adapter gracefully falls back to GFS with explicit logging."""
    adapter = NCUMAdapter()
    dataset = adapter.load("2025-07-15T00:00:00Z", lead_time_hours=24, use_fallback_if_unavailable=True)
    assert dataset.receipt.data_source == "NOAA-GFS"
    assert "FALLBACK ENGAGED" in dataset.receipt.provenance_note


def test_era5_adapter_load():
    """Verify ERA5 adapter loads atmospheric variables and valid pressure bounds."""
    adapter = ERA5Adapter(resolution_deg=0.25)
    dataset = adapter.load("2025-07-15T00:00:00Z")

    assert dataset.receipt.data_source == "ECMWF-ERA5"
    slp = dataset.ds["slp"].values
    assert np.all(slp >= 900.0) and np.all(slp <= 1050.0), "SLP must be within reasonable atmospheric bounds"


def test_imdaa_adapter_fallback():
    """Verify IMDAA adapter falls back to ERA5 when no raw file is given."""
    adapter = IMDAAAdapter()
    dataset = adapter.load("2025-07-15T00:00:00Z", use_fallback_if_unavailable=True)
    assert dataset.receipt.data_source == "ECMWF-ERA5"
    assert "FALLBACK ENGAGED" in dataset.receipt.provenance_note


def test_imd_rainfall_adapter_leakage_safeguard():
    """Verify IMD rainfall adapter designates data as post-forecast verification target."""
    adapter = IMDRainfallAdapter(resolution_deg=0.25)
    dataset = adapter.load("2025-07-15")

    assert dataset.receipt.data_source == "IMD-0.25-GRIDDED"
    assert dataset.receipt.lead_time_hours == 0
    assert "GROUND TRUTH VERIFICATION TARGET" in dataset.receipt.provenance_note
    rf = dataset.rainfall.values
    assert np.all(rf >= 0.0)


def test_raut_regime_seeds_mapping():
    """Verify Raut 11-cluster to 6-regime probabilistic mapping sums to 1.0."""
    for cluster_id in range(1, 12):
        probs = RautRegimeSeedsAdapter.map_cluster_to_regime_probabilities(cluster_id)
        assert len(probs) == 6
        assert np.isclose(probs.sum(), 1.0, atol=1e-5)
        assert np.all(probs >= 0.0)

    # Test seed retrieval for dates
    seed_monsoon = RautRegimeSeedsAdapter.get_seed_for_date("2025-07-15")
    assert "operational_probabilities" in seed_monsoon
    assert len(seed_monsoon["operational_probabilities"]) == 6
    assert seed_monsoon["dominant_operational_regime"] in RautRegimeSeedsAdapter.OPERATIONAL_6_REGIMES


def test_district_adapter_and_mask():
    """Verify district catalog and spatial mask extraction."""
    districts = DistrictBoundaryAdapter.get_all_districts()
    assert len(districts) >= 15

    # Check Wayanad
    wayanad = DistrictBoundaryAdapter.get_district_by_id("KL_WAY")
    assert wayanad is not None
    assert wayanad["zone"] == "WESTERN_GHATS_OROGRAPHIC"

    # Test mask generation
    lats = np.arange(6.5, 38.5 + 0.01, 0.25)
    lons = np.arange(68.0, 98.0 + 0.01, 0.25)
    mask = DistrictBoundaryAdapter.get_grid_mask_for_district(wayanad, lats, lons)
    assert mask.shape == (len(lats), len(lons))
    assert np.any(mask), "District mask must intersect at least one grid cell"


def test_provenance_validation_and_integrity():
    """Verify provenance tracker catches missing fields and enforces zero fabrication."""
    receipt = ProvenanceTracker.create_receipt(
        data_source="TEST_SOURCE",
        dataset_version="v1.0",
        forecast_reference_time="2025-07-15T00:00:00Z",
        valid_time="2025-07-16T00:00:00Z",
        lead_time_hours=24,
        model_version="TEST_MODEL",
        is_synthetic=True,
    )
    assert receipt.is_synthetic is True
    assert "DEVELOPMENT / SYNTHETIC DATA" in receipt.provenance_note

    # Incomplete receipt should raise ValueError
    receipt.data_source = ""
    with pytest.raises(ValueError):
        ProvenanceTracker.validate_receipt(receipt)


def test_validate_gridded_dataset_physical_bounds():
    """Verify dataset validator enforces coordinates and physical limits."""
    adapter = GFSAdapter(resolution_deg=0.25)
    dataset = adapter.load("2025-07-15T00:00:00Z", lead_time_hours=24)
    report = validate_gridded_dataset(dataset, strict=True)
    assert report["status"] == "PASS"
    assert len(report["issues"]) == 0
