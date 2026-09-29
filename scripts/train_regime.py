"""Train the probabilistic regime classifier on chronological dataset splits."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
import numpy as np
import xarray as xr

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ml.data.gfs import GFSAdapter
from ml.features.builder import FeatureBuilder
from ml.data.regime_seeds import RautRegimeSeedsAdapter
from ml.regime.features import create_chronological_splits
from ml.regime.training import train_regime_classifier


def main():
    parser = argparse.ArgumentParser(description="Train the probabilistic regime classifier.")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument(
        "--checkpoint",
        default="artifacts/checkpoints/regime_classifier.pt",
        help="Destination path for trained model checkpoint",
    )
    args = parser.parse_args()

    print("=" * 65)
    print("TRAINING MODULE A: PROBABILISTIC REGIME CLASSIFIER")
    print("=" * 65)

    dataset_path = PROJECT_ROOT / "data" / "processed" / "dev_dataset.nc"
    if not dataset_path.is_file():
        from scripts.prepare_dataset import prepare_development_dataset
        prepare_development_dataset(dataset_path)

    ds = xr.open_dataset(dataset_path)
    time_coords = [str(t)[:10] for t in ds.time.values]
    print(f"Loaded {len(time_coords)} chronological time steps from {dataset_path.name}")

    # Build features for each time step
    builder = FeatureBuilder()
    feature_list = []
    labels_list = []

    for i, date_str in enumerate(time_coords):
        seed = RautRegimeSeedsAdapter.get_seed_for_date(date_str)
        probs_6 = [seed["operational_probabilities"][reg] for reg in RautRegimeSeedsAdapter.OPERATIONAL_6_REGIMES]
        dominant_label = int(np.argmax(probs_6))

        # Create single time slice dataset
        adapter = GFSAdapter()
        forecast = adapter.load(f"{date_str}T00:00:00Z", lead_time_hours=24)
        fm = builder.build_features(forecast)
        feature_list.append(fm.tensor)
        labels_list.append(dominant_label)

    features = np.stack(feature_list, axis=0)  # (N, 20, 129, 121)
    labels = np.array(labels_list, dtype=np.int64)

    # Chronological train/val/test separation
    train_ds, val_ds, test_ds = create_chronological_splits(time_coords, features, labels)
    print(f"Split sizes -> Train: {len(train_ds)}, Validation: {len(val_ds)}, Test: {len(test_ds)}")

    checkpoint_path = PROJECT_ROOT / args.checkpoint
    model, history = train_regime_classifier(
        train_dataset=train_ds,
        val_dataset=val_ds,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        checkpoint_path=checkpoint_path,
        device="cpu",
    )

    print("\n[+] Training Complete!")
    print(f"    Checkpoint saved to: {checkpoint_path.resolve()}")
    print(f"    Final Train Loss: {history['train_loss'][-1]:.4f}")
    print(f"    Final Val Loss: {history['val_loss'][-1]:.4f}")
    print("=" * 65)


if __name__ == "__main__":
    main()
