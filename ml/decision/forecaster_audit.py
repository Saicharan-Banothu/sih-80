"""Human-in-the-loop forecaster review, alert override mechanism, and provenance audit log."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict, List, Optional


class ForecasterReviewManager:
    """Manages duty meteorologist overrides and maintains an immutable provenance audit log."""

    def __init__(self, audit_file_path: Optional[Path] = None):
        self.audit_path = audit_file_path or Path("artifacts/audit/forecaster_overrides.jsonl")
        self.audit_path.parent.mkdir(parents=True, exist_ok=True)
        self.in_memory_log: List[Dict[str, Any]] = []
        self._load_existing_log()

    def _load_existing_log(self) -> None:
        if self.audit_path.exists():
            with open(self.audit_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            self.in_memory_log.append(json.loads(line))
                        except Exception:
                            pass

    def apply_override(
        self,
        district_advisory: Dict[str, Any],
        forecaster_id: str,
        overridden_color: Optional[str] = None,
        scaling_multiplier: Optional[float] = None,
        justification_reason: str = "Expert synoptic inspection adjustment",
    ) -> Dict[str, Any]:
        """Apply a documented operational override to a district advisory."""
        now_iso = datetime.now(timezone.utc).isoformat()
        original_color = district_advisory["advisory"]["color_code"]
        original_q50 = district_advisory["forecast"]["mean_q50_mm"]

        # Color mapping for severity
        severity_map = {"GREEN": 1, "YELLOW": 2, "ORANGE": 3, "RED": 4}

        updated = json.loads(json.dumps(district_advisory))  # Deep copy

        if scaling_multiplier is not None and scaling_multiplier > 0:
            updated["forecast"]["mean_q50_mm"] = round(original_q50 * scaling_multiplier, 1)
            updated["forecast"]["max_q90_mm"] = round(updated["forecast"]["max_q90_mm"] * scaling_multiplier, 1)
            updated["forecast"]["peak_q99_mm"] = round(updated["forecast"]["peak_q99_mm"] * scaling_multiplier, 1)

        if overridden_color and overridden_color.upper() in severity_map:
            new_color = overridden_color.upper()
            updated["advisory"]["color_code"] = new_color
            updated["advisory"]["severity"] = severity_map[new_color]
            updated["advisory"]["action_text"] = f"[OVERRIDDEN by {forecaster_id}] Alert modified to {new_color}."

        audit_entry = {
            "timestamp": now_iso,
            "forecaster_id": forecaster_id,
            "district_id": district_advisory["district_id"],
            "district_name": district_advisory["name"],
            "original_color": original_color,
            "overridden_color": updated["advisory"]["color_code"],
            "original_mean_q50": original_q50,
            "updated_mean_q50": updated["forecast"]["mean_q50_mm"],
            "scaling_multiplier": scaling_multiplier,
            "justification": justification_reason,
        }

        self.in_memory_log.append(audit_entry)

        # Append to audit file
        with open(self.audit_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(audit_entry) + "\n")

        updated["forecaster_override"] = audit_entry
        return updated

    def get_audit_history(self) -> List[Dict[str, Any]]:
        """Return complete list of all forecaster overrides."""
        return list(self.in_memory_log)
