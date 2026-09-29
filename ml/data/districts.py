"""Indian revenue district boundaries, regional zones, and spatial aggregation utilities."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Tuple
import numpy as np


class DistrictBoundaryAdapter:
    """Manager for Indian district administrative units and spatial grid mapping."""

    # Comprehensive catalog of representative Indian districts stratified by meteorological zones
    REPRESENTATIVE_DISTRICTS = [
        # Western Ghats Orographic Zone
        {
            "district_id": "KL_WAY",
            "name": "Wayanad",
            "state": "Kerala",
            "zone": "WESTERN_GHATS_OROGRAPHIC",
            "lat": 11.68,
            "lon": 76.13,
            "area_sq_km": 2132,
            "bbox": [11.45, 75.90, 11.95, 76.40],
        },
        {
            "district_id": "KL_IDU",
            "name": "Idukki",
            "state": "Kerala",
            "zone": "WESTERN_GHATS_OROGRAPHIC",
            "lat": 9.85,
            "lon": 76.97,
            "area_sq_km": 4356,
            "bbox": [9.50, 76.65, 10.25, 77.30],
        },
        {
            "district_id": "KA_DKA",
            "name": "Dakshina Kannada",
            "state": "Karnataka",
            "zone": "WESTERN_GHATS_OROGRAPHIC",
            "lat": 12.87,
            "lon": 75.25,
            "area_sq_km": 4861,
            "bbox": [12.50, 74.80, 13.20, 75.60],
        },
        {
            "district_id": "MH_RAT",
            "name": "Ratnagiri",
            "state": "Maharashtra",
            "zone": "WESTERN_GHATS_OROGRAPHIC",
            "lat": 16.99,
            "lon": 73.30,
            "area_sq_km": 8208,
            "bbox": [16.50, 73.10, 17.50, 73.80],
        },
        # Coastal Convective Zone
        {
            "district_id": "MH_MUM",
            "name": "Mumbai Suburban",
            "state": "Maharashtra",
            "zone": "COASTAL_CONVECTIVE",
            "lat": 19.07,
            "lon": 72.87,
            "area_sq_km": 446,
            "bbox": [18.90, 72.75, 19.30, 73.05],
        },
        {
            "district_id": "TN_CHE",
            "name": "Chennai",
            "state": "Tamil Nadu",
            "zone": "COASTAL_CONVECTIVE",
            "lat": 13.08,
            "lon": 80.27,
            "area_sq_km": 426,
            "bbox": [12.90, 80.15, 13.25, 80.35],
        },
        {
            "district_id": "AP_VSK",
            "name": "Visakhapatnam",
            "state": "Andhra Pradesh",
            "zone": "COASTAL_CONVECTIVE",
            "lat": 17.68,
            "lon": 83.21,
            "area_sq_km": 1048,
            "bbox": [17.50, 83.00, 17.90, 83.45],
        },
        # Monsoon Depression / Bay of Bengal Zone
        {
            "district_id": "OD_PUR",
            "name": "Puri",
            "state": "Odisha",
            "zone": "MONSOON_DEPRESSION_PATH",
            "lat": 19.81,
            "lon": 85.83,
            "area_sq_km": 3479,
            "bbox": [19.50, 85.10, 20.15, 86.40],
        },
        {
            "district_id": "OD_BAL",
            "name": "Balasore",
            "state": "Odisha",
            "zone": "MONSOON_DEPRESSION_PATH",
            "lat": 21.49,
            "lon": 86.93,
            "area_sq_km": 3806,
            "bbox": [21.10, 86.30, 21.90, 87.50],
        },
        {
            "district_id": "WB_MID",
            "name": "Paschim Medinipur",
            "state": "West Bengal",
            "zone": "MONSOON_DEPRESSION_PATH",
            "lat": 22.42,
            "lon": 87.32,
            "area_sq_km": 6308,
            "bbox": [21.80, 86.60, 22.90, 87.90],
        },
        # Central Monsoon Core Zone
        {
            "district_id": "MH_NAG",
            "name": "Nagpur",
            "state": "Maharashtra",
            "zone": "CENTRAL_MONSOON_CORE",
            "lat": 21.14,
            "lon": 79.08,
            "area_sq_km": 9892,
            "bbox": [20.55, 78.25, 21.75, 79.95],
        },
        {
            "district_id": "MP_BHO",
            "name": "Bhopal",
            "state": "Madhya Pradesh",
            "zone": "CENTRAL_MONSOON_CORE",
            "lat": 23.25,
            "lon": 77.41,
            "area_sq_km": 2772,
            "bbox": [23.05, 77.15, 23.55, 77.70],
        },
        # Northeast High-Relief Orographic Zone
        {
            "district_id": "ML_EKH",
            "name": "East Khasi Hills",
            "state": "Meghalaya",
            "zone": "NORTHEAST_OROGRAPHIC",
            "lat": 25.57,
            "lon": 91.89,
            "area_sq_km": 2748,
            "bbox": [25.10, 91.30, 25.85, 92.20],
        },
        {
            "district_id": "AS_KAM",
            "name": "Kamrup Metropolitan",
            "state": "Assam",
            "zone": "NORTHEAST_OROGRAPHIC",
            "lat": 26.14,
            "lon": 91.73,
            "area_sq_km": 1528,
            "bbox": [25.90, 91.45, 26.35, 92.05],
        },
        # Western Disturbance Zone (Northern India)
        {
            "district_id": "JK_SRI",
            "name": "Srinagar",
            "state": "Jammu & Kashmir",
            "zone": "WESTERN_DISTURBANCE_NORTH",
            "lat": 34.08,
            "lon": 74.79,
            "area_sq_km": 1979,
            "bbox": [33.85, 74.50, 34.30, 75.10],
        },
        {
            "district_id": "HP_SHI",
            "name": "Shimla",
            "state": "Himachal Pradesh",
            "zone": "WESTERN_DISTURBANCE_NORTH",
            "lat": 31.10,
            "lon": 77.17,
            "area_sq_km": 5131,
            "bbox": [30.75, 76.95, 31.45, 77.85],
        },
        {
            "district_id": "UK_DEH",
            "name": "Dehradun",
            "state": "Uttarakhand",
            "zone": "WESTERN_DISTURBANCE_NORTH",
            "lat": 30.31,
            "lon": 78.03,
            "area_sq_km": 3088,
            "bbox": [29.95, 77.55, 30.95, 78.35],
        },
    ]

    @classmethod
    def get_all_districts(cls) -> List[Dict[str, Any]]:
        """Return full district catalog."""
        return cls.REPRESENTATIVE_DISTRICTS

    @classmethod
    def get_district_by_id(cls, district_id: str) -> Optional[Dict[str, Any]]:
        """Find a district by identifier."""
        for d in cls.REPRESENTATIVE_DISTRICTS:
            if d["district_id"].upper() == district_id.upper():
                return d
        return None

    @classmethod
    def get_grid_mask_for_district(
        cls, district: Dict[str, Any], lats: np.ndarray, lons: np.ndarray
    ) -> np.ndarray:
        """Create a boolean 2D mask (lat x lon) for grid cells intersecting district bounding box."""
        lat_min, lon_min, lat_max, lon_max = district["bbox"]
        lon_grid, lat_grid = np.meshgrid(lons, lats)
        mask = (
            (lat_grid >= lat_min)
            & (lat_grid <= lat_max)
            & (lon_grid >= lon_min)
            & (lon_grid <= lon_max)
        )
        if not np.any(mask):
            # If box is small, find nearest single grid cell
            dist = (lat_grid - district["lat"]) ** 2 + (lon_grid - district["lon"]) ** 2
            nearest_idx = np.unravel_index(np.argmin(dist), dist.shape)
            mask[nearest_idx] = True
        return mask
