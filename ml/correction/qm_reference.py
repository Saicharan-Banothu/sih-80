"""Regime-specific Quantile Mapping reference prototypes serving as inductive priors."""

from __future__ import annotations

from typing import Dict, List, Optional
import numpy as np

from ml.correction.baseline_global_qm import GlobalQuantileMappingBaseline
from ml.regime.labels import REGIME_IDS


class RegimeQMReferencePrototypes:
    """Maintains six regime-specific empirical QM reference baselines."""

    def __init__(self, n_quantiles: int = 50):
        self.n_quantiles = n_quantiles
        # Six expert baselines
        self.expert_baselines: Dict[int, GlobalQuantileMappingBaseline] = {
            k: GlobalQuantileMappingBaseline(n_quantiles=n_quantiles)
            for k in range(6)
        }
        self.is_fitted: bool = False

    def fit_from_stratified_data(
        self,
        nwp_by_regime: Dict[int, np.ndarray],
        obs_by_regime: Dict[int, np.ndarray],
    ) -> RegimeQMReferencePrototypes:
        """Fit each regime-expert QM baseline strictly on data from that regime in the training set."""
        for k in range(6):
            if k in nwp_by_regime and len(nwp_by_regime[k]) > 0:
                self.expert_baselines[k].fit(nwp_by_regime[k], obs_by_regime[k])
            else:
                # If regime samples are sparse in training subset, initialize with identity
                dummy = np.linspace(0.0, 100.0, 50)
                self.expert_baselines[k].fit(dummy, dummy)

        self.is_fitted = True
        return self

    def predict_expert_reference(self, regime_id: int, nwp_input: np.ndarray) -> np.ndarray:
        """Get reference QM prediction for a specific regime expert."""
        if not self.is_fitted:
            return np.maximum(0.0, nwp_input)
        return self.expert_baselines[regime_id].predict(nwp_input)
