"""Wet-day frequency adjustment and zero-rainfall / drizzle discrimination."""

from __future__ import annotations

from typing import Dict, Tuple
import numpy as np


class WetDayFrequencyAdjuster:
    """Corrects drizzle bias and aligns wet-day occurrence frequencies between NWP and observations."""

    def __init__(self, wet_threshold_mm: float = 0.1):
        self.wet_threshold_mm = wet_threshold_mm
        self.nwp_drizzle_threshold: float = wet_threshold_mm
        self.is_fitted: bool = False

    def fit(self, nwp_rain_train: np.ndarray, obs_rain_train: np.ndarray) -> WetDayFrequencyAdjuster:
        """Find the NWP drizzle threshold that matches the observed wet-day frequency on training data."""
        # Valid non-NaN values
        valid_mask = (~np.isnan(nwp_rain_train)) & (~np.isnan(obs_rain_train))
        nwp_vals = np.maximum(0.0, nwp_rain_train[valid_mask])
        obs_vals = np.maximum(0.0, obs_rain_train[valid_mask])

        if len(obs_vals) == 0:
            self.nwp_drizzle_threshold = self.wet_threshold_mm
            self.is_fitted = True
            return self

        # Observed wet-day frequency P(obs >= wet_threshold)
        obs_wet_freq = float(np.mean(obs_vals >= self.wet_threshold_mm))

        # Find quantile in NWP corresponding to the dry-day fraction (1 - obs_wet_freq)
        dry_quantile = max(0.0, min(1.0, 1.0 - obs_wet_freq))
        self.nwp_drizzle_threshold = float(np.quantile(nwp_vals, dry_quantile))
        self.is_fitted = True
        return self

    def apply(self, nwp_rain: np.ndarray) -> np.ndarray:
        """Set drizzle values below the adjusted threshold to 0.0 mm."""
        adjusted = np.maximum(0.0, nwp_rain.copy())
        # Zero out values below NWP drizzle threshold
        adjusted[adjusted < self.nwp_drizzle_threshold] = 0.0
        return adjusted

    def summary(self) -> Dict[str, float]:
        return {
            "wet_threshold_mm": self.wet_threshold_mm,
            "fitted_nwp_drizzle_threshold_mm": round(self.nwp_drizzle_threshold, 4),
            "is_fitted": self.is_fitted,
        }
