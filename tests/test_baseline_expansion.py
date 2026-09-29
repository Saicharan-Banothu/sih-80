"""Test suite for Phase 11 Extended ML Baselines and Multi-Model Leaderboard."""

import tempfile
from pathlib import Path
import numpy as np
import pytest

from ml.correction.ml_baselines import (
    LinearMOSBaseline,
    RandomForestCorrectionBaseline,
    GradientBoostingCorrectionBaseline,
)
from ml.experiments.baseline_expansion import ExtendedBaselineBenchmark


class TestMLBaselines:
    """Test suite for individual classical downscaling baseline estimators."""

    @pytest.fixture
    def synthetic_data(self):
        rng = np.random.RandomState(42)
        N, H, W = 8, 10, 10
        X = rng.randn(N, 20, H, W).astype(np.float32)
        y = rng.exponential(scale=10.0, size=(N, H, W)).astype(np.float32)
        return X, y

    def test_linear_mos_fit_predict(self, synthetic_data):
        X, y = synthetic_data
        model = LinearMOSBaseline()
        model.fit(X, y)
        pred = model.predict(X)

        assert pred.shape == y.shape
        assert np.all(pred >= 0.0)

    def test_random_forest_fit_predict(self, synthetic_data):
        X, y = synthetic_data
        model = RandomForestCorrectionBaseline(n_estimators=10, max_depth=4)
        model.fit(X, y)
        pred = model.predict(X)

        assert pred.shape == y.shape
        assert np.all(pred >= 0.0)

    def test_gradient_boosting_fit_predict(self, synthetic_data):
        X, y = synthetic_data
        model = GradientBoostingCorrectionBaseline(max_iter=10, max_depth=4)
        model.fit(X, y)
        pred = model.predict(X)

        assert pred.shape == y.shape
        assert np.all(pred >= 0.0)


class TestExtendedBaselineBenchmark:
    """Test suite for ExtendedBaselineBenchmark."""

    def test_run_benchmark_all_models_evaluated(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_dir = Path(tmp_dir)
            benchmark = ExtendedBaselineBenchmark(output_dir=out_dir)

            N_tr, N_te, H, W = 6, 6, 8, 8
            rng = np.random.RandomState(42)
            train_X = rng.randn(N_tr, 20, H, W).astype(np.float32)
            train_y = rng.exponential(10.0, size=(N_tr, H, W)).astype(np.float32)

            test_X = rng.randn(N_te, 20, H, W).astype(np.float32)
            test_obs = rng.exponential(10.0, size=(N_te, H, W)).astype(np.float32)
            raw = test_obs * 0.70
            qm = test_obs * 0.85
            moe = test_obs * 0.96

            results = benchmark.run_benchmark(
                train_features=train_X,
                train_targets=train_y,
                test_features=test_X,
                test_obs=test_obs,
                raw_test=raw,
                qm_test=qm,
                moe_test_median=moe,
            )

            assert "leaderboard" in results
            board = results["leaderboard"]

            expected_models = [
                "Model_A_Raw_NWP",
                "Linear_MOS",
                "Model_B_Global_QM",
                "Random_Forest",
                "Gradient_Boosting",
                "Model_C_Soft_MoE_Ours",
            ]

            for m in expected_models:
                assert m in board
                assert "rmse" in board[m]
                assert "ets_heavy" in board[m]
                assert "heavy_rmse" in board[m]

            json_file = out_dir / "extended_baseline_results.json"
            assert json_file.exists()
            assert json_file.stat().st_size > 0
