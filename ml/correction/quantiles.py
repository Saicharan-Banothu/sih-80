"""Quantile definitions, monotonicity transformations, and pinball loss formulation."""

from __future__ import annotations

from typing import List, Tuple
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

# The 7 canonical operational quantiles
OPERATIONAL_QUANTILES: List[float] = [0.10, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99]


def logits_to_monotonic_quantiles(raw_increments: torch.Tensor) -> torch.Tensor:
    """Transform unconstrained network outputs into strictly non-negative, monotonic quantiles.
    
    raw_increments: tensor of shape (B, 7, H, W)
    returns: monotonic quantiles of shape (B, 7, H, W) where q10 <= q25 <= q50 <= q75 <= q90 <= q95 <= q99
    
    Mathematical Formulation:
      q[0] = Softplus(raw_increments[:, 0])
      q[k] = q[k-1] + Softplus(raw_increments[:, k])  for k = 1..6
    """
    positive_increments = F.softplus(raw_increments)
    quantiles = torch.cumsum(positive_increments, dim=1)
    return quantiles


def compute_pinball_loss(
    predicted_quantiles: torch.Tensor,
    targets: torch.Tensor,
    quantiles: List[float] = OPERATIONAL_QUANTILES,
) -> torch.Tensor:
    """Compute the multi-quantile pinball (tilted absolute) loss.
    
    predicted_quantiles: tensor of shape (B, 7, H, W)
    targets: tensor of shape (B, 1, H, W) or (B, H, W)
    returns: scalar pinball loss
    """
    if targets.ndim == 3:
        targets = targets.unsqueeze(1)  # (B, 1, H, W)

    total_loss = 0.0
    for i, tau in enumerate(quantiles):
        pred_q = predicted_quantiles[:, i : i + 1, :, :]
        error = targets - pred_q
        loss_tau = torch.maximum(tau * error, (tau - 1.0) * error)
        total_loss = total_loss + torch.mean(loss_tau)

    return total_loss / len(quantiles)
