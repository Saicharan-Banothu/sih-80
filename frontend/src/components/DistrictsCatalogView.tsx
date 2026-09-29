import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ShieldAlert,
  Sliders,
  ArrowRight,
  CloudRain,
  Compass,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

export interface DistrictAdvisory {
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
  forecaster_override?: any;
}

interface DistrictsCatalogViewProps {
  districts: DistrictAdvisory[];
  onSelectDistrict: (district: DistrictAdvisory) => void;
  onOpenOverride: (district: DistrictAdvisory) => void;
}

export const DistrictsCatalogView: React.FC<DistrictsCatalogViewProps> = ({
  districts,
  onSelectDistrict,
  onOpenOverride,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [zoneFilter, setZoneFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"severity" | "rain" | "prob" | "name">("severity");

  // Extract unique zones
  const uniqueZones = useMemo(() => {
    const zones = new Set<string>();
    districts.forEach((d) => zones.add(d.zone));
    return Array.from(zones);
  }, [districts]);

  // Filter and sort districts
  const filteredDistricts = useMemo(() => {
    return districts
      .filter((d) => {
        // Search term filter
        if (searchTerm.trim() !== "") {
          const q = searchTerm.toLowerCase();
          const matchName = d.name.toLowerCase().includes(q);
          const matchState = d.state.toLowerCase().includes(q);
          const matchId = d.district_id.toLowerCase().includes(q);
          if (!matchName && !matchState && !matchId) return false;
        }

        // Severity filter
        if (severityFilter !== "ALL" && d.advisory.color_code !== severityFilter) {
          return false;
        }

        // Zone filter
        if (zoneFilter !== "ALL" && d.zone !== zoneFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "severity") {
          return b.advisory.severity - a.advisory.severity;
        }
        if (sortBy === "rain") {
          return b.forecast.mean_q50_mm - a.forecast.mean_q50_mm;
        }
        if (sortBy === "prob") {
          return b.forecast.prob_heavy_64_5mm - a.forecast.prob_heavy_64_5mm;
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [districts, searchTerm, severityFilter, zoneFilter, sortBy]);

  const getColorTheme = (code: string) => {
    switch (code) {
      case "RED":
        return {
          bg: "#dc2626",
          lightBg: "rgba(220, 38, 38, 0.12)",
          border: "#ef4444",
          text: "#fca5a5",
          title: "Take Action",
        };
      case "ORANGE":
        return {
          bg: "#ea580c",
          lightBg: "rgba(234, 88, 12, 0.12)",
          border: "#f97316",
          text: "#fdba74",
          title: "Be Prepared",
        };
      case "YELLOW":
        return {
          bg: "#ca8a04",
          lightBg: "rgba(202, 138, 4, 0.12)",
          border: "#eab308",
          text: "#fef08a",
          title: "Be Updated",
        };
      case "GREEN":
      default:
        return {
          bg: "#16a34a",
          lightBg: "rgba(22, 163, 74, 0.12)",
          border: "#22c55e",
          text: "#86efac",
          title: "No Warning",
        };
    }
  };

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header & Controls Section */}
      <div
        style={{
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.7) 100%)",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Compass size={24} color="#38bdf8" />
              District Operational Advisories & Risk Dossier
            </h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
              Continuous district-scale probabilistic rainfall intelligence across 17 monitored meteorological jurisdictions.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "#cbd5e1" }}>
            <span style={{ padding: "0.3rem 0.6rem", background: "rgba(30, 41, 59, 0.8)", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
              Total Monitored: <strong style={{ color: "#38bdf8" }}>{districts.length}</strong>
            </span>
            <span style={{ padding: "0.3rem 0.6rem", background: "rgba(220, 38, 38, 0.15)", borderRadius: "6px", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5" }}>
              Red/Orange: <strong>{districts.filter((d) => d.advisory.color_code === "RED" || d.advisory.color_code === "ORANGE").length}</strong>
            </span>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "0.75rem", alignItems: "center" }}>
          {/* Search Input */}
          <div style={{ position: "relative" }}>
            <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search district, state, or ID (e.g., Wayanad, Puri, KL_WAY)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem 0.6rem 2.4rem",
                borderRadius: "8px",
                background: "rgba(2, 6, 23, 0.6)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#f8fafc",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          {/* Severity Filter */}
          <div style={{ display: "flex", gap: "0.3rem", background: "rgba(2, 6, 23, 0.6)", padding: "0.25rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            {["ALL", "RED", "ORANGE", "YELLOW", "GREEN"].map((sev) => {
              const isActive = severityFilter === sev;
              let activeColor = "#38bdf8";
              if (sev === "RED") activeColor = "#ef4444";
              if (sev === "ORANGE") activeColor = "#f97316";
              if (sev === "YELLOW") activeColor = "#eab308";
              if (sev === "GREEN") activeColor = "#22c55e";

              return (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  style={{
                    padding: "0.4rem 0.7rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: isActive ? activeColor : "transparent",
                    color: isActive ? (sev === "YELLOW" ? "#000" : "#fff") : "#94a3b8",
                    transition: "all 0.15s ease",
                  }}
                >
                  {sev}
                </button>
              );
            })}
          </div>

          {/* Zone Filter */}
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            style={{
              padding: "0.55rem 0.75rem",
              borderRadius: "8px",
              background: "rgba(2, 6, 23, 0.8)",
              border: "1px solid var(--border-subtle)",
              color: "#cbd5e1",
              fontSize: "0.8rem",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="ALL">All Meteorological Zones</option>
            {uniqueZones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: "0.55rem 0.75rem",
              borderRadius: "8px",
              background: "rgba(2, 6, 23, 0.8)",
              border: "1px solid var(--border-subtle)",
              color: "#cbd5e1",
              fontSize: "0.8rem",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="severity">Sort by: Severity Level</option>
            <option value="rain">Sort by: Expected Rain (q50)</option>
            <option value="prob">Sort by: Heavy Rain Probability</option>
            <option value="name">Sort by: Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* District Cards Grid */}
      {filteredDistricts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "rgba(15, 23, 42, 0.4)",
            borderRadius: "12px",
            border: "1px dashed var(--border-subtle)",
          }}
        >
          <AlertTriangle size={36} color="#94a3b8" style={{ marginBottom: "1rem" }} />
          <h3 style={{ color: "#cbd5e1", fontSize: "1.1rem", margin: "0 0 0.5rem" }}>No matching districts found</h3>
          <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
            Try resetting your search query or changing severity and zone filters.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {filteredDistricts.map((d) => {
            const theme = getColorTheme(d.advisory.color_code);
            const isRedOrOrange = d.advisory.color_code === "RED" || d.advisory.color_code === "ORANGE";

            return (
              <div
                key={d.district_id}
                style={{
                  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.8) 100%)",
                  borderRadius: "12px",
                  border: `1px solid ${isRedOrOrange ? theme.border : "var(--border-subtle)"}`,
                  borderLeft: `6px solid ${theme.bg}`,
                  padding: "1.25rem",
                  boxShadow: isRedOrOrange
                    ? `0 10px 25px -5px ${theme.lightBg}, 0 4px 6px -2px rgba(0, 0, 0, 0.3)`
                    : "0 4px 15px rgba(0, 0, 0, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <div>
                  {/* Top Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc" }}>{d.name}</span>
                        <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "#64748b" }}>
                          [{d.district_id}]
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.15rem" }}>
                        {d.state} • {d.zone.replace(/_/g, " ")}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-block",
                          background: theme.bg,
                          color: d.advisory.color_code === "YELLOW" ? "#000" : "#fff",
                          padding: "0.3rem 0.75rem",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          letterSpacing: "0.5px",
                        }}
                      >
                        {d.advisory.color_code}
                      </span>
                      <div style={{ fontSize: "0.65rem", color: theme.text, marginTop: "0.2rem", fontWeight: 600 }}>
                        {theme.title}
                      </div>
                    </div>
                  </div>

                  {/* 3-Part Metric Display */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "0.5rem",
                      background: "rgba(2, 6, 23, 0.6)",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      marginBottom: "0.75rem",
                      border: "1px solid rgba(56, 189, 248, 0.1)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 600 }}>EXPECTED (q50)</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
                        {d.forecast.mean_q50_mm.toFixed(1)} <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>mm</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 600 }}>LIKELY (q25-q75)</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#e2e8f0", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
                        {d.forecast.likely_range_q25_q75
                          ? `${d.forecast.likely_range_q25_q75[0].toFixed(0)}-${d.forecast.likely_range_q25_q75[1].toFixed(0)} mm`
                          : `${(d.forecast.mean_q50_mm * 0.8).toFixed(0)}-${(d.forecast.mean_q50_mm * 1.25).toFixed(0)} mm`}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 600 }}>PEAK TAIL (q99)</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f87171", fontFamily: "var(--font-mono)" }}>
                        {d.forecast.peak_q99_mm.toFixed(1)} <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>mm</span>
                      </div>
                    </div>
                  </div>

                  {/* Tail Probabilities */}
                  <div style={{ marginBottom: "0.75rem", fontSize: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", color: "#cbd5e1" }}>
                      <span>Heavy Rain &gt; 64.5 mm:</span>
                      <strong style={{ color: d.forecast.prob_heavy_64_5mm > 0.5 ? "#f87171" : "#94a3b8", fontFamily: "var(--font-mono)" }}>
                        {(d.forecast.prob_heavy_64_5mm * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1" }}>
                      <span>Very Heavy &gt; 115.6 mm:</span>
                      <strong style={{ color: d.forecast.prob_very_heavy_115_6mm > 0.3 ? "#f87171" : "#94a3b8", fontFamily: "var(--font-mono)" }}>
                        {(d.forecast.prob_very_heavy_115_6mm * 100).toFixed(1)}%
                      </strong>
                    </div>
                  </div>

                  {/* Operational Action Text */}
                  <div
                    style={{
                      background: theme.lightBg,
                      border: `1px solid ${theme.border}44`,
                      borderRadius: "6px",
                      padding: "0.6rem 0.75rem",
                      fontSize: "0.75rem",
                      color: "#f8fafc",
                      lineHeight: 1.45,
                      marginBottom: "1rem",
                    }}
                  >
                    {d.advisory.action_text}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
                  <button
                    onClick={() => onSelectDistrict(d)}
                    style={{
                      flex: 1,
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      background: "rgba(56, 189, 248, 0.15)",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                      color: "#38bdf8",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                  >
                    Inspect Dossier <ArrowRight size={14} />
                  </button>

                  <button
                    onClick={() => onOpenOverride(d)}
                    title="Certified Forecaster Override & Review"
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid var(--border-subtle)",
                      color: "#cbd5e1",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <Sliders size={13} /> Review
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
