"""Leakage-safe feature normalization fitted strictly on training chronologies."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np


class FeatureNormalizer:
    """Channel-wise standardizer fitted strictly on training data splits to prevent temporal leakage."""

    def __init__(self, channel_names: Optional[List[str]] = None, eps: float = 1e-6):
        self.channel_names = channel_names or []
        self.eps = eps
        self.means: Optional[np.ndarray] = None
        self.stds: Optional[np.ndarray] = None
        self.fitted_on_training_only: bool = False
        self.n_samples_fitted: int = 0

    def fit(self, X: np.ndarray, channel_names: Optional[List[str]] = None) -> FeatureNormalizer:
        """Fit means and standard deviations strictly on training split.
        
        X: array of shape (N, C, H, W) or (N, C)
        """
        if channel_names is not None:
            self.channel_names = channel_names

        if X.ndim == 4:
            # (N, C, H, W) -> mean over axis (0, 2, 3) per channel C
            self.means = np.nanmean(X, axis=(0, 2, 3), keepdims=True)
            self.stds = np.nanstd(X, axis=(0, 2, 3), keepdims=True)
            self.stds = np.maximum(self.stds, self.eps)
        elif X.ndim == 2:
            # (N, C) -> mean over axis 0
            self.means = np.nanmean(X, axis=0, keepdims=True)
            self.stds = np.nanstd(X, axis=0, keepdims=True)
            self.stds = np.maximum(self.stds, self.eps)
        else:
            raise ValueError(f"Expected 2D or 4D array, got shape {X.shape}")

        self.fitted_on_training_only = True
        self.n_samples_fitted = X.shape[0]
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        """Transform arbitrary data using the pre-fitted training statistics."""
        if not self.fitted_on_training_only or self.means is None or self.stds is None:
            raise RuntimeError("FeatureNormalizer must be fitted on training data before transform()")
        return (X - self.means) / self.stds

    def fit_transform(self, X: np.ndarray, channel_names: Optional[List[str]] = None) -> np.ndarray:
        """Fit on training data and return transformed training data."""
        return self.fit(X, channel_names=channel_names).transform(X)

    def save_json(self, file_path: Path) -> None:
        """Serialize normalization parameters to JSON file."""
        file_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "channel_names": self.channel_names,
            "fitted_on_training_only": self.fitted_on_training_only,
            "n_samples_fitted": self.n_samples_fitted,
            "means": self.means.flatten().tolist() if self.means is not None else [],
            "stds": self.stds.flatten().tolist() if self.stds is not None else [],
        }
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def load_json(cls, file_path: Path) -> FeatureNormalizer:
        """Load normalization parameters from JSON file."""
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        normalizer = cls(channel_names=data.get("channel_names"))
        normalizer.fitted_on_training_only = data.get("fitted_on_training_only", False)
        normalizer.n_samples_fitted = data.get("n_samples_fitted", 0)
        means = np.array(data["means"], dtype=np.float32)
        stds = np.array(data["stds"], dtype=np.float32)
        # Reshape to (1, C, 1, 1) for 4D broadcast compatibility
        normalizer.means = means.reshape(1, len(means), 1, 1)
        normalizer.stds = stds.reshape(1, len(stds), 1, 1)
        return normalizer
