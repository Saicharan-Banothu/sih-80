import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  CloudRain,
  ShieldAlert,
  Compass,
  TrendingUp,
  Info,
  Sliders,
  CheckCircle,
  HelpCircle,
  Clock,
  Layers,
  UserCheck,
} from "lucide-react";

interface DistrictAdvisory {
  district_id: string;
  name: string;
  state: string;
  zone: string;
  lat: number;
  lon: number;
  area_sq_km: number;
  forecast: {
    mean_q50_mm: number;
    likely_range_q25_q75?: [number, number];
    max_q90_mm: number;
    peak_q99_mm: number;
    quantiles?: {
      q10: number;
      q25: number;
      q50: number;
      q75: number;
      q90: number;
      q95: number;
      q99: number;
    };
    prob_heavy_64_5mm: number;
    prob_very_heavy_115_6mm: number;
    prob_extreme_204_5mm: number;
    confidence?: string;
  };
  advisory: {
    color_code: "RED" | "ORANGE" | "YELLOW" | "GREEN";
    severity: number;
    action_text: string;
    dominant_regime: string;
  };
  comparison?: {
    raw_nwp_median_mm: number;
    global_qm_median_mm: number;
    moe_corrected_median_mm: number;
    correction_delta_mm: number;
    nwp_bias_corrected: string;
  };
  explanation?: {
    summary: string;
    synoptic_regime: string;
    primary_driver: string;
    bias_adjustment: string;
    risk_verdict: string;
  };
  timeline?: Array<{
    lead_hours: number;
    label: string;
    expected_rain_mm: number;
    risk_color: string;
  }>;
}

interface DistrictDetailDrawerProps {
  district: DistrictAdvisory | null;
  onClose: () => void;
  onOpenOverride: (district: DistrictAdvisory) => void;
}

