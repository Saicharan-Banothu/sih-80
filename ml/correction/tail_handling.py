"""Upper-tail extrapolation policies and extreme rainfall behavior for quantile mapping."""

from __future__ import annotations

from typing import Any, Dict, Optional, Tuple
import numpy as np
from scipy.stats import genpareto


class TailExtrapolationEngine:
    """Manages upper-tail extrapolation beyond training empirical quantiles for extreme events."""

    POLICIES = ["CONSTANT_DELTA", "RATIO_EXTRAPOLATION", "PARETO_TAIL", "SAFETY_CLIP"]

    def __init__(
        self,
        extreme_threshold_mm: float = 64.5,
        tail_quantile: float = 0.99,
        max_physical_limit_mm: float = 1500.0,
        policy: str = "CONSTANT_DELTA",
    ):
        self.extreme_threshold_mm = extreme_threshold_mm
        self.tail_quantile = tail_quantile
        self.max_physical_limit_mm = max_physical_limit_mm
        self.policy = policy

        self.nwp_max_train: float = 0.0
        self.obs_max_train: float = 0.0
        self.tail_delta: float = 0.0
        self.tail_ratio: float = 1.0
        self.pareto_shape: float = 0.1
        self.pareto_scale: float = 15.0
        self.is_fitted: bool = False

    def fit(self, nwp_train: np.ndarray, obs_train: np.ndarray) -> TailExtrapolationEngine:
        """Fit tail parameters strictly on training period."""
        valid_mask = (~np.isnan(nwp_train)) & (~np.isnan(obs_train))
        nwp_vals = np.maximum(0.0, nwp_train[valid_mask])
        obs_vals = np.maximum(0.0, obs_train[valid_mask])

        if len(obs_vals) == 0:
            self.is_fitted = True
            return self

        self.nwp_max_train = float(np.max(nwp_vals))
        self.obs_max_train = float(np.max(obs_vals))

        # Quantile at tail threshold
        q_nwp = float(np.quantile(nwp_vals, self.tail_quantile))
        q_obs = float(np.quantile(obs_vals, self.tail_quantile))

        self.tail_delta = q_obs - q_nwp
        self.tail_ratio = max(0.2, min(5.0, q_obs / max(q_nwp, 1.0)))

        # Fit Generalized Pareto Distribution on observations exceeding heavy rain threshold (64.5 mm)
        tail_obs = obs_vals[obs_vals > self.extreme_threshold_mm] - self.extreme_threshold_mm
        if len(tail_obs) >= 10:
            try:
                c, _, scale = genpareto.fit(tail_obs, floc=0)
                self.pareto_shape = float(c)
                self.pareto_scale = float(scale)
            except Exception:
                pass

        self.is_fitted = True
        return self

    def extrapolate_tail(self, unadjusted_nwp: np.ndarray, mapped_values: np.ndarray) -> np.ndarray:
        """Apply tail extrapolation policy to extreme values exceeding training maximums."""
        adjusted = mapped_values.copy()
        extreme_mask = unadjusted_nwp > self.nwp_max_train

        if np.any(extreme_mask):
            excess = unadjusted_nwp[extreme_mask] - self.nwp_max_train
            if self.policy == "CONSTANT_DELTA":
                # Add the tail bias delta: y = x_mapped + delta
                adjusted[extreme_mask] = self.obs_max_train + excess + self.tail_delta
            elif self.policy == "RATIO_EXTRAPOLATION":
                adjusted[extreme_mask] = self.obs_max_train + excess * self.tail_ratio
            else:
                adjusted[extreme_mask] = np.maximum(adjusted[extreme_mask], self.obs_max_train + excess)

        # Enforce physical bounds (cannot be negative, capped at physical ceiling)
        return np.clip(adjusted, 0.0, self.max_physical_limit_mm)

    def summary(self) -> Dict[str, Any]:
        return {
            "policy": self.policy,
            "extreme_threshold_mm": self.extreme_threshold_mm,
            "tail_quantile": self.tail_quantile,
            "nwp_max_train_mm": round(self.nwp_max_train, 2),
            "obs_max_train_mm": round(self.obs_max_train, 2),
            "tail_delta_mm": round(self.tail_delta, 2),
            "tail_ratio": round(self.tail_ratio, 3),
            "is_fitted": self.is_fitted,
        }
