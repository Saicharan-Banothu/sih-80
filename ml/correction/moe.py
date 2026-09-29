"""Regime-Gated Mixture-of-Experts (MoE) with differentiable residual experts and soft gating."""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn

from ml.correction.residual_expert import ResidualExpert
from ml.correction.quantiles import OPERATIONAL_QUANTILES
from ml.regime.labels import REGIME_IDS


class RegimeGatedMoE(nn.Module):
    """Model C: Soft-gated Mixture-of-Experts neural architecture conditioned on regime probabilities.
    
    Architecture:
      Inputs:
        x: atmospheric feature tensor (B, 20, H, W)
        p: calibrated regime probability vector (B, 6) from Module A
      Six Experts:
        E0: Active Monsoon
        E1: Break Monsoon
        E2: Monsoon Depression / Low
        E3: Orographic
        E4: Coastal Convective
        E5: Western Disturbance
      Soft Gating Mixture:
        Q_MoE = sum_k p_k * E_k(x)
    """

    def __init__(
        self,
        in_channels: int = 20,
        hidden_dim: int = 32,
        num_quantiles: int = 7,
        model_version: str = "MoE-v0.1.0-soft",
    ):
        super().__init__()
        self.model_version = model_version
        self.num_quantiles = num_quantiles
        self.quantiles = list(OPERATIONAL_QUANTILES)

        # 6 specialized residual neural experts
        self.experts = nn.ModuleList([
            ResidualExpert(
                regime_id=k,
                in_channels=in_channels,
                hidden_dim=hidden_dim,
                num_quantiles=num_quantiles,
            )
            for k in range(6)
        ])

    def forward(
        self, x: torch.Tensor, regime_probs: torch.Tensor
    ) -> Tuple[torch.Tensor, List[torch.Tensor]]:
        """Forward pass executing soft mixture of experts.
        
        x: tensor of shape (B, 20, H, W)
        regime_probs: tensor of shape (B, 6) with sum_k p_k = 1.0
        
        returns:
          blended_quantiles: tensor of shape (B, 7, H, W)
          expert_outputs: list of 6 tensors each of shape (B, 7, H, W)
        """
        B, C, H, W = x.shape
        expert_outputs: List[torch.Tensor] = []

        # Run each expert
        for expert in self.experts:
            q_k = expert(x)  # (B, 7, H, W)
            expert_outputs.append(q_k)

        # Soft gating blend: sum_k p_k * q_k
        blended_quantiles = torch.zeros(B, self.num_quantiles, H, W, device=x.device, dtype=x.dtype)
        for k in range(6):
            # Broadcast p[:, k] from (B,) to (B, 1, 1, 1)
            weight = regime_probs[:, k].view(B, 1, 1, 1)
            blended_quantiles = blended_quantiles + weight * expert_outputs[k]

        return blended_quantiles, expert_outputs

    def predict_distribution(
        self, x: torch.Tensor, regime_probs: torch.Tensor
    ) -> Dict[str, Any]:
        """Inference helper returning numpy arrays of all quantiles and expert contributions."""
        self.eval()
        with torch.no_grad():
            blended_q, expert_qs = self.forward(x, regime_probs)
            blended_np = blended_q.cpu().numpy()
            p_np = regime_probs.cpu().numpy()

        q_dict = {
            f"q{int(q * 100)}": blended_np[:, i, :, :]
            for i, q in enumerate(self.quantiles)
        }

        return {
            "quantiles": q_dict,
            "q50_median": blended_np[:, 2, :, :],  # q50 is index 2
            "regime_weights": {REGIME_IDS[k]: float(p_np[0, k]) for k in range(6)},
            "model_version": self.model_version,
            "quantiles_evaluated": self.quantiles,
        }
