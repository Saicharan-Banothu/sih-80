"""FeatureBuilder: End-to-end meteorological feature engineering and tensor synthesis."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
import xarray as xr

from ml.data.base import GriddedForecastDataset
from ml.features.spatial import (
    compute_spatial_gradients_2d,
    compute_relative_vorticity_2d,
    compute_divergence_2d,
    compute_spatial_neighborhood_features,
)
from ml.features.anomalies import (
    compute_slp_anomalies_2d,
    compute_moisture_flux_2d,
)
from ml.features.masks import SpatialMasks
from ml.features.temporal import (
    encode_cyclic_seasonality,
    encode_lead_time,
)
from ml.features.leakage_audit import LeakageAuditor


@dataclass
class FeatureMatrix:
    """Multi-channel 2D spatial feature tensor for atmospheric representation learning."""
    tensor: np.ndarray  # Shape: (C, H, W)
    channel_names: List[str]
    lats: np.ndarray
    lons: np.ndarray
    forecast_ref_time: str
    valid_time: str
    lead_time_hours: int

    @property
    def num_channels(self) -> int:
        return len(self.channel_names)

    @property
    def shape(self) -> Tuple[int, ...]:
        return self.tensor.shape

    def get_channel(self, name: str) -> np.ndarray:
        if name not in self.channel_names:
            raise KeyError(f"Channel '{name}' not found. Available: {self.channel_names}")
        idx = self.channel_names.index(name)
        return self.tensor[idx]

    def summary(self) -> Dict[str, Any]:
        return {
            "num_channels": self.num_channels,
            "channel_names": self.channel_names,
            "spatial_shape": [int(len(self.lats)), int(len(self.lons))],
            "forecast_ref_time": self.forecast_ref_time,
            "valid_time": self.valid_time,
            "lead_time_hours": self.lead_time_hours,
        }


class FeatureBuilder:
    """Leakage-safe atmospheric feature builder synthesizing 20 physical and dynamical channels."""

    FEATURE_CHANNELS = [
        "rainfall_raw_nwp",
        "log_rainfall_nwp",
        "wind_speed_850",
        "u_wind_850",
        "v_wind_850",
        "vorticity_850",
        "divergence_850",
        "moisture_flux_u",
        "moisture_flux_v",
        "moisture_flux_mag",
        "slp_standardized",
        "slp_domain_anomaly",
        "slp_grad_meridional",
        "slp_grad_zonal",
        "rainfall_smoothed_3x3",
        "topography_mask",
        "land_sea_mask",
        "lead_time_normalized",
        "doy_sin",
        "doy_cos",
    ]

    def __init__(self, resolution_deg: float = 0.25):
        self.resolution_deg = resolution_deg

    def build_features(
        self,
        forecast: GriddedForecastDataset,
        past_rainfall_history_24h: Optional[np.ndarray] = None,
        history_timestamp: Optional[str] = None,
    ) -> FeatureMatrix:
        """Construct multi-channel feature matrix from forecast state and issue-time inputs."""
        ds = forecast.ds
        lats = forecast.lats
        lons = forecast.lons
        ref_time = forecast.receipt.forecast_reference_time
        valid_time = forecast.receipt.valid_time
        lead_hours = forecast.receipt.lead_time_hours

        # 1. Leakage Audit Check: verify feature names and timestamp causality
        obs_timestamps = [history_timestamp] if history_timestamp else []
        LeakageAuditor.run_full_audit(
            feature_names=self.FEATURE_CHANNELS,
            forecast_ref_time=ref_time,
            valid_time=valid_time,
            observation_timestamps_used=obs_timestamps,
            raise_on_violation=True,
        )

        # 2. Extract base NWP variables
        rainfall_raw = ds["rainfall"].values.copy()
        log_rainfall = np.log1p(rainfall_raw)

        u_wind = ds["u_wind"].values.copy()
        v_wind = ds["v_wind"].values.copy()
        wind_speed = np.sqrt(u_wind ** 2 + v_wind ** 2)

        slp = ds["slp"].values.copy()
        moisture = ds["moisture"].values.copy()

        # 3. Dynamic circulation features
        vorticity = compute_relative_vorticity_2d(u_wind, v_wind, lats, self.resolution_deg)
        divergence = compute_divergence_2d(u_wind, v_wind, lats, self.resolution_deg)
        u_flux, v_flux, flux_mag = compute_moisture_flux_2d(u_wind, v_wind, moisture)

        # 4. Pressure anomaly and gradients
        slp_dom_anom, _ = compute_slp_anomalies_2d(slp)
        grad_x, grad_y = compute_spatial_gradients_2d(slp, lats, self.resolution_deg)

        # 5. Multi-scale spatial smoothing
        (rf_smooth_3x3,) = compute_spatial_neighborhood_features(rainfall_raw, scales=(3,))

        # 6. Static geospatial masks
        topo_mask = SpatialMasks.get_topography_mask(lats, lons)
        land_mask = SpatialMasks.get_land_sea_mask(lats, lons)

        # 7. Temporal & seasonal scalar features broadcast to 2D
        norm_lead = encode_lead_time(lead_hours)
        lead_grid = np.full_like(rainfall_raw, norm_lead, dtype=np.float32)

        doy_sin, doy_cos, _, _ = encode_cyclic_seasonality(valid_time)
        doy_sin_grid = np.full_like(rainfall_raw, doy_sin, dtype=np.float32)
        doy_cos_grid = np.full_like(rainfall_raw, doy_cos, dtype=np.float32)

        # 8. Assemble full channel list
        channel_data = [
            rainfall_raw.astype(np.float32),
            log_rainfall.astype(np.float32),
            wind_speed.astype(np.float32),
            u_wind.astype(np.float32),
            v_wind.astype(np.float32),
            vorticity.astype(np.float32),
            divergence.astype(np.float32),
            u_flux.astype(np.float32),
            v_flux.astype(np.float32),
            flux_mag.astype(np.float32),
            slp.astype(np.float32),
            slp_dom_anom.astype(np.float32),
            grad_y.astype(np.float32),
            grad_x.astype(np.float32),
            rf_smooth_3x3.astype(np.float32),
            topo_mask.astype(np.float32),
            land_mask.astype(np.float32),
            lead_grid.astype(np.float32),
            doy_sin_grid.astype(np.float32),
            doy_cos_grid.astype(np.float32),
        ]

        tensor = np.stack(channel_data, axis=0)  # Shape: (20, n_lat, n_lon)

        return FeatureMatrix(
            tensor=tensor,
            channel_names=list(self.FEATURE_CHANNELS),
            lats=lats,
            lons=lons,
            forecast_ref_time=ref_time,
            valid_time=valid_time,
            lead_time_hours=lead_hours,
        )
