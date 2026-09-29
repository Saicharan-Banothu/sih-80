"""Joint Regime-Aware Neural Model combining Atmospheric Backbone, Probabilistic Regime Classifier, and Mixture-of-Experts."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from ml.regime.model import ProbabilisticRegimeClassifier
from ml.regime.labels import REGIME_IDS
from ml.correction.moe import RegimeGatedMoE
from ml.correction.quantiles import OPERATIONAL_QUANTILES
from ml.correction.tail_model import ExtremeRainfallTailModel


class JointRegimeAwareModel(nn.Module):
    """End-to-End Joint Model integrating Regime Classification (Module A) and Soft-Gated MoE Correction (Model C).
    
    Data Flow:
      Atmospheric Tensor X (B, 20, H, W)
        -> Atmospheric Backbone (ClimaX / Lightweight Residual Fallback)
        -> Regime Classification Head -> Logits (B, 6) -> Softmax Probabilities p (B, 6)
        -> 6 Residual Quantile Experts E_0(X), ..., E_5(X) -> Quantiles (B, 7, H, W)
        -> Soft Gating: Q_MoE = sum_k p_k * E_k(X)
        -> Continuous Tail Inversion: Exceedance Probabilities P(>64.5mm), P(>115.6mm), P(>204.5mm)
    """

    def __init__(
        self,
        in_channels: int = 20,
        embedding_dim: int = 128,
        num_classes: int = 6,
        expert_hidden_dim: int = 32,
        num_quantiles: int = 7,
        backbone_weights_path: Optional[str] = None,
        model_version: str = "JointRegimeAware-v0.1.0",
    ):
        super().__init__()
        self.model_version = model_version
        self.num_quantiles = num_quantiles
        self.quantiles = list(OPERATIONAL_QUANTILES)

        # Module A: Probabilistic Regime Classifier
        self.regime_classifier = ProbabilisticRegimeClassifier(
            in_channels=in_channels,
            embedding_dim=embedding_dim,
            num_classes=num_classes,
            weights_path=backbone_weights_path,
        )

        # Model C: Soft-gated Mixture-of-Experts
        self.moe = RegimeGatedMoE(
            in_channels=in_channels,
            hidden_dim=expert_hidden_dim,
            num_quantiles=num_quantiles,
        )

        # Upper-tail exceedance engine
        self.tail_model = ExtremeRainfallTailModel()

    @property
    def backbone_type(self) -> str:
        return self.regime_classifier.backbone_type

    def freeze_backbone(self) -> None:
        """Freeze atmospheric encoder parameters to train only residual experts."""
        for param in self.regime_classifier.backbone.parameters():
            param.requires_grad = False

    def unfreeze_backbone(self) -> None:
        """Unfreeze atmospheric encoder for end-to-end joint fine-tuning."""
        for param in self.regime_classifier.backbone.parameters():
            param.requires_grad = True

    def forward(
        self,
        x: torch.Tensor,
        temperature: float = 1.0,
    ) -> Dict[str, Any]:
        """Joint forward pass through regime classifier and soft MoE.
        
        x: (B, 20, H, W)
        returns dict with:
          regime_logits: (B, 6)
          regime_probs: (B, 6)
          blended_quantiles: (B, 7, H, W)
          expert_quantiles: list of 6 tensors of (B, 7, H, W)
        """
        # Step 1: Regime classification
        regime_logits = self.regime_classifier(x)  # (B, 6)
        scaled_logits = regime_logits / max(temperature, 1e-4)
        regime_probs = F.softmax(scaled_logits, dim=-1)  # (B, 6)

        # Step 2: Soft mixture of experts
        blended_quantiles, expert_quantiles = self.moe(x, regime_probs)  # (B, 7, H, W)

        return {
            "regime_logits": regime_logits,
            "regime_probs": regime_probs,
            "blended_quantiles": blended_quantiles,
            "expert_quantiles": expert_quantiles,
        }

    def predict(
        self,
        x: torch.Tensor,
        temperature: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Full inference pipeline returning calibrated probabilities, median, quantiles, and tail risks."""
        self.eval()
        with torch.no_grad():
            if temperature is not None:
                t_val = float(temperature)
            else:
                temp_attr = self.regime_classifier.scaler.temperature
                t_val = float(temp_attr.item() if hasattr(temp_attr, "item") else temp_attr)
            out = self.forward(x, temperature=t_val)

            blended_q = out["blended_quantiles"].cpu().numpy()  # (B, 7, H, W)
            regime_p = out["regime_probs"].cpu().numpy()        # (B, 6)

            # Continuous extreme tail exceedance probabilities
            tail_probs = self.tail_model.compute_exceedance_probabilities(blended_q)

        B = x.shape[0]
        quantiles_dict = {
            f"q{int(q * 100)}": blended_q[:, i, :, :]
            for i, q in enumerate(self.quantiles)
        }

        return {
            "regime_probabilities": {
                REGIME_IDS[k]: regime_p[:, k] for k in range(6)
            },
            "dominant_regime": [REGIME_IDS[int(np.argmax(regime_p[b]))] for b in range(B)],
            "median_q50": blended_q[:, 2, :, :],  # index 2 corresponds to q50
            "quantiles": quantiles_dict,
            "exceedance_probabilities": tail_probs,
            "backbone_type": self.backbone_type,
            "model_version": self.model_version,
        }
