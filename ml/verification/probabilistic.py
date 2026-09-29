"""Continuous probabilistic verification: CRPS, Brier Skill Score, and Reliability Curves."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from ml.correction.quantiles import OPERATIONAL_QUANTILES


def compute_crps_quantiles(
    predicted_quantiles: np.ndarray,
    observed: np.ndarray,
    quantiles: Optional[List[float]] = None,
) -> float:
    """Compute Continuous Ranked Probability Score (CRPS) from predictive quantiles.
    
    predicted_quantiles: (7, ...) or (B, 7, ...) array
    observed: (...) or (B, ...) array
    quantiles: list of quantile levels (defaults to OPERATIONAL_QUANTILES)
    """
    if quantiles is None:
        quantiles = OPERATIONAL_QUANTILES

    tau_arr = np.array(quantiles)
    K = len(tau_arr)

    # Flatten spatial / batch dimensions
    if predicted_quantiles.shape[0] == K:
        # Shape (7, N)
        q_flat = predicted_quantiles.reshape(K, -1)
        y_flat = observed.flatten()
    elif predicted_quantiles.ndim >= 2 and predicted_quantiles.shape[1] == K:
        # Shape (B, 7, ...)
        B = predicted_quantiles.shape[0]
        q_flat = np.moveaxis(predicted_quantiles, 1, 0).reshape(K, -1)
        y_flat = observed.flatten()
    else:
        raise ValueError(f"Unexpected shape for predicted_quantiles: {predicted_quantiles.shape}")

    valid = ~np.isnan(y_flat)
    q_valid = q_flat[:, valid]
    y_valid = y_flat[valid]

    if len(y_valid) == 0:
        return 0.0

    # Quantile score approximation: CRPS = (2 / K) * sum_k rho_{tau_k}(y - q_k)
    total_pinball = 0.0
    for k, tau in enumerate(tau_arr):
        u = y_valid - q_valid[k]
        loss_k = np.where(u >= 0, tau * u, (tau - 1.0) * u)
        total_pinball += np.mean(loss_k)

    crps = (2.0 / K) * total_pinball
    return round(float(crps), 4)


def compute_brier_skill_score(
    forecast_probs: np.ndarray,
    observed: np.ndarray,
    threshold: float,
    climo_prob: Optional[float] = None,
) -> Dict[str, float]:
    """Compute Brier Score (BS) and Brier Skill Score (BSS) relative to sample climatology."""
    p_flat = forecast_probs.flatten()
    y_flat = (observed.flatten() >= threshold).astype(np.float64)

    valid = (~np.isnan(p_flat)) & (~np.isnan(y_flat))
    p = p_flat[valid]
    y = y_flat[valid]

    if len(p) == 0:
        return {"brier_score": 0.0, "climatology_brier": 0.0, "brier_skill_score": 0.0}

    bs = float(np.mean((p - y) ** 2))

    p_climo = climo_prob if climo_prob is not None else float(np.mean(y))
    bs_climo = float(np.mean((p_climo - y) ** 2))

    if bs_climo > 1e-6:
        bss = 1.0 - (bs / bs_climo)
    else:
        bss = 1.0 if bs < 1e-6 else 0.0

    return {
        "brier_score": round(bs, 4),
        "climatology_brier": round(bs_climo, 4),
        "brier_skill_score": round(bss, 4),
        "climatology_frequency": round(p_climo, 4),
    }


def compute_reliability_curve(
    forecast_probs: np.ndarray,
    observed: np.ndarray,
    threshold: float,
    n_bins: int = 10,
) -> Dict[str, Any]:
    """Compute reliability diagram data: mean forecast probability vs observed relative frequency."""
    p_flat = forecast_probs.flatten()
    y_flat = (observed.flatten() >= threshold).astype(np.float64)

    valid = (~np.isnan(p_flat)) & (~np.isnan(y_flat))
    p = p_flat[valid]
    y = y_flat[valid]

    bins = np.linspace(0.0, 1.0, n_bins + 1)
    bin_centers = 0.5 * (bins[:-1] + bins[1:])
    observed_frequencies = []
    mean_forecast_probs = []
    bin_counts = []

    for i in range(n_bins):
        in_bin = (p >= bins[i]) & (p < bins[i + 1] if i < n_bins - 1 else p <= bins[i + 1])
        cnt = int(np.sum(in_bin))
        bin_counts.append(cnt)
        if cnt > 0:
            observed_frequencies.append(round(float(np.mean(y[in_bin])), 4))
            mean_forecast_probs.append(round(float(np.mean(p[in_bin])), 4))
        else:
            observed_frequencies.append(0.0)
            mean_forecast_probs.append(round(float(bin_centers[i]), 4))

    return {
        "bin_centers": [round(float(c), 3) for c in bin_centers],
        "mean_forecast_probs": mean_forecast_probs,
        "observed_frequencies": observed_frequencies,
        "sample_counts": bin_counts,
    }
