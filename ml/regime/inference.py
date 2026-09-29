"""Operational inference engine for probabilistic weather regime prediction."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional
import numpy as np
import torch

from ml.data.base import GriddedForecastDataset
from ml.features.builder import FeatureBuilder
from ml.regime.model import ProbabilisticRegimeClassifier
from ml.regime.labels import REGIME_IDS


class RegimeInferenceEngine:
    """Operational inference engine for predicting probabilistic weather regimes over India."""

    def __init__(
        self,
        checkpoint_path: Optional[Path] = None,
        device: str = "cpu",
    ):
        self.device = torch.device(device)
        self.feature_builder = FeatureBuilder()
        self.model = ProbabilisticRegimeClassifier(in_channels=20, embedding_dim=128, num_classes=6)

        if checkpoint_path is not None and checkpoint_path.is_file():
            checkpoint = torch.load(checkpoint_path, map_location=self.device, weights_only=True)
            if "model_state_dict" in checkpoint:
                self.model.load_state_dict(checkpoint["model_state_dict"])
            else:
                self.model.load_state_dict(checkpoint)
            # Default temperature calibrated if present
            if "temperature" in checkpoint:
                self.model.scaler.temperature = float(checkpoint["temperature"])
                self.model.scaler.is_calibrated = True

        self.model.to(self.device)
        self.model.eval()

    def predict_regime(
        self, forecast: GriddedForecastDataset, use_calibration: bool = True
    ) -> Dict[str, Any]:
        """Predict calibrated 6-class regime probability distribution from forecast-time atmospheric state."""
        # 1. Synthesize 20-channel feature matrix
        feature_matrix = self.feature_builder.build_features(forecast)

        # 2. Run inference through model
        tensor_np = feature_matrix.tensor
        prediction = self.model.predict_single(tensor_np, use_calibration=use_calibration)

        prediction["forecast_ref_time"] = forecast.receipt.forecast_reference_time
        prediction["valid_time"] = forecast.receipt.valid_time
        prediction["lead_time_hours"] = forecast.receipt.lead_time_hours
        prediction["data_source"] = forecast.receipt.data_source

        return prediction
