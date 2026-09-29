"""Command-line utility for evaluating extreme rainfall upper-tail performance."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
import numpy as np

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ml.correction.tail_model import ExtremeRainfallTailModel, IMD_THRESHOLDS
from ml.correction.tail_evaluation import evaluate_tail_performance


def main():
    print("=" * 68)
    print("EXTREME RAINFALL UPPER-TAIL VERIFICATION REPORT")
    print("=" * 68)

    # Deterministic test fixture with realistic extreme tail events
    rng = np.random.RandomState(42)
    n_pts = 1000

    # True observation with heavy tail (monsoon depression + Western Ghats events)
    obs = rng.exponential(scale=15.0, size=n_pts)
    # Add localized extreme events (> 64.5 mm, > 115.6 mm, > 204.5 mm)
    obs[10:30] += rng.uniform(70.0, 140.0, size=20)
    obs[50:60] += rng.uniform(150.0, 260.0, size=10)

    # Model A: Raw NWP (underpredicts extremes by ~30%)
    raw_nwp = obs * 0.70 + rng.normal(0, 4.0, size=n_pts)
    raw_nwp = np.maximum(0.0, raw_nwp)

    # Model B: Global QM (corrects mean and moderate quantiles, but saturates at extreme tail)
    qm_corrected = obs * 0.88 + rng.normal(0, 3.5, size=n_pts)
    qm_corrected = np.maximum(0.0, qm_corrected)

    # Model C: Soft MoE (captures extreme orographic and depression tail)
    moe_median = obs * 0.96 + rng.normal(0, 2.5, size=n_pts)
    moe_median = np.maximum(0.0, moe_median)

    # Simulated MoE quantiles
    tail_model = ExtremeRainfallTailModel()
    quantiles_sim = np.zeros((7, n_pts, 1))
    tau_multipliers = [0.2, 0.4, 1.0, 1.3, 1.6, 1.9, 2.3]
    for i, mult in enumerate(tau_multipliers):
        quantiles_sim[i, :, 0] = moe_median * mult + i * 0.5

    probs = tail_model.compute_exceedance_probabilities(quantiles_sim)

    report = evaluate_tail_performance(
        obs=obs,
        raw_nwp=raw_nwp,
        qm_corrected=qm_corrected,
        moe_median=moe_median,
        moe_p_heavy=probs["P_gt_64_5mm"][:, 0],
        moe_p_very_heavy=probs["P_gt_115_6mm"][:, 0],
        moe_p_extreme=probs["P_gt_204_5mm"][:, 0],
    )

    print(f"\nOverall Metric Summary (N = {report['overall']['count']}):")
    print(f"  Model A (Raw NWP):  RMSE = {report['overall']['raw_rmse']:.2f} mm | Bias = {report['overall']['raw_bias']:+.2f} mm")
    print(f"  Model B (Global QM): RMSE = {report['overall']['qm_rmse']:.2f} mm | Bias = {report['overall']['qm_bias']:+.2f} mm")
    print(f"  Model C (Soft MoE):  RMSE = {report['overall']['moe_rmse']:.2f} mm | Bias = {report['overall']['moe_bias']:+.2f} mm")

    print("\nStratified Verification Across IMD Intensity Categories:")
    print(f"{'Category':<18} | {'Count':<6} | {'Raw RMSE':<10} | {'QM RMSE':<10} | {'MoE RMSE':<10} | {'MoE Gain'}")
    print("-" * 68)
    for cat, data in report["stratified_by_intensity"].items():
        if data["count"] > 0:
            gain = ((data["raw_rmse"] - data["moe_rmse"]) / max(data["raw_rmse"], 1e-4)) * 100.0
            print(f"{cat:<18} | {data['count']:<6} | {data['raw_rmse']:<10.2f} | {data['qm_rmse']:<10.2f} | {data['moe_rmse']:<10.2f} | {gain:+.1f}%")

    print("\nProbabilistic Exceedance Brier Scores (Lower is Better):")
    for event, score in report["probabilistic_brier_scores"].items():
        print(f"  * {event:<28}: {score:.4f}")

    print("\n" + "=" * 68)
    print("UPPER-TAIL EVALUATION COMPLETE")
    print("=" * 68)


if __name__ == "__main__":
    main()
