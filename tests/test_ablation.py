"""Test suite for Phase 10 Architectural Ablation Study."""

import tempfile
from pathlib import Path
import numpy as np
import pytest

from ml.experiments.ablation import AblationStudyRunner


class TestAblationStudy:
    """Test suite for AblationStudyRunner."""

    def test_run_ablation_all_variants_present(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            out_dir = Path(tmp_dir)
            runner = AblationStudyRunner(output_dir=out_dir)

            N, H, W = 10, 12, 12
            obs = np.random.exponential(15.0, size=(N, H, W)).astype(np.float32)
            raw = obs * 0.70
            moe_q = np.zeros((N, 7, H, W), dtype=np.float32)
            for i in range(7):
                moe_q[:, i] = obs * (0.85 + 0.04 * i)
            regime_p = np.full((N, 6), 1.0 / 6.0)

            results = runner.run_ablation(
                obs_series=obs,
                raw_nwp_series=raw,
                full_moe_quantiles=moe_q,
                regime_probs=regime_p,
            )

            assert "variants" in results
            variants = results["variants"]

            expected_variants = [
                "V1_Full_Proposed_System",
                "V2_No_Regimes_Single_Expert",
                "V3_Hard_Argmax_Gating",
                "V4_No_Tail_Loss_Weighting",
                "V5_Reduced_Features_No_Dynamics",
            ]

            for v in expected_variants:
                assert v in variants
                m = variants[v]
                assert "rmse" in m
                assert "ets_heavy" in m
                assert "crps" in m
                assert "delta_rmse_pct" in m
                assert "delta_ets_pct" in m

            # V1 (full proposed) should be the base with delta_rmse_pct == 0.0
            assert variants["V1_Full_Proposed_System"]["delta_rmse_pct"] == 0.0

            # V2 (no regimes) should show higher RMSE than V1
            assert variants["V2_No_Regimes_Single_Expert"]["rmse"] >= variants["V1_Full_Proposed_System"]["rmse"]

            # Output JSON file must exist
            json_file = out_dir / "ablation_study_results.json"
            assert json_file.exists()
            assert json_file.stat().st_size > 0
