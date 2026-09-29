import React from "react";
import {
  CloudRain,
  AlertTriangle,
  ShieldAlert,
  Compass,
  Clock,
  ArrowRight,
  UserCheck,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { IndiaMap, MapLayerType } from "./IndiaMap";

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

interface ForecastPrediction {
  dominant_regime: string;
  regime_probabilities: Record<string, number>;
  domain_stats: {
    mean_q50_mm: number;
    peak_q50_mm: number;
    peak_q90_mm: number;
    peak_q99_mm: number;
    max_p_heavy?: number;
    max_p_very_heavy?: number;
    max_p_extreme?: number;
  };
  district_alert_counts: Record<string, number>;
  total_districts: number;
  model_metadata?: any;
}

interface ForecastViewProps {
  districts: DistrictAdvisory[];
  prediction: ForecastPrediction | null;
  leadHours: number;
  onChangeLeadHours: (hours: number) => void;
  activeLayer: MapLayerType;
  onChangeLayer: (layer: MapLayerType) => void;
  selectedDistrictId: string | null;
  onSelectDistrict: (districtId: string) => void;
  onOpenOverride: (district: DistrictAdvisory) => void;
  onViewDistrictDetails: (district: DistrictAdvisory) => void;
}

export const ForecastView: React.FC<ForecastViewProps> = ({
  districts,
  prediction,
  leadHours,
  onChangeLeadHours,
  activeLayer,
  onChangeLayer,
  selectedDistrictId,
  onSelectDistrict,
  onOpenOverride,
  onViewDistrictDetails,
}) => {
  // Find highest risk district (highest peak_q99)
  const highestRiskDistrict = React.useMemo(() => {
    if (!districts || districts.length === 0) return null;
    return [...districts].sort(
      (a, b) => (b.advisory.severity * 1000 + b.forecast.peak_q99_mm) - (a.advisory.severity * 1000 + a.forecast.peak_q99_mm)
    )[0];
  }, [districts]);

  // Selected district object if any
  const currentSelectedDistrict = React.useMemo(() => {
    if (!selectedDistrictId || !districts) return null;
    return districts.find((d) => d.district_id.toUpperCase() === selectedDistrictId.toUpperCase()) || null;
  }, [selectedDistrictId, districts]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", width: "100%" }}>
      {/* Subheader Toolbar: Lead Time Progression & Operational Status */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          background: "#1e293b",
          padding: "10px 18px",
          borderRadius: "10px",
          border: "1px solid #334155",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Clock size={16} style={{ color: "#38bdf8" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#cbd5e1" }}>Forecast Lead Horizon:</span>
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { hours: 24, label: "Next 24h" },
              { hours: 48, label: "24h - 48h" },
              { hours: 72, label: "48h - 72h" },
            ].map((slot) => (
              <button
                key={slot.hours}
                onClick={() => onChangeLeadHours(slot.hours)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: leadHours === slot.hours ? "1px solid #38bdf8" : "1px solid #475569",
                  background: leadHours === slot.hours ? "rgba(56, 189, 248, 0.18)" : "transparent",
                  color: leadHours === slot.hours ? "#38bdf8" : "#94a3b8",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "12px", color: "#94a3b8" }}>
          <span>
            Domain Median: <strong style={{ color: "#f8fafc" }}>{prediction?.domain_stats?.mean_q50_mm ?? "23.4"} mm</strong>
          </span>
          <span>
            Domain Peak: <strong style={{ color: "#f8fafc" }}>{prediction?.domain_stats?.peak_q99_mm ?? "279.3"} mm</strong>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#34d399", fontWeight: 600 }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
            Model Inferred
          </span>
        </div>
      </div>

      {/* Main Operational Hero Grid: Map (68%) + Decision Sidebar (32%) */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.85fr) minmax(320px, 1fr)", gap: "18px", minHeight: "620px" }}>
        {/* Left: Dominant Interactive India Geospatial Map */}
        <div style={{ height: "620px", width: "100%" }}>
          <IndiaMap
            districts={districts}
            selectedDistrictId={selectedDistrictId}
            onSelectDistrict={onSelectDistrict}
            activeLayer={activeLayer}
            onChangeLayer={onChangeLayer}
          />
        </div>

        {/* Right: Operational Decision-Support Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Card 1: Dominant Weather Situation */}
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Compass size={18} style={{ color: "#f97316" }} />
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Dominant Weather Situation
              </h3>
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#f97316", marginBottom: "4px" }}>
              {prediction?.dominant_regime ? prediction.dominant_regime.replace(/_/g, " ") : "MONSOON DEPRESSION LOW"}
            </div>
            <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.4, margin: "0 0 12px 0" }}>
              Deep convective depression tracking west-northwest from Bay of Bengal across Central India, coupled with strong orographic onshore flux along the Western Ghats.
            </p>

            {/* Regime Probabilities Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {prediction?.regime_probabilities &&
                Object.entries(prediction.regime_probabilities)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([name, prob]) => (
                    <div key={name} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1" }}>
                        <span>{name.replace(/_/g, " ")}</span>
                        <strong>{(prob * 100).toFixed(1)}%</strong>
                      </div>
                      <div style={{ width: "100%", height: "4px", background: "#0f172a", borderRadius: "2px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.min(100, prob * 100)}%`,
                            height: "100%",
                            background: name.includes("DEPRESSION") ? "#f97316" : name.includes("OROGRAPHIC") ? "#10b981" : "#3b82f6",
                            borderRadius: "2px",
                          }}
                        />
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Card 2: Districts Requiring Immediate Attention */}
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={18} style={{ color: "#ef4444" }} />
                <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Districts Requiring Attention
                </h3>
              </div>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>17 Monitored</span>
            </div>

            {/* Warning Level Badges */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "12px" }}>
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "8px", padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#ef4444" }}>
                  {prediction?.district_alert_counts?.RED ?? 3}
                </div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#fca5a5" }}>RED ALERT</div>
              </div>
              <div style={{ background: "rgba(249, 115, 22, 0.15)", border: "1px solid rgba(249, 115, 22, 0.4)", borderRadius: "8px", padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#f97316" }}>
                  {prediction?.district_alert_counts?.ORANGE ?? 0}
                </div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#fdba74" }}>ORANGE</div>
              </div>
              <div style={{ background: "rgba(234, 179, 8, 0.15)", border: "1px solid rgba(234, 179, 8, 0.4)", borderRadius: "8px", padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#eab308" }}>
                  {prediction?.district_alert_counts?.YELLOW ?? 4}
                </div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#fef08a" }}>YELLOW</div>
              </div>
              <div style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.4)", borderRadius: "8px", padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#22c55e" }}>
                  {prediction?.district_alert_counts?.GREEN ?? 10}
                </div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#86efac" }}>GREEN</div>
              </div>
            </div>

            {/* High-Risk District Quick Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {districts
                .filter((d) => d.advisory.severity >= 3)
                .map((d) => (
                  <button
                    key={d.district_id}
                    onClick={() => {
                      onSelectDistrict(d.district_id);
                      onViewDistrictDetails(d);
                    }}
                    style={{
                      background: d.advisory.color_code === "RED" ? "#ef4444" : "#f97316",
                      color: "#ffffff",
                      border: "none",
                      padding: "4px 9px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span>{d.name}</span>
                    <span style={{ fontSize: "10px", opacity: 0.85 }}>({d.forecast.mean_q50_mm}mm)</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Card 3: Highest Rainfall Risk Spotlight */}
          {highestRiskDistrict && (
            <div
              style={{
                background: "#1e293b",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#ef4444", textTransform: "uppercase" }}>
                    Highest Risk Spotlight
                  </div>
                  <h4 style={{ fontSize: "17px", fontWeight: 800, margin: "2px 0 0 0", color: "#f8fafc" }}>
                    {highestRiskDistrict.name}, {highestRiskDistrict.state}
                  </h4>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>{highestRiskDistrict.zone.replace(/_/g, " ")}</span>
                </div>
                <span
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  {highestRiskDistrict.advisory.color_code}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", margin: "10px 0" }}>
                <div style={{ background: "#0f172a", padding: "8px 10px", borderRadius: "6px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Expected Q50</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#38bdf8" }}>
                    {highestRiskDistrict.forecast.mean_q50_mm} mm
                  </div>
                </div>
                <div style={{ background: "#0f172a", padding: "8px 10px", borderRadius: "6px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>Peak Q99</div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#ef4444" }}>
                    {highestRiskDistrict.forecast.peak_q99_mm} mm
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "11px", color: "#cbd5e1", display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span>P(&gt;64.5mm Heavy): <strong style={{ color: "#f8fafc" }}>{(highestRiskDistrict.forecast.prob_heavy_64_5mm * 100).toFixed(0)}%</strong></span>
                <span>P(&gt;115.6mm): <strong style={{ color: "#fca5a5" }}>{(highestRiskDistrict.forecast.prob_very_heavy_115_6mm * 100).toFixed(0)}%</strong></span>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => {
                    onSelectDistrict(highestRiskDistrict.district_id);
                    onViewDistrictDetails(highestRiskDistrict);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#0284c7",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  District Details
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => onOpenOverride(highestRiskDistrict)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #475569",
                    background: "#1e293b",
                    color: "#cbd5e1",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                  title="Apply Meteorologist Override"
                >
                  <UserCheck size={14} />
                  Review
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
