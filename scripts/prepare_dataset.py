"""Prepares a reproducible, multi-regime gridded development dataset for model development."""

from __future__ import annotations

import sys
from pathlib import Path
import numpy as np
import pandas as pd
import xarray as xr

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ml.data.gfs import GFSAdapter
from ml.data.imd_rainfall import IMDRainfallAdapter
from ml.data.regime_seeds import RautRegimeSeedsAdapter
from ml.data.provenance import ProvenanceTracker


def prepare_development_dataset(output_path: Path) -> Path:
    """Construct multi-date, multi-regime gridded dataset for training and verification pipelines."""
    print("=" * 65)
    print("PREPARING REPRODUCIBLE DEVELOPMENT DATASET")
    print("=" * 65)

    # 12 representative test dates covering distinct seasonal synoptic conditions
    sample_dates = [
        ("2025-07-05", 24, "Active Monsoon - Peninsular Trough"),
        ("2025-07-12", 24, "Active Monsoon - Gangetic Core"),
        ("2025-07-20", 24, "Monsoon Depression - Bay of Bengal"),
        ("2025-07-28", 24, "Deep Depression - Central India"),
        ("2025-08-05", 24, "Break Monsoon - Foothill Shift"),
        ("2025-08-14", 24, "Break Monsoon - Extended Suppressed"),
        ("2025-08-22", 24, "Orographic Heavy - Western Ghats Surge"),
        ("2025-08-30", 24, "Orographic Extreme - Northeast Meghalaya"),
        ("2025-09-10", 24, "Coastal Convective - East Coast Sea Breeze"),
        ("2025-09-20", 24, "Coastal Convective - Diurnal Peninsular"),
        ("2026-01-15", 24, "Western Disturbance - Northwest Himalayas"),
        ("2026-02-10", 24, "Western Disturbance - North Plains"),
    ]

    gfs_adapter = GFSAdapter(resolution_deg=0.25)
    imd_adapter = IMDRainfallAdapter(resolution_deg=0.25)

    time_coords = []
    nwp_rainfall_list = []
    obs_rainfall_list = []
    u_wind_list = []
    v_wind_list = []
    slp_list = []
    moisture_list = []
    regime_probs_list = []

    lats = None
    lons = None

    for date_str, lead_hours, desc in sample_dates:
        print(f"  -> Processing {date_str} (Lead: {lead_hours}h) | {desc}")
        ref_iso = f"{date_str}T00:00:00Z"
        valid_dt = pd.to_datetime(date_str) + pd.Timedelta(hours=lead_hours)

        # 1. NWP Forecast State
        gfs_ds = gfs_adapter.load(ref_iso, lead_time_hours=lead_hours, is_synthetic=True)
        # 2. IMD Observed Ground Truth (Verification Target)
        imd_ds = imd_adapter.load(date_str, is_synthetic=True)
        # 3. Regime Seed Probabilities
        seed = RautRegimeSeedsAdapter.get_seed_for_date(date_str)
        probs_6 = [seed["operational_probabilities"][reg] for reg in RautRegimeSeedsAdapter.OPERATIONAL_6_REGIMES]

        if lats is None:
            lats = gfs_ds.lats
            lons = gfs_ds.lons

        time_coords.append(valid_dt)
        nwp_rainfall_list.append(gfs_ds.ds["rainfall"].values)
        obs_rainfall_list.append(imd_ds.ds["rainfall"].values)
        u_wind_list.append(gfs_ds.ds["u_wind"].values)
        v_wind_list.append(gfs_ds.ds["v_wind"].values)
        slp_list.append(gfs_ds.ds["slp"].values)
        moisture_list.append(gfs_ds.ds["moisture"].values)
        regime_probs_list.append(probs_6)

    # Stack along time dimension
    combined_ds = xr.Dataset(
        data_vars={
            "rainfall_nwp": (("time", "lat", "lon"), np.stack(nwp_rainfall_list), {"units": "mm/day", "long_name": "Raw NWP Forecast Rainfall"}),
            "rainfall_obs": (("time", "lat", "lon"), np.stack(obs_rainfall_list), {"units": "mm/day", "long_name": "IMD Observed Rainfall (Target)"}),
            "u_wind": (("time", "lat", "lon"), np.stack(u_wind_list), {"units": "m/s", "long_name": "850 hPa Zonal Wind"}),
            "v_wind": (("time", "lat", "lon"), np.stack(v_wind_list), {"units": "m/s", "long_name": "850 hPa Meridional Wind"}),
            "slp": (("time", "lat", "lon"), np.stack(slp_list), {"units": "hPa", "long_name": "Mean Sea Level Pressure"}),
            "moisture": (("time", "lat", "lon"), np.stack(moisture_list), {"units": "g/kg", "long_name": "850 hPa Specific Humidity"}),
            "regime_seed_probs": (("time", "regime"), np.array(regime_probs_list, dtype=np.float32), {"long_name": "Raut Seed Regime Probabilities"}),
        },
        coords={
            "time": time_coords,
            "lat": lats,
            "lon": lons,
            "regime": RautRegimeSeedsAdapter.OPERATIONAL_6_REGIMES,
        },
        attrs={
            "title": "SIH-80 Multi-Regime Development Dataset",
            "is_synthetic": "True",
            "provenance_note": "DEVELOPMENT / SYNTHETIC DATA — NOT FOR OPERATIONAL FORECASTING",
            "spatial_resolution": "0.25 degree (~27 km)",
            "data_policy": "ABSOLUTE_INTEGRITY_NO_FABRICATION",
        },
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    combined_ds.to_netcdf(output_path)
    print(f"\n[+] Saved normalized dataset to: {output_path.resolve()}")
    print(f"    Dimensions: {dict(combined_ds.sizes)}")
    print(f"    Variables: {list(combined_ds.data_vars.keys())}")
    print(f"    Time Steps: {len(time_coords)}")
    print("=" * 65)
    return output_path


if __name__ == "__main__":
    out_file = PROJECT_ROOT / "data" / "processed" / "dev_dataset.nc"
    prepare_development_dataset(out_file)
