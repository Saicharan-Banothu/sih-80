"""Provenance tracking and verification for zero-fabrication data integrity."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
import yaml
from ml.data.base import DataReceipt


class ProvenanceTracker:
    """Audit and provenance manager ensuring complete traceability across the pipeline."""

    REQUIRED_RECEIPT_FIELDS = [
        "data_source",
        "dataset_version",
        "forecast_reference_time",
        "valid_time",
        "lead_time_hours",
        "model_version",
        "generation_timestamp",
    ]

    SYNTHETIC_WARNING = (
        "DEVELOPMENT / SYNTHETIC DATA — NOT FOR OPERATIONAL FORECASTING"
    )

    @classmethod
    def create_receipt(
        cls,
        data_source: str,
        dataset_version: str,
        forecast_reference_time: str,
        valid_time: str,
        lead_time_hours: int,
        model_version: str,
        is_synthetic: bool = False,
        provenance_note: Optional[str] = None,
    ) -> DataReceipt:
        """Create a validated DataReceipt enforcing provenance rules."""
        note = provenance_note or ("Verified operational data" if not is_synthetic else cls.SYNTHETIC_WARNING)
        receipt = DataReceipt(
            data_source=data_source,
            dataset_version=dataset_version,
            forecast_reference_time=forecast_reference_time,
            valid_time=valid_time,
            lead_time_hours=lead_time_hours,
            model_version=model_version,
            generation_timestamp=datetime.now(timezone.utc).isoformat(),
            is_synthetic=is_synthetic,
            provenance_note=note,
        )
        cls.validate_receipt(receipt)
        return receipt

    @classmethod
    def validate_receipt(cls, receipt: DataReceipt) -> bool:
        """Validate receipt completeness and non-empty metadata."""
        receipt_dict = receipt.to_dict()
        for field in cls.REQUIRED_RECEIPT_FIELDS:
            if field not in receipt_dict or receipt_dict[field] is None:
                raise ValueError(f"Provenance violation: Missing required field '{field}'")
            if isinstance(receipt_dict[field], str) and not receipt_dict[field].strip():
                raise ValueError(f"Provenance violation: Empty value for field '{field}'")

        if receipt.is_synthetic and cls.SYNTHETIC_WARNING not in receipt.provenance_note:
            receipt.provenance_note = f"{cls.SYNTHETIC_WARNING} | {receipt.provenance_note}"

        return True

    @classmethod
    def save_receipt_json(cls, receipt: DataReceipt, file_path: Path) -> None:
        """Save receipt to JSON file."""
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(receipt.to_dict(), f, indent=2)

    @classmethod
    def load_receipt_json(cls, file_path: Path) -> DataReceipt:
        """Load receipt from JSON file."""
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return DataReceipt(**data)
