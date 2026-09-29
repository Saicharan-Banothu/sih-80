"""Comprehensive test suite for Phase 3 Probabilistic Regime Classifier (Module A)."""

import pytest
import numpy as np
import torch

from ml.data.gfs import GFSAdapter
from ml.regime.labels import REGIME_IDS, get_regime_name, get_regime_id, get_all_regimes
from ml.regime.mapping import RegimeTaxonomyMapper
from ml.regime.model import (
    ResidualAtmosphericEncoder,
    RegimeClassificationHead,
    ProbabilisticRegimeClassifier,
)
from ml.regime.calibration import (
    softmax,
    compute_shannon_entropy,
    compute_brier_score,
    compute_expected_calibration_error,
    TemperatureScaler,
)
from ml.regime.evaluation import evaluate_regime_predictions
from ml.regime.inference import RegimeInferenceEngine


def test_regime_labels_and_metadata():
    """Verify operational regime taxonomy codification."""
    assert len(REGIME_IDS) == 6
    assert get_regime_name(0) == "ACTIVE_MONSOON"
    assert get_regime_id("BREAK_MONSOON") == 1
    assert get_regime_name(2) == "MONSOON_DEPRESSION_LOW"
    assert len(get_all_regimes()) == 6


def test_regime_mapping_rationale():
    """Verify documented mapping rationale from 11 Raut clusters to 6 regimes."""
    rationale = RegimeTaxonomyMapper.get_mapping_rationale()
    assert len(rationale) == 6
    for item in rationale:
        assert "raut_clusters" in item
        assert "mapped_regime" in item
        assert len(item["scientific_rationale"]) > 20


def test_model_forward_pass_and_shape():
    """Verify encoder and classifier forward pass on CPU."""
    batch_size = 2
    in_channels = 20
    H, W = 32, 32

    x = torch.randn(batch_size, in_channels, H, W)
    encoder = ResidualAtmosphericEncoder(in_channels=in_channels, embedding_dim=128)
    embedding = encoder(x)
    assert embedding.shape == (batch_size, 128)

    head = RegimeClassificationHead(embedding_dim=128, num_classes=6)
    logits = head(embedding)
    assert logits.shape == (batch_size, 6)

    model = ProbabilisticRegimeClassifier(in_channels=in_channels, embedding_dim=128, num_classes=6)
    assert model.backbone_type == "LIGHTWEIGHT_RESIDUAL_FALLBACK"

    full_logits = model(x)
    assert full_logits.shape == (batch_size, 6)
    assert not torch.isnan(full_logits).any()


def test_probabilistic_output_properties():
    """Verify that regime probabilities sum to 1.0, contain zero NaNs, and bounds are [0, 1]."""
    model = ProbabilisticRegimeClassifier(in_channels=20, embedding_dim=128, num_classes=6)
    x = torch.randn(3, 20, 32, 32)
    probs, logits = model.predict_probabilities(x)

    assert probs.shape == (3, 6)
    assert not np.isnan(probs).any()
    assert np.all(probs >= 0.0) and np.all(probs <= 1.0)
    for i in range(3):
        assert np.isclose(probs[i].sum(), 1.0, atol=1e-5), f"Probabilities for sample {i} do not sum to 1"


def test_temperature_scaling_calibration():
    """Verify temperature scaling calibration on validation logits."""
    rng = np.random.RandomState(42)
    val_logits = rng.normal(0, 3.0, size=(40, 6)).astype(np.float32)
    val_labels = rng.randint(0, 6, size=(40,))

    scaler = TemperatureScaler()
    scaler.fit(val_logits, val_labels)

    assert scaler.is_calibrated is True
    assert scaler.temperature > 0.0
    cal_probs = scaler.calibrate_probs(val_logits)
    assert cal_probs.shape == (40, 6)
    assert np.allclose(cal_probs.sum(axis=1), 1.0, atol=1e-5)


def test_entropy_and_brier_score():
    """Verify normalized Shannon entropy and Brier score."""
    # Completely certain distribution
    certain_p = np.array([[1.0, 0.0, 0.0, 0.0, 0.0, 0.0]], dtype=np.float32)
    h_certain = compute_shannon_entropy(certain_p)
    assert np.isclose(h_certain[0], 0.0, atol=1e-4)

    # Uniform distribution (maximum uncertainty)
    uniform_p = np.full((1, 6), 1.0 / 6.0, dtype=np.float32)
    h_uniform = compute_shannon_entropy(uniform_p)
    assert np.isclose(h_uniform[0], 1.0, atol=1e-4)

    # Brier score perfect prediction
    labels = np.array([0])
    bs = compute_brier_score(certain_p, labels)
    assert np.isclose(bs, 0.0, atol=1e-5)


def test_evaluation_metrics_reporting():
    """Verify evaluation calculations (accuracy, macro F1, ECE, confusion matrix)."""
    probs = np.array([
        [0.9, 0.1, 0.0, 0.0, 0.0, 0.0],
        [0.1, 0.8, 0.1, 0.0, 0.0, 0.0],
        [0.0, 0.1, 0.7, 0.1, 0.1, 0.0],
    ], dtype=np.float32)
    labels = np.array([0, 1, 2])

    metrics = evaluate_regime_predictions(probs, labels)
    assert metrics["accuracy"] == 1.0
    assert metrics["macro_f1"] == 1.0
    assert metrics["sample_count"] == 3
    assert len(metrics["confusion_matrix"]) == 6


def test_regime_inference_engine_end_to_end():
    """Verify operational regime inference engine on a live GFS forecast object."""
    adapter = GFSAdapter()
    forecast = adapter.load("2025-07-15T00:00:00Z", lead_time_hours=24)

    engine = RegimeInferenceEngine(device="cpu")
    pred = engine.predict_regime(forecast, use_calibration=False)

    assert "dominant_regime" in pred
    assert pred["dominant_regime"] in REGIME_IDS.values()
    assert "probabilities" in pred
    assert len(pred["probabilities"]) == 6
    assert "entropy" in pred
    assert 0.0 <= pred["entropy"] <= 1.0
    assert pred["backbone_type"] == "LIGHTWEIGHT_RESIDUAL_FALLBACK"
    assert "model_version" in pred
