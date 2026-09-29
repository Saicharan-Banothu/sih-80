"""Transparent probabilistic mapping from Raut et al. 2026 11 clusters to 6 operational classes."""

from __future__ import annotations

from typing import Any, Dict, List
import numpy as np
from ml.data.regime_seeds import RautRegimeSeedsAdapter
from ml.regime.labels import REGIME_IDS, REGIME_METADATA


class RegimeTaxonomyMapper:
    """Manages weak-supervision seed mapping and cluster-to-regime transformation."""

    @classmethod
    def get_mapping_rationale(cls) -> List[Dict[str, Any]]:
        """Return full documentation of the 11-cluster to 6-regime mapping rationale."""
        return [
            {
                "raut_clusters": [1, 2],
                "raut_description": "Vigorous Deep Monsoon Trough & Normal Active Monsoon Trough",
                "mapped_regime": "ACTIVE_MONSOON",
                "scientific_rationale": "Clusters 1 & 2 exhibit established low-level westerlies (850 hPa > 12 m/s) with a deep monsoon trough oriented across central India, matching the operational Active Monsoon profile.",
            },
            {
                "raut_clusters": [3],
                "raut_description": "Foothill Break Monsoon",
                "mapped_regime": "BREAK_MONSOON",
                "scientific_rationale": "Cluster 3 exhibits the northward migration of the monsoon trough toward the Himalayan foothills with suppressed central Indian precipitation.",
            },
            {
                "raut_clusters": [4, 5],
                "raut_description": "Bay of Bengal Monsoon Depression & Arabian Sea Low",
                "mapped_regime": "MONSOON_DEPRESSION_LOW",
                "scientific_rationale": "Clusters 4 & 5 represent synoptic cyclonic vortices with concentrated positive relative vorticity (> 2.5e-5 s^-1) and closed MSLP contours.",
            },
            {
                "raut_clusters": [6, 7],
                "raut_description": "Strong Cross-Equatorial Jet (Western Ghats) & Northeast Orographic",
                "mapped_regime": "OROGRAPHIC",
                "scientific_rationale": "Clusters 6 & 7 are dominated by mechanical barrier uplift where heavy rainfall is anchored along high-elevation topography.",
            },
            {
                "raut_clusters": [8, 9],
                "raut_description": "East Coast / Coromandel Convergence & West Coast Sea-Breeze",
                "mapped_regime": "COASTAL_CONVECTIVE",
                "scientific_rationale": "Clusters 8 & 9 capture mesoscale diurnal coastal convection driven by land-sea thermal contrasts.",
            },
            {
                "raut_clusters": [10, 11],
                "raut_description": "Subtropical Westerly Troughs (Western Disturbance phases)",
                "mapped_regime": "WESTERN_DISTURBANCE",
                "scientific_rationale": "Clusters 10 & 11 exhibit upper-tropospheric westerly trough intrusion into northwest and northern India.",
            },
        ]

    @classmethod
    def cluster_id_to_probabilities(cls, cluster_id: int) -> np.ndarray:
        """Map a Raut cluster ID (1..11) to calibrated 6-class operational probabilities."""
        return RautRegimeSeedsAdapter.map_cluster_to_regime_probabilities(cluster_id)
