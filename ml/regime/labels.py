"""Operational prototype regime taxonomy definitions and metadata."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from backend.config import settings

# Canonical list of the 6 operational prototype regimes
REGIME_IDS = {
    0: "ACTIVE_MONSOON",
    1: "BREAK_MONSOON",
    2: "MONSOON_DEPRESSION_LOW",
    3: "OROGRAPHIC",
    4: "COASTAL_CONVECTIVE",
    5: "WESTERN_DISTURBANCE",
}

REGIME_NAMES_TO_ID = {v: k for k, v in REGIME_IDS.items()}

REGIME_METADATA = [
    {
        "id": 0,
        "name": "ACTIVE_MONSOON",
        "code": "AM",
        "description": "Vigorous monsoon trough with widespread convective and stratiform rain over central/peninsular India.",
        "color": "#3b82f6",
    },
    {
        "id": 1,
        "name": "BREAK_MONSOON",
        "code": "BM",
        "description": "Monsoon trough shifted north to Himalayan foothills, suppressed rainfall over central India.",
        "color": "#eab308",
    },
    {
        "id": 2,
        "name": "MONSOON_DEPRESSION_LOW",
        "code": "MDL",
        "description": "Synoptic-scale low-pressure system or depression originating in the Bay of Bengal or Arabian Sea.",
        "color": "#f97316",
    },
    {
        "id": 3,
        "name": "OROGRAPHIC",
        "code": "ORO",
        "description": "Mechanical terrain uplift along the Western Ghats, Northeast hills, or sub-Himalayan belt.",
        "color": "#10b981",
    },
    {
        "id": 4,
        "name": "COASTAL_CONVECTIVE",
        "code": "CC",
        "description": "Localized mesoscale convection driven by land-sea thermal contrasts and sea-breeze convergence.",
        "color": "#06b6d4",
    },
    {
        "id": 5,
        "name": "WESTERN_DISTURBANCE",
        "code": "WD",
        "description": "Mid-latitude upper-tropospheric westerly trough affecting north/northwest India.",
        "color": "#a855f7",
    },
]


def get_regime_name(regime_id: int) -> str:
    if regime_id not in REGIME_IDS:
        raise ValueError(f"Invalid regime ID {regime_id}. Expected 0..5.")
    return REGIME_IDS[regime_id]


def get_regime_id(regime_name: str) -> int:
    reg_upper = regime_name.upper().strip()
    if reg_upper not in REGIME_NAMES_TO_ID:
        raise ValueError(f"Unknown regime '{regime_name}'. Expected one of {list(REGIME_NAMES_TO_ID.keys())}")
    return REGIME_NAMES_TO_ID[reg_upper]


def get_all_regimes() -> List[Dict[str, Any]]:
    return REGIME_METADATA
