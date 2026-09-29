"""Training pipeline for Module A Probabilistic Regime Classifier."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ml.regime.model import ProbabilisticRegimeClassifier
from ml.regime.features import RegimeDataset
from ml.regime.calibration import TemperatureScaler
from ml.regime.evaluation import evaluate_regime_predictions

logger = logging.getLogger("regimerain.regime.train")


def train_regime_classifier(
    train_dataset: RegimeDataset,
    val_dataset: RegimeDataset,
    epochs: int = 15,
    batch_size: int = 4,
    lr: float = 1e-3,
    checkpoint_path: Optional[Path] = None,
    device: str = "cpu",
) -> Tuple[ProbabilisticRegimeClassifier, Dict[str, Any]]:
    """Train regime classifier head and encoder on chronological training split."""
    device_obj = torch.device(device)
    model = ProbabilisticRegimeClassifier(in_channels=20, embedding_dim=128, num_classes=6)
    model.to(device_obj)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)

    history = {"train_loss": [], "val_loss": [], "val_f1": []}
    best_val_loss = float("inf")

    logger.info(f"Beginning training on {len(train_dataset)} samples, validating on {len(val_dataset)} samples.")

    for epoch in range(epochs):
        model.train()
        train_losses = []
        for x_batch, y_batch in train_loader:
            x_batch = x_batch.to(device_obj)
            y_batch = y_batch.to(device_obj)

            optimizer.zero_grad()
            logits = model(x_batch)
            loss = criterion(logits, y_batch)
            loss.backward()
            optimizer.step()
            train_losses.append(loss.item())

        # Validation
        model.eval()
        val_losses = []
        val_logits_list = []
        val_labels_list = []

        with torch.no_grad():
            for x_val, y_val in val_loader:
                x_val = x_val.to(device_obj)
                y_val = y_val.to(device_obj)
                v_logits = model(x_val)
                v_loss = criterion(v_logits, y_val)
                val_losses.append(v_loss.item())
                val_logits_list.append(v_logits.cpu().numpy())
                val_labels_list.append(y_val.cpu().numpy())

        avg_train = float(np.mean(train_losses))
        avg_val = float(np.mean(val_losses)) if val_losses else avg_train
        history["train_loss"].append(avg_train)
        history["val_loss"].append(avg_val)

        if val_logits_list:
            all_val_logits = np.concatenate(val_logits_list, axis=0)
            all_val_labels = np.concatenate(val_labels_list, axis=0)
            val_eval = evaluate_regime_predictions(
                model.scaler.calibrate_probs(all_val_logits), all_val_labels
            )
            history["val_f1"].append(val_eval["macro_f1"])
            logger.info(f"Epoch {epoch+1:02d}/{epochs:02d} | Train Loss: {avg_train:.4f} | Val Loss: {avg_val:.4f} | Val F1: {val_eval['macro_f1']:.4f}")

        if avg_val < best_val_loss and checkpoint_path is not None:
            best_val_loss = avg_val
            checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
            torch.save({
                "model_state_dict": model.state_dict(),
                "model_version": model.model_version,
                "backbone_type": model.backbone_type,
                "best_val_loss": best_val_loss,
            }, checkpoint_path)

    # Calibrate on validation split using temperature scaling
    if val_logits_list:
        logger.info("Fitting post-hoc temperature scaling calibration on validation set...")
        model.scaler.fit(all_val_logits, all_val_labels)
        logger.info(f"Calibration complete: Temperature T = {model.scaler.temperature:.3f} | ECE before: {model.scaler.val_ece_before:.3f} -> after: {model.scaler.val_ece_after:.3f}")

    return model, history
