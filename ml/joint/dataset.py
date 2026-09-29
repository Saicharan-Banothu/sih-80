"""Chronologically partitioned dataset for joint end-to-end training."""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import torch
from torch.utils.data import Dataset


class JointChronologicalDataset(Dataset):
    """PyTorch Dataset for joint regime-aware model training adhering to chronological data integrity.
    
    Guarantees:
      - Strictly past/earlier data for training.
      - Targets are verification-only observed IMD rainfall grids.
      - Regime targets are weakly supervised cluster seeds or Raut et al. classes.
    """

    def __init__(
        self,
        features: np.ndarray,             # (N, 20, H, W)
        rainfall_targets: np.ndarray,     # (N, H, W)
        regime_targets: Optional[np.ndarray] = None,  # (N,) or (N, 6)
        dates: Optional[List[str]] = None,
    ):
        self.features = torch.from_numpy(features).float()
        self.rainfall_targets = torch.from_numpy(rainfall_targets).float()
        
        if regime_targets is not None:
            if regime_targets.ndim == 1:
                self.regime_targets = torch.from_numpy(regime_targets).long()
            else:
                self.regime_targets = torch.from_numpy(regime_targets).float()
        else:
            self.regime_targets = None

        self.dates = dates

    def __len__(self) -> int:
        return len(self.features)

    def __getitem__(
        self, idx: int
    ) -> Tuple[torch.Tensor, torch.Tensor, Optional[torch.Tensor]]:
        feat = self.features[idx]
        target_rain = self.rainfall_targets[idx]
        target_regime = self.regime_targets[idx] if self.regime_targets is not None else torch.tensor(-1)
        return feat, target_rain, target_regime

    @classmethod
    def split_chronological(
        cls,
        features: np.ndarray,
        rainfall_targets: np.ndarray,
        regime_targets: Optional[np.ndarray] = None,
        dates: Optional[List[str]] = None,
        train_ratio: float = 0.70,
    ) -> Tuple[JointChronologicalDataset, JointChronologicalDataset]:
        """Split into train and validation sets strictly in chronological sequence (no shuffling across time)."""
        n_total = len(features)
        split_idx = int(n_total * train_ratio)

        train_ds = cls(
            features=features[:split_idx],
            rainfall_targets=rainfall_targets[:split_idx],
            regime_targets=regime_targets[:split_idx] if regime_targets is not None else None,
            dates=dates[:split_idx] if dates is not None else None,
        )

        val_ds = cls(
            features=features[split_idx:],
            rainfall_targets=rainfall_targets[split_idx:],
            regime_targets=regime_targets[split_idx:] if regime_targets is not None else None,
            dates=dates[split_idx:] if dates is not None else None,
        )

        return train_ds, val_ds
