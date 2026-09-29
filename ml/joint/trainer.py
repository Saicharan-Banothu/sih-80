"""Joint model trainer orchestrating multi-task optimization and checkpointing."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ml.joint.model import JointRegimeAwareModel
from ml.joint.losses import JointMultiTaskLoss
from ml.joint.dataset import JointChronologicalDataset

logger = logging.getLogger("regimerain.joint.trainer")


class JointTrainer:
    """Trainer coordinating joint multi-task optimization for regime-aware forecast correction."""

    def __init__(
        self,
        model: JointRegimeAwareModel,
        loss_fn: Optional[JointMultiTaskLoss] = None,
        lr: float = 1e-3,
        weight_decay: float = 1e-4,
        grad_clip_norm: float = 1.0,
        freeze_backbone: bool = False,
        device: str = "cpu",
    ):
        self.device = torch.device(device)
        self.model = model.to(self.device)
        self.loss_fn = loss_fn if loss_fn is not None else JointMultiTaskLoss()
        self.grad_clip_norm = grad_clip_norm
        self.freeze_backbone = freeze_backbone

        if freeze_backbone:
            self.model.freeze_backbone()
            trainable_params = [p for p in self.model.parameters() if p.requires_grad]
        else:
            self.model.unfreeze_backbone()
            trainable_params = list(self.model.parameters())

        self.optimizer = torch.optim.AdamW(trainable_params, lr=lr, weight_decay=weight_decay)
        self.scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(self.optimizer, T_max=20, eta_min=1e-5)

    def train_epoch(self, dataloader: DataLoader) -> Dict[str, float]:
        """Execute one complete training epoch."""
        self.model.train()
        epoch_telemetry: Dict[str, List[float]] = {
            "total_loss": [],
            "loss_quantile": [],
            "loss_heavy": [],
            "loss_regime": [],
            "entropy": [],
        }

        for x_b, y_rain_b, y_reg_b in dataloader:
            x_b = x_b.to(self.device)
            y_rain_b = y_rain_b.to(self.device)
            y_reg_b = y_reg_b.to(self.device) if torch.any(y_reg_b >= 0) else None

            self.optimizer.zero_grad()
            outputs = self.model(x_b)
            loss, telemetry = self.loss_fn(outputs, y_rain_b, y_reg_b)

            loss.backward()
            if self.grad_clip_norm > 0:
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.grad_clip_norm)
            self.optimizer.step()

            for k, v in telemetry.items():
                epoch_telemetry[k].append(v)

        return {k: float(np.mean(vals)) for k, vals in epoch_telemetry.items()}

    def evaluate(self, dataloader: DataLoader) -> Dict[str, float]:
        """Evaluate model on validation dataloader."""
        self.model.eval()
        val_telemetry: Dict[str, List[float]] = {
            "total_loss": [],
            "loss_quantile": [],
            "loss_heavy": [],
            "loss_regime": [],
            "entropy": [],
            "rmse_median": [],
        }

        with torch.no_grad():
            for x_b, y_rain_b, y_reg_b in dataloader:
                x_b = x_b.to(self.device)
                y_rain_b = y_rain_b.to(self.device)
                y_reg_b = y_reg_b.to(self.device) if torch.any(y_reg_b >= 0) else None

                outputs = self.model(x_b)
                loss, telemetry = self.loss_fn(outputs, y_rain_b, y_reg_b)

                for k, v in telemetry.items():
                    val_telemetry[k].append(v)

                # RMSE of median forecast q50 vs actual target
                q50 = outputs["blended_quantiles"][:, 2, :, :]
                diff = q50 - y_rain_b
                rmse = torch.sqrt(torch.mean(diff ** 2))
                val_telemetry["rmse_median"].append(float(rmse.item()))

        return {k: float(np.mean(vals)) for k, vals in val_telemetry.items()}

    def fit(
        self,
        train_dataset: JointChronologicalDataset,
        val_dataset: JointChronologicalDataset,
        epochs: int = 10,
        batch_size: int = 2,
        checkpoint_dir: Optional[Path] = None,
        early_stopping_patience: int = 5,
    ) -> Dict[str, Any]:
        """Train model with early stopping and automatic checkpoint serialization."""
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

        history: Dict[str, List[float]] = {
            "train_loss": [],
            "val_loss": [],
            "train_loss_quantile": [],
            "val_rmse_median": [],
        }

        best_val_loss = float("inf")
        patience_counter = 0

        logger.info(
            f"Starting Joint Training | Epochs: {epochs} | Batch: {batch_size} | "
            f"Train: {len(train_dataset)} | Val: {len(val_dataset)}"
        )

        for epoch in range(1, epochs + 1):
            train_metrics = self.train_epoch(train_loader)
            val_metrics = self.evaluate(val_loader)
            self.scheduler.step()

            history["train_loss"].append(train_metrics["total_loss"])
            history["val_loss"].append(val_metrics["total_loss"])
            history["train_loss_quantile"].append(train_metrics["loss_quantile"])
            history["val_rmse_median"].append(val_metrics["rmse_median"])

            logger.info(
                f"Epoch {epoch:02d}/{epochs:02d} | Train: {train_metrics['total_loss']:.4f} | "
                f"Val: {val_metrics['total_loss']:.4f} | Val RMSE (q50): {val_metrics['rmse_median']:.2f} mm"
            )

            # Checkpoint save on improvement
            if val_metrics["total_loss"] < best_val_loss:
                best_val_loss = val_metrics["total_loss"]
                patience_counter = 0

                if checkpoint_dir is not None:
                    checkpoint_dir.mkdir(parents=True, exist_ok=True)
                    ckpt_path = checkpoint_dir / "joint_model_best.pt"
                    torch.save(
                        {
                            "model_state_dict": self.model.state_dict(),
                            "model_version": self.model.model_version,
                            "backbone_type": self.model.backbone_type,
                            "best_val_loss": best_val_loss,
                            "epoch": epoch,
                        },
                        ckpt_path,
                    )
            else:
                patience_counter += 1
                if patience_counter >= early_stopping_patience:
                    logger.info(f"Early stopping triggered at epoch {epoch}.")
                    break

        if checkpoint_dir is not None:
            history_file = checkpoint_dir / "joint_training_history.json"
            with open(history_file, "w") as f:
                json.dump(history, f, indent=2)

        return {
            "history": history,
            "best_val_loss": best_val_loss,
            "epochs_completed": epoch,
        }
