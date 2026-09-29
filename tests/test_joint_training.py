"""Test suite for Phase 7 Joint Model Optimization and Multi-Task Training."""

import tempfile
from pathlib import Path
import numpy as np
import pytest
import torch

from ml.joint.model import JointRegimeAwareModel
from ml.joint.losses import JointMultiTaskLoss
from ml.joint.dataset import JointChronologicalDataset
from ml.joint.trainer import JointTrainer
from ml.correction.quantiles import OPERATIONAL_QUANTILES


class TestJointModel:
    """Tests for the end-to-end JointRegimeAwareModel architecture."""

    @pytest.fixture
    def joint_model(self):
        return JointRegimeAwareModel(
            in_channels=20,
            embedding_dim=64,
            num_classes=6,
            expert_hidden_dim=16,
            num_quantiles=7,
        )

    def test_forward_output_shapes_and_probabilities(self, joint_model):
        B, C, H, W = 2, 20, 16, 16
        x = torch.randn(B, C, H, W)
        out = joint_model(x)

        assert "regime_logits" in out
        assert "regime_probs" in out
        assert "blended_quantiles" in out
        assert "expert_quantiles" in out

        assert out["regime_logits"].shape == (B, 6)
        assert out["regime_probs"].shape == (B, 6)
        assert out["blended_quantiles"].shape == (B, 7, H, W)
        assert len(out["expert_quantiles"]) == 6

        # Regime probabilities must sum to 1.0
        prob_sums = torch.sum(out["regime_probs"], dim=-1)
        assert torch.allclose(prob_sums, torch.ones(B), atol=1e-5)

        # Monotonicity of blended quantiles
        q_np = out["blended_quantiles"].detach().cpu().numpy()
        for i in range(6):
            diff = q_np[:, i + 1, :, :] - q_np[:, i, :, :]
            assert np.all(diff >= -1e-5)

    def test_freeze_and_unfreeze_backbone(self, joint_model):
        # Freeze
        joint_model.freeze_backbone()
        for p in joint_model.regime_classifier.backbone.parameters():
            assert not p.requires_grad

        # Unfreeze
        joint_model.unfreeze_backbone()
        for p in joint_model.regime_classifier.backbone.parameters():
            assert p.requires_grad

    def test_predict_structure_and_tail_risks(self, joint_model):
        B, C, H, W = 2, 20, 12, 12
        x = torch.randn(B, C, H, W)
        pred = joint_model.predict(x)

        assert "regime_probabilities" in pred
        assert len(pred["regime_probabilities"]) == 6
        assert "dominant_regime" in pred
        assert len(pred["dominant_regime"]) == B
        assert "median_q50" in pred
        assert pred["median_q50"].shape == (B, H, W)
        assert "exceedance_probabilities" in pred
        assert "P_gt_64_5mm" in pred["exceedance_probabilities"]
        assert "P_gt_115_6mm" in pred["exceedance_probabilities"]
        assert "P_gt_204_5mm" in pred["exceedance_probabilities"]


class TestJointLoss:
    """Tests for multi-task loss computation and gradient propagation."""

    def test_loss_computation_and_backward(self):
        model = JointRegimeAwareModel(in_channels=20, embedding_dim=32, expert_hidden_dim=16)
        loss_fn = JointMultiTaskLoss(heavy_threshold_mm=64.5, weight_heavy=2.0)

        B, H, W = 2, 12, 12
        x = torch.randn(B, 20, H, W)
        y_rain = torch.abs(torch.randn(B, H, W) * 20.0)
        y_rain[0, 2:5, 2:5] = 75.0  # Add heavy event
        y_reg = torch.tensor([1, 4], dtype=torch.long)

        outputs = model(x)
        total_loss, telemetry = loss_fn(outputs, y_rain, y_reg)

        assert total_loss.item() > 0.0
        assert "loss_quantile" in telemetry
        assert "loss_heavy" in telemetry
        assert "loss_regime" in telemetry
        assert "entropy" in telemetry

        # Test gradient propagation
        total_loss.backward()
        # Verify gradients exist on experts and classifier head
        assert model.moe.experts[0].input_layer.conv.weight.grad is not None
        assert model.regime_classifier.head.mlp[0].weight.grad is not None


class TestJointDatasetAndTrainer:
    """Tests for chronological dataset splitting and trainer execution."""

    def test_chronological_split_integrity(self):
        N = 20
        features = np.zeros((N, 20, 8, 8), dtype=np.float32)
        rainfall = np.arange(N, dtype=np.float32)[:, None, None] * np.ones((N, 8, 8), dtype=np.float32)
        regimes = np.arange(N) % 6

        train_ds, val_ds = JointChronologicalDataset.split_chronological(
            features=features,
            rainfall_targets=rainfall,
            regime_targets=regimes,
            train_ratio=0.70,
        )

        assert len(train_ds) == 14
        assert len(val_ds) == 6

        # Train targets strictly from 0 to 13
        assert float(train_ds[0][1][0, 0]) == 0.0
        assert float(train_ds[13][1][0, 0]) == 13.0
        # Val targets strictly from 14 to 19 (future chronology)
        assert float(val_ds[0][1][0, 0]) == 14.0
        assert float(val_ds[5][1][0, 0]) == 19.0

    def test_trainer_single_epoch_and_checkpoint(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            ckpt_dir = Path(tmp_dir)

            model = JointRegimeAwareModel(in_channels=20, embedding_dim=32, expert_hidden_dim=16)
            trainer = JointTrainer(model=model, lr=1e-3, device="cpu")

            features = np.random.randn(8, 20, 8, 8).astype(np.float32)
            rainfall = np.random.exponential(10.0, size=(8, 8, 8)).astype(np.float32)
            regimes = np.random.randint(0, 6, size=8)

            train_ds, val_ds = JointChronologicalDataset.split_chronological(
                features=features, rainfall_targets=rainfall, regime_targets=regimes, train_ratio=0.75
            )

            fit_results = trainer.fit(
                train_dataset=train_ds,
                val_dataset=val_ds,
                epochs=2,
                batch_size=2,
                checkpoint_dir=ckpt_dir,
            )

            assert "history" in fit_results
            assert len(fit_results["history"]["train_loss"]) == 2
            assert (ckpt_dir / "joint_model_best.pt").exists()
            assert (ckpt_dir / "joint_training_history.json").exists()
