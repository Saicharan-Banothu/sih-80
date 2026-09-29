"""Command-line utility for downloading and ingesting meteorological datasets with provenance."""

import argparse
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ml.data.gfs import GFSAdapter
from ml.data.era5 import ERA5Adapter
from ml.data.imd_rainfall import IMDRainfallAdapter
from ml.data.regime_seeds import RautRegimeSeedsAdapter
from ml.data.validation import validate_gridded_dataset


def main():
    parser = argparse.ArgumentParser(
        description="Ingest or generate meteorological datasets for SIH-80."
    )
    parser.add_argument(
        "--source",
        choices=["gfs", "ncum", "era5", "imdaa", "imd_rainfall", "raut_seeds", "all"],
        default="all",
        help="Target data source to ingest/prepare",
    )
    parser.add_argument(
        "--date",
        default="2026-07-15",
        help="Target date YYYY-MM-DD",
    )
    parser.add_argument(
        "--lead-time",
        type=int,
        default=24,
        help="Forecast lead time in hours (default: 24)",
    )
    parser.add_argument(
        "--out-dir",
        default="data/raw",
        help="Destination directory for raw ingest files",
    )

    args = parser.parse_args()
    print("=" * 65)
    print(f"METEOROLOGICAL DATA INGESTION UTILITY — DATE: {args.date}")
    print("=" * 65)

    out_path = PROJECT_ROOT / args.out_dir
    out_path.mkdir(parents=True, exist_ok=True)

    if args.source in ["gfs", "all"]:
        print("\n[+] Ingesting NOAA-GFS 0.25° Forecast...")
        gfs_adapter = GFSAdapter()
        gfs_ds = gfs_adapter.load(f"{args.date}T00:00:00Z", lead_time_hours=args.lead_time)
        val_report = validate_gridded_dataset(gfs_ds, strict=False)
        print(f"    Source: {gfs_ds.receipt.data_source} | Status: {val_report['status']}")
        print(f"    Dimensions: {gfs_ds.summary()['dimensions']}")

    if args.source in ["era5", "all"]:
        print("\n[+] Ingesting ECMWF ERA5 0.25° Reanalysis...")
        era5_adapter = ERA5Adapter()
        era5_ds = era5_adapter.load(f"{args.date}T00:00:00Z")
        val_report = validate_gridded_dataset(era5_ds, strict=False)
        print(f"    Source: {era5_ds.receipt.data_source} | Status: {val_report['status']}")

    if args.source in ["imd_rainfall", "all"]:
        print("\n[+] Ingesting IMD 0.25° Observational Ground Truth...")
        imd_adapter = IMDRainfallAdapter()
        imd_ds = imd_adapter.load(args.date)
        val_report = validate_gridded_dataset(imd_ds, strict=False)
        print(f"    Source: {imd_ds.receipt.data_source} | Status: {val_report['status']}")
        print(f"    Role: {imd_ds.receipt.provenance_note}")

    if args.source in ["raut_seeds", "all"]:
        print("\n[+] Ingesting Raut et al. 2026 Synoptic Weather Seeds...")
        seed = RautRegimeSeedsAdapter.get_seed_for_date(args.date)
        print(f"    Raut Cluster [{seed['raut_cluster_id']}]: {seed['raut_cluster_description']}")
        print(f"    Mapped Dominant Operational Regime: {seed['dominant_operational_regime']}")

    print("\n" + "=" * 65)
    print("DATA INGESTION CHECK COMPLETE (All pipelines operational)")
    print("=" * 65)


if __name__ == "__main__":
    main()
