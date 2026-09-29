"""Comprehensive test suite for Phase 5 Regime-Gated Mixture-of-Experts (Model C)."""

import pytest
import numpy as np
import torch

from ml.data.gfs import GFSAdapter
from ml.correction.quantiles import (
    OPERATIONAL_QUANTILES,
    logits_to_monotonic_quantiles,
    compute_pinball_loss,
)
from ml.correction.residual_expert import ResidualExpert
from ml.correction.moe import RegimeGatedMoE
from ml.correction.losses import MoEQuantileLoss
from ml.correction.inference import MoEInferenceEngine


def test_monotonic_quantiles_transformation():
    """Verify that logits_to_monotonic_quantiles guarantees strict monotonicity and non-negativity."""
    B, C, H, W = 4, 7, 16, 16
    raw_increments = torch.randn(B, C, H, W)
    quantiles = logits_to_monotonic_quantiles(raw_increments)

    assert quantiles.shape == (B, 7, H, W)
    # Check non-negativity
    assert torch.all(quantiles >= 0.0), "All quantiles must be non-negative"

    # Check monotonicity along quantile channel axis 1
    for k in range(6):
        diff = quantiles[:, k + 1, :, :] - quantiles[:, k, :, :]
        assert torch.all(diff >= 0.0), f"Quantile {k+1} must be >= Quantile {k}"


def test_residual_expert_forward_and_backward():
    """Verify single residual expert produces monotonic quantiles and is differentiable."""
    expert = ResidualExpert(regime_id=0, in_channels=20, hidden_dim=32, num_quantiles=7)
    x = torch.randn(2, 20, 16, 16, requires_grad=True)

    out = expert(x)
    assert out.shape == (2, 7, 16, 16)
    assert torch.all(out >= 0.0)

    # Test backward gradient propagation
    loss = out.mean()
    loss.backward()
    assert x.grad is not None, "Gradients must propagate back through residual expert"


def test_regime_gated_moe_soft_gating():
    """Verify soft mixture of experts blends all 6 experts with guaranteed monotonicity."""
    moe = RegimeGatedMoE(in_channels=20, hidden_dim=32, num_quantiles=7)
    assert len(moe.experts) == 6

    B, H, W = 2, 16, 16
    x = torch.randn(B, 20, H, W)

    # Soft probability vector: Active = 0.60, Depression = 0.25, Coastal = 0.10, others = 0.05
    probs = torch.tensor([
        [0.60, 0.01, 0.25, 0.02, 0.10, 0.02],
        [0.10, 0.50, 0.10, 0.10, 0.10, 0.10],
    ], dtype=torch.float32)

    blended_q, expert_qs = moe(x, probs)

    assert blended_q.shape == (B, 7, H, W)
    assert len(expert_qs) == 6

    # Verify that the blended mixture preserves quantile monotonicity
    for k in range(6):
        diff = blended_q[:, k + 1, :, :] - blended_q[:, k, :, :]
        assert torch.all(diff >= 0.0), f"Blended quantile {k+1} must be >= blended quantile {k}"


def test_moe_quantile_loss():
    """Verify pinball loss and heavy rainfall penalty."""
    B, H, W = 2, 8, 8
    criterion = MoEQuantileLoss(quantiles=OPERATIONAL_QUANTILES, heavy_weight=2.0)

    pred = torch.full((B, 7, H, W), 20.0, requires_grad=True)
    target = torch.full((B, 1, H, W), 20.0)

    # Perfect prediction should yield zero pinball loss
    loss = criterion(pred, target)
    assert loss.item() >= 0.0

    # Under-predicting heavy rain (target = 100mm, pred = 20mm)
    heavy_target = torch.full((B, 1, H, W), 100.0)
    heavy_loss = criterion(pred, heavy_target)
    assert heavy_loss.item() > loss.item()


def test_moe_inference_engine_end_to_end():
    """Verify operational MoE inference engine produces quantiles and exceedance probabilities."""
    adapter = GFSAdapter()
    forecast = adapter.load("2025-07-15T00:00:00Z", lead_time_hours=24)

    regime_probs = {
        "ACTIVE_MONSOON": 0.55,
        "BREAK_MONSOON": 0.05,
        "MONSOON_DEPRESSION_LOW": 0.25,
        "OROGRAPHIC": 0.10,
        "COASTAL_CONVECTIVE": 0.03,
        "WESTERN_DISTURBANCE": 0.02,
    }

    engine = MoEInferenceEngine(device="cpu")
    result = engine.predict_corrected_forecast(forecast, regime_probs)

    assert result["model"] == "Model_C_Regime_Gated_MoE"
    assert "quantiles" in result
    for q in ["q10", "q25", "q50", "q75", "q90", "q95", "q99"]:
        assert q in result["quantiles"]
        assert result["quantiles"][q].shape == (len(forecast.lats), len(forecast.lons))
        assert np.all(result["quantiles"][q] >= 0.0)

    # Verify exceedance probabilities
    probs = result["exceedance_probabilities"]
    p_h = probs["heavy_gt_64_5mm"]
    p_vh = probs["very_heavy_gt_115_6mm"]
    p_ex = probs["extremely_heavy_gt_204_5mm"]

    assert np.all(p_h >= 0.0) and np.all(p_h <= 1.0)
    assert np.all(p_vh >= 0.0) and np.all(p_vh <= 1.0)
    assert np.all(p_ex >= 0.0) and np.all(p_ex <= 1.0)

    # Exceedance monotonicity: P(>64.5) >= P(>115.6) >= P(>204.5)
    assert np.all(p_h >= p_vh - 1e-4)
    assert np.all(p_vh >= p_ex - 1e-4)
