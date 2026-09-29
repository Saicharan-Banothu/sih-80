"""Evaluation metrics for probabilistic regime classification: Macro F1, Brier score, ECE, and confusion matrix."""

from __future__ import annotations

from typing import Any, Dict, List, Tuple
import numpy as np
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix

from ml.regime.labels import REGIME_IDS
from ml.regime.calibration import (
    compute_expected_calibration_error,
    compute_brier_score,
    compute_shannon_entropy,
)


def evaluate_regime_predictions(
    probs: np.ndarray,
    labels: np.ndarray,
    n_bins: int = 10,
    regime_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Calculate multi-class classification and calibration metrics."""
    names = regime_names or [REGIME_IDS[i] for i in range(6)]
    preds = np.argmax(probs, axis=1)

    acc = float(accuracy_score(labels, preds))
    macro_f1 = float(f1_score(labels, preds, average="macro", zero_division=0))
    conf_mat = confusion_matrix(labels, preds, labels=list(range(len(names))))

    brier = compute_brier_score(probs, labels)
    ece, mce, bin_details = compute_expected_calibration_error(probs, labels, n_bins=n_bins)
    entropies = compute_shannon_entropy(probs)

    all_labels = list(range(len(names)))
    per_class_f1 = f1_score(labels, preds, labels=all_labels, average=None, zero_division=0)
    class_metrics = {
        names[i]: {
            "f1": float(per_class_f1[i]),
            "support": int(np.sum(labels == i)),
        }
        for i in range(len(names))
    }

    return {
        "accuracy": round(acc, 4),
        "macro_f1": round(macro_f1, 4),
        "brier_score": round(brier, 4),
        "expected_calibration_error": round(ece, 4),
        "maximum_calibration_error": round(mce, 4),
        "mean_entropy": round(float(np.mean(entropies)), 4),
        "std_entropy": round(float(np.std(entropies)), 4),
        "confusion_matrix": conf_mat.tolist(),
        "per_class_metrics": class_metrics,
        "calibration_bins": bin_details,
        "sample_count": len(labels),
    }
