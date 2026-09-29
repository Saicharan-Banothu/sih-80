"""Joint multi-task loss combining quantile pinball loss, regime cross-entropy, extreme tail penalty, and entropy regularization."""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F

from ml.correction.quantiles import OPERATIONAL_QUANTILES, compute_pinball_loss


class JointMultiTaskLoss(nn.Module):
    """End-to-End Multi-Task Loss for Joint Regime-Aware Rainfall Correction.
    
    Components:
      1. Quantile Pinball Loss (L_q): Enforces calibration across the 7 operational quantiles.
      2. Heavy Rain Asymmetric Penalty (L_heavy): Penalizes under-prediction when target >= 64.5 mm.
      3. Regime Cross-Entropy (L_regime): Supervised / weakly-supervised regime classification.
      4. Gating Entropy Regularization (L_entropy): Encourages balanced gating diversity across experts.
    """

    def __init__(
        self,
        quantiles: List[float] = OPERATIONAL_QUANTILES,
        heavy_threshold_mm: float = 64.5,
        weight_quantile: float = 1.0,
        weight_heavy: float = 2.0,
        weight_regime: float = 0.5,
        weight_entropy: float = 0.05,
    ):
        super().__init__()
        self.quantiles = quantiles
        self.heavy_threshold_mm = heavy_threshold_mm
        self.w_quantile = weight_quantile
        self.w_heavy = weight_heavy
        self.w_regime = weight_regime
        self.w_entropy = weight_entropy

    def forward(
        self,
        model_outputs: Dict[str, Any],
        target_rainfall: torch.Tensor,
        target_regimes: Optional[torch.Tensor] = None,
    ) -> Tuple[torch.Tensor, Dict[str, float]]:
        """Compute multi-task loss and return total scalar plus telemetry dictionary.
        
        model_outputs: dict from JointRegimeAwareModel containing:
          - blended_quantiles: (B, 7, H, W)
          - regime_logits: (B, 6)
          - regime_probs: (B, 6)
        target_rainfall: (B, H, W) or (B, 1, H, W)
        target_regimes: Optional (B,) long tensor of class indices or (B, 6) soft distribution
        """
        blended_q = model_outputs["blended_quantiles"]
        regime_logits = model_outputs["regime_logits"]
        regime_probs = model_outputs["regime_probs"]

        if target_rainfall.ndim == 3:
            target_rainfall = target_rainfall.unsqueeze(1)

        # 1. Multi-quantile Pinball Loss
        l_quantile = compute_pinball_loss(blended_q, target_rainfall, self.quantiles)

        # 2. Extreme Heavy Rain Asymmetric Penalty
        heavy_mask = (target_rainfall >= self.heavy_threshold_mm).float()
        if torch.sum(heavy_mask) > 0:
            q50 = blended_q[:, 2:3, :, :]
            under_pred = torch.relu(target_rainfall - q50) * heavy_mask
            l_heavy = torch.sum(under_pred) / (torch.sum(heavy_mask) + 1e-6)
        else:
            l_heavy = torch.tensor(0.0, device=blended_q.device)

        # 3. Regime Classification Loss
        if target_regimes is not None:
            if target_regimes.ndim == 1:
                l_regime = F.cross_entropy(regime_logits, target_regimes)
            else:
                # Soft labels / probability distributions
                log_probs = F.log_softmax(regime_logits, dim=-1)
                l_regime = -torch.mean(torch.sum(target_regimes * log_probs, dim=-1))
        else:
            l_regime = torch.tensor(0.0, device=regime_logits.device)

        # 4. Expert Gating Entropy (regularizer to prevent premature collapse)
        # H(p) = - sum p * log(p)
        entropy = -torch.mean(torch.sum(regime_probs * torch.log(regime_probs + 1e-8), dim=-1))
        # Negative entropy minimizes uncertainty; positive entropy encourages exploration.
        # We penalize ultra-low entropy (all weight on 1 expert everywhere)
        l_entropy = -entropy

        # Total Weighted Multi-Task Objective
        total_loss = (
            self.w_quantile * l_quantile
            + self.w_heavy * l_heavy
            + self.w_regime * l_regime
            + self.w_entropy * l_entropy
        )

        telemetry = {
            "total_loss": float(total_loss.item()),
            "loss_quantile": float(l_quantile.item()),
            "loss_heavy": float(l_heavy.item()),
            "loss_regime": float(l_regime.item()),
            "entropy": float(entropy.item()),
        }

        return total_loss, telemetry
