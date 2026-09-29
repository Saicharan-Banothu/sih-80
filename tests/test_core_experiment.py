"""Test suite for Phase 9 Core 3-Way Comparative Experiment and Block-Bootstrap Statistical Testing."""

import tempfile
from pathlib import Path
import numpy as np
import pytest

from ml.experiments.bootstrap import paired_block_bootstrap, rmse_metric, ets_metric
from ml.experiments.core_benchmark import CoreExperimentRunner


class TestBlockBootstrap:
    """Test suite for paired stationary block-bootstrap hypothesis testing."""

    def test_bootstrap_detects_significant_difference(self):
        N = 40
        obs = np.random.exponential(15.0, size=(N, 10, 10))
        # Model C has consistently lower errors than Baseline
        pred_base = obs + 10.0 + np.random.normal(0, 2.0, size=(N, 10, 10))
        pred_c = obs + 1.0 + np.random.normal(0, 1.0, size=(N, 10, 10))

        res = paired_block_bootstrap(
            metric_func=rmse_metric,
            pred_c=pred_c,
            pred_base=pred_base,
            observed=obs,
            block_length=4,
            n_resamples=200,
            seed=42,
        )

        assert "observed_difference" in res
        assert "ci_lower" in res
        assert "ci_upper" in res
        assert "p_value" in res
        assert "is_significant_at_95" in res

        # RMSE difference should be negative (Model C has lower RMSE)
        assert res["observed_difference"] < 0
        assert res["ci_upper"] < 0
        assert res["p_value"] < 0.05
        assert res["is_significant_at_95"] is True

    def test_bootstrap_null_hypothesis_identical_models(self):
        N = 30
        obs = np.random.exponential(10.0, size=(N, 8, 8))
        pred = obs + np.random.normal(0, 2.0, size=(N, 8, 8))

        # Comparing model against itself
        res = paired_block_bootstrap(
            metric_func=rmse_metric,
            pred_c=pred,
            pred_base=pred,
            observed=obs,
            block_length=3,
            n_resamples=100,
            seed=42,
        )

        assert res["observed_difference"] == 0.0
        assert res["ci_lower"] <= 0.0 <= res["ci_upper"]
        assert res["is_significant_at_95"] is False


class TestCoreBenchmarkRunner:
    """Test suite for CoreExperimentRunner end-to-end execution."""

    def test_run_benchmark_and_export_json(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_path = Path(tmp_dir)
            runner = CoreExperimentRunner(
                output_dir=out_path,
                block_length=3,
                bootstrap_replications=50,  # Fast for unit tests
            )

            N, H, W = 15, 12, 12
            obs = np.random.exponential(12.0, size=(N, H, W)).astype(np.float32)
            raw = obs * 0.70
            qm = obs * 0.85
            moe_q = np.zeros((N, 7, H, W), dtype=np.float32)
            for i in range(7):
                moe_q[:, i] = obs * (0.8 + 0.05 * i)

            results = runner.run_benchmark(
                raw_nwp_series=raw,
                qm_series=qm,
                moe_quantiles_series=moe_q,
                obs_series=obs,
            )

            assert "metadata" in results
            assert "scientific_verification" in results
            assert "upper_tail_stratification" in results
            assert "statistical_significance" in results

            # Verify exported JSON file exists and matches
            json_file = out_path / "core_experiment_results.json"
            assert json_file.exists()
            assert json_file.stat().st_size > 0
