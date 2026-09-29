"""Dataset validation, coordinate checks, and physical bounds auditing."""

from __future__ import annotations

from typing import Any, Dict, List
import numpy as np
import xarray as xr
from ml.data.base import GriddedForecastDataset
from ml.data.provenance import ProvenanceTracker


def validate_gridded_dataset(dataset: GriddedForecastDataset, strict: bool = True) -> Dict[str, Any]:
    """Validate spatial coordinates, physical value bounds, and metadata integrity."""
    ds = dataset.ds
    issues: List[str] = []
    checks_passed: List[str] = []

    # 1. Coordinate Existence & Monotonicity
    for coord in ["lat", "lon"]:
        if coord not in ds.coords:
            issues.append(f"Missing required coordinate: '{coord}'")
        else:
            vals = ds.coords[coord].values
            if not np.all(np.diff(vals) > 0):
                issues.append(f"Coordinate '{coord}' is not strictly monotonically increasing")
            else:
                checks_passed.append(f"Coordinate '{coord}' is strictly monotonic")

    # 2. Geographic Domain Extent (India focus: lat ~6.5 to ~38.5, lon ~68 to ~98)
    if "lat" in ds.coords:
        lat_min, lat_max = float(ds.lat.min()), float(ds.lat.max())
        if lat_min < -90 or lat_max > 90:
            issues.append(f"Latitude out of global bounds: [{lat_min}, {lat_max}]")
        else:
            checks_passed.append(f"Latitude within bounds: [{lat_min:.2f}°, {lat_max:.2f}°]")

    if "lon" in ds.coords:
        lon_min, lon_max = float(ds.lon.min()), float(ds.lon.max())
        if lon_min < -180 or lon_max > 180:
            issues.append(f"Longitude out of global bounds: [{lon_min}, {lon_max}]")
        else:
            checks_passed.append(f"Longitude within bounds: [{lon_min:.2f}°, {lon_max:.2f}°]")

    # 3. Rainfall Physical Bounds
    if "rainfall" in ds:
        rf = ds["rainfall"].values
        nan_pct = float(np.isnan(rf).mean() * 100.0)
        valid_rf = rf[~np.isnan(rf)]
        if len(valid_rf) > 0:
            min_val = float(valid_rf.min())
            max_val = float(valid_rf.max())
            if min_val < -1e-4:
                issues.append(f"Rainfall contains unphysical negative values: min = {min_val:.3f} mm")
            if max_val > 2500.0:
                issues.append(f"Rainfall exceeds world-record physical threshold: max = {max_val:.2f} mm")
            checks_passed.append(f"Rainfall physical check passed: [{min_val:.1f}, {max_val:.1f}] mm/day (NaN: {nan_pct:.1f}%)")
    else:
        issues.append("Missing essential variable: 'rainfall'")

    # 4. Wind Components Bounds (850 hPa standard: -100 m/s to +100 m/s)
    for wind_var in ["u_wind", "v_wind"]:
        if wind_var in ds:
            w = ds[wind_var].values
            valid_w = w[~np.isnan(w)]
            if len(valid_w) > 0:
                if np.any(np.abs(valid_w) > 120.0):
                    issues.append(f"Wind variable '{wind_var}' contains unphysical velocities > 120 m/s")
                else:
                    checks_passed.append(f"Wind component '{wind_var}' within physical bounds")

    # 5. Sea Level Pressure (SLP) Physical Bounds (870 hPa - 1085 hPa)
    if "slp" in ds:
        p = ds["slp"].values
        valid_p = p[~np.isnan(p)]
        if len(valid_p) > 0:
            if float(valid_p.min()) < 870.0 or float(valid_p.max()) > 1085.0:
                issues.append(f"SLP out of physical meteorological bounds: [{valid_p.min():.1f}, {valid_p.max():.1f}] hPa")
            else:
                checks_passed.append(f"SLP within physical bounds: [{valid_p.min():.1f}, {valid_p.max():.1f}] hPa")

    # 6. Provenance Receipt Audit
    try:
        ProvenanceTracker.validate_receipt(dataset.receipt)
        checks_passed.append("Provenance receipt valid and complete")
    except Exception as e:
        issues.append(f"Provenance validation error: {str(e)}")

    status = "PASS" if len(issues) == 0 else "FAIL"
    report = {
        "status": status,
        "checks_passed": checks_passed,
        "issues": issues,
        "summary": dataset.summary(),
    }

    if strict and status == "FAIL":
        raise ValueError(f"Dataset validation failed with {len(issues)} issues: {'; '.join(issues)}")

    return report
