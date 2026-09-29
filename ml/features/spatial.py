"""Spatial feature operations: metric derivatives, vorticity, divergence, and multi-scale filters."""

from __future__ import annotations

from typing import Tuple
import numpy as np
from scipy.ndimage import uniform_filter, gaussian_filter

EARTH_RADIUS_METERS = 6371000.0


def compute_lat_lon_metric_spacing(
    lats: np.ndarray, resolution_deg: float = 0.25
) -> Tuple[np.ndarray, float]:
    """Compute local metric grid spacing dx (zonal) and dy (meridional) in meters.
    
    dy is constant for uniform latitude spacing.
    dx depends on latitude: dx(lat) = R * cos(lat * pi / 180) * dlon * (pi / 180)
    """
    d_rad = np.radians(resolution_deg)
    dy = EARTH_RADIUS_METERS * d_rad
    # dx varies with latitude (shape: len(lats))
    dx_profile = EARTH_RADIUS_METERS * np.cos(np.radians(lats)) * d_rad
    # Guard against zero or negative values at extreme poles
    dx_profile = np.maximum(dx_profile, 1000.0)
    return dx_profile, dy


def compute_spatial_gradients_2d(
    field: np.ndarray, lats: np.ndarray, resolution_deg: float = 0.25
) -> Tuple[np.ndarray, np.ndarray]:
    """Compute zonal derivative (df/dx) and meridional derivative (df/dy).
    
    field: 2D array of shape (n_lat, n_lon)
    returns: (df_dx, df_dy) in units of field_unit / meter
    """
    n_lat, n_lon = field.shape
    dx_profile, dy = compute_lat_lon_metric_spacing(lats, resolution_deg)

    # 1. Meridional gradient df/dy along axis 0 (lat)
    # Using central differences, interior 2*dy, edges 1*dy
    df_dy = np.gradient(field, dy, axis=0)

    # 2. Zonal gradient df/dx along axis 1 (lon), scaled by local latitude dx
    df_dx = np.zeros_like(field)
    for i in range(n_lat):
        df_dx[i, :] = np.gradient(field[i, :], dx_profile[i])

    return df_dx, df_dy


def compute_relative_vorticity_2d(
    u_wind: np.ndarray, v_wind: np.ndarray, lats: np.ndarray, resolution_deg: float = 0.25
) -> np.ndarray:
    """Compute vertical component of relative vorticity: zeta = dv/dx - du/dy (s^-1).
    
    Essential for identifying cyclonic monsoon depressions (zeta > 0 in Northern Hemisphere).
    """
    dv_dx, _ = compute_spatial_gradients_2d(v_wind, lats, resolution_deg)
    _, du_dy = compute_spatial_gradients_2d(u_wind, lats, resolution_deg)
    vorticity = dv_dx - du_dy
    return vorticity


def compute_divergence_2d(
    u_wind: np.ndarray, v_wind: np.ndarray, lats: np.ndarray, resolution_deg: float = 0.25
) -> np.ndarray:
    """Compute horizontal divergence: div = du/dx + dv/dy (s^-1).
    
    Low-level convergence (div < 0) indicates organized updrafts and deep convection.
    """
    du_dx, _ = compute_spatial_gradients_2d(u_wind, lats, resolution_deg)
    _, dv_dy = compute_spatial_gradients_2d(v_wind, lats, resolution_deg)
    divergence = du_dx + dv_dy
    return divergence


def compute_spatial_neighborhood_features(
    field: np.ndarray, scales: Tuple[int, ...] = (3, 7)
) -> Tuple[np.ndarray, ...]:
    """Compute multi-scale spatial neighborhood representations (e.g., 3x3 ~75km, 7x7 ~175km).
    
    Captures synoptic background context around each grid cell.
    """
    smoothed = []
    for scale in scales:
        smoothed.append(uniform_filter(field, size=scale, mode="nearest"))
    return tuple(smoothed)
