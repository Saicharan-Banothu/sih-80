"""Temperature scaling calibration, Expected Calibration Error (ECE), and entropy metrics."""

from __future__ import annotations

from typing import Any, Dict, List, Tuple
import numpy as np
from scipy.optimize import minimize_scalar


def softmax(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    """Compute temperature-scaled softmax probabilities along last dimension."""
    t = max(1e-4, temperature)
    scaled = logits / t
    max_vals = np.max(scaled, axis=-1, keepdims=True)
    exp_vals = np.exp(scaled - max_vals)
    return exp_vals / np.sum(exp_vals, axis=-1, keepdims=True)


def compute_shannon_entropy(probs: np.ndarray, eps: float = 1e-9) -> np.ndarray:
    """Compute normalized Shannon entropy: H = -sum(p * log(p)) / log(K) in [0, 1].
    
    H = 0 represents complete certainty (1.0 for one regime).
    H = 1 represents uniform uncertainty across all 6 regimes.
    """
    K = probs.shape[-1]
    safe_p = np.clip(probs, eps, 1.0)
    entropy = -np.sum(safe_p * np.log(safe_p), axis=-1)
    normalized = entropy / np.log(K)
    return np.clip(normalized, 0.0, 1.0)


def compute_brier_score(probs: np.ndarray, labels: np.ndarray) -> float:
    """Compute multi-class Brier score for regime probability vectors.
    
    BS = (1/N) * sum_n sum_k (p_nk - y_nk)^2 in [0, 2]
    Lower is better. A lower Brier score indicates sharper, more accurate probabilistic forecasts.
    """
    N, K = probs.shape
    if labels.ndim == 1:
        one_hot = np.zeros((N, K), dtype=np.float32)
        one_hot[np.arange(N), labels] = 1.0
    else:
        one_hot = labels

    return float(np.mean(np.sum((probs - one_hot) ** 2, axis=1)))


def compute_expected_calibration_error(
    probs: np.ndarray, labels: np.ndarray, n_bins: int = 10
) -> Tuple[float, float, List[Dict[str, float]]]:
    """Compute Expected Calibration Error (ECE) and Maximum Calibration Error (MCE).
    
    ECE measures the difference between confidence (predicted probability) and empirical accuracy.
    """
    confidences = np.max(probs, axis=1)
    predictions = np.argmax(probs, axis=1)
    accuracies = (predictions == labels).astype(np.float32)

    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    mce = 0.0
    bin_details = []
    N = len(labels)

    for i in range(n_bins):
        bin_lower, bin_upper = bin_boundaries[i], bin_boundaries[i + 1]
        in_bin = (confidences > bin_lower) & (confidences <= bin_upper)
        bin_size = int(np.sum(in_bin))

        if bin_size > 0:
            bin_acc = float(np.mean(accuracies[in_bin]))
            bin_conf = float(np.mean(confidences[in_bin]))
            abs_diff = abs(bin_acc - bin_conf)
            ece += (bin_size / N) * abs_diff
            mce = max(mce, abs_diff)
            bin_details.append({
                "bin_idx": i,
                "bin_range": [float(bin_lower), float(bin_upper)],
                "count": bin_size,
                "accuracy": bin_acc,
                "confidence": bin_conf,
                "calibration_gap": abs_diff,
            })

    return float(ece), float(mce), bin_details


class TemperatureScaler:
    """Post-hoc temperature scaling calibration optimizing cross-entropy NLL on validation logits."""

    def __init__(self):
        self.temperature: float = 1.0
        self.is_calibrated: bool = False
        self.val_ece_before: float = 0.0
        self.val_ece_after: float = 0.0

    def fit(self, val_logits: np.ndarray, val_labels: np.ndarray) -> TemperatureScaler:
        """Find optimal temperature T > 0 minimizing negative log-likelihood on validation logits."""
        N = len(val_labels)

        def nll_objective(T: float) -> float:
            p = softmax(val_logits, temperature=T)
            # Negative log-likelihood of true class
            log_likelihood = np.log(np.maximum(1e-9, p[np.arange(N), val_labels]))
            return -float(np.mean(log_likelihood))

        # Initial uncalibrated ECE
        uncal_probs = softmax(val_logits, temperature=1.0)
        self.val_ece_before, _, _ = compute_expected_calibration_error(uncal_probs, val_labels)

        # Optimize scalar T over bounds [0.1, 10.0]
        res = minimize_scalar(nll_objective, bounds=(0.1, 10.0), method="bounded")
        self.temperature = float(res.x)
        self.is_calibrated = True

        # Post-calibration ECE
        cal_probs = softmax(val_logits, temperature=self.temperature)
        self.val_ece_after, _, _ = compute_expected_calibration_error(cal_probs, val_labels)

        return self

    def calibrate_probs(self, logits: np.ndarray) -> np.ndarray:
        """Apply calibrated temperature scaling to output probabilities."""
        return softmax(logits, temperature=self.temperature)

    def summary(self) -> Dict[str, Any]:
        return {
            "temperature": round(self.temperature, 4),
            "is_calibrated": self.is_calibrated,
            "val_ece_before": round(self.val_ece_before, 4),
            "val_ece_after": round(self.val_ece_after, 4),
            "calibration_status": (
                "CALIBRATED_TEMPERATURE_SCALED" if self.is_calibrated else "UNCALIBRATED"
            ),
        }
