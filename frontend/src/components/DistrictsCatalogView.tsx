import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  CloudRain,
  Compass,
  AlertTriangle,
  Star,
  Layers,
  ChevronRight,
} from "lucide-react";
import { DistrictAdvisory } from "./IndiaMap";

interface DistrictsCatalogViewProps {
  districts: DistrictAdvisory[];
  onSelectDistrict: (district: DistrictAdvisory) => void;
  onOpenOverride?: (district: DistrictAdvisory) => void;
  watchlist: string[];
  onToggleWatchlist: (districtId: string) => void;
}

export const DistrictsCatalogView: React.FC<DistrictsCatalogViewProps> = ({
  districts,
  onSelectDistrict,
  watchlist,
  onToggleWatchlist,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [zoneFilter, setZoneFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"severity" | "rain" | "prob" | "name">("severity");
  const [showWatchlistOnly, setShowWatchlistOnly] = useState<boolean>(false);

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
        // Watchlist filter
        if (showWatchlistOnly && !watchlist.includes(d.district_id)) {
          return false;
        }

        // Search term filter
        if (searchTerm.trim() !== "") {
          const q = searchTerm.toLowerCase();
          const matchName = d.name.toLowerCase().includes(q);
          const matchState = d.state.toLowerCase().includes(q);
          const matchZone = d.zone.toLowerCase().includes(q);
          if (!matchName && !matchState && !matchZone) return false;
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
          return b.forecast.prob_very_heavy_115_6mm - a.forecast.prob_very_heavy_115_6mm;
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [districts, searchTerm, severityFilter, zoneFilter, sortBy, showWatchlistOnly, watchlist]);

  // Counts by alert level
  const alertCounts = useMemo(() => {
    return {
      RED: districts.filter((d) => d.advisory.color_code === "RED").length,
      ORANGE: districts.filter((d) => d.advisory.color_code === "ORANGE").length,
      YELLOW: districts.filter((d) => d.advisory.color_code === "YELLOW").length,
      GREEN: districts.filter((d) => d.advisory.color_code === "GREEN").length,
    };
  }, [districts]);

  const humanRegimeNames: Record<string, string> = {
    MONSOON_DEPRESSION_LOW: "Monsoon Depression",
    OROGRAPHIC_WESTERN_GHATS: "Western Ghats Uplift",
    ACTIVE_MONSOON: "Active Monsoon Surge",
    BREAK_MONSOON: "Break Monsoon",
    COASTAL_CONVECTIVE: "Coastal Convective",
    WESTERN_DISTURBANCE: "Western Disturbance",
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: "1400px", margin: "0 auto", color: "#f8fafc" }}>
      {/* Title & Overview Summary */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "#f8fafc" }}>
            District Rainfall Risk Directory
          </h1>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: "4px 0 0 0" }}>
            Real-time advisory levels, expected rainfall accumulations, and heavy precipitation likelihoods across all monitored districts.
          </p>
        </div>

        {/* Quick Alert Summary Badges */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <div
            onClick={() => {
              setSeverityFilter(severityFilter === "RED" ? "ALL" : "RED");
              setShowWatchlistOnly(false);
            }}
            style={{
              cursor: "pointer",
              background: severityFilter === "RED" ? "#ef4444" : "rgba(239, 68, 68, 0.15)",
              color: severityFilter === "RED" ? "#ffffff" : "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <span>{alertCounts.RED} High Attention (Red)</span>
          </div>

          <div
            onClick={() => {
              setSeverityFilter(severityFilter === "ORANGE" ? "ALL" : "ORANGE");
              setShowWatchlistOnly(false);
            }}
            style={{
              cursor: "pointer",
              background: severityFilter === "ORANGE" ? "#f97316" : "rgba(249, 115, 22, 0.15)",
              color: severityFilter === "ORANGE" ? "#ffffff" : "#f97316",
              border: "1px solid rgba(249, 115, 22, 0.4)",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <span>{alertCounts.ORANGE} Elevated (Orange)</span>
          </div>

          <div
            onClick={() => {
              setSeverityFilter(severityFilter === "YELLOW" ? "ALL" : "YELLOW");
              setShowWatchlistOnly(false);
            }}
            style={{
              cursor: "pointer",
              background: severityFilter === "YELLOW" ? "#eab308" : "rgba(234, 179, 8, 0.15)",
              color: severityFilter === "YELLOW" ? "#000000" : "#eab308",
              border: "1px solid rgba(234, 179, 8, 0.4)",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <span>{alertCounts.YELLOW} Watch (Yellow)</span>
          </div>

          <div
            onClick={() => {
              setShowWatchlistOnly(!showWatchlistOnly);
              setSeverityFilter("ALL");
            }}
            style={{
              cursor: "pointer",
              background: showWatchlistOnly ? "rgba(234, 179, 8, 0.3)" : "rgba(255, 255, 255, 0.05)",
              color: showWatchlistOnly ? "#eab308" : "#94a3b8",
              border: showWatchlistOnly ? "1px solid #eab308" : "1px solid #334155",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Star size={13} fill={showWatchlistOnly ? "#eab308" : "none"} />
            <span>Watchlist ({watchlist.length})</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          background: "#1e293b",
          padding: "12px 16px",
          borderRadius: "8px",
          border: "1px solid #334155",
          marginBottom: "16px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: "200px" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}
          />
          <input
            type="text"
            placeholder="Search district, state, or zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px 7px 32px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "6px",
              color: "#f8fafc",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        {/* Severity filter dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Advisory:</span>
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setShowWatchlistOnly(false);
            }}
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              color: "#f8fafc",
              padding: "7px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Advisory Levels</option>
            <option value="RED">Red (Take Action)</option>
            <option value="ORANGE">Orange (Be Prepared)</option>
            <option value="YELLOW">Yellow (Be Aware)</option>
            <option value="GREEN">Green (Normal / No Warning)</option>
          </select>
        </div>

        {/* Zone filter dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Zone:</span>
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              color: "#f8fafc",
              padding: "7px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Meteorological Zones</option>
            {uniqueZones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Sort by */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              color: "#f8fafc",
              padding: "7px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <option value="severity">Highest Risk First</option>
            <option value="rain">Expected Rain (High to Low)</option>
            <option value="prob">Very Heavy Rain Probability</option>
            <option value="name">District Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* District Cards List */}
      {filteredDistricts.length === 0 ? (
        <div
          style={{
            background: "#1e293b",
            padding: "40px 20px",
            textAlign: "center",
            borderRadius: "8px",
            border: "1px solid #334155",
            color: "#94a3b8",
          }}
        >
          <CloudRain size={36} style={{ margin: "0 auto 10px auto", color: "#64748b" }} />
          <h3 style={{ fontSize: "16px", color: "#f8fafc", margin: "0 0 6px 0" }}>No districts found</h3>
          <p style={{ fontSize: "13px", margin: 0 }}>
            No districts match the selected filters or search terms. Try clearing filters or search queries.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredDistricts.map((d) => {
            const isWatch = watchlist.includes(d.district_id);
            const alertColor =
              d.advisory.color_code === "RED"
                ? "#ef4444"
                : d.advisory.color_code === "ORANGE"
                ? "#f97316"
                : d.advisory.color_code === "YELLOW"
                ? "#eab308"
                : "#22c55e";

            const likelyRange = d.forecast.likely_range_q25_q75 ?? [
              Math.round(d.forecast.mean_q50_mm * 0.75),
              Math.round(d.forecast.mean_q50_mm * 1.25),
            ];

            const weatherSituation =
              humanRegimeNames[d.advisory.dominant_regime] ||
              d.advisory.dominant_regime.replace(/_/g, " ");

            return (
              <div
                key={d.district_id}
                onClick={() => onSelectDistrict(d)}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderLeft: `5px solid ${alertColor}`,
                  borderRadius: "8px",
                  padding: "14px 18px",
                  display: "grid",
                  gridTemplateColumns: "1.8fr 1.2fr 1.2fr 1.5fr auto",
                  alignItems: "center",
                  gap: "16px",
                  cursor: "pointer",
                  transition: "transform 0.1s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#475569";
                  e.currentTarget.style.borderLeftColor = alertColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#334155";
                  e.currentTarget.style.borderLeftColor = alertColor;
                }}
              >
                {/* District & State */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        background: alertColor,
                        color: "#ffffff",
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {d.advisory.color_code}
                    </span>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>
                      {d.name}
                    </span>
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>({d.state})</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                    {d.zone.replace(/_/g, " ")} &bull; {weatherSituation}
                  </div>
                </div>

                {/* Expected Rainfall */}
                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Expected (24h)</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#38bdf8", marginTop: "1px" }}>
                    {d.forecast.mean_q50_mm}{" "}
                    <span style={{ fontSize: "11px", fontWeight: 500, color: "#94a3b8" }}>mm</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Range: {likelyRange[0]}–{likelyRange[1]} mm
                  </div>
                </div>

                {/* Exceedance Probabilities */}
                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Heavy Rain Risk</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "2px" }}>
                    <span
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: d.forecast.prob_very_heavy_115_6mm > 0.4 ? "#f97316" : "#cbd5e1",
                      }}
                    >
                      {Math.round(d.forecast.prob_very_heavy_115_6mm * 100)}%
                    </span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>(&gt;115 mm)</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    &gt;64 mm: {Math.round(d.forecast.prob_heavy_64_5mm * 100)}%
                  </div>
                </div>

                {/* Advisory Snippet */}
                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Advisory Guidance</div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#cbd5e1",
                      marginTop: "2px",
                      lineHeight: 1.3,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {d.advisory.action_text}
                  </div>
                </div>

                {/* Actions: Watchlist & Arrow */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWatchlist(d.district_id);
                    }}
                    title={isWatch ? "Remove from watchlist" : "Add to watchlist"}
                    style={{
                      background: isWatch ? "rgba(234, 179, 8, 0.2)" : "transparent",
                      border: "none",
                      color: isWatch ? "#eab308" : "#64748b",
                      padding: "6px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Star size={16} fill={isWatch ? "#eab308" : "none"} />
                  </button>

                  <div
                    style={{
                      background: "#334155",
                      borderRadius: "6px",
                      padding: "6px",
                      color: "#cbd5e1",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
