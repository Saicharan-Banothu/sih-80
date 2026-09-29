"""Paired stationary block-bootstrap statistical significance testing for meteorological time series."""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional, Tuple
import numpy as np


def paired_block_bootstrap(
    metric_func: Callable[[np.ndarray, np.ndarray], float],
    pred_c: np.ndarray,      # Model C predictions (N, ...)
    pred_base: np.ndarray,   # Baseline predictions (N, ...)
    observed: np.ndarray,    # Observed verification targets (N, ...)
    block_length: int = 5,
    n_resamples: int = 1000,
    confidence_level: float = 0.95,
    seed: int = 42,
) -> Dict[str, Any]:
    """Execute paired block-bootstrap significance test accounting for temporal autocorrelation (Politis & Romano, 1994).
    
    Args:
        metric_func: Function f(pred, obs) -> scalar score (e.g. RMSE, ETS, CRPS)
        pred_c: Predictions from Model C (MoE)
        pred_base: Predictions from Baseline (Model A or Model B)
        observed: True observed rainfall
        block_length: Length of contiguous blocks (e.g. 5 days to match synoptic weather persistence)
        n_resamples: Number of bootstrap replications (default 1000)
        confidence_level: Nominal confidence level (default 0.95)
    
    Returns:
        Dictionary containing observed diff, bootstrap mean, 95% CI, p-value, and significance flag.
    """
    rng = np.random.RandomState(seed)
    N = len(pred_c)
    if N < block_length:
        block_length = max(1, N // 2)

    # Base point estimate of metric difference: Delta = Metric(MoE) - Metric(Base)
    score_c_base = metric_func(pred_c, observed)
    score_b_base = metric_func(pred_base, observed)
    delta_obs = score_c_base - score_b_base

    # Generate overlapping blocks
    n_blocks = int(np.ceil(N / block_length))
    possible_starts = N - block_length + 1

    bootstrap_deltas = np.empty(n_resamples, dtype=np.float64)

    for b in range(n_resamples):
        # Sample starting indices for blocks
        starts = rng.randint(0, possible_starts, size=n_blocks)
        indices = []
        for s in starts:
            indices.extend(range(s, s + block_length))
        sample_indices = np.array(indices[:N])

        # Extract resampled paired slices
        p_c_resample = pred_c[sample_indices]
        p_b_resample = pred_base[sample_indices]
        obs_resample = observed[sample_indices]

        sc = metric_func(p_c_resample, obs_resample)
        sb = metric_func(p_b_resample, obs_resample)
        bootstrap_deltas[b] = sc - sb

    # Confidence interval percentiles
    alpha = 1.0 - confidence_level
    ci_lower = float(np.percentile(bootstrap_deltas, 100.0 * (alpha / 2.0)))
    ci_upper = float(np.percentile(bootstrap_deltas, 100.0 * (1.0 - alpha / 2.0)))

    # Two-sided empirical p-value for H0: Delta = 0
    # Centering bootstrap distribution around null hypothesis
    p_pos = np.mean(bootstrap_deltas >= 0)
    p_neg = np.mean(bootstrap_deltas <= 0)
    p_value = 2.0 * min(p_pos, p_neg)
    p_value = min(1.0, max(0.0, float(p_value)))

    # Statistical significance: 0 not contained within the 95% CI
    is_significant = bool((ci_lower > 0.0 and ci_upper > 0.0) or (ci_lower < 0.0 and ci_upper < 0.0))

    return {
        "score_c": round(float(score_c_base), 4),
        "score_base": round(float(score_b_base), 4),
        "observed_difference": round(float(delta_obs), 4),
        "ci_lower": round(ci_lower, 4),
        "ci_upper": round(ci_upper, 4),
        "bootstrap_mean_diff": round(float(np.mean(bootstrap_deltas)), 4),
        "bootstrap_std": round(float(np.std(bootstrap_deltas)), 4),
        "p_value": round(p_value, 4),
        "is_significant_at_95": is_significant,
        "n_resamples": n_resamples,
        "block_length": block_length,
    }


def rmse_metric(p: np.ndarray, o: np.ndarray) -> float:
    return float(np.sqrt(np.mean((p.flatten() - o.flatten()) ** 2)))


def ets_metric(p: np.ndarray, o: np.ndarray, threshold: float = 64.5) -> float:
    p_bin = p.flatten() >= threshold
    o_bin = o.flatten() >= threshold
    H = np.sum(p_bin & o_bin)
    F = np.sum(p_bin & (~o_bin))
    M = np.sum((~p_bin) & o_bin)
    N = len(p_bin)
    h_random = ((H + M) * (H + F)) / max(N, 1)
    denom = H + F + M - h_random
    return float((H - h_random) / denom) if denom != 0 else 0.0
