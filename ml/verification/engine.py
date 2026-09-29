"""Unified Scientific Verification Engine orchestrating spatial, categorical, and probabilistic evaluation."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from ml.verification.contingency import compute_categorical_scores
from ml.verification.spatial import compute_multi_scale_fss
from ml.verification.probabilistic import compute_crps_quantiles, compute_brier_skill_score
from ml.correction.tail_model import IMD_THRESHOLDS


class ScientificVerificationEngine:
    """End-to-End Scientific Verification Engine following WMO/IMD and pySTEPS standards."""

    def __init__(
        self,
        critical_thresholds: Optional[List[float]] = None,
        spatial_scales: Optional[List[int]] = None,
    ):
        self.thresholds = critical_thresholds or [2.5, 15.6, 64.5, 115.6]
        self.scales = spatial_scales or [1, 3, 5, 9, 15]

    def evaluate_continuous(self, pred: np.ndarray, obs: np.ndarray) -> Dict[str, float]:
        """Compute standard continuous verification metrics."""
        p_flat = pred.flatten()
        o_flat = obs.flatten()
        valid = (~np.isnan(p_flat)) & (~np.isnan(o_flat))
        p = p_flat[valid]
        o = o_flat[valid]

        if len(p) == 0:
            return {"rmse": 0.0, "mae": 0.0, "bias": 0.0, "corr": 0.0}

        diff = p - o
        rmse = np.sqrt(np.mean(diff ** 2))
        mae = np.mean(np.abs(diff))
        bias = np.mean(diff)

        # Pearson correlation
        if np.std(p) > 1e-6 and np.std(o) > 1e-6:
            corr = np.corrcoef(p, o)[0, 1]
        else:
            corr = 0.0

        return {
            "rmse": round(float(rmse), 3),
            "mae": round(float(mae), 3),
            "bias": round(float(bias), 3),
            "corr": round(float(corr), 4),
        }

    def evaluate_categorical_spectrum(
        self, pred: np.ndarray, obs: np.ndarray
    ) -> Dict[str, Dict[str, float]]:
        """Compute categorical contingency scores across all IMD thresholds."""
        scores = {}
        for thr in self.thresholds:
            scores[f"{thr}mm"] = compute_categorical_scores(pred, obs, thr)
        return scores

    def evaluate_spatial_fss(
        self, pred: np.ndarray, obs: np.ndarray
    ) -> Dict[str, Dict[str, float]]:
        """Compute Fractions Skill Score across thresholds and spatial scales."""
        return compute_multi_scale_fss(pred, obs, self.thresholds, self.scales)

    def compare_forecasts(
        self,
        raw_nwp: np.ndarray,
        qm_corrected: np.ndarray,
        moe_median: np.ndarray,
        obs: np.ndarray,
        moe_quantiles: Optional[np.ndarray] = None,
        moe_p_heavy: Optional[np.ndarray] = None,
    ) -> Dict[str, Any]:
        """Comprehensive 3-Way Benchmark Comparison: Raw NWP vs Global QM vs Soft MoE."""
        # 1. Continuous Metrics
        cont_raw = self.evaluate_continuous(raw_nwp, obs)
        cont_qm = self.evaluate_continuous(qm_corrected, obs)
        cont_moe = self.evaluate_continuous(moe_median, obs)

        # 2. Categorical Scores
        cat_raw = self.evaluate_categorical_spectrum(raw_nwp, obs)
        cat_qm = self.evaluate_categorical_spectrum(qm_corrected, obs)
        cat_moe = self.evaluate_categorical_spectrum(moe_median, obs)

        # 3. Spatial FSS
        fss_raw = self.evaluate_spatial_fss(raw_nwp, obs)
        fss_qm = self.evaluate_spatial_fss(qm_corrected, obs)
        fss_moe = self.evaluate_spatial_fss(moe_median, obs)

        # 4. Probabilistic Metrics for MoE
        prob_metrics = {}
        if moe_quantiles is not None:
            prob_metrics["moe_crps"] = compute_crps_quantiles(moe_quantiles, obs)

        if moe_p_heavy is not None:
            prob_metrics["moe_bss_heavy_64_5mm"] = compute_brier_skill_score(
                moe_p_heavy, obs, threshold=IMD_THRESHOLDS["HEAVY"]
            )

        # Skill improvements (%)
        rmse_gain_qm = round(((cont_raw["rmse"] - cont_qm["rmse"]) / max(cont_raw["rmse"], 1e-4)) * 100.0, 1)
        rmse_gain_moe = round(((cont_raw["rmse"] - cont_moe["rmse"]) / max(cont_raw["rmse"], 1e-4)) * 100.0, 1)

        return {
            "continuous_metrics": {
                "raw_nwp": cont_raw,
                "global_qm": cont_qm,
                "moe_median": cont_moe,
                "moe_rmse_gain_vs_raw_pct": rmse_gain_moe,
                "qm_rmse_gain_vs_raw_pct": rmse_gain_qm,
            },
            "categorical_metrics": {
                "raw_nwp": cat_raw,
                "global_qm": cat_qm,
                "moe_median": cat_moe,
            },
            "spatial_fss": {
                "raw_nwp": fss_raw,
                "global_qm": fss_qm,
                "moe_median": fss_moe,
            },
            "probabilistic_metrics": prob_metrics,
        }
