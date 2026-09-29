"""ECMWF ERA5 atmospheric reanalysis adapter (0.25°)."""

from __future__ import annotations

from typing import Any, Dict, Optional
import numpy as np
import pandas as pd
import xarray as xr

from ml.data.base import BaseDataAdapter, GriddedForecastDataset
from ml.data.provenance import ProvenanceTracker


class ERA5Adapter(BaseDataAdapter):
    """Adapter for ECMWF ERA5 Atmospheric Reanalysis fields at 0.25° resolution."""

    def __init__(self, resolution_deg: float = 0.25):
        super().__init__(source_name="ECMWF-ERA5", resolution_deg=resolution_deg)
        self.provider = "ECMWF / Copernicus Climate Change Service (C3S)"
        self.license = "Creative Commons Attribution 4.0 International (CC-BY-4.0)"

    def get_provenance(self) -> Dict[str, Any]:
        return {
            "source_name": self.source_name,
            "provider": self.provider,
            "resolution": f"{self.resolution_deg}° (~31 km)",
            "license": self.license,
            "availability": "PUBLIC_ACTIVE",
            "access_method": "Copernicus Climate Data Store (CDS) API",
        }

    def load(
        self,
        valid_time: str,
        ds: Optional[xr.Dataset] = None,
        is_synthetic: bool = False,
    ) -> GriddedForecastDataset:
        """Load and normalize ERA5 atmospheric analysis for the Indian subcontinent."""
        if ds is None:
            ds = self._create_deterministic_fixture(valid_time)
            is_synthetic = True

        receipt = ProvenanceTracker.create_receipt(
            data_source=self.source_name,
            dataset_version="ERA5-Reanalysis-0.25deg",
            forecast_reference_time=valid_time,
            valid_time=valid_time,
            lead_time_hours=0,
            model_version="ERA5_IFS_CY41R2",
            is_synthetic=is_synthetic,
            provenance_note="ECMWF ERA5 Regional Atmospheric State Ingest",
        )

        return GriddedForecastDataset(ds, receipt)

    def _create_deterministic_fixture(self, valid_time: str) -> xr.Dataset:
        """Generate physically consistent atmospheric state over the Indian domain."""
        lats = np.arange(6.5, 38.5 + 0.01, self.resolution_deg)
        lons = np.arange(68.0, 98.0 + 0.01, self.resolution_deg)
        n_lat, n_lon = len(lats), len(lons)

        seed = int(pd.to_datetime(valid_time).timestamp()) % 100000 + 42
        rng = np.random.RandomState(seed)

        lon_grid, lat_grid = np.meshgrid(lons, lats)

        # Realistic 850 hPa wind fields
        u_wind = 14.0 * np.exp(-((lat_grid - 15.0) ** 2) / 45.0) + rng.normal(0, 1.0, (n_lat, n_lon))
        v_wind = -1.5 + 3.0 * np.sin(np.radians(lat_grid)) + rng.normal(0, 0.8, (n_lat, n_lon))

        # Mean sea level pressure
        slp = 1010.0 - 0.25 * (lat_grid - 8.0) - 4.0 * np.exp(-((lon_grid - 85.0) ** 2) / 50.0)
        slp += rng.normal(0, 0.2, (n_lat, n_lon))

        # Moisture (specific humidity g/kg)
        moisture = 15.0 + 2.5 * np.cos(np.radians(lat_grid)) + rng.normal(0, 0.4, (n_lat, n_lon))

        # Total column precipitation equivalent (reanalysis rainfall estimate)
        rainfall = np.clip(
            np.exp(-((lat_grid - 14.0) ** 2) / 30.0 - ((lon_grid - 75.0) ** 2) / 2.0) * 40.0
            + rng.gamma(1.2, 1.8, (n_lat, n_lon)),
            0.0,
            250.0,
        )

        valid_dt = pd.to_datetime(valid_time)

        return xr.Dataset(
            data_vars={
                "rainfall": (("lat", "lon"), rainfall.astype(np.float32), {"units": "mm/day"}),
                "u_wind": (("lat", "lon"), u_wind.astype(np.float32), {"units": "m/s"}),
                "v_wind": (("lat", "lon"), v_wind.astype(np.float32), {"units": "m/s"}),
                "slp": (("lat", "lon"), slp.astype(np.float32), {"units": "hPa"}),
                "moisture": (("lat", "lon"), moisture.astype(np.float32), {"units": "g/kg"}),
            },
            coords={
                "lat": ("lat", lats.astype(np.float32)),
                "lon": ("lon", lons.astype(np.float32)),
                "time": valid_dt,
            },
            attrs={
                "title": "ECMWF ERA5 Reanalysis Normalized Adapter",
                "source": "ECMWF-ERA5",
            },
        )
