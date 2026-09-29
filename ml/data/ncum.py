"""NCMRWF Unified Model (NCUM-G) 12km operational NWP adapter."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional
import pandas as pd
import xarray as xr

from ml.data.base import BaseDataAdapter, GriddedForecastDataset
from ml.data.gfs import GFSAdapter
from ml.data.provenance import ProvenanceTracker

logger = logging.getLogger("regimerain.data.ncum")


class NCUMAdapter(BaseDataAdapter):
    """Adapter for NCMRWF Unified Model Global (NCUM-G) ~12 km operational forecast."""

    def __init__(self, resolution_deg: float = 0.12):
        super().__init__(source_name="NCUM-G", resolution_deg=resolution_deg)
        self.provider = "NCMRWF (MoES, Govt. of India)"
        self.license = "MoES Data Policy / Institutional Access Only"
        self._fallback_adapter = GFSAdapter(resolution_deg=0.25)

    def get_provenance(self) -> Dict[str, Any]:
        return {
            "source_name": self.source_name,
            "provider": self.provider,
            "resolution": "12 km (~0.12°)",
            "license": self.license,
            "availability": "AUTHORIZED_RESTRICTED",
            "access_method": "OPeNDAP / FTP / Institutional API",
            "fallback_source": "NOAA-GFS",
        }

    def load(
        self,
        ref_time: str,
        lead_time_hours: int = 24,
        raw_file_path: Optional[str] = None,
        use_fallback_if_unavailable: bool = True,
    ) -> GriddedForecastDataset:
        """Load NCUM-G forecast or gracefully fall back to GFS with explicit logging."""
        if raw_file_path is not None:
            # Load real NCUM NetCDF/GRIB file
            ds = xr.open_dataset(raw_file_path)
            valid_dt = pd.to_datetime(ref_time) + pd.Timedelta(hours=lead_time_hours)
            receipt = ProvenanceTracker.create_receipt(
                data_source=self.source_name,
                dataset_version="NCUM-G-12km",
                forecast_reference_time=ref_time,
                valid_time=valid_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                lead_time_hours=lead_time_hours,
                model_version="NCUM_GLOBAL_v6",
                is_synthetic=False,
                provenance_note="Operational NCMRWF NCUM-G Forecast Ingest",
            )
            return GriddedForecastDataset(ds, receipt)

        if use_fallback_if_unavailable:
            logger.warning(
                "NCUM-G institutional archive access not configured. "
                "Activating explicitly logged fallback: NOAA-GFS 0.25°."
            )
            gfs_data = self._fallback_adapter.load(ref_time, lead_time_hours, is_synthetic=True)
            # Retain clear provenance indicating that GFS was used as fallback
            gfs_data.receipt.provenance_note = (
                f"FALLBACK ENGAGED: Primary {self.source_name} unavailable; using NOAA-GFS."
            )
            return gfs_data

        raise PermissionError(
            f"NCUM-G data requires authorized NCMRWF institutional credentials and raw file input."
        )
