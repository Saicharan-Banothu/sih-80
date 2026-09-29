"""Spatial neighborhood verification and Fractions Skill Score (FSS) implementation."""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
from scipy.ndimage import uniform_filter

try:
    import pysteps.verification as pv
    PYSTEPS_AVAILABLE = True
except ImportError:
    PYSTEPS_AVAILABLE = False


def compute_fss_fallback(
    forecast: np.ndarray,
    observed: np.ndarray,
    threshold: float,
    scale: int,
) -> float:
    """Vectorized NumPy/SciPy implementation of Fractions Skill Score (Roberts and Lean, 2008).
    
    Args:
        forecast: 2D array of predicted precipitation (H, W)
        observed: 2D array of verification precipitation (H, W)
        threshold: Precipitation cutoff in mm
        scale: Neighborhood window size (scale x scale boxcar)
    """
    f_bin = (forecast >= threshold).astype(np.float64)
    o_bin = (observed >= threshold).astype(np.float64)

    # Neighborhood fraction smoothing via uniform filter
    f_frac = uniform_filter(f_bin, size=scale, mode="constant", cval=0.0)
    o_frac = uniform_filter(o_bin, size=scale, mode="constant", cval=0.0)

    mse = np.mean((f_frac - o_frac) ** 2)
    mse_ref = np.mean(f_frac ** 2) + np.mean(o_frac ** 2)

    if mse_ref == 0.0:
        return 1.0 if np.all(f_bin == o_bin) else 0.0

    fss = 1.0 - (mse / mse_ref)
    return float(np.clip(fss, 0.0, 1.0))


def compute_fss(
    forecast: np.ndarray,
    observed: np.ndarray,
    threshold: float,
    scale: int,
) -> float:
    """Compute Fractions Skill Score using pySTEPS (with robust fallback)."""
    if PYSTEPS_AVAILABLE:
        try:
            val = pv.fss(forecast, observed, threshold, scale)
            if not np.isnan(val):
                return float(np.clip(val, 0.0, 1.0))
        except Exception:
            pass

    return compute_fss_fallback(forecast, observed, threshold, scale)


def compute_multi_scale_fss(
    forecast: np.ndarray,
    observed: np.ndarray,
    thresholds: Optional[List[float]] = None,
    scales: Optional[List[int]] = None,
) -> Dict[str, Dict[str, float]]:
    """Compute FSS across a matrix of meteorological thresholds and spatial neighborhood scales.
    
    Default scales: [1, 3, 5, 9, 15] grid boxes (~25km to 375km)
    Default thresholds: [2.5, 15.6, 64.5, 115.6] mm/day
    """
    if thresholds is None:
        thresholds = [2.5, 15.6, 64.5, 115.6]
    if scales is None:
        scales = [1, 3, 5, 9, 15]

    results: Dict[str, Dict[str, float]] = {}

    for thr in thresholds:
        thr_key = f"thresh_{thr}mm"
        results[thr_key] = {}
        # Base observed domain fraction
        o_base = np.mean((observed >= thr).astype(np.float64))
        fss_useful = 0.5 + o_base / 2.0
        results[thr_key]["fss_useful_threshold"] = round(float(fss_useful), 4)

        for s in scales:
            fss_val = compute_fss(forecast, observed, thr, s)
            results[thr_key][f"scale_{s}x{s}"] = round(fss_val, 4)

    return results
