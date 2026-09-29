"""Temporal encoding: cyclic seasonality, lead-time scaling, and issue-time history windows."""

from __future__ import annotations

from typing import Dict, Tuple
import numpy as np
import pandas as pd


def encode_cyclic_seasonality(date_str_or_dt: str | pd.Timestamp) -> Tuple[float, float, float, float]:
    """Encode date into continuous cyclic trigonometric features.
    
    returns: (doy_sin, doy_cos, month_sin, month_cos)
    Preserves seasonal continuity across year-end transitions.
    """
    dt = pd.to_datetime(date_str_or_dt)
    doy = dt.dayofyear
    doy_rad = 2.0 * np.pi * (doy / 365.25)
    doy_sin = float(np.sin(doy_rad))
    doy_cos = float(np.cos(doy_rad))

    month = dt.month
    month_rad = 2.0 * np.pi * (month / 12.0)
    month_sin = float(np.sin(month_rad))
    month_cos = float(np.cos(month_rad))

    return doy_sin, doy_cos, month_sin, month_cos


def encode_lead_time(lead_time_hours: int, max_lead_hours: int = 72) -> float:
    """Normalize forecast lead time into [0.0, 1.0]."""
    return float(np.clip(lead_time_hours / max_lead_hours, 0.0, 1.0))
