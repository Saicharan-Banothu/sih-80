"""Rainfall bias correction package containing baselines, tail handling, and MoE experts."""

from ml.correction.base import BaseCorrectionModel
from ml.correction.wet_day import WetDayFrequencyAdjuster
from ml.correction.tail_handling import TailExtrapolationEngine
from ml.correction.baseline_global_qm import GlobalQuantileMappingBaseline
from ml.correction.quantiles import (
    OPERATIONAL_QUANTILES,
    logits_to_monotonic_quantiles,
    compute_pinball_loss,
)
from ml.correction.residual_expert import ResidualExpert
from ml.correction.moe import RegimeGatedMoE
from ml.correction.losses import MoEQuantileLoss
from ml.correction.inference import MoEInferenceEngine

__all__ = [
    "BaseCorrectionModel",
    "WetDayFrequencyAdjuster",
    "TailExtrapolationEngine",
    "GlobalQuantileMappingBaseline",
    "OPERATIONAL_QUANTILES",
    "logits_to_monotonic_quantiles",
    "compute_pinball_loss",
    "ResidualExpert",
    "RegimeGatedMoE",
    "MoEQuantileLoss",
    "MoEInferenceEngine",
]
