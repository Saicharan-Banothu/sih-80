"""Global Quantile Mapping (Model B) baseline using xsdba and empirical quantile adjustment."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import xarray as xr
from scipy.interpolate import interp1d

try:
    import xsdba
    HAS_XSDBA = True
except ImportError:
    HAS_XSDBA = False

from ml.correction.wet_day import WetDayFrequencyAdjuster
from ml.correction.tail_handling import TailExtrapolationEngine

logger = logging.getLogger("regimerain.correction.global_qm")


class GlobalQuantileMappingBaseline:
    """Model B: Regime-agnostic Global Quantile Mapping baseline fitted strictly on training data."""

    def __init__(
        self,
        n_quantiles: int = 100,
        wet_threshold_mm: float = 0.1,
        tail_policy: str = "CONSTANT_DELTA",
        use_xsdba_if_available: bool = True,
    ):
        self.n_quantiles = n_quantiles
        self.wet_threshold_mm = wet_threshold_mm
        self.use_xsdba = use_xsdba_if_available and HAS_XSDBA
        self.model_name = "Model_B_Global_QM_Baseline"

        self.wet_adjuster = WetDayFrequencyAdjuster(wet_threshold_mm=wet_threshold_mm)
        self.tail_engine = TailExtrapolationEngine(policy=tail_policy)

        # Empirical quantile arrays
        self.quantiles = np.linspace(0.001, 0.999, n_quantiles)
        self.nwp_quantiles: Optional[np.ndarray] = None
        self.obs_quantiles: Optional[np.ndarray] = None
        self.interp_func: Optional[interp1d] = None
        self.is_fitted: bool = False
        self.fitted_on_training_only: bool = False
        self.xsdba_eqm = None

    def fit(
        self,
        nwp_train: np.ndarray | xr.DataArray,
        obs_train: np.ndarray | xr.DataArray,
    ) -> GlobalQuantileMappingBaseline:
        """Fit quantile transformation functions strictly on training data."""
        # Convert to numpy 1D flattened arrays of valid entries
        if isinstance(nwp_train, xr.DataArray):
            nwp_raw = nwp_train.values
        else:
            nwp_raw = np.array(nwp_train)

        if isinstance(obs_train, xr.DataArray):
            obs_raw = obs_train.values
        else:
            obs_raw = np.array(obs_train)

        # 1. Fit wet-day drizzle adjuster
        self.wet_adjuster.fit(nwp_raw, obs_raw)
        nwp_drizzle_adj = self.wet_adjuster.apply(nwp_raw)

        # 2. Fit tail extrapolation engine
        self.tail_engine.fit(nwp_drizzle_adj, obs_raw)

        # 3. Fit xsdba EmpiricalQuantileMapping if input is DataArray with time dim
        if self.use_xsdba and isinstance(nwp_train, xr.DataArray) and isinstance(obs_train, xr.DataArray):
            try:
                # xsdba requires units attribute
                nwp_da = nwp_train.copy()
                obs_da = obs_train.copy()
                if "units" not in nwp_da.attrs:
                    nwp_da.attrs["units"] = "mm/day"
                if "units" not in obs_da.attrs:
                    obs_da.attrs["units"] = "mm/day"
                self.xsdba_eqm = xsdba.EmpiricalQuantileMapping.train(
                    ref=obs_da, hist=nwp_da, nquantiles=self.n_quantiles, kind="+"
                )
            except Exception as e:
                logger.warning(f"xsdba fit failed on gridded dimensions: {e}. Falling back to standard QM interpolator.")
                self.xsdba_eqm = None

        # 4. Fit robust continuous empirical quantile interpolator
        valid_mask = (~np.isnan(nwp_drizzle_adj)) & (~np.isnan(obs_raw))
        nwp_clean = nwp_drizzle_adj[valid_mask]
        obs_clean = obs_raw[valid_mask]

        self.nwp_quantiles = np.quantile(nwp_clean, self.quantiles)
        self.obs_quantiles = np.quantile(obs_clean, self.quantiles)

        # Build monotonic 1D piecewise-linear transfer function
        # Ensure strict monotonicity for interp1d
        unique_nwp, unique_idx = np.unique(self.nwp_quantiles, return_index=True)
        unique_obs = self.obs_quantiles[unique_idx]

        self.interp_func = interp1d(
            unique_nwp,
            unique_obs,
            kind="linear",
            bounds_error=False,
            fill_value=(unique_obs[0], unique_obs[-1]),
        )

        self.is_fitted = True
        self.fitted_on_training_only = True
        return self

    def predict(self, nwp_input: np.ndarray | xr.DataArray) -> np.ndarray:
        """Apply fitted Global Quantile Mapping baseline to held-out forecast inputs.
        
        Strictly zero future observation leakage: obs are never accessed here.
        """
        if not self.is_fitted or self.interp_func is None:
            raise RuntimeError("GlobalQuantileMappingBaseline must be fitted on training data before predict()")

        if isinstance(nwp_input, xr.DataArray):
            input_vals = nwp_input.values.copy()
        else:
            input_vals = np.array(nwp_input, copy=True)

        orig_shape = input_vals.shape
        flat_input = input_vals.flatten()

        # Step 1: Drizzle / wet-day thresholding
        drizzle_adj = self.wet_adjuster.apply(flat_input)

        # Step 2: Quantile transfer mapping
        mapped = self.interp_func(drizzle_adj)

        # Step 3: Extreme upper-tail extrapolation
        extrapolated = self.tail_engine.extrapolate_tail(drizzle_adj, mapped)

        # Ensure physical non-negativity
        result = np.maximum(0.0, extrapolated).reshape(orig_shape)
        return result

    def evaluate_bias_reduction(
        self,
        raw_nwp: np.ndarray,
        obs_truth: np.ndarray,
        corrected: np.ndarray,
    ) -> Dict[str, Any]:
        """Compute verification statistics comparing raw NWP vs. Global QM corrected rainfall."""
        valid_mask = (~np.isnan(raw_nwp)) & (~np.isnan(obs_truth)) & (~np.isnan(corrected))
        y_true = obs_truth[valid_mask]
        y_raw = raw_nwp[valid_mask]
        y_qm = corrected[valid_mask]

        raw_rmse = float(np.sqrt(np.mean((y_raw - y_true) ** 2)))
        qm_rmse = float(np.sqrt(np.mean((y_qm - y_true) ** 2)))

        raw_mae = float(np.mean(np.abs(y_raw - y_true)))
        qm_mae = float(np.mean(np.abs(y_qm - y_true)))

        raw_bias = float(np.mean(y_raw - y_true))
        qm_bias = float(np.mean(y_qm - y_true))

        # Upper tail evaluation (> 64.5 mm)
        heavy_mask = y_true >= 64.5
        heavy_count = int(np.sum(heavy_mask))
        if heavy_count > 0:
            heavy_raw_rmse = float(np.sqrt(np.mean((y_raw[heavy_mask] - y_true[heavy_mask]) ** 2)))
            heavy_qm_rmse = float(np.sqrt(np.mean((y_qm[heavy_mask] - y_true[heavy_mask]) ** 2)))
        else:
            heavy_raw_rmse = 0.0
            heavy_qm_rmse = 0.0

        return {
            "model": self.model_name,
            "sample_count": len(y_true),
            "raw_rmse_mm": round(raw_rmse, 3),
            "qm_rmse_mm": round(qm_rmse, 3),
            "rmse_improvement_pct": round(((raw_rmse - qm_rmse) / max(raw_rmse, 1e-4)) * 100.0, 2),
            "raw_mae_mm": round(raw_mae, 3),
            "qm_mae_mm": round(qm_mae, 3),
            "raw_mean_bias_mm": round(raw_bias, 3),
            "qm_mean_bias_mm": round(qm_bias, 3),
            "heavy_tail_samples": heavy_count,
            "heavy_raw_rmse_mm": round(heavy_raw_rmse, 3),
            "heavy_qm_rmse_mm": round(heavy_qm_rmse, 3),
            "xsdba_engine_used": self.xsdba_eqm is not None,
        }
