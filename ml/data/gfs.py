"""NOAA-GFS 0.25° operational numerical weather prediction adapter."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
import numpy as np
import pandas as pd
import xarray as xr

from ml.data.base import BaseDataAdapter, DataReceipt, GriddedForecastDataset
from ml.data.provenance import ProvenanceTracker


class GFSAdapter(BaseDataAdapter):
    """Adapter for NOAA Global Forecast System 0.25° gridded forecasts."""

    def __init__(self, resolution_deg: float = 0.25):
        super().__init__(source_name="NOAA-GFS", resolution_deg=resolution_deg)
        self.provider = "NOAA / NCEP"
        self.license = "Public Domain / CC0 equivalent"

    def get_provenance(self) -> Dict[str, Any]:
        return {
            "source_name": self.source_name,
            "provider": self.provider,
            "resolution": f"{self.resolution_deg}° (~27 km)",
            "license": self.license,
            "availability": "PUBLIC_ACTIVE",
            "access_method": "NOAA AWS Open Data / NOMADS",
        }

    def load(
        self,
        ref_time: str,
        lead_time_hours: int = 24,
        ds: Optional[xr.Dataset] = None,
        is_synthetic: bool = False,
    ) -> GriddedForecastDataset:
        """Load and normalize GFS forecast array for the Indian subcontinent domain."""
        if ds is None:
            # Generate deterministic offline fixture when no raw NetCDF/GRIB is supplied
            ds = self._create_deterministic_fixture(ref_time, lead_time_hours)
            is_synthetic = True

        valid_dt = pd.to_datetime(ref_time) + pd.Timedelta(hours=lead_time_hours)
        valid_time_str = valid_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        receipt = ProvenanceTracker.create_receipt(
            data_source=self.source_name,
            dataset_version="GFS-v16-0.25deg",
            forecast_reference_time=ref_time,
            valid_time=valid_time_str,
            lead_time_hours=lead_time_hours,
            model_version="GFS_0.25_NCEP",
            is_synthetic=is_synthetic,
            provenance_note="NOAA GFS Gridded Operational Forecast Ingest",
        )

        return GriddedForecastDataset(ds, receipt)

    def _create_deterministic_fixture(
        self, ref_time: str, lead_time_hours: int
    ) -> xr.Dataset:
        """Create a physically plausible deterministic development fixture over India.
        
        Latitude: 6.5°N to 38.5°N (step 0.25° -> 129 points)
        Longitude: 68.0°E to 98.0°E (step 0.25° -> 121 points)
        """
        lats = np.arange(6.5, 38.5 + 0.01, self.resolution_deg)
        lons = np.arange(68.0, 98.0 + 0.01, self.resolution_deg)
        n_lat, n_lon = len(lats), len(lons)

        # Deterministic seed based on date string hash for reproducible test fixtures
        seed = int(pd.to_datetime(ref_time).timestamp()) % 100000 + lead_time_hours
        rng = np.random.RandomState(seed)

        lon_grid, lat_grid = np.meshgrid(lons, lats)

        # 1. Orographic rain along Western Ghats (lat 8-20N, lon 73-76E)
        wg_mask = np.exp(-((lat_grid - 14.0) ** 2) / 40.0 - ((lon_grid - 74.5) ** 2) / 1.5)
        # 2. Monsoon trough rain over Central India / Bay of Bengal (lat 20-25N, lon 80-90E)
        trough_mask = np.exp(-((lat_grid - 22.0) ** 2) / 15.0 - ((lon_grid - 85.0) ** 2) / 35.0)

        # Base precipitation rate in kg/m^2/s converted to mm/day
        synoptic_field = (wg_mask * 45.0 + trough_mask * 35.0 + rng.gamma(1.5, 2.0, (n_lat, n_lon)))
        rainfall = np.clip(synoptic_field, 0.0, 280.0)

        # Low-level 850 hPa wind fields (strong westerlies over peninsular India, southeasterlies in BoB)
        u_wind = 12.0 * np.exp(-((lat_grid - 15.0) ** 2) / 50.0) + rng.normal(0, 1.5, (n_lat, n_lon))
        v_wind = -2.0 + 4.0 * np.sin(np.radians(lat_grid)) + rng.normal(0, 1.2, (n_lat, n_lon))

        # Mean Sea Level Pressure (monsoon depression trough ~996 hPa, southern peninsular ~1008 hPa)
        slp = 1008.0 - 10.0 * trough_mask - 0.2 * (lat_grid - 10.0) + rng.normal(0, 0.3, (n_lat, n_lon))

        # Specific humidity at 850 hPa (g/kg: 10 to 18)
        moisture = 14.0 + 3.0 * np.sin(np.radians(lat_grid)) + rng.normal(0, 0.5, (n_lat, n_lon))

        valid_dt = pd.to_datetime(ref_time) + pd.Timedelta(hours=lead_time_hours)

        ds = xr.Dataset(
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
                "title": "NOAA-GFS Gridded Forecast Normalized Adapter",
                "source": "NOAA-GFS",
            },
        )
        return ds
