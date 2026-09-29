"""Unit tests for configuration loading, schema integrity, and regime taxonomy."""

import pytest
from pathlib import Path
from backend.config import SystemSettings, settings

EXPECTED_REGIMES = [
    "ACTIVE_MONSOON",
    "BREAK_MONSOON",
    "MONSOON_DEPRESSION_LOW",
    "OROGRAPHIC",
    "COASTAL_CONVECTIVE",
    "WESTERN_DISTURBANCE",
]


def test_system_config_loaded():
    """Verify that system configuration loads and has valid project metadata."""
    assert settings.project_info["sih_problem_statement"] == 80
    assert "Regime-Aware" in settings.project_info["name"]


def test_regime_taxonomy_exact_six_classes():
    """Ensure exactly six operational prototype regimes are defined with required attributes."""
    regimes = settings.regimes
    assert len(regimes) == 6

    regime_names = settings.regime_names
    for expected in EXPECTED_REGIMES:
        assert expected in regime_names, f"Missing regime: {expected}"

    for i, r in enumerate(regimes):
        assert r["id"] == i
        assert len(r["code"]) > 0
        assert len(r["description"]) > 10


def test_imd_critical_thresholds():
    """Verify official IMD rainfall intensity thresholds are correctly codified."""
    thresh = settings.critical_thresholds
    assert thresh["heavy"] == 64.5
    assert thresh["very_heavy"] == 115.6
    assert thresh["extremely_heavy"] == 204.5


def test_source_registry_integrity():
    """Verify data source registry specifies primary and fallback paths."""
    sources = settings.source_registry.get("sources", {})
    assert "nwp_forecast" in sources
    assert "atmospheric_state" in sources
    assert "ground_truth_rainfall" in sources
    assert "regime_seeds" in sources

    # Check that fallbacks exist
    assert "fallback" in sources["nwp_forecast"]
    assert sources["nwp_forecast"]["fallback"]["name"] == "NOAA-GFS"
    assert "fallback" in sources["atmospheric_state"]
    assert sources["atmospheric_state"]["fallback"]["name"] == "ERA5"

    # Absolute data integrity policy check
    assert settings.source_registry.get("data_policy") == "ABSOLUTE_INTEGRITY_NO_FABRICATION"
