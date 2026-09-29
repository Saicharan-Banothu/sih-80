"""Loss functions for MoE: Quantile pinball loss and heavy-rain weighted penalties."""

from __future__ import annotations

from typing import List, Optional
import torch
import torch.nn as nn
from ml.correction.quantiles import OPERATIONAL_QUANTILES, compute_pinball_loss


class MoEQuantileLoss(nn.Module):
    """Pinball quantile loss with heavy-rain tail weighting."""

    def __init__(
        self,
        quantiles: List[float] = OPERATIONAL_QUANTILES,
        heavy_threshold_mm: float = 64.5,
        heavy_weight: float = 2.5,
    ):
        super().__init__()
        self.quantiles = quantiles
        self.heavy_threshold_mm = heavy_threshold_mm
        self.heavy_weight = heavy_weight

    def forward(
        self,
        predicted_quantiles: torch.Tensor,
        targets: torch.Tensor,
    ) -> torch.Tensor:
        """Compute weighted pinball loss.
        
        predicted_quantiles: (B, 7, H, W)
        targets: (B, 1, H, W) or (B, H, W)
        """
        if targets.ndim == 3:
            targets = targets.unsqueeze(1)

        base_loss = compute_pinball_loss(predicted_quantiles, targets, self.quantiles)

        # Extreme event tail weighting: overweight under-prediction of heavy rain
        heavy_mask = (targets >= self.heavy_threshold_mm).float()
        if torch.sum(heavy_mask) > 0:
            q50_pred = predicted_quantiles[:, 2:3, :, :]
            under_prediction = torch.relu(targets - q50_pred) * heavy_mask
            heavy_penalty = torch.mean(under_prediction) * (self.heavy_weight - 1.0)
            return base_loss + heavy_penalty

        return base_loss
