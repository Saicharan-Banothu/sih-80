"""Categorical contingency table metrics across official IMD rainfall thresholds."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import numpy as np

try:
    import pysteps.verification as pv
    PYSTEPS_AVAILABLE = True
except ImportError:
    PYSTEPS_AVAILABLE = False


def compute_contingency_table(
    forecast: np.ndarray,
    observed: np.ndarray,
    threshold: float,
) -> Dict[str, int]:
    """Compute 2x2 contingency table counts: Hits (H), False Alarms (F), Misses (M), Correct Negatives (C)."""
    f_flat = forecast.flatten()
    o_flat = observed.flatten()

    valid = (~np.isnan(f_flat)) & (~np.isnan(o_flat))
    f_bin = f_flat[valid] >= threshold
    o_bin = o_flat[valid] >= threshold

    hits = int(np.sum(f_bin & o_bin))
    false_alarms = int(np.sum(f_bin & (~o_bin)))
    misses = int(np.sum((~f_bin) & o_bin))
    correct_negatives = int(np.sum((~f_bin) & (~o_bin)))

    return {
        "H": hits,
        "F": false_alarms,
        "M": misses,
        "C": correct_negatives,
        "total": int(np.sum(valid)),
    }


def compute_categorical_scores(
    forecast: np.ndarray,
    observed: np.ndarray,
    threshold: float,
) -> Dict[str, float]:
    """Calculate meteorological scores: POD, FAR, CSI, ETS, Frequency Bias, and HSS.
    
    Uses pySTEPS det_cat_fct if available, otherwise vectorized NumPy fallback.
    """
    table = compute_contingency_table(forecast, observed, threshold)
    H, F, M, C, N = table["H"], table["F"], table["M"], table["C"], table["total"]

    if N == 0:
        return {
            "POD": 0.0,
            "FAR": 0.0,
            "CSI": 0.0,
            "ETS": 0.0,
            "BIAS": 1.0,
            "HSS": 0.0,
            "hits": 0,
            "false_alarms": 0,
            "misses": 0,
            "correct_negatives": 0,
        }

    # POD = H / (H + M)
    pod = H / (H + M) if (H + M) > 0 else 0.0
    # FAR = F / (H + F)
    far = F / (H + F) if (H + F) > 0 else 0.0
    # CSI = H / (H + F + M)
    csi = H / (H + F + M) if (H + F + M) > 0 else 0.0
    # Frequency Bias = (H + F) / (H + M)
    bias = (H + F) / (H + M) if (H + M) > 0 else 1.0

    # Equitable Threat Score (ETS) / Gilbert Skill Score (GSS)
    # H_random = (H + M) * (H + F) / N
    h_random = ((H + M) * (H + F)) / N
    denom_ets = (H + F + M - h_random)
    ets = (H - h_random) / denom_ets if denom_ets != 0 else 0.0

    # Heidke Skill Score (HSS)
    expected_correct = ((H + M) * (H + F) + (C + M) * (C + F)) / N
    denom_hss = N - expected_correct
    hss = (H + C - expected_correct) / denom_hss if denom_hss != 0 else 0.0

    return {
        "POD": round(float(pod), 4),
        "FAR": round(float(far), 4),
        "CSI": round(float(csi), 4),
        "ETS": round(float(ets), 4),
        "BIAS": round(float(bias), 4),
        "HSS": round(float(hss), 4),
        "hits": H,
        "false_alarms": F,
        "misses": M,
        "correct_negatives": C,
    }
