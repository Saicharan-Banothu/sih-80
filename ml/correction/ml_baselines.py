"""Extended classical statistical downscaling and tabular ML baselines (Random Forest, GBDT, Linear MOS)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.linear_model import Ridge


class LinearMOSBaseline:
    """Classical Model Output Statistics (MOS) linear regression baseline."""

    def __init__(self, alpha: float = 1.0):
        self.model = Ridge(alpha=alpha, positive=True)
        self.is_fitted = False

    def fit(self, features: np.ndarray, targets: np.ndarray) -> LinearMOSBaseline:
        """Fit linear MOS on flattened spatio-temporal feature matrix.
        
        features: (N, 20, H, W)
        targets: (N, H, W)
        """
        N, C, H, W = features.shape
        # Subsample to keep fitting rapid and memory-efficient
        X_flat = np.moveaxis(features, 1, -1).reshape(-1, C)
        y_flat = targets.flatten()

        valid = (~np.isnan(X_flat).any(axis=-1)) & (~np.isnan(y_flat))
        # Take up to 20,000 points
        idx = np.where(valid)[0]
        if len(idx) > 20000:
            rng = np.random.RandomState(42)
            idx = rng.choice(idx, size=20000, replace=False)

        self.model.fit(X_flat[idx], y_flat[idx])
        self.is_fitted = True
        return self

    def predict(self, features: np.ndarray) -> np.ndarray:
        """Generate corrected rainfall forecast grids."""
        if not self.is_fitted:
            raise RuntimeError("LinearMOSBaseline must be fitted before predict.")
        N, C, H, W = features.shape
        X_flat = np.moveaxis(features, 1, -1).reshape(-1, C)
        preds = self.model.predict(X_flat).reshape(N, H, W)
        return np.maximum(0.0, preds)


class RandomForestCorrectionBaseline:
    """Tabular Random Forest Regressor predicting spatial rainfall point corrections."""

    def __init__(self, n_estimators: int = 40, max_depth: int = 8, random_state: int = 42):
        self.model = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=random_state,
            n_jobs=-1,
        )
        self.is_fitted = False

    def fit(self, features: np.ndarray, targets: np.ndarray) -> RandomForestCorrectionBaseline:
        N, C, H, W = features.shape
        X_flat = np.moveaxis(features, 1, -1).reshape(-1, C)
        y_flat = targets.flatten()

        valid = (~np.isnan(X_flat).any(axis=-1)) & (~np.isnan(y_flat))
        idx = np.where(valid)[0]
        if len(idx) > 20000:
            rng = np.random.RandomState(42)
            idx = rng.choice(idx, size=20000, replace=False)

        self.model.fit(X_flat[idx], y_flat[idx])
        self.is_fitted = True
        return self

    def predict(self, features: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError("RandomForestCorrectionBaseline must be fitted before predict.")
        N, C, H, W = features.shape
        X_flat = np.moveaxis(features, 1, -1).reshape(-1, C)
        preds = self.model.predict(X_flat).reshape(N, H, W)
        return np.maximum(0.0, preds)


class GradientBoostingCorrectionBaseline:
    """Tabular Histogram Gradient Boosting Regressor (LightGBM equivalent)."""

    def __init__(self, max_iter: int = 40, max_depth: int = 6, random_state: int = 42):
        self.model = HistGradientBoostingRegressor(
            max_iter=max_iter,
            max_depth=max_depth,
            random_state=random_state,
        )
        self.is_fitted = False

    def fit(self, features: np.ndarray, targets: np.ndarray) -> GradientBoostingCorrectionBaseline:
        N, C, H, W = features.shape
        X_flat = np.moveaxis(features, 1, -1).reshape(-1, C)
        y_flat = targets.flatten()

        valid = (~np.isnan(X_flat).any(axis=-1)) & (~np.isnan(y_flat))
        idx = np.where(valid)[0]
        if len(idx) > 20000:
            rng = np.random.RandomState(42)
            idx = rng.choice(idx, size=20000, replace=False)

        self.model.fit(X_flat[idx], y_flat[idx])
        self.is_fitted = True
        return self

    def predict(self, features: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError("GradientBoostingCorrectionBaseline must be fitted before predict.")
        N, C, H, W = features.shape
        X_flat = np.moveaxis(features, 1, -1).reshape(-1, C)
        preds = self.model.predict(X_flat).reshape(N, H, W)
        return np.maximum(0.0, preds)