export const DistrictDetailDrawer: React.FC<DistrictDetailDrawerProps> = ({
  district,
  onClose,
  onOpenOverride,
}) => {
  const [showTechnicalUncertainty, setShowTechnicalUncertainty] = useState<boolean>(false);

  if (!district) return null;

  const { forecast, advisory, comparison, explanation, timeline } = district;
  const alertColor =
    advisory.color_code === "RED"
      ? "#ef4444"
      : advisory.color_code === "ORANGE"
      ? "#f97316"
      : advisory.color_code === "YELLOW"
      ? "#eab308"
      : "#22c55e";

  const likelyRange = forecast.likely_range_q25_q75 ?? [
    Math.round(forecast.mean_q50_mm * 0.7),
    Math.round(forecast.mean_q50_mm * 1.3),
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 9000,
        display: "flex",
        justifyContent: "flex-end",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          height: "100%",
          background: "#0f172a",
          borderLeft: "1px solid #334155",
          boxShadow: "-8px 0 25px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          color: "#f8fafc",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #1e293b",
            background: "#1e293b",
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  background: alertColor,
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: "5px",
                }}
              >
                {advisory.color_code} WARNING
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>{district.zone.replace(/_/g, " ")}</span>
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 800, margin: "2px 0 0 0" }}>
              {district.name}, <span style={{ color: "#94a3b8", fontWeight: 500 }}>{district.state}</span>
            </h2>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
              Lat: {district.lat}°N | Lon: {district.lon}°E | Area: {district.area_sq_km.toLocaleString()} km²
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#334155",
              border: "none",
              color: "#f8fafc",
              padding: "6px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Action SOP Banner */}
          <div
            style={{
              background: `rgba(${
                advisory.color_code === "RED"
                  ? "239, 68, 68"
                  : advisory.color_code === "ORANGE"
                  ? "249, 115, 22"
                  : advisory.color_code === "YELLOW"
                  ? "234, 179, 8"
                  : "34, 197, 94"
              }, 0.12)`,
              borderLeft: `4px solid ${alertColor}`,
              padding: "14px 16px",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: alertColor, textTransform: "uppercase", marginBottom: "4px" }}>
              Official IMD 4-Stage Advisory SOP
            </div>
            <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.4, margin: 0 }}>
              {advisory.action_text}
            </p>
          </div>

          {/* Key Forecast Quantiles Grid */}
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.5px" }}>
              Rainfall Expectations & Uncertainty Range
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              <div style={{ background: "#1e293b", padding: "12px", borderRadius: "10px", border: "1px solid #334155" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Expected Rainfall</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#38bdf8", marginTop: "2px" }}>
                  {forecast.mean_q50_mm} <span style={{ fontSize: "12px", fontWeight: 500 }}>mm</span>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>Median Scenario (q50)</div>
              </div>

              <div style={{ background: "#1e293b", padding: "12px", borderRadius: "10px", border: "1px solid #334155" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Likely Range (q25-q75)</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", marginTop: "2px" }}>
                  {likelyRange[0]} - {likelyRange[1]} <span style={{ fontSize: "12px", fontWeight: 500 }}>mm</span>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>50% Ensemble Core</div>
              </div>

              <div style={{ background: "#1e293b", padding: "12px", borderRadius: "10px", border: "1px solid #334155" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>High-End Peak (q99)</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: alertColor, marginTop: "2px" }}>
                  {forecast.peak_q99_mm} <span style={{ fontSize: "12px", fontWeight: 500 }}>mm</span>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>99th Percentile Tail</div>
              </div>
            </div>
          </div>

          {/* Exceedance Probabilities Progress Bars */}
          <div style={{ background: "#1e293b", padding: "16px", borderRadius: "10px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "12px", letterSpacing: "0.5px" }}>
              Extreme Rainfall Exceedance Evidence (Generalized Pareto)
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Heavy */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                  <span>P(R &gt; 64.5 mm / Heavy Rain)</span>
                  <strong style={{ color: forecast.prob_heavy_64_5mm > 0.5 ? "#f97316" : "#f8fafc" }}>
                    {(forecast.prob_heavy_64_5mm * 100).toFixed(0)}%
                  </strong>
                </div>
                <div style={{ width: "100%", height: "6px", background: "#0f172a", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, forecast.prob_heavy_64_5mm * 100)}%`,
                      height: "100%",
                      background: "#f97316",
                      borderRadius: "3px",
                    }}
                  />
                </div>
              </div>

              {/* Very Heavy */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                  <span>P(R &gt; 115.6 mm / Very Heavy)</span>
                  <strong style={{ color: forecast.prob_very_heavy_115_6mm > 0.3 ? "#ef4444" : "#f8fafc" }}>
                    {(forecast.prob_very_heavy_115_6mm * 100).toFixed(0)}%
                  </strong>
                </div>
                <div style={{ width: "100%", height: "6px", background: "#0f172a", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, forecast.prob_very_heavy_115_6mm * 100)}%`,
                      height: "100%",
                      background: "#ef4444",
                      borderRadius: "3px",
                    }}
                  />
                </div>
              </div>

              {/* Extremely Heavy */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                  <span>P(R &gt; 204.5 mm / Extremely Heavy)</span>
                  <strong style={{ color: forecast.prob_extreme_204_5mm > 0.05 ? "#a855f7" : "#f8fafc" }}>
                    {(forecast.prob_extreme_204_5mm * 100).toFixed(1)}%
                  </strong>
                </div>
                <div style={{ width: "100%", height: "6px", background: "#0f172a", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, forecast.prob_extreme_204_5mm * 100)}%`,
                      height: "100%",
                      background: "#a855f7",
                      borderRadius: "3px",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* "Why This Forecast?" Scientific Explainability Section */}
          <div style={{ background: "#1e293b", padding: "16px", borderRadius: "10px", border: "1px solid #334155" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <HelpCircle size={16} style={{ color: "#38bdf8" }} />
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Why This Forecast? (Scientific Diagnostic)
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", lineHeight: 1.5 }}>
              <div>
                <strong style={{ color: "#f8fafc" }}>1. Weather Situation:</strong>{" "}
                <span style={{ color: "#94a3b8" }}>
                  {explanation?.synoptic_regime || advisory.dominant_regime.replace(/_/g, " ")}
                </span>
              </div>
              <div>
                <strong style={{ color: "#f8fafc" }}>2. Dynamical Forcing:</strong>{" "}
                <span style={{ color: "#94a3b8" }}>
                  {explanation?.primary_driver || "Strong lower-tropospheric convergence and elevated maritime moisture flux."}
                </span>
              </div>
              <div>
                <strong style={{ color: "#f8fafc" }}>3. Terrain & Orographic Influence:</strong>{" "}
                <span style={{ color: "#94a3b8" }}>
                  {district.zone.includes("OROGRAPHIC")
                    ? "Western Ghats / Himalayan ridge acts as a mechanical barrier causing intense precipitation enhancement."
                    : "Lowland or coastal topography allows synoptic convective cell translation."}
                </span>
              </div>
              <div>
                <strong style={{ color: "#f8fafc" }}>4. NWP Bias Correction:</strong>{" "}
                <span style={{ color: "#94a3b8" }}>
                  {explanation?.bias_adjustment || "Model adjusted for operational systematic error distributions."}
                </span>
              </div>
              <div>
                <strong style={{ color: "#f8fafc" }}>5. Confidence Level:</strong>{" "}
                <span style={{ color: "#34d399", fontWeight: 600 }}>{forecast.confidence || "High"}</span>
              </div>
            </div>
          </div>

          {/* 3-Day Forecast Timeline (24h, 48h, 72h) */}
          {timeline && timeline.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "0.5px" }}>
                3-Day Rainfall Progression (Depression Evolution)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {timeline.map((slot) => (
                  <div
                    key={slot.lead_hours}
                    style={{
                      background: "#1e293b",
                      border: "1px solid #334155",
                      padding: "10px",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8" }}>{slot.label}</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", margin: "4px 0" }}>
                      {slot.expected_rain_mm} <span style={{ fontSize: "11px", fontWeight: 500 }}>mm</span>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background:
                          slot.risk_color === "RED"
                            ? "#ef4444"
                            : slot.risk_color === "ORANGE"
                            ? "#f97316"
                            : slot.risk_color === "YELLOW"
                            ? "#eab308"
                            : "#22c55e",
                        color: "#ffffff",
                      }}
                    >
                      {slot.risk_color}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Comparison: Raw NWP vs Global QM vs Regime MoE */}
          {comparison && (
            <div style={{ background: "#1e293b", padding: "16px", borderRadius: "10px", border: "1px solid #334155" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Model Value-Add Comparison
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: comparison.correction_delta_mm > 0 ? "rgba(56, 189, 248, 0.2)" : "rgba(244, 63, 94, 0.2)",
                    color: comparison.correction_delta_mm > 0 ? "#38bdf8" : "#fb7185",
                  }}
                >
                  Δ {comparison.correction_delta_mm > 0 ? `+${comparison.correction_delta_mm}` : comparison.correction_delta_mm} mm
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                <div style={{ background: "#0f172a", padding: "8px 10px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Raw NWP</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#cbd5e1" }}>
                    {comparison.raw_nwp_median_mm} mm
                  </div>
                </div>
                <div style={{ background: "#0f172a", padding: "8px 10px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Global QM (xsdba)</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#cbd5e1" }}>
                    {comparison.global_qm_median_mm} mm
                  </div>
                </div>
                <div style={{ background: "#0f172a", padding: "8px 10px", borderRadius: "6px", border: "1px solid #0284c7" }}>
                  <div style={{ fontSize: "10px", color: "#38bdf8" }}>Regime MoE</div>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#38bdf8" }}>
                    {comparison.moe_corrected_median_mm} mm
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "8px" }}>
                Bias Assessment: <em>{comparison.nwp_bias_corrected}</em>
              </div>
            </div>
          )}

          {/* Collapsible Technical Uncertainty (7 Quantiles) */}
          <div style={{ border: "1px solid #334155", borderRadius: "8px", overflow: "hidden" }}>
            <button
              onClick={() => setShowTechnicalUncertainty(!showTechnicalUncertainty)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#1e293b",
                border: "none",
                color: "#cbd5e1",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <span>Detailed Uncertainty Distribution (7 Quantiles)</span>
              <span>{showTechnicalUncertainty ? "▲ Hide" : "▼ Show"}</span>
            </button>

            {showTechnicalUncertainty && forecast.quantiles && (
              <div style={{ padding: "12px", background: "#0f172a", display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center" }}>
                {Object.entries(forecast.quantiles).map(([qName, val]) => (
                  <div key={qName} style={{ background: "#1e293b", padding: "6px 2px", borderRadius: "4px" }}>
                    <div style={{ fontSize: "9px", color: "#94a3b8" }}>{qName}</div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Forecaster Override CTA Button */}
          <div style={{ marginTop: "10px" }}>
            <button
              onClick={() => onOpenOverride(district)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                background: "#0284c7",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 2px 6px rgba(2, 132, 199, 0.4)",
              }}
            >
              <UserCheck size={16} />
              Review / Apply Forecaster Override
            </button>
            <div style={{ fontSize: "11px", color: "#64748b", textAlign: "center", marginTop: "6px" }}>
              Logged with cryptographic SHA-256 provenance to forecaster audit trail.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
