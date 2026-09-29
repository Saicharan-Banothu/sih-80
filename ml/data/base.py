"""Base abstractions, container classes, and coordinate normalization for gridded meteorological data."""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
import xarray as xr


@dataclass
class DataReceipt:
    """Explicit provenance metadata tracking every meteorological data artifact."""
    data_source: str
    dataset_version: str
    forecast_reference_time: str
    valid_time: str
    lead_time_hours: int
    model_version: str
    generation_timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    is_synthetic: bool = False
    provenance_note: str = "Verified data artifact"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "data_source": self.data_source,
            "dataset_version": self.dataset_version,
            "forecast_reference_time": self.forecast_reference_time,
            "valid_time": self.valid_time,
            "lead_time_hours": self.lead_time_hours,
            "model_version": self.model_version,
            "generation_timestamp": self.generation_timestamp,
            "is_synthetic": self.is_synthetic,
            "provenance_note": self.provenance_note,
        }


class GriddedForecastDataset:
    """Normalized multi-variable gridded dataset container for Indian meteorological fields."""

    STANDARD_VARS = ["rainfall", "u_wind", "v_wind", "slp", "moisture"]

    def __init__(
        self,
        dataset: xr.Dataset,
        receipt: DataReceipt,
    ):
        self.receipt = receipt
        self.ds = self._normalize_dataset(dataset)

    def _normalize_dataset(self, ds: xr.Dataset) -> xr.Dataset:
        """Enforce standard dimension names, coordinate ordering, and variable attributes."""
        # 1. Rename coordinate aliases to standard (lat, lon, time)
        rename_map = {}
        for coord in ds.coords:
            c_lower = str(coord).lower()
            if c_lower in ["latitude", "lats", "y"]:
                rename_map[coord] = "lat"
            elif c_lower in ["longitude", "longitudes", "lons", "x"]:
                rename_map[coord] = "lon"
            elif c_lower in ["valid_time", "step", "datetime"]:
                rename_map[coord] = "time"
        if rename_map:
            ds = ds.rename(rename_map)

        # 2. Normalize Longitudes from [0, 360) to [-180, 180) if needed
        if "lon" in ds.coords:
            lons = ds.coords["lon"].values
            if np.any(lons > 180.0):
                new_lons = np.where(lons > 180.0, lons - 360.0, lons)
                ds = ds.assign_coords(lon=new_lons)

        # 3. Sort Coordinates monotonically (South->North, West->East)
        if "lat" in ds.coords:
            ds = ds.sortby("lat", ascending=True)
        if "lon" in ds.coords:
            ds = ds.sortby("lon", ascending=True)

        # 4. Attach provenance metadata directly to xarray attributes
        for k, v in self.receipt.to_dict().items():
            ds.attrs[k] = str(v)

        return ds

    @property
    def lats(self) -> np.ndarray:
        return self.ds["lat"].values

    @property
    def lons(self) -> np.ndarray:
        return self.ds["lon"].values

    @property
    def times(self) -> np.ndarray:
        return self.ds["time"].values

    @property
    def rainfall(self) -> xr.DataArray:
        if "rainfall" not in self.ds:
            raise KeyError("Rainfall variable not present in dataset")
        return self.ds["rainfall"]

    def get_var(self, var_name: str) -> Optional[xr.DataArray]:
        return self.ds.get(var_name)

    def summary(self) -> Dict[str, Any]:
        return {
            "dimensions": {k: int(v) for k, v in self.ds.sizes.items()},
            "variables": list(self.ds.data_vars.keys()),
            "lat_range": [float(self.lats.min()), float(self.lats.max())],
            "lon_range": [float(self.lons.min()), float(self.lons.max())],
            "provenance": self.receipt.to_dict(),
        }


class BaseDataAdapter(abc.ABC):
    """Abstract base class for source-specific meteorological data adapters."""

    def __init__(self, source_name: str, resolution_deg: float = 0.25):
        self.source_name = source_name
        self.resolution_deg = resolution_deg

    @abc.abstractmethod
    def load(self, *args, **kwargs) -> GriddedForecastDataset:
        """Load and normalize source data into a GriddedForecastDataset."""
        pass

    @abc.abstractmethod
    def get_provenance(self) -> Dict[str, Any]:
        """Return full provenance, license, and access specifications."""
        pass

    @staticmethod
    def prate_to_mm_per_day(prate: np.ndarray, input_units: str = "kg/m^2/s") -> np.ndarray:
        """Convert precipitation rates to standard operational mm/day."""
        if input_units in ["kg/m^2/s", "kg m-2 s-1"]:
            # 1 kg/m^2/s = 86400 mm/day
            return np.maximum(0.0, prate * 86400.0)
        elif input_units in ["m", "meters"]:
            # Accumulated depth in meters to mm
            return np.maximum(0.0, prate * 1000.0)
        elif input_units in ["mm/hr", "mm/hour"]:
            return np.maximum(0.0, prate * 24.0)
        elif input_units in ["mm/day", "mm"]:
            return np.maximum(0.0, prate)
        else:
            raise ValueError(f"Unrecognized precipitation unit: {input_units}")

    @staticmethod
    def pressure_to_hpa(pressure: np.ndarray, input_units: str = "Pa") -> np.ndarray:
        """Convert pressure to standard hectopascals (hPa)."""
        if input_units in ["Pa", "N/m^2"]:
            return pressure / 100.0
        elif input_units in ["hPa", "mbar"]:
            return pressure
        else:
            raise ValueError(f"Unrecognized pressure unit: {input_units}")
