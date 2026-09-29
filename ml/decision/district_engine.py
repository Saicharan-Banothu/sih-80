"""District aggregation engine and official IMD 4-tier color code advisory rule system."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from ml.data.districts import DistrictBoundaryAdapter
from ml.correction.tail_model import IMD_THRESHOLDS
from ml.regime.labels import REGIME_IDS, REGIME_METADATA


class DistrictDecisionEngine:
    """Computes area-aggregated statistics and determines official IMD color advisories."""

    def __init__(self):
        self.districts = DistrictBoundaryAdapter.get_all_districts()

    def determine_advisory(
        self,
        mean_q50: float,
        max_q90: float,
        peak_q99: float,
        p_heavy: float,
        p_very_heavy: float,
        p_extreme: float,
    ) -> Tuple[str, str, int]:
        """Apply strict multi-criteria IMD operational decision rules.
        
        Returns:
            (color_code, action_recommendation, severity_level [1 to 4])
        """
        # Tier 4: RED WARNING (Take Action)
        if p_extreme >= 0.30 or peak_q99 >= IMD_THRESHOLDS["EXTREMELY_HEAVY"] or p_very_heavy >= 0.60:
            return (
                "RED",
                "Take Action (RED WARNING): Extremely heavy rainfall expected. High risk of flash floods, "
                "urban inundation, and landslides in ghat sections. Mobilize NDRF/SDRF emergency disaster units.",
                4,
            )

        # Tier 3: ORANGE ALERT (Be Prepared)
        if p_very_heavy >= 0.40 or max_q90 >= IMD_THRESHOLDS["VERY_HEAVY"] or p_heavy >= 0.65:
            return (
                "ORANGE",
                "Be Prepared (ORANGE ALERT): Very heavy rainfall expected. Significant waterlogging on roads, "
                "swelling of river streams, and minor power disruptions. Keep relief mechanisms on standby.",
                3,
            )

        # Tier 2: YELLOW WATCH (Be Updated)
        if p_heavy >= 0.25 or max_q90 >= IMD_THRESHOLDS["HEAVY"] or mean_q50 >= 25.0:
            return (
                "YELLOW",
                "Be Updated (YELLOW WATCH): Heavy showers expected at isolated locations. Minor traffic delays "
                "and temporary water pooling. Monitor weather updates before travel.",
                2,
            )

        # Tier 1: GREEN (No Warning)
        return (
            "GREEN",
            "No Warning (GREEN): Light to moderate rainfall. Normal daily activities may proceed as usual.",
            1,
        )

    def aggregate_district_forecasts(
        self,
        lats: np.ndarray,
        lons: np.ndarray,
        q50_grid: np.ndarray,               # (H, W)
        q90_grid: np.ndarray,               # (H, W)
        q99_grid: np.ndarray,               # (H, W)
        p_heavy_grid: np.ndarray,           # (H, W)
        p_very_heavy_grid: np.ndarray,      # (H, W)
        p_extreme_grid: np.ndarray,         # (H, W)
        regime_probabilities: Optional[Dict[str, float]] = None,
    ) -> List[Dict[str, Any]]:
        """Compute district-level aggregations and advisory outputs across all Indian catalog districts."""
        # Find dominant regime
        dominant_regime = "ACTIVE_MONSOON"
        if regime_probabilities:
            dominant_regime = max(regime_probabilities.items(), key=lambda kv: kv[1])[0]

        advisories: List[Dict[str, Any]] = []

        for dist in self.districts:
            mask = DistrictBoundaryAdapter.get_grid_mask_for_district(dist, lats, lons)

            # Spatial aggregation inside district boundary
            mean_q50 = float(np.mean(q50_grid[mask]))
            max_q90 = float(np.max(q90_grid[mask]))
            peak_q99 = float(np.max(q99_grid[mask]))

            p_h = float(np.max(p_heavy_grid[mask]))
            p_vh = float(np.max(p_very_heavy_grid[mask]))
            p_ex = float(np.max(p_extreme_grid[mask]))

            color, action, severity = self.determine_advisory(
                mean_q50=mean_q50,
                max_q90=max_q90,
                peak_q99=peak_q99,
                p_heavy=p_h,
                p_very_heavy=p_vh,
                p_extreme=p_ex,
            )

            advisories.append({
                "district_id": dist["district_id"],
                "name": dist["name"],
                "state": dist["state"],
                "zone": dist["zone"],
                "lat": dist["lat"],
                "lon": dist["lon"],
                "area_sq_km": dist["area_sq_km"],
                "forecast": {
                    "mean_q50_mm": round(mean_q50, 1),
                    "max_q90_mm": round(max_q90, 1),
                    "peak_q99_mm": round(peak_q99, 1),
                    "prob_heavy_64_5mm": round(p_h, 3),
                    "prob_very_heavy_115_6mm": round(p_vh, 3),
                    "prob_extreme_204_5mm": round(p_ex, 3),
                },
                "advisory": {
                    "color_code": color,
                    "severity": severity,
                    "action_text": action,
                    "dominant_regime": dominant_regime,
                },
            })

        # Sort by severity descending (Red first, then Orange, Yellow, Green)
        advisories.sort(key=lambda d: d["advisory"]["severity"], reverse=True)
        return advisories
