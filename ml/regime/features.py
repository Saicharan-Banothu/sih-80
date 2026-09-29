"""Dataset loaders and chronological batching for regime classification."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset
import xarray as xr

from ml.features.builder import FeatureBuilder
from ml.data.gfs import GFSAdapter
from ml.data.regime_seeds import RautRegimeSeedsAdapter


class RegimeDataset(Dataset):
    """PyTorch Dataset yielding 20-channel forecast feature tensors and regime labels."""

    def __init__(
        self,
        features: np.ndarray,  # Shape: (N, C, H, W)
        labels: np.ndarray,    # Shape: (N,) or (N, 6)
        dates: List[str],
    ):
        self.features = torch.from_numpy(features).float()
        if labels.ndim == 1:
            self.labels = torch.from_numpy(labels).long()
        else:
            self.labels = torch.from_numpy(labels).float()
        self.dates = dates

    def __len__(self) -> int:
        return len(self.features)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        return self.features[idx], self.labels[idx]


def create_chronological_splits(
    dates: List[str],
    features: np.ndarray,
    labels: np.ndarray,
    train_end_date: str = "2025-08-15",
    val_end_date: str = "2025-09-15",
) -> Tuple[RegimeDataset, RegimeDataset, RegimeDataset]:
    """Split dataset chronologically to prevent temporal data leakage.
    
    Train: Dates <= train_end_date
    Validation: train_end_date < Dates <= val_end_date
    Test: Dates > val_end_date (held-out evaluation period)
    """
    dt_series = pd.to_datetime(dates)
    train_mask = dt_series <= pd.to_datetime(train_end_date)
    val_mask = (dt_series > pd.to_datetime(train_end_date)) & (dt_series <= pd.to_datetime(val_end_date))
    test_mask = dt_series > pd.to_datetime(val_end_date)

    # Fallback to index-based slice if date filtering yields empty sets on small subsets
    if not np.any(train_mask) or not np.any(test_mask):
        n = len(dates)
        n_train = max(1, int(n * 0.6))
        n_val = max(1, int(n * 0.2))
        train_mask = np.zeros(n, dtype=bool)
        train_mask[:n_train] = True
        val_mask = np.zeros(n, dtype=bool)
        val_mask[n_train:n_train + n_val] = True
        test_mask = np.zeros(n, dtype=bool)
        test_mask[n_train + n_val:] = True

    train_ds = RegimeDataset(features[train_mask], labels[train_mask], [dates[i] for i in range(len(dates)) if train_mask[i]])
    val_ds = RegimeDataset(features[val_mask], labels[val_mask], [dates[i] for i in range(len(dates)) if val_mask[i]])
    test_ds = RegimeDataset(features[test_mask], labels[test_mask], [dates[i] for i in range(len(dates)) if test_mask[i]])

    return train_ds, val_ds, test_ds
