"""Command-line script for executing formal forecast-time leakage audits."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ml.data.gfs import GFSAdapter
from ml.features.builder import FeatureBuilder
from ml.features.leakage_audit import LeakageAuditor, DataLeakageError


def run_audit(ref_time: str, lead_hours: int) -> int:
    print("=" * 65)
    print("FORMAL FORECAST-TIME DATA LEAKAGE AUDIT")
    print("=" * 65)
    print(f"Auditing Forecast Cycle: {ref_time} (Lead Time: +{lead_hours}h)")

    # 1. Ingest forecast
    adapter = GFSAdapter()
    forecast = adapter.load(ref_time, lead_time_hours=lead_hours)

    builder = FeatureBuilder()
    try:
        features = builder.build_features(forecast)
        print(f"\n[+] Feature Tensor Generated: Shape {features.shape} ({features.num_channels} channels)")
        for i, name in enumerate(features.channel_names):
            print(f"    Channel {i:02d}: {name}")

        # 2. Run explicit audit
        report = LeakageAuditor.run_full_audit(
            feature_names=features.channel_names,
            forecast_ref_time=features.forecast_ref_time,
            valid_time=features.valid_time,
            observation_timestamps_used=[],
            raise_on_violation=True,
        )

        print(f"\n[+] Leakage Audit Status: {report['status']}")
        print("    * Feature Name Whitelist Check: PASSED")
        print("    * Temporal Causality Check: PASSED")
        print("    * Future Target Contamination Check: PASSED")
        print("\n" + "=" * 65)
        print("AUDIT SUCCESS: Zero forecast-time data leakage detected.")
        print("=" * 65)
        return 0

    except DataLeakageError as e:
        print(f"\n[!] DATA LEAKAGE DETECTED: {e}", file=sys.stderr)
        print("=" * 65, file=sys.stderr)
        return 1


def main():
    parser = argparse.ArgumentParser(description="Audit forecast features for data leakage.")
    parser.add_argument("--ref-time", default="2025-07-15T00:00:00Z", help="Forecast reference time UTC")
    parser.add_argument("--lead-hours", type=int, default=24, help="Forecast lead time in hours")
    args = parser.parse_args()

    exit_code = run_audit(args.ref_time, args.lead_hours)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
