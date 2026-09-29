"""Static geographic and topographic indicator masks over the Indian domain."""

from __future__ import annotations

from typing import Dict, Tuple
import numpy as np


class SpatialMasks:
    """Generates physically grounded geospatial and topographic masks on a 2D lat-lon grid."""

    @classmethod
    def get_topography_mask(cls, lats: np.ndarray, lons: np.ndarray) -> np.ndarray:
        """Normalized elevation/relief proxy [0, 1] highlighting Western Ghats, Himalayas, and NE hills."""
        lon_grid, lat_grid = np.meshgrid(lons, lats)
        elev_proxy = np.zeros_like(lat_grid, dtype=np.float32)

        # 1. Western Ghats escarpment (narrow North-South barrier, lat 8-20°N, lon 73.5-76°E)
        wg_dist = ((lon_grid - (74.0 + 0.1 * (lat_grid - 10.0))) / 1.2) ** 2
        wg_band = np.exp(-wg_dist) * ((lat_grid >= 8.0) & (lat_grid <= 21.0)).astype(np.float32)
        elev_proxy += wg_band * 0.75

        # 2. Himalayan / Karakoram barrier (North India: lat >= 28.5°N)
        himalayas = np.clip((lat_grid - 28.0) / 7.0, 0.0, 1.0) * ((lon_grid >= 73.0) & (lon_grid <= 96.0)).astype(np.float32)
        elev_proxy += himalayas * 0.95

        # 3. Northeast Hills (Meghalaya Plateau, Garo-Khasi-Jaintia: lat 25-27°N, lon 89-94°E)
        ne_hills = np.exp(-((lat_grid - 25.8) ** 2) / 1.5 - ((lon_grid - 92.0) ** 2) / 8.0) * 0.85
        elev_proxy += ne_hills

        return np.clip(elev_proxy, 0.0, 1.0)

    @classmethod
    def get_land_sea_mask(cls, lats: np.ndarray, lons: np.ndarray) -> np.ndarray:
        """Simplified binary land-sea mask (1 = land, 0 = ocean) approximating mainland India."""
        lon_grid, lat_grid = np.meshgrid(lons, lats)
        # Peninsular triangle + Northern landmass
        is_north_land = (lat_grid >= 22.0) & (lon_grid >= 68.0) & (lon_grid <= 97.0)
        # Peninsular taper
        taper_west = 68.0 + 0.7 * (22.0 - lat_grid)
        taper_east = 89.0 - 0.7 * (22.0 - lat_grid)
        is_peninsula = (lat_grid < 22.0) & (lat_grid >= 8.0) & (lon_grid >= taper_west) & (lon_grid <= taper_east)

        land_mask = (is_north_land | is_peninsula).astype(np.float32)
        return land_mask
