import React from "react";
import {
  CloudRain,
  AlertTriangle,
  ShieldAlert,
  Compass,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Star,
  ChevronRight,
  Eye,
} from "lucide-react";
import { IndiaMap, MapLayerType, DistrictAdvisory } from "./IndiaMap";

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
  onViewDistrictDetails: (district: DistrictAdvisory) => void;
  watchlist?: string[];
  onToggleWatchlist?: (districtId: string) => void;
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
  onViewDistrictDetails,
  watchlist = [],
  onToggleWatchlist,
}) => {
  // Identify high-priority districts (RED or ORANGE)
  const highPriorityDistricts = districts.filter(
    (d) => d.advisory.color_code === "RED" || d.advisory.color_code === "ORANGE"
  );

  // Highest risk district
  const highestRiskDistrict = [...districts].sort(
    (a, b) => b.forecast.mean_q50_mm - a.forecast.mean_q50_mm
  )[0];

  const humanRegimeNames: Record<string, string> = {
    MONSOON_DEPRESSION_LOW: "Monsoon Depression / Low Pressure",
    OROGRAPHIC_WESTERN_GHATS: "Western Ghats Topographic Uplift",
    ACTIVE_MONSOON: "Active Monsoon Surge",
    BREAK_MONSOON: "Break Monsoon Condition",
    COASTAL_CONVECTIVE: "Coastal Convective Convergence",
    WESTERN_DISTURBANCE: "Western Disturbance Trough",
  };

  const weatherSituationName =
    humanRegimeNames[prediction?.dominant_regime || ""] ||
    (prediction?.dominant_regime || "Active Weather System").replace(/_/g, " ");

  const redCount = prediction?.district_alert_counts?.RED ?? districts.filter((d) => d.advisory.color_code === "RED").length;
  const orangeCount = prediction?.district_alert_counts?.ORANGE ?? districts.filter((d) => d.advisory.color_code === "ORANGE").length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 105px)",
        minHeight: "520px",
        background: "#090d16",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top Floating Weather Situation Card (Overlay) */}
      <div
        className="map-float-card"
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          zIndex: 1000,
          background: "rgba(15, 23, 42, 0.92)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(51, 65, 85, 0.8)",
          borderRadius: "10px",
          padding: "16px 20px",
          maxWidth: "420px",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
          color: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Compass size={14} /> Current Weather Situation
          </span>
          <span
            style={{
              fontSize: "11px",
              background: "#334155",
              color: "#cbd5e1",
              padding: "2px 8px",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            +{leadHours}h Horizon
          </span>
        </div>

        <div style={{ fontSize: "17px", fontWeight: 800, color: "#ffffff", lineHeight: 1.25 }}>
          {weatherSituationName}
        </div>

        <p style={{ fontSize: "12px", color: "#94a3b8", margin: "6px 0 10px 0", lineHeight: 1.4 }}>
          {prediction?.dominant_regime === "MONSOON_DEPRESSION_LOW"
            ? "Deep low pressure circulation over the Bay of Bengal tracking northwestward, inducing intense coastal rainfall bands and heavy windward moisture convergence."
            : prediction?.dominant_regime === "OROGRAPHIC_WESTERN_GHATS"
            ? "Strong low-level cross-equatorial westerly flow colliding with the Western Ghats escarpment, driving persistent high-volume orographic precipitation."
            : "Active synoptic moisture convergence concentrating across vulnerable river catchments and urban centers."}
        </p>

        {/* Quick summary metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            paddingTop: "8px",
            borderTop: "1px solid #334155",
          }}
        >
          <div style={{ background: "rgba(239, 68, 68, 0.12)", padding: "8px 10px", borderRadius: "6px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
            <div style={{ fontSize: "10px", color: "#ef4444", fontWeight: 700, textTransform: "uppercase" }}>High Attention</div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#ffffff", marginTop: "1px" }}>
              {redCount} Districts <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600 }}>(Red)</span>
            </div>
          </div>

          <div style={{ background: "rgba(249, 115, 22, 0.12)", padding: "8px 10px", borderRadius: "6px", border: "1px solid rgba(249, 115, 22, 0.3)" }}>
            <div style={{ fontSize: "10px", color: "#f97316", fontWeight: 700, textTransform: "uppercase" }}>Elevated Risk</div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#ffffff", marginTop: "1px" }}>
              {orangeCount} Districts <span style={{ fontSize: "11px", color: "#f97316", fontWeight: 600 }}>(Orange)</span>
            </div>
          </div>
        </div>

        {/* Spotlight District */}
        {highestRiskDistrict && (
          <div
            onClick={() => {
              onSelectDistrict(highestRiskDistrict.district_id);
              onViewDistrictDetails(highestRiskDistrict);
            }}
            style={{
              marginTop: "10px",
              padding: "8px 10px",
              background: "#1e293b",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              border: "1px solid #334155",
            }}
          >
            <div>
              <div style={{ fontSize: "10px", color: "#94a3b8" }}>Highest Rainfall Spotlight</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>
                {highestRiskDistrict.name} ({highestRiskDistrict.state}) &bull;{" "}
                <span style={{ color: "#38bdf8" }}>{highestRiskDistrict.forecast.mean_q50_mm} mm</span>
              </div>
            </div>
            <ChevronRight size={16} color="#38bdf8" />
          </div>
        )}
      </div>

      {/* Hero Map (Takes 100% of container height minus bottom strip) */}
      <div style={{ flex: 1, position: "relative", width: "100%", height: "100%" }}>
        <IndiaMap
          districts={districts}
          selectedDistrictId={selectedDistrictId}
          onSelectDistrict={(id) => {
            onSelectDistrict(id);
            const target = districts.find((d) => d.district_id === id);
            if (target) onViewDistrictDetails(target);
          }}
          activeLayer={activeLayer}
          onChangeLayer={onChangeLayer}
        />
      </div>

      {/* Bottom Priority Districts Attention Strip */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid #334155",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          zIndex: 1000,
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
          <ShieldAlert size={16} color="#ef4444" />
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#f8fafc", textTransform: "uppercase" }}>
            Priority Districts:
          </span>
        </div>

        <div className="priority-strip" style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
          {highPriorityDistricts.map((d) => {
            const isRed = d.advisory.color_code === "RED";
            const pillColor = isRed ? "#ef4444" : "#f97316";

            return (
              <button
                key={d.district_id}
                onClick={() => {
                  onSelectDistrict(d.district_id);
                  onViewDistrictDetails(d);
                }}
                style={{
                  background: isRed ? "rgba(239, 68, 68, 0.18)" : "rgba(249, 115, 22, 0.18)",
                  border: `1px solid ${pillColor}`,
                  borderRadius: "6px",
                  padding: "5px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  color: "#f8fafc",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                  transition: "transform 0.1s ease",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: pillColor,
                  }}
                />
                <span style={{ fontWeight: 700 }}>{d.name}</span>
                <span style={{ color: "#94a3b8", fontSize: "11px" }}>({d.forecast.mean_q50_mm} mm)</span>
              </button>
            );
          })}

          {highPriorityDistricts.length === 0 && (
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              No districts currently under Red or Orange alerts. All monitored districts in normal or watch status.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
