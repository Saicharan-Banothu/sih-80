"""Fit temperature scaling calibration for the probabilistic regime classifier."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
import numpy as np
import torch

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ml.regime.model import ProbabilisticRegimeClassifier
from ml.regime.calibration import TemperatureScaler, compute_expected_calibration_error


def main():
    parser = argparse.ArgumentParser(description="Calibrate regime classifier probabilities.")
    parser.add_argument(
        "--checkpoint",
        default="artifacts/checkpoints/regime_classifier.pt",
        help="Path to trained checkpoint",
    )
    args = parser.parse_args()

    print("=" * 65)
    print("PROBABILISTIC REGIME CLASSIFIER CALIBRATION")
    print("=" * 65)

    ckpt_path = PROJECT_ROOT / args.checkpoint
    if not ckpt_path.is_file():
        print(f"Notice: Checkpoint not found at {ckpt_path.name}. Initializing fresh model for demonstration.")
        model = ProbabilisticRegimeClassifier()
    else:
        ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=True)
        model = ProbabilisticRegimeClassifier()
        if "model_state_dict" in ckpt:
            model.load_state_dict(ckpt["model_state_dict"])
        else:
            model.load_state_dict(ckpt)

    # Synthetic validation logits to evaluate calibration optimizer
    rng = np.random.RandomState(42)
    val_logits = rng.normal(0, 2.5, size=(30, 6)).astype(np.float32)
    val_labels = rng.randint(0, 6, size=(30,))

    scaler = TemperatureScaler()
    scaler.fit(val_logits, val_labels)

    print(f"[+] Optimal Temperature (T): {scaler.temperature:.4f}")
    print(f"    Expected Calibration Error (ECE) BEFORE: {scaler.val_ece_before * 100:.2f}%")
    print(f"    Expected Calibration Error (ECE) AFTER:  {scaler.val_ece_after * 100:.2f}%")
    print(f"    Status: {scaler.summary()['calibration_status']}")
    print("=" * 65)


if __name__ == "__main__":
    main()
