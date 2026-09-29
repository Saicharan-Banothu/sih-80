"""Core 3-Way Comparative Experiment: Model A (Raw NWP) vs Model B (Global QM) vs Model C (Regime-Gated MoE)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from ml.verification.engine import ScientificVerificationEngine
from ml.correction.tail_model import ExtremeRainfallTailModel, IMD_THRESHOLDS
from ml.correction.tail_evaluation import evaluate_tail_performance
from ml.experiments.bootstrap import paired_block_bootstrap, rmse_metric, ets_metric


class CoreExperimentRunner:
    """Standardized experimental protocol executing Model A vs Model B vs Model C comparison."""

    def __init__(
        self,
        output_dir: Optional[Path] = None,
        block_length: int = 5,
        bootstrap_replications: int = 500,
    ):
        self.output_dir = output_dir or Path("artifacts/experiments")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.block_length = block_length
        self.bootstrap_replications = bootstrap_replications
        self.engine = ScientificVerificationEngine()
        self.tail_model = ExtremeRainfallTailModel()

    def run_benchmark(
        self,
        raw_nwp_series: np.ndarray,      # (N, H, W)
        qm_series: np.ndarray,           # (N, H, W)
        moe_quantiles_series: np.ndarray,# (N, 7, H, W)
        obs_series: np.ndarray,          # (N, H, W)
    ) -> Dict[str, Any]:
        """Execute full comparative benchmark and block-bootstrap hypothesis testing."""
        N = len(obs_series)
        moe_median_series = moe_quantiles_series[:, 2, :, :]  # index 2 is q50

        # Compute extreme exceedance probabilities
        exceed_probs = self.tail_model.compute_exceedance_probabilities(moe_quantiles_series)
        p_heavy = exceed_probs["P_gt_64_5mm"]
        p_very_heavy = exceed_probs["P_gt_115_6mm"]
        p_extreme = exceed_probs["P_gt_204_5mm"]

        # 1. Overall Scientific Verification Metrics
        verif_report = self.engine.compare_forecasts(
            raw_nwp=raw_nwp_series,
            qm_corrected=qm_series,
            moe_median=moe_median_series,
            obs=obs_series,
            moe_quantiles=moe_quantiles_series,
            moe_p_heavy=p_heavy,
        )

        # 2. Upper-Tail Stratified Metrics
        tail_report = evaluate_tail_performance(
            obs=obs_series,
            raw_nwp=raw_nwp_series,
            qm_corrected=qm_series,
            moe_median=moe_median_series,
            moe_p_heavy=p_heavy,
            moe_p_very_heavy=p_very_heavy,
            moe_p_extreme=p_extreme,
        )

        # 3. Paired Block-Bootstrap Significance Testing
        print("Executing paired block-bootstrap significance tests (preserving temporal synoptic autocorrelation)...")
        # Test 1: RMSE Reduction: MoE vs Raw NWP
        boot_rmse_vs_raw = paired_block_bootstrap(
            metric_func=rmse_metric,
            pred_c=moe_median_series,
            pred_base=raw_nwp_series,
            observed=obs_series,
            block_length=self.block_length,
            n_resamples=self.bootstrap_replications,
        )

        # Test 2: RMSE Reduction: MoE vs Global QM
        boot_rmse_vs_qm = paired_block_bootstrap(
            metric_func=rmse_metric,
            pred_c=moe_median_series,
            pred_base=qm_series,
            observed=obs_series,
            block_length=self.block_length,
            n_resamples=self.bootstrap_replications,
        )

        # Test 3: Heavy Rain ETS Increase: MoE vs Global QM
        boot_ets_vs_qm = paired_block_bootstrap(
            metric_func=lambda p, o: ets_metric(p, o, threshold=IMD_THRESHOLDS["HEAVY"]),
            pred_c=moe_median_series,
            pred_base=qm_series,
            observed=obs_series,
            block_length=self.block_length,
            n_resamples=self.bootstrap_replications,
        )

        # Test 4: Heavy Rain ETS Increase: MoE vs Raw NWP
        boot_ets_vs_raw = paired_block_bootstrap(
            metric_func=lambda p, o: ets_metric(p, o, threshold=IMD_THRESHOLDS["HEAVY"]),
            pred_c=moe_median_series,
            pred_base=raw_nwp_series,
            observed=obs_series,
            block_length=self.block_length,
            n_resamples=self.bootstrap_replications,
        )

        benchmark_results = {
            "metadata": {
                "n_samples": N,
                "block_length_days": self.block_length,
                "bootstrap_replications": self.bootstrap_replications,
                "models": {
                    "Model_A": "Raw NWP (Operational Baseline)",
                    "Model_B": "Global Quantile Mapping (Standard Prior)",
                    "Model_C": "Regime-Gated Mixture-of-Experts (Proposed System)",
                },
            },
            "scientific_verification": verif_report,
            "upper_tail_stratification": tail_report,
            "statistical_significance": {
                "rmse_moe_vs_raw": boot_rmse_vs_raw,
                "rmse_moe_vs_qm": boot_rmse_vs_qm,
                "ets_heavy_moe_vs_raw": boot_ets_vs_raw,
                "ets_heavy_moe_vs_qm": boot_ets_vs_qm,
            },
        }

        # Save to disk
        out_path = self.output_dir / "core_experiment_results.json"
        with open(out_path, "w") as f:
            json.dump(benchmark_results, f, indent=2)

        return benchmark_results
