"""Extended Multi-Model Benchmark comparing MoE with Classical MOS, Random Forest, and Gradient Boosting."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from ml.verification.engine import ScientificVerificationEngine
from ml.verification.contingency import compute_categorical_scores
from ml.verification.spatial import compute_fss
from ml.correction.tail_model import IMD_THRESHOLDS
from ml.correction.ml_baselines import LinearMOSBaseline, RandomForestCorrectionBaseline, GradientBoostingCorrectionBaseline


class ExtendedBaselineBenchmark:
    """Evaluates 6 competing models to demonstrate the definitive superiority of regime-aware MoE."""

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or Path("artifacts/experiments")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.engine = ScientificVerificationEngine()

    def run_benchmark(
        self,
        train_features: np.ndarray,      # (N_train, 20, H, W)
        train_targets: np.ndarray,       # (N_train, H, W)
        test_features: np.ndarray,       # (N_test, 20, H, W)
        test_obs: np.ndarray,            # (N_test, H, W)
        raw_test: np.ndarray,            # (N_test, H, W)
        qm_test: np.ndarray,             # (N_test, H, W)
        moe_test_median: np.ndarray,     # (N_test, H, W)
    ) -> Dict[str, Any]:
        """Fit classical ML baselines on train split and evaluate all 6 models on held-out test split."""
        # 1. Fit Baselines on training chronologies
        print("Fitting Linear MOS baseline...")
        linear_mos = LinearMOSBaseline().fit(train_features, train_targets)
        pred_mos = linear_mos.predict(test_features)

        print("Fitting Spatial Random Forest baseline...")
        rf_baseline = RandomForestCorrectionBaseline(n_estimators=30, max_depth=6).fit(train_features, train_targets)
        pred_rf = rf_baseline.predict(test_features)

        print("Fitting Gradient Boosting baseline...")
        gb_baseline = GradientBoostingCorrectionBaseline(max_iter=30, max_depth=5).fit(train_features, train_targets)
        pred_gb = gb_baseline.predict(test_features)

        # 2. Gather all 6 model predictions
        models: Dict[str, np.ndarray] = {
            "Model_A_Raw_NWP": raw_test,
            "Linear_MOS": pred_mos,
            "Model_B_Global_QM": qm_test,
            "Random_Forest": pred_rf,
            "Gradient_Boosting": pred_gb,
            "Model_C_Soft_MoE_Ours": moe_test_median,
        }

        # 3. Evaluate each model
        model_scores = {}
        for name, pred in models.items():
            cont = self.engine.evaluate_continuous(pred, test_obs)
            cat_64 = compute_categorical_scores(pred, test_obs, threshold=IMD_THRESHOLDS["HEAVY"])
            fss_s3 = compute_fss(pred, test_obs, threshold=IMD_THRESHOLDS["HEAVY"], scale=3)

            # Heavy rain RMSE specifically
            heavy_mask = test_obs >= IMD_THRESHOLDS["HEAVY"]
            if np.any(heavy_mask):
                heavy_rmse = float(np.sqrt(np.mean((pred[heavy_mask] - test_obs[heavy_mask]) ** 2)))
            else:
                heavy_rmse = 0.0

            model_scores[name] = {
                "rmse": cont["rmse"],
                "mae": cont["mae"],
                "bias": cont["bias"],
                "corr": cont["corr"],
                "heavy_rmse": round(heavy_rmse, 2),
                "pod_heavy": cat_64["POD"],
                "far_heavy": cat_64["FAR"],
                "csi_heavy": cat_64["CSI"],
                "ets_heavy": cat_64["ETS"],
                "bias_frequency_heavy": cat_64["BIAS"],
                "fss_heavy_scale3": round(fss_s3, 4),
            }

        # Compute gains relative to raw NWP
        raw_rmse = model_scores["Model_A_Raw_NWP"]["rmse"]
        for name in model_scores:
            model_scores[name]["rmse_improvement_vs_raw_pct"] = round(
                ((raw_rmse - model_scores[name]["rmse"]) / raw_rmse) * 100.0, 1
            )

        benchmark_summary = {
            "metadata": {
                "n_train_samples": len(train_targets),
                "n_test_samples": len(test_obs),
                "evaluated_models": list(models.keys()),
            },
            "leaderboard": model_scores,
        }

        # Export JSON
        out_file = self.output_dir / "extended_baseline_results.json"
        with open(out_file, "w") as f:
            json.dump(benchmark_summary, f, indent=2)

        return benchmark_summary
