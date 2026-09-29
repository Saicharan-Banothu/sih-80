"""Operational inference engine for Model C: Soft-Gated Mixture-of-Experts."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import torch

from ml.data.base import GriddedForecastDataset
from ml.features.builder import FeatureBuilder
from ml.correction.moe import RegimeGatedMoE
from ml.correction.quantiles import OPERATIONAL_QUANTILES
from ml.regime.labels import REGIME_IDS


class MoEInferenceEngine:
    """Operational inference engine for Regime-Gated Mixture-of-Experts rainfall correction."""

    def __init__(
        self,
        checkpoint_path: Optional[Path] = None,
        device: str = "cpu",
    ):
        self.device = torch.device(device)
        self.feature_builder = FeatureBuilder()
        self.model = RegimeGatedMoE(in_channels=20, hidden_dim=32, num_quantiles=7)

        if checkpoint_path is not None and checkpoint_path.is_file():
            checkpoint = torch.load(checkpoint_path, map_location=self.device, weights_only=True)
            if "model_state_dict" in checkpoint:
                self.model.load_state_dict(checkpoint["model_state_dict"])
            else:
                self.model.load_state_dict(checkpoint)

        self.model.to(self.device)
        self.model.eval()

    def predict_corrected_forecast(
        self,
        forecast: GriddedForecastDataset,
        regime_probabilities: Dict[str, float] | np.ndarray,
    ) -> Dict[str, Any]:
        """Produce calibrated probabilistic rainfall predictions conditioned on regime probabilities."""
        # 1. Build 20-channel forecast-time features
        feature_matrix = self.feature_builder.build_features(forecast)
        x_tensor = torch.from_numpy(np.expand_dims(feature_matrix.tensor, axis=0)).float().to(self.device)

        # 2. Format regime probabilities vector (1, 6)
        if isinstance(regime_probabilities, dict):
            p_vec = np.array([regime_probabilities.get(REGIME_IDS[k], 1.0 / 6.0) for k in range(6)], dtype=np.float32)
        else:
            p_vec = np.array(regime_probabilities, dtype=np.float32)
        p_tensor = torch.from_numpy(np.expand_dims(p_vec, axis=0)).to(self.device)

        # 3. Model forward pass
        with torch.no_grad():
            blended_q, expert_qs = self.model(x_tensor, p_tensor)
            blended_np = blended_q.cpu().numpy()[0]  # Shape: (7, H, W)

        # 4. Extract quantiles
        q_map = {
            f"q{int(q * 100)}": blended_np[i]
            for i, q in enumerate(OPERATIONAL_QUANTILES)
        }

        # 5. Compute exceedance probabilities across IMD critical thresholds
        p_heavy = self._calculate_exceedance_probability(blended_np, threshold=64.5)
        p_very_heavy = self._calculate_exceedance_probability(blended_np, threshold=115.6)
        p_extreme = self._calculate_exceedance_probability(blended_np, threshold=204.5)

        dominant_idx = int(np.argmax(p_vec))

        return {
            "model": "Model_C_Regime_Gated_MoE",
            "model_version": self.model.model_version,
            "quantiles": q_map,
            "median_rainfall_mm": q_map["q50"],
            "exceedance_probabilities": {
                "heavy_gt_64_5mm": p_heavy,
                "very_heavy_gt_115_6mm": p_very_heavy,
                "extremely_heavy_gt_204_5mm": p_extreme,
            },
            "dominant_regime": REGIME_IDS[dominant_idx],
            "regime_weights": {REGIME_IDS[k]: float(p_vec[k]) for k in range(6)},
            "forecast_ref_time": forecast.receipt.forecast_reference_time,
            "valid_time": forecast.receipt.valid_time,
            "lead_time_hours": forecast.receipt.lead_time_hours,
            "data_source": forecast.receipt.data_source,
        }

    def _calculate_exceedance_probability(
        self, quantiles_3d: np.ndarray, threshold: float
    ) -> np.ndarray:
        """Derive P(R > threshold) from monotonic quantiles [q10..q99] via empirical CDF inversion.
        
        quantiles_3d: (7, H, W) corresponding to tau = [0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99]
        """
        tau_levels = np.array(OPERATIONAL_QUANTILES)
        H, W = quantiles_3d.shape[1], quantiles_3d.shape[2]
        prob_exceed = np.zeros((H, W), dtype=np.float32)

        # Threshold below q10 -> P(R > threshold) >= 0.90
        prob_exceed[threshold <= quantiles_3d[0]] = 0.95

        # In between quantiles
        for i in range(len(tau_levels) - 1):
            q_low = quantiles_3d[i]
            q_high = quantiles_3d[i + 1]
            tau_low = tau_levels[i]
            tau_high = tau_levels[i + 1]

            in_bracket = (threshold > q_low) & (threshold <= q_high)
            denom = np.maximum(q_high - q_low, 1e-4)
            fraction = (threshold - q_low) / denom
            cdf_val = tau_low + fraction * (tau_high - tau_low)
            prob_exceed[in_bracket] = 1.0 - cdf_val[in_bracket]

        # Threshold above q99
        extreme_mask = threshold > quantiles_3d[-1]
        excess = threshold - quantiles_3d[-1]
        # Exponential tail decay beyond q99
        prob_exceed[extreme_mask] = 0.01 * np.exp(-excess[extreme_mask] / 30.0)

        return np.clip(prob_exceed, 0.0, 1.0)
