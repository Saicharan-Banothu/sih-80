"""Extreme rainfall modeling, IMD exceedance probabilities, and tail distribution analysis."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from scipy.stats import genpareto

from ml.correction.quantiles import OPERATIONAL_QUANTILES

# Official IMD rainfall classification cutoffs (mm/day)
IMD_THRESHOLDS = {
    "HEAVY": 64.5,
    "VERY_HEAVY": 115.6,
    "EXTREMELY_HEAVY": 204.5,
}

IMD_BINS = [
    (0.0, 2.5, "NO_RAIN_TRACE"),
    (2.5, 15.5, "LIGHT"),
    (15.6, 64.4, "MODERATE"),
    (64.5, 115.5, "HEAVY"),
    (115.6, 204.4, "VERY_HEAVY"),
    (204.5, 9999.0, "EXTREMELY_HEAVY"),
]


class ExtremeRainfallTailModel:
    """Rigorous extreme-tail inference engine deriving exceedance probabilities from predictive quantiles."""

    def __init__(
        self,
        heavy_threshold_mm: float = 64.5,
        very_heavy_threshold_mm: float = 115.6,
        extremely_heavy_threshold_mm: float = 204.5,
        pareto_scale_prior: float = 25.0,
    ):
        self.heavy_thresh = heavy_threshold_mm
        self.very_heavy_thresh = very_heavy_threshold_mm
        self.extremely_heavy_thresh = extremely_heavy_threshold_mm
        self.pareto_scale = pareto_scale_prior

    def compute_exceedance_probabilities(
        self, quantiles_3d_or_4d: np.ndarray
    ) -> Dict[str, np.ndarray]:
        """Derive P(R > 64.5), P(R > 115.6), P(R > 204.5) directly from predictive quantiles.
        
        quantiles: array of shape (7, H, W) or (B, 7, H, W) where axis corresponds to
                   tau = [0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99]
        returns:
          dictionary of exceedance probability arrays strictly bounded in [0.0, 1.0]
        """
        # Ensure 4D (B, 7, H, W)
        if quantiles_3d_or_4d.ndim == 3:
            q_arr = np.expand_dims(quantiles_3d_or_4d, axis=0)
            is_single = True
        else:
            q_arr = quantiles_3d_or_4d
            is_single = False

        p_heavy = self._invert_predictive_cdf(q_arr, self.heavy_thresh)
        p_very_heavy = self._invert_predictive_cdf(q_arr, self.very_heavy_thresh)
        p_extreme = self._invert_predictive_cdf(q_arr, self.extremely_heavy_thresh)

        # Enforce mathematical monotonicity: P(>64.5) >= P(>115.6) >= P(>204.5)
        p_very_heavy = np.minimum(p_very_heavy, p_heavy)
        p_extreme = np.minimum(p_extreme, p_very_heavy)

        if is_single:
            return {
                "P_gt_64_5mm": p_heavy[0],
                "P_gt_115_6mm": p_very_heavy[0],
                "P_gt_204_5mm": p_extreme[0],
            }

        return {
            "P_gt_64_5mm": p_heavy,
            "P_gt_115_6mm": p_very_heavy,
            "P_gt_204_5mm": p_extreme,
        }

    def _invert_predictive_cdf(self, quantiles_4d: np.ndarray, threshold: float) -> np.ndarray:
        """Invert the piecewise continuous quantile function to compute exceedance probability 1 - F(u).
        
        quantiles_4d: shape (B, 7, H, W)
        """
        tau_levels = np.array(OPERATIONAL_QUANTILES)  # [0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99]
        B, _, H, W = quantiles_4d.shape
        exceed_prob = np.zeros((B, H, W), dtype=np.float32)

        # Case 1: Threshold below q10 (threshold <= q10) -> P(R > u) is high
        q10 = quantiles_4d[:, 0, :, :]
        below_q10 = threshold <= q10
        # Linear ramp from 1.0 (at 0 mm) to 0.90 (at q10)
        exceed_prob[below_q10] = 1.0 - 0.10 * np.clip(threshold / np.maximum(q10[below_q10], 0.1), 0.0, 1.0)

        # Case 2: Threshold between quantiles q_k and q_{k+1}
        for k in range(len(tau_levels) - 1):
            q_k = quantiles_4d[:, k, :, :]
            q_next = quantiles_4d[:, k + 1, :, :]
            tau_k = tau_levels[k]
            tau_next = tau_levels[k + 1]

            in_interval = (threshold > q_k) & (threshold <= q_next)
            if np.any(in_interval):
                denom = np.maximum(q_next[in_interval] - q_k[in_interval], 1e-4)
                fraction = (threshold - q_k[in_interval]) / denom
                cdf_k = tau_k + fraction * (tau_next - tau_k)
                exceed_prob[in_interval] = 1.0 - cdf_k

        # Case 3: Threshold beyond q99 -> Generalized Pareto / exponential tail decay
        q99 = quantiles_4d[:, -1, :, :]
        above_q99 = threshold > q99
        if np.any(above_q99):
            excess = threshold - q99[above_q99]
            # Tail exceedance probability: P(R > u | R > q99) * (1 - 0.99)
            # Using exponential/Pareto tail survival function: S(x) = exp(-x / scale)
            tail_survival = 0.01 * np.exp(-excess / self.pareto_scale)
            exceed_prob[above_q99] = tail_survival

        return np.clip(exceed_prob, 0.0, 1.0)

    @classmethod
    def classify_rainfall_intensity(cls, rainfall: np.ndarray) -> np.ndarray:
        """Categorize rainfall grid cells into official IMD intensity classes."""
        categories = np.empty(rainfall.shape, dtype=object)
        for min_v, max_v, label in IMD_BINS:
            mask = (rainfall >= min_v) & (rainfall < max_v)
            categories[mask] = label
        return categories
