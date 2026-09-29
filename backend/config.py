"""Centralized configuration loader for RegimeRain-AI system."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List
import yaml
from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parent.parent


class RegimeItem(BaseModel):
    id: int
    name: str
    code: str
    description: str


class ThresholdsConfig(BaseModel):
    critical_levels_mm: Dict[str, float]
    imd_categories: Dict[str, Any]
    warnings: Dict[str, Any]


class SystemSettings:
    """Singleton loader for system and data registry configurations."""

    def __init__(self, config_path: Path | None = None, registry_path: Path | None = None):
        self.project_root = PROJECT_ROOT
        self.config_path = config_path or (PROJECT_ROOT / "config" / "system.yaml")
        self.registry_path = registry_path or (PROJECT_ROOT / "data" / "source_registry.yaml")

        self.system_config: Dict[str, Any] = self._load_yaml(self.config_path)
        self.source_registry: Dict[str, Any] = self._load_yaml(self.registry_path)

        self._validate_core_sections()

    def _load_yaml(self, path: Path) -> Dict[str, Any]:
        if not path.is_file():
            raise FileNotFoundError(f"Configuration file not found: {path.resolve()}")
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        if not isinstance(data, dict):
            raise ValueError(f"Invalid YAML structure in {path.resolve()}")
        return data

    def _validate_core_sections(self) -> None:
        required_keys = ["project", "regimes", "thresholds", "domain", "model", "server"]
        for key in required_keys:
            if key not in self.system_config:
                raise KeyError(f"Missing required configuration section '{key}' in system.yaml")

        regime_list = self.system_config.get("regimes", {}).get("taxonomy", [])
        if len(regime_list) != 6:
            raise ValueError(f"Expected exactly 6 operational regimes, found {len(regime_list)}")

    @property
    def project_info(self) -> Dict[str, Any]:
        return self.system_config.get("project", {})

    @property
    def regimes(self) -> List[Dict[str, Any]]:
        return self.system_config.get("regimes", {}).get("taxonomy", [])

    @property
    def regime_names(self) -> List[str]:
        return [r["name"] for r in self.regimes]

    @property
    def thresholds(self) -> Dict[str, Any]:
        return self.system_config.get("thresholds", {})

    @property
    def critical_thresholds(self) -> Dict[str, float]:
        return self.thresholds.get("critical_levels_mm", {
            "heavy": 64.5,
            "very_heavy": 115.6,
            "extremely_heavy": 204.5,
        })

    @property
    def server_settings(self) -> Dict[str, Any]:
        return self.system_config.get("server", {})

    @property
    def environment_status(self) -> Dict[str, Any]:
        """Explicit environment runtime status distinguishing demonstration from operational mode."""
        return {
            "mode": "DEMONSTRATION",
            "mode_label": "DEMONSTRATION MODE (Reproducible Synoptic Scenario)",
            "operational_readiness": "PROTOTYPE_DEMONSTRATION",
            "backbone": {
                "name": "LightweightResidualConvNet (Active Fallback)",
                "status": "FALLBACK_ACTIVE",
                "planned_target": "microsoft/climax",
                "note": "ClimaX ViT pretrained checkpoint not loaded; lightweight residual spatial encoder active.",
            },
            "nwp_source": {
                "active": "NOAA-GFS (Fallback)",
                "primary_planned": "NCUM-G (NCMRWF)",
                "note": "NCUM requires institutional MoES authorization; running GFS fallback in demo environment.",
            },
            "atmospheric_source": {
                "active": "ERA5 (Fallback)",
                "primary_planned": "IMDAA (NCMRWF)",
                "note": "IMDAA reanalysis substituted with global ERA5 fallback for demonstration.",
            },
            "verification_status": "SYNTHETIC VALIDATION / METHODOLOGY DEMONSTRATION",
            "data_policy": "ABSOLUTE_INTEGRITY_NO_FABRICATION",
        }

    @property
    def active_data_sources(self) -> Dict[str, Any]:
        sources = self.source_registry.get("sources", {})
        nwp_env = os.getenv("NWP_SOURCE", "GFS_FALLBACK")
        atm_env = os.getenv("ATMOSPHERIC_SOURCE", "ERA5_FALLBACK")
        return {
            "nwp_mode": nwp_env,
            "nwp_details": sources.get("nwp_forecast", {}).get(
                "primary" if nwp_env == "NCUM" else "fallback", {}
            ),
            "atmospheric_mode": atm_env,
            "atmospheric_details": sources.get("atmospheric_state", {}).get(
                "primary" if atm_env == "IMDAA" else "fallback", {}
            ),
            "ground_truth": sources.get("ground_truth_rainfall", {}).get("primary", {}),
            "regime_seeds": sources.get("regime_seeds", {}).get("primary", {}),
            "environment_status": self.environment_status,
        }


# Global cached settings instance
settings = SystemSettings()
