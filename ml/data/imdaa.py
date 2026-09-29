"""NCMRWF IMDAA 12km regional atmospheric reanalysis adapter."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional
import pandas as pd
import xarray as xr

from ml.data.base import BaseDataAdapter, GriddedForecastDataset
from ml.data.era5 import ERA5Adapter
from ml.data.provenance import ProvenanceTracker

logger = logging.getLogger("regimerain.data.imdaa")


class IMDAAAdapter(BaseDataAdapter):
    """Adapter for Indian Monsoon Data Assimilation and Analysis (IMDAA) 12km reanalysis."""

    def __init__(self, resolution_deg: float = 0.12):
        super().__init__(source_name="NCMRWF-IMDAA", resolution_deg=resolution_deg)
        self.provider = "NCMRWF & IMD with UK Met Office"
        self.license = "MoES Non-commercial Research License"
        self._fallback_adapter = ERA5Adapter(resolution_deg=0.25)

    def get_provenance(self) -> Dict[str, Any]:
        return {
            "source_name": self.source_name,
            "provider": self.provider,
            "resolution": "12 km (~0.12°)",
            "license": self.license,
            "availability": "AUTHORIZED_RESTRICTED",
            "access_method": "NCMRWF Portal / MoES",
            "fallback_source": "ECMWF-ERA5",
        }

    def load(
        self,
        valid_time: str,
        raw_file_path: Optional[str] = None,
        use_fallback_if_unavailable: bool = True,
    ) -> GriddedForecastDataset:
        """Load IMDAA reanalysis or transparently switch to ERA5 fallback."""
        if raw_file_path is not None:
            ds = xr.open_dataset(raw_file_path)
            receipt = ProvenanceTracker.create_receipt(
                data_source=self.source_name,
                dataset_version="IMDAA-12km-v1",
                forecast_reference_time=valid_time,
                valid_time=valid_time,
                lead_time_hours=0,
                model_version="IMDAA_MoES",
                is_synthetic=False,
                provenance_note="NCMRWF IMDAA Regional Reanalysis Ingest",
            )
            return GriddedForecastDataset(ds, receipt)

        if use_fallback_if_unavailable:
            logger.warning(
                "IMDAA institutional archive not configured. "
                "Activating explicitly logged fallback: ECMWF ERA5 0.25°."
            )
            era5_data = self._fallback_adapter.load(valid_time, is_synthetic=True)
            era5_data.receipt.provenance_note = (
                f"FALLBACK ENGAGED: Primary {self.source_name} unavailable; using ECMWF-ERA5."
            )
            return era5_data

        raise PermissionError(
            f"IMDAA reanalysis data requires authorized MoES credentials and file input."
        )
