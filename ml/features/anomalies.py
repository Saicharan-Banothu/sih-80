"""Meteorological anomaly fields: pressure deficit, monsoon gradients, and moisture transport."""

from __future__ import annotations

from typing import Dict, Tuple
import numpy as np


def compute_slp_anomalies_2d(slp: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Compute domain-relative pressure deficit and zonal pressure anomaly (hPa).
    
    returns:
      domain_anomaly: SLP - domain_mean (negative indicates cyclonic depression core)
      zonal_anomaly: SLP - mean along longitude axis
    """
    domain_mean = np.nanmean(slp)
    domain_anomaly = slp - domain_mean

    # Zonal mean along axis 1 (longitude)
    zonal_mean = np.nanmean(slp, axis=1, keepdims=True)
    zonal_anomaly = slp - zonal_mean

    return domain_anomaly, zonal_anomaly


def compute_monsoon_meridional_pressure_index(
    slp: np.ndarray, lats: np.ndarray
) -> float:
    """Compute the operational Indian Monsoon pressure gradient index: SLP(South) - SLP(North).
    
    A strong positive South-North pressure gradient drives the cross-equatorial monsoon jet.
    Negative or weak gradients indicate a Break monsoon state.
    """
    # South India slice ~8-12°N
    south_idx = np.where((lats >= 8.0) & (lats <= 12.0))[0]
    # North India / Foothills slice ~26-30°N
    north_idx = np.where((lats >= 26.0) & (lats <= 30.0))[0]

    if len(south_idx) == 0 or len(north_idx) == 0:
        return 0.0

    south_slp = float(np.nanmean(slp[south_idx, :]))
    north_slp = float(np.nanmean(slp[north_idx, :]))

    return south_slp - north_slp


def compute_moisture_flux_2d(
    u_wind: np.ndarray, v_wind: np.ndarray, moisture: np.ndarray
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Compute horizontal moisture flux vector components and flux magnitude.
    
    u_flux = u * moisture (m/s * g/kg)
    v_flux = v * moisture (m/s * g/kg)
    flux_mag = sqrt(u_flux^2 + v_flux^2)
    """
    u_flux = u_wind * moisture
    v_flux = v_wind * moisture
    flux_mag = np.sqrt(u_flux ** 2 + v_flux ** 2)
    return u_flux, v_flux, flux_mag
