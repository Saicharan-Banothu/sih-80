import React, { useState } from "react";
import { ShieldCheck, X, AlertTriangle, UserCheck } from "lucide-react";

interface DistrictAdvisory {
  district_id: string;
  name: string;
  state: string;
  zone: string;
  forecast: {
    mean_q50_mm: number;
    max_q90_mm: number;
    peak_q99_mm: number;
  };
  advisory: {
    color_code: "RED" | "ORANGE" | "YELLOW" | "GREEN";
    severity: number;
    action_text: string;
    dominant_regime: string;
  };
}

interface ForecasterOverrideModalProps {
  isOpen: boolean;
  district: DistrictAdvisory | null;
  onClose: () => void;
  onSubmit: (districtId: string, color: string, scale: number, reason: string) => Promise<void>;
}

export const ForecasterOverrideModal: React.FC<ForecasterOverrideModalProps> = ({
  isOpen,
  district,
  onClose,
  onSubmit,
}) => {
  const [overrideColor, setOverrideColor] = useState<string>("ORANGE");
  const [overrideScale, setOverrideScale] = useState<number>(1.15);
  const [overrideReason, setOverrideReason] = useState<string>(
    "Doppler radar indicates mesoscale convective cell intensification in ghat section."
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen || !district) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(district.district_id, overrideColor, overrideScale, overrideReason);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "520px",
          padding: "24px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
          color: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Forecaster Decision Override</h3>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                Human-in-the-Loop Duty Meteorologist Review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ background: "#0f172a", padding: "12px 16px", borderRadius: "8px", marginBottom: "18px", border: "1px solid #334155" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>{district.name} ({district.state})</span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "4px",
                background:
                  district.advisory.color_code === "RED"
                    ? "#ef4444"
                    : district.advisory.color_code === "ORANGE"
                    ? "#f97316"
                    : district.advisory.color_code === "YELLOW"
                    ? "#eab308"
                    : "#22c55e",
                color: "#ffffff",
              }}
            >
              Current: {district.advisory.color_code}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            Model Q50: <strong style={{ color: "#f8fafc" }}>{district.forecast.mean_q50_mm} mm</strong> | Peak Q99: <strong style={{ color: "#f8fafc" }}>{district.forecast.peak_q99_mm} mm</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
              Target IMD Color Advisory
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {[
                { code: "RED", bg: "#ef4444" },
                { code: "ORANGE", bg: "#f97316" },
                { code: "YELLOW", bg: "#eab308" },
                { code: "GREEN", bg: "#22c55e" },
              ].map((c) => (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => setOverrideColor(c.code)}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    border: overrideColor === c.code ? `2px solid #ffffff` : "1px solid #475569",
                    background: overrideColor === c.code ? c.bg : "#1e293b",
                    color: overrideColor === c.code ? "#ffffff" : "#94a3b8",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
              Rainfall Amplitude Multiplier: <span style={{ color: "#38bdf8" }}>{overrideScale.toFixed(2)}x</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={overrideScale}
              onChange={(e) => setOverrideScale(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#0284c7" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748b" }}>
              <span>0.5x (Dampen)</span>
              <span>1.0x (No change)</span>
              <span>2.0x (Intensify)</span>
            </div>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
              Mandatory Scientific Justification (Recorded to SHA-256 Audit Log)
            </label>
            <textarea
              required
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="State observational evidence (e.g. Doppler radar velocity, river gauge, sounding CAPE)..."
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                background: "#0f172a",
                border: "1px solid #334155",
                color: "#f8fafc",
                fontSize: "12px",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #475569",
                background: "transparent",
                color: "#cbd5e1",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                border: "none",
                background: "#0284c7",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {submitting ? "Signing Audit..." : "Commit Override"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
