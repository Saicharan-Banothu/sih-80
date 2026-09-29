"""Training pipeline for Regime-Gated Mixture-of-Experts."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset

from ml.correction.moe import RegimeGatedMoE
from ml.correction.losses import MoEQuantileLoss
from ml.correction.quantiles import OPERATIONAL_QUANTILES

logger = logging.getLogger("regimerain.correction.train")


class MoETrainingDataset(Dataset):
    """Dataset yielding (feature_tensor, regime_probs, target_rainfall)."""

    def __init__(
        self,
        features: np.ndarray,      # (N, 20, H, W)
        regime_probs: np.ndarray,  # (N, 6)
        targets: np.ndarray,       # (N, H, W)
    ):
        self.features = torch.from_numpy(features).float()
        self.regime_probs = torch.from_numpy(regime_probs).float()
        self.targets = torch.from_numpy(targets).float()

    def __len__(self) -> int:
        return len(self.features)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        return self.features[idx], self.regime_probs[idx], self.targets[idx]


def train_moe_pipeline(
    train_dataset: MoETrainingDataset,
    val_dataset: MoETrainingDataset,
    epochs: int = 10,
    batch_size: int = 2,
    lr: float = 1e-3,
    checkpoint_path: Optional[Path] = None,
    device: str = "cpu",
) -> Tuple[RegimeGatedMoE, Dict[str, Any]]:
    """Train soft MoE residual experts with pinball quantile loss."""
    device_obj = torch.device(device)
    model = RegimeGatedMoE(in_channels=20, hidden_dim=32, num_quantiles=7)
    model.to(device_obj)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    criterion = MoEQuantileLoss(quantiles=OPERATIONAL_QUANTILES, heavy_weight=2.0)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)

    history = {"train_loss": [], "val_loss": []}
    best_val_loss = float("inf")

    logger.info(f"Training Soft MoE on {len(train_dataset)} samples, validating on {len(val_dataset)} samples.")

    for epoch in range(epochs):
        model.train()
        train_losses = []
        for x_b, p_b, y_b in train_loader:
            x_b = x_b.to(device_obj)
            p_b = p_b.to(device_obj)
            y_b = y_b.to(device_obj)

            optimizer.zero_grad()
            blended_q, _ = model(x_b, p_b)
            loss = criterion(blended_q, y_b)
            loss.backward()
            optimizer.step()
            train_losses.append(loss.item())

        # Validation
        model.eval()
        val_losses = []
        with torch.no_grad():
            for x_v, p_v, y_v in val_loader:
                x_v = x_v.to(device_obj)
                p_v = p_v.to(device_obj)
                y_v = y_v.to(device_obj)
                blended_q, _ = model(x_v, p_v)
                loss = criterion(blended_q, y_v)
                val_losses.append(loss.item())

        avg_train = float(np.mean(train_losses))
        avg_val = float(np.mean(val_losses)) if val_losses else avg_train
        history["train_loss"].append(avg_train)
        history["val_loss"].append(avg_val)

        logger.info(f"Epoch {epoch+1:02d}/{epochs:02d} | Train Loss: {avg_train:.4f} | Val Loss: {avg_val:.4f}")

        if avg_val < best_val_loss and checkpoint_path is not None:
            best_val_loss = avg_val
            checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
            torch.save({
                "model_state_dict": model.state_dict(),
                "model_version": model.model_version,
                "best_val_loss": best_val_loss,
            }, checkpoint_path)

    return model, history
