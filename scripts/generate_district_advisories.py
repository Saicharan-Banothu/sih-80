"""Command-line utility generating operational district-level rainfall advisories and IMD color codes."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ml.decision.district_engine import DistrictDecisionEngine
from ml.correction.tail_model import ExtremeRainfallTailModel
from ml.data.districts import DistrictBoundaryAdapter


def generate_operational_scenario():
    """Synthesize a synoptic monsoon depression scenario affecting Central & Coastal India."""
    lats = np.linspace(8.0, 36.0, 113)
    lons = np.linspace(68.0, 98.0, 121)
    lon_grid, lat_grid = np.meshgrid(lons, lats)

    # Active depression centered near Odisha / Coastal Andhra
    dist_dep = np.sqrt((lon_grid - 84.5) ** 2 + (lat_grid - 19.5) ** 2)
    q50 = 140.0 * np.exp(-dist_dep / 3.0) + 15.0

    # Western Ghats orographic crest
    ghats_mask = (lon_grid >= 74.0) & (lon_grid <= 76.5) & (lat_grid >= 9.0) & (lat_grid <= 18.0)
    q50[ghats_mask] += 95.0

    q90 = q50 * 1.45
    q99 = q50 * 2.10

    quantiles_3d = np.zeros((7, len(lats), len(lons)), dtype=np.float32)
    tau_factors = [0.25, 0.50, 1.0, 1.30, 1.65, 1.95, 2.30]
    for i, tf in enumerate(tau_factors):
        quantiles_3d[i] = q50 * tf

    tail_model = ExtremeRainfallTailModel()
    tail_probs = tail_model.compute_exceedance_probabilities(quantiles_3d)

    regime_probs = {
        "ACTIVE_MONSOON": 0.20,
        "BREAK_MONSOON": 0.05,
        "MONSOON_DEPRESSION_LOW": 0.55,
        "OROGRAPHIC_WESTERN_GHATS": 0.15,
        "COASTAL_CONVECTIVE": 0.03,
        "WESTERN_DISTURBANCE": 0.02,
    }

    return lats, lons, q50, q90, q99, tail_probs, regime_probs


def main():
    print("=" * 105)
    print("OPERATIONAL DISTRICT RAINFALL DECISION SUPPORT & IMD ADVISORY SYSTEM")
    print("Synoptic Regime: MONSOON DEPRESSION / LOW (Bay of Bengal landfall)")
    print("=" * 105)

    lats, lons, q50, q90, q99, tail_probs, regime_probs = generate_operational_scenario()

    engine = DistrictDecisionEngine()
    advisories = engine.aggregate_district_forecasts(
        lats=lats,
        lons=lons,
        q50_grid=q50,
        q90_grid=q90,
        q99_grid=q99,
        p_heavy_grid=tail_probs["P_gt_64_5mm"],
        p_very_heavy_grid=tail_probs["P_gt_115_6mm"],
        p_extreme_grid=tail_probs["P_gt_204_5mm"],
        regime_probabilities=regime_probs,
    )

    print(f"\nTotal Evaluated Districts: {len(advisories)}")
    counts = {"RED": 0, "ORANGE": 0, "YELLOW": 0, "GREEN": 0}
    for a in advisories:
        counts[a["advisory"]["color_code"]] += 1

    print(f"Summary: RED: {counts['RED']} | ORANGE: {counts['ORANGE']} | YELLOW: {counts['YELLOW']} | GREEN: {counts['GREEN']}\n")

    print("-" * 105)
    print(f"{'District':<18} | {'State':<15} | {'Mean q50':<9} | {'Max q90':<9} | {'Peak q99':<9} | {'P(>64.5)':<9} | {'IMD Alert':<8} | {'Action Summary'}")
    print("-" * 105)

    for a in advisories:
        fc = a["forecast"]
        adv = a["advisory"]
        color = adv["color_code"]
        action_short = adv["action_text"][:38] + "..." if len(adv["action_text"]) > 38 else adv["action_text"]
        print(
            f"{a['name']:<18} | "
            f"{a['state']:<15} | "
            f"{fc['mean_q50_mm']:<9.1f} | "
            f"{fc['max_q90_mm']:<9.1f} | "
            f"{fc['peak_q99_mm']:<9.1f} | "
            f"{fc['prob_heavy_64_5mm']:<9.3f} | "
            f"{color:<8} | "
            f"{action_short}"
        )

    print("-" * 105)
    out_dir = PROJECT_ROOT / "artifacts" / "advisories"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "latest_district_advisories.json"
    with open(out_file, "w") as f:
        json.dump(advisories, f, indent=2)

    print(f"Advisories exported successfully to: {out_file}")
    print("=" * 105)


if __name__ == "__main__":
    main()
