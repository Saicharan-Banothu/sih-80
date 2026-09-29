"""Command-line utility for training the Joint Regime-Aware Forecast Correction System."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path
import sys
import numpy as np
import torch

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ml.joint.model import JointRegimeAwareModel
from ml.joint.losses import JointMultiTaskLoss
from ml.joint.dataset import JointChronologicalDataset
from ml.joint.trainer import JointTrainer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("regimerain.scripts.train_joint")


def generate_synthetic_joint_fixture(n_samples: int = 30, H: int = 16, W: int = 16):
    """Generate deterministic atmospheric fixture for training validation."""
    rng = np.random.RandomState(42)
    features = rng.randn(n_samples, 20, H, W).astype(np.float32)
    # Target rainfall with exponential distribution and occasional heavy events
    rainfall = rng.exponential(scale=12.0, size=(n_samples, H, W)).astype(np.float32)
    heavy_mask = rng.rand(*rainfall.shape) < 0.10
    rainfall[heavy_mask] += rng.uniform(50.0, 120.0, size=int(np.sum(heavy_mask)))
    rainfall = np.maximum(0.0, rainfall)

    # Regime targets (0 to 5)
    regimes = rng.randint(0, 6, size=n_samples).astype(np.int64)

    return features, rainfall, regimes


def main():
    parser = argparse.ArgumentParser(description="Train Joint Regime-Aware Model")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--freeze-backbone", action="store_true", help="Freeze atmospheric backbone")
    parser.add_argument("--heavy-weight", type=float, default=2.0, help="Weight for heavy-rain penalty")
    parser.add_argument("--checkpoint-dir", type=str, default="artifacts/checkpoints", help="Output directory")
    parser.add_argument("--device", type=str, default="cpu", help="Compute device (cpu/cuda)")
    args = parser.parse_args()

    print("=" * 72)
    print("JOINT REGIME-AWARE FORECAST CORRECTION MODEL TRAINING")
    print(f"Device: {args.device} | Epochs: {args.epochs} | Batch: {args.batch_size} | LR: {args.lr}")
    print(f"Freeze Backbone: {args.freeze_backbone} | Heavy Rain Weight: {args.heavy_weight}")
    print("=" * 72)

    # 1. Dataset setup
    ckpt_dir = PROJECT_ROOT / args.checkpoint_dir
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    features, rainfall, regimes = generate_synthetic_joint_fixture(n_samples=40, H=16, W=16)
    train_ds, val_ds = JointChronologicalDataset.split_chronological(
        features=features,
        rainfall_targets=rainfall,
        regime_targets=regimes,
        train_ratio=0.75,
    )

    print(f"Dataset split: {len(train_ds)} train samples, {len(val_ds)} validation samples (strictly chronological)")

    # 2. Model initialization
    model = JointRegimeAwareModel(
        in_channels=20,
        embedding_dim=128,
        num_classes=6,
        expert_hidden_dim=32,
        num_quantiles=7,
    )
    print(f"Model backbone type: {model.backbone_type}")

    # 3. Loss & Trainer
    loss_fn = JointMultiTaskLoss(
        weight_quantile=1.0,
        weight_heavy=args.heavy_weight,
        weight_regime=0.5,
        weight_entropy=0.05,
    )

    trainer = JointTrainer(
        model=model,
        loss_fn=loss_fn,
        lr=args.lr,
        freeze_backbone=args.freeze_backbone,
        device=args.device,
    )

    # 4. Fit
    results = trainer.fit(
        train_dataset=train_ds,
        val_dataset=val_ds,
        epochs=args.epochs,
        batch_size=args.batch_size,
        checkpoint_dir=ckpt_dir,
    )

    print("\nTraining Finished Successfully!")
    print(f"Best Validation Loss: {results['best_val_loss']:.4f}")
    print(f"Model checkpoint saved to: {ckpt_dir / 'joint_model_best.pt'}")

    # 5. Inference demonstration
    sample_feat = torch.from_numpy(features[:2]).float()
    pred = model.predict(sample_feat)
    print("\nInference Verification on Sample Batch:")
    print(f"  Dominant Regimes: {pred['dominant_regime']}")
    print(f"  Median Forecast Mean: {np.mean(pred['median_q50']):.2f} mm")
    print(f"  P(>64.5mm) Max Prob: {np.max(pred['exceedance_probabilities']['P_gt_64_5mm']):.4f}")
    print("=" * 72)


if __name__ == "__main__":
    main()
