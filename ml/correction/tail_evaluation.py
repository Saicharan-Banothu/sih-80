"""Stratified verification and evaluation metrics specifically on the extreme upper tail."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import numpy as np

from ml.correction.tail_model import IMD_THRESHOLDS, IMD_BINS


def evaluate_tail_performance(
    obs: np.ndarray,
    raw_nwp: np.ndarray,
    qm_corrected: np.ndarray,
    moe_median: np.ndarray,
    moe_p_heavy: Optional[np.ndarray] = None,
    moe_p_very_heavy: Optional[np.ndarray] = None,
    moe_p_extreme: Optional[np.ndarray] = None,
) -> Dict[str, Any]:
    """Compute verification metrics stratified by IMD rainfall intensity categories."""
    y_true = obs.flatten()
    y_raw = raw_nwp.flatten()
    y_qm = qm_corrected.flatten()
    y_moe = moe_median.flatten()

    valid = (~np.isnan(y_true)) & (~np.isnan(y_raw)) & (~np.isnan(y_qm)) & (~np.isnan(y_moe))
    y_true = y_true[valid]
    y_raw = y_raw[valid]
    y_qm = y_qm[valid]
    y_moe = y_moe[valid]

    def calc_metrics(t: np.ndarray, r: np.ndarray, q: np.ndarray, m: np.ndarray) -> Dict[str, float]:
        if len(t) == 0:
            return {"count": 0, "raw_rmse": 0.0, "qm_rmse": 0.0, "moe_rmse": 0.0, "raw_bias": 0.0, "moe_bias": 0.0}
        return {
            "count": len(t),
            "raw_rmse": round(float(np.sqrt(np.mean((r - t) ** 2))), 3),
            "qm_rmse": round(float(np.sqrt(np.mean((q - t) ** 2))), 3),
            "moe_rmse": round(float(np.sqrt(np.mean((m - t) ** 2))), 3),
            "raw_bias": round(float(np.mean(r - t)), 3),
            "qm_bias": round(float(np.mean(q - t)), 3),
            "moe_bias": round(float(np.mean(m - t)), 3),
        }

    # Stratify by IMD Intensity Bins
    stratified_results = {}
    for min_v, max_v, label in IMD_BINS:
        mask = (y_true >= min_v) & (y_true < max_v)
        stratified_results[label] = calc_metrics(y_true[mask], y_raw[mask], y_qm[mask], y_moe[mask])

    # Brier Scores for Extreme Exceedance Probabilities
    brier_scores = {}
    if moe_p_heavy is not None:
        p_h = moe_p_heavy.flatten()[valid]
        y_h = (y_true >= IMD_THRESHOLDS["HEAVY"]).astype(np.float32)
        brier_scores["brier_heavy_64_5mm"] = round(float(np.mean((p_h - y_h) ** 2)), 4)

    if moe_p_very_heavy is not None:
        p_vh = moe_p_very_heavy.flatten()[valid]
        y_vh = (y_true >= IMD_THRESHOLDS["VERY_HEAVY"]).astype(np.float32)
        brier_scores["brier_very_heavy_115_6mm"] = round(float(np.mean((p_vh - y_vh) ** 2)), 4)

    if moe_p_extreme is not None:
        p_ex = moe_p_extreme.flatten()[valid]
        y_ex = (y_true >= IMD_THRESHOLDS["EXTREMELY_HEAVY"]).astype(np.float32)
        brier_scores["brier_extreme_204_5mm"] = round(float(np.mean((p_ex - y_ex) ** 2)), 4)

    return {
        "overall": calc_metrics(y_true, y_raw, y_qm, y_moe),
        "stratified_by_intensity": stratified_results,
        "probabilistic_brier_scores": brier_scores,
    }
