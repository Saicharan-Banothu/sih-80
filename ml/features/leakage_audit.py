"""Formal leakage audit engine to detect and prohibit future-data contamination."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger("regimerain.features.leakage")


class DataLeakageError(Exception):
    """Raised when an operational inference feature violates forecast-time temporal causality."""
    pass


class LeakageAuditor:
    """Formal audit engine verifying that forecast-time inputs are free from future observation leakage."""

    PROHIBITED_FUTURE_TOKENS = [
        "rainfall_obs",
        "observed_rainfall",
        "imd_valid",
        "ground_truth_target",
        "future_rain",
        "future_obs",
        "truth_valid",
    ]

    @classmethod
    def audit_feature_names(cls, feature_names: List[str]) -> List[str]:
        """Check feature channel names against prohibited target token blacklists."""
        violations = []
        for name in feature_names:
            name_lower = name.lower()
            for token in cls.PROHIBITED_FUTURE_TOKENS:
                if token in name_lower and "past" not in name_lower and "hist" not in name_lower:
                    violations.append(
                        f"Prohibited future-target token '{token}' detected in feature channel '{name}'"
                    )
        return violations

    @classmethod
    def audit_timestamps(
        cls,
        forecast_ref_time: str | pd.Timestamp,
        feature_time_stamps: List[str | pd.Timestamp],
        valid_time: str | pd.Timestamp,
    ) -> List[str]:
        """Verify that any observational feature strictly precedes or equals the forecast issue time."""
        violations = []
        ref_dt = pd.to_datetime(forecast_ref_time)
        valid_dt = pd.to_datetime(valid_time)

        for ts in feature_time_stamps:
            f_dt = pd.to_datetime(ts)
            # If an observation is timestamped after the forecast issue time, it constitutes leakage!
            if f_dt > ref_dt:
                violations.append(
                    f"Temporal leakage violation: Feature timestamp {f_dt} is in the future relative to issue time {ref_dt}"
                )
            if f_dt == valid_dt and f_dt > ref_dt:
                violations.append(
                    f"Direct target contamination: Feature timestamp {f_dt} matches forecast valid time {valid_dt}"
                )
        return violations

    @classmethod
    def audit_normalizer(cls, normalizer_metadata: Dict[str, Any]) -> List[str]:
        """Verify that feature normalization parameters were fitted strictly on training data."""
        violations = []
        if not normalizer_metadata.get("fitted_on_training_only", False):
            violations.append(
                "Normalization leakage violation: Feature normalizer was not fitted exclusively on training data"
            )
        return violations

    @classmethod
    def run_full_audit(
        cls,
        feature_names: List[str],
        forecast_ref_time: str,
        valid_time: str,
        observation_timestamps_used: List[str],
        normalizer_metadata: Optional[Dict[str, Any]] = None,
        raise_on_violation: bool = True,
    ) -> Dict[str, Any]:
        """Execute complete leakage audit across channel names, timestamps, and normalization."""
        all_violations: List[str] = []

        # 1. Feature Name Check
        name_violations = cls.audit_feature_names(feature_names)
        all_violations.extend(name_violations)

        # 2. Timestamp Causality Check
        time_violations = cls.audit_timestamps(
            forecast_ref_time=forecast_ref_time,
            feature_time_stamps=observation_timestamps_used,
            valid_time=valid_time,
        )
        all_violations.extend(time_violations)

        # 3. Normalizer Fit Check
        if normalizer_metadata is not None:
            norm_violations = cls.audit_normalizer(normalizer_metadata)
            all_violations.extend(norm_violations)

        status = "FAIL" if all_violations else "PASS"
        report = {
            "status": status,
            "violations_count": len(all_violations),
            "violations": all_violations,
            "forecast_ref_time": str(forecast_ref_time),
            "valid_time": str(valid_time),
            "timestamp_audit": "PASSED" if not time_violations else "FAILED",
            "feature_name_audit": "PASSED" if not name_violations else "FAILED",
        }

        if raise_on_violation and status == "FAIL":
            err_msg = "; ".join(all_violations)
            logger.error(f"DATA LEAKAGE DETECTED: {err_msg}")
            raise DataLeakageError(f"Forecast-Time Data Leakage Audit Failed: {err_msg}")

        return report
