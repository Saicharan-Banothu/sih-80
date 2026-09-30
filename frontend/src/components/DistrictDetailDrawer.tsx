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
  Star,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { DistrictAdvisory } from "./IndiaMap";

interface DistrictDetailDrawerProps {
  district: DistrictAdvisory | null;
  onClose: () => void;
  onOpenOverride?: (district: DistrictAdvisory) => void;
  isWatchlisted?: boolean;
  onToggleWatchlist?: (districtId: string) => void;
}

export const DistrictDetailDrawer: React.FC<DistrictDetailDrawerProps> = ({
  district,
  onClose,
  onOpenOverride,
  isWatchlisted = false,
  onToggleWatchlist,
}) => {
  const [showComparison, setShowComparison] = useState<boolean>(false);

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
    Math.round(forecast.mean_q50_mm * 0.75),
    Math.round(forecast.mean_q50_mm * 1.25),
  ];

  // Map regime codes to clean human descriptions
  const humanRegimeNames: Record<string, string> = {
    MONSOON_DEPRESSION_LOW: "Monsoon Depression / Low Pressure System",
    OROGRAPHIC_WESTERN_GHATS: "Western Ghats Topographic Uplift",
    ACTIVE_MONSOON: "Active Monsoon Surge (Trough Axis Active)",
    BREAK_MONSOON: "Break Monsoon (Foothills Convection)",
    COASTAL_CONVECTIVE: "Coastal Convective Convergence",
    WESTERN_DISTURBANCE: "Western Disturbance Trough",
  };

  const weatherSituation =
    humanRegimeNames[advisory.dominant_regime] ||
    advisory.dominant_regime.replace(/_/g, " ");

  const confidenceText = forecast.confidence || "HIGH";
  const confidenceColor =
    confidenceText === "HIGH"
      ? "#38bdf8"
      : confidenceText === "MODERATE"
      ? "#facc15"
      : "#94a3b8";

  const confidenceExplanation =
    confidenceText === "HIGH"
      ? "Consistent alignment across synoptic satellite flow and atmospheric moisture soundings."
      : confidenceText === "MODERATE"
      ? "Localized convective variability; track and intensity remain within expected margins."
      : "Moderate uncertainty due to mesoscale moisture fluctuation.";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(5px)",
        zIndex: 9000,
        display: "flex",
        justifyContent: "flex-end",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        className="drawer-panel"
        style={{
          width: "100%",
          maxWidth: "580px",
          height: "100%",
          background: "#0f172a",
          borderLeft: "1px solid #334155",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.6)",
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
                  letterSpacing: "0.5px",
                }}
              >
                {advisory.color_code} WARNING
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                {district.zone.replace(/_/g, " ")}
              </span>
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "2px 0 0 0" }}>
              {district.name},{" "}
              <span style={{ color: "#94a3b8", fontWeight: 500 }}>{district.state}</span>
            </h2>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
              Coordinates: {district.lat}°N, {district.lon}°E &bull; Area:{" "}
              {district.area_sq_km.toLocaleString()} km²
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {onToggleWatchlist && (
              <button
                onClick={() => onToggleWatchlist(district.district_id)}
                title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
                style={{
                  background: isWatchlisted ? "rgba(234, 179, 8, 0.2)" : "#334155",
                  border: isWatchlisted ? "1px solid #eab308" : "1px solid transparent",
                  color: isWatchlisted ? "#eab308" : "#94a3b8",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "12px",
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                }}
              >
                <Star size={16} fill={isWatchlisted ? "#eab308" : "none"} />
                {isWatchlisted ? "Watching" : "Watch"}
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: "#334155",
                border: "none",
                color: "#f8fafc",
                padding: "8px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>
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
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: alertColor,
                textTransform: "uppercase",
                marginBottom: "4px",
                letterSpacing: "0.5px",
              }}
            >
              Official Preparedness & Action Guidance
            </div>
            <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.45, margin: 0, fontWeight: 500 }}>
              {advisory.action_text}
            </p>
          </div>

          {/* Key Rainfall Numbers */}
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                marginBottom: "10px",
                letterSpacing: "0.5px",
              }}
            >
              Expected Rainfall & Likely Range (24h)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              <div
                style={{
                  background: "#1e293b",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "1px solid #334155",
                }}
              >
                <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>Expected Rain</div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#38bdf8", marginTop: "2px" }}>
                  {forecast.mean_q50_mm}{" "}
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#94a3b8" }}>mm</span>
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Most likely accumulation</div>
              </div>

              <div
                style={{
                  background: "#1e293b",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "1px solid #334155",
                }}
              >
                <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>Likely Range</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#f8fafc", marginTop: "4px" }}>
                  {likelyRange[0]}–{likelyRange[1]}{" "}
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#94a3b8" }}>mm</span>
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Primary spread</div>
              </div>

              <div
                style={{
                  background: "#1e293b",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "1px solid #334155",
                }}
              >
                <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>Peak Potential</div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: alertColor, marginTop: "2px" }}>
                  {forecast.peak_q99_mm}{" "}
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#94a3b8" }}>mm</span>
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Severe localized surge</div>
              </div>
            </div>
          </div>

          {/* Risk Probabilities */}
          <div
            style={{
              background: "#1e293b",
              padding: "16px",
              borderRadius: "10px",
              border: "1px solid #334155",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                marginBottom: "14px",
                letterSpacing: "0.5px",
              }}
            >
              Threshold Exceedance Probabilities
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Heavy */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ color: "#e2e8f0" }}>Heavy Rainfall (&gt;64.5 mm)</span>
                  <span style={{ fontWeight: 700, color: "#facc15" }}>
                    {Math.round(forecast.prob_heavy_64_5mm * 100)}%
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "#334155",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.round(forecast.prob_heavy_64_5mm * 100))}%`,
                      height: "100%",
                      background: "#facc15",
                      borderRadius: "4px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>

              {/* Very Heavy */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ color: "#e2e8f0" }}>Very Heavy Rainfall (&gt;115.6 mm)</span>
                  <span style={{ fontWeight: 700, color: "#f97316" }}>
                    {Math.round(forecast.prob_very_heavy_115_6mm * 100)}%
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "#334155",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.round(forecast.prob_very_heavy_115_6mm * 100))}%`,
                      height: "100%",
                      background: "#f97316",
                      borderRadius: "4px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>

              {/* Extremely Heavy */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ color: "#e2e8f0" }}>Extremely Heavy Rainfall (&gt;204.5 mm)</span>
                  <span style={{ fontWeight: 700, color: "#ef4444" }}>
                    {Math.round(forecast.prob_extreme_204_5mm * 100)}%
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    background: "#334155",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.round(forecast.prob_extreme_204_5mm * 100))}%`,
                      height: "100%",
                      background: "#ef4444",
                      borderRadius: "4px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Weather Situation & Why Highlighted */}
          <div
            style={{
              background: "#1e293b",
              padding: "16px",
              borderRadius: "10px",
              border: "1px solid #334155",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                Weather Situation
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#38bdf8" }}>
                {weatherSituation}
              </div>
              <div style={{ fontSize: "13px", color: "#cbd5e1", marginTop: "4px", lineHeight: 1.4 }}>
                {explanation?.summary ||
                  "Active atmospheric flow triggering concentrated moisture convergence over the district."}
              </div>
            </div>

            <div style={{ borderTop: "1px solid #334155", paddingTop: "12px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                Why this district requires attention
              </div>
              <div style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.45 }}>
                {explanation?.risk_verdict ||
                  explanation?.primary_driver ||
                  "The district is situated in the high-impact sector of the current weather system, presenting substantial risk of intense precipitation and localized waterlogging."}
              </div>
            </div>

            {/* Forecast Confidence */}
            <div
              style={{
                borderTop: "1px solid #334155",
                paddingTop: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                  Forecast Confidence
                </div>
                <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "2px" }}>
                  {confidenceExplanation}
                </div>
              </div>
              <span
                style={{
                  background: `${confidenceColor}20`,
                  color: confidenceColor,
                  border: `1px solid ${confidenceColor}50`,
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontWeight: 800,
                  fontSize: "12px",
                  letterSpacing: "0.5px",
                }}
              >
                {confidenceText}
              </span>
            </div>
          </div>

          {/* 3-Day Evolution Timeline */}
          {timeline && timeline.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                  letterSpacing: "0.5px",
                }}
              >
                3-Day Horizon Progression
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {timeline.map((step) => (
                  <div
                    key={step.lead_hours}
                    style={{
                      background: "#1e293b",
                      border: "1px solid #334155",
                      borderTop: `3px solid ${step.risk_color}`,
                      borderRadius: "8px",
                      padding: "12px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>
                      {step.label}
                    </div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        color: step.risk_color,
                        marginTop: "4px",
                      }}
                    >
                      {step.expected_rain_mm}
                      <span style={{ fontSize: "11px", fontWeight: 500, color: "#94a3b8", marginLeft: "2px" }}>
                        mm
                      </span>
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                      Expected 24h sum
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Collapsible: Forecast Comparison vs Standard Models */}
          {comparison && (
            <div
              style={{
                border: "1px solid #334155",
                borderRadius: "8px",
                background: "#1e293b",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setShowComparison(!showComparison)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "#94a3b8",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>Comparison with standard baseline forecast</span>
                {showComparison ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showComparison && (
                <div
                  style={{
                    padding: "14px 16px",
                    borderTop: "1px solid #334155",
                    background: "#0f172a",
                    fontSize: "12px",
                    color: "#cbd5e1",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "6px" }}>
                      <div style={{ color: "#94a3b8", fontSize: "11px" }}>Standard Numerical Model</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#cbd5e1", marginTop: "2px" }}>
                        {comparison.raw_nwp_median_mm} mm
                      </div>
                    </div>
                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "6px" }}>
                      <div style={{ color: "#38bdf8", fontSize: "11px" }}>Regime-Aware Corrected</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#38bdf8", marginTop: "2px" }}>
                        {comparison.moe_corrected_median_mm} mm
                        <span style={{ fontSize: "11px", color: comparison.correction_delta_mm >= 0 ? "#4ade80" : "#f87171", marginLeft: "4px" }}>
                          ({comparison.correction_delta_mm >= 0 ? "+" : ""}{comparison.correction_delta_mm} mm)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "11px", lineHeight: 1.4 }}>
                    Standard weather models often underestimate heavy convective precipitation during extreme atmospheric regimes. The regime-aware adjustment resolves localized terrain and convergence effects.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Forecaster Note / Adjustment trigger (optional, clean) */}
          {onOpenOverride && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
              <button
                onClick={() => onOpenOverride(district)}
                style={{
                  background: "transparent",
                  border: "1px solid #334155",
                  color: "#94a3b8",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sliders size={14} /> Forecaster Operational Note / Override
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
