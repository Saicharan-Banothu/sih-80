import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  AlertCircle,
  Clock,
  Compass,
  Star,
  ArrowRight,
  Filter,
  Search,
  CheckCircle,
  MapPin,
  ChevronRight,
  Layers,
} from "lucide-react";
import { DistrictAdvisory } from "./IndiaMap";

interface AlertsViewProps {
  districts: DistrictAdvisory[];
  leadHours: number;
  watchlist: string[];
  onToggleWatchlist: (districtId: string) => void;
  onSelectDistrict: (districtId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  districts,
  leadHours,
  watchlist,
  onToggleWatchlist,
  onSelectDistrict,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("ALL");

  // Extract all active alert districts (RED, ORANGE, YELLOW)
  const activeAlertDistricts = useMemo(() => {
    return districts.filter((d) => d.advisory.color_code !== "GREEN");
  }, [districts]);

  // Unique states with active alerts
  const states = useMemo(() => {
    const s = new Set<string>();
    activeAlertDistricts.forEach((d) => s.add(d.state));
    return Array.from(s).sort();
  }, [activeAlertDistricts]);

  // Counts
  const counts = useMemo(() => {
    let red = 0;
    let orange = 0;
    let yellow = 0;
    activeAlertDistricts.forEach((d) => {
      if (d.advisory.color_code === "RED") red++;
      else if (d.advisory.color_code === "ORANGE") orange++;
      else if (d.advisory.color_code === "YELLOW") yellow++;
    });
    return { total: activeAlertDistricts.length, red, orange, yellow };
  }, [activeAlertDistricts]);

  // Filtered districts
  const filteredAlerts = useMemo(() => {
    return activeAlertDistricts.filter((d) => {
      if (severityFilter !== "ALL" && d.advisory.color_code !== severityFilter) {
        return false;
      }
      if (selectedState !== "ALL" && d.state !== selectedState) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = d.name.toLowerCase().includes(q);
        const matchState = d.state.toLowerCase().includes(q);
        if (!matchName && !matchState) return false;
      }
      return true;
    }).sort((a, b) => {
      const order: Record<string, number> = { RED: 0, ORANGE: 1, YELLOW: 2, GREEN: 3 };
      const diff = (order[a.advisory.color_code] ?? 99) - (order[b.advisory.color_code] ?? 99);
      if (diff !== 0) return diff;
      return b.forecast.mean_q50_mm - a.forecast.mean_q50_mm;
    });
  }, [activeAlertDistricts, severityFilter, selectedState, searchQuery]);

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 16px" }}>
      {/* Top Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: "12px",
          padding: "24px",
          color: "#ffffff",
          marginBottom: "24px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
            <AlertTriangle size={15} />
            Institutional Meteorological Advisories
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
            Active Rainfall Warnings & Alerts
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
            District-level alerts derived from soft-gated MoE probabilistic rainfall forecasts for the next {leadHours} hours.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {/* Red Warning Card */}
          <div
            onClick={() => setSeverityFilter(severityFilter === "RED" ? "ALL" : "RED")}
            style={{
              background: severityFilter === "RED" ? "rgba(220, 38, 38, 0.3)" : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${severityFilter === "RED" ? "#ef4444" : "rgba(255, 255, 255, 0.1)"}`,
              borderRadius: "8px",
              padding: "10px 16px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#f87171" }}>{counts.red}</div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#cbd5e1" }}>Red Warnings</div>
          </div>

          {/* Orange Alert Card */}
          <div
            onClick={() => setSeverityFilter(severityFilter === "ORANGE" ? "ALL" : "ORANGE")}
            style={{
              background: severityFilter === "ORANGE" ? "rgba(234, 88, 12, 0.3)" : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${severityFilter === "ORANGE" ? "#f97316" : "rgba(255, 255, 255, 0.1)"}`,
              borderRadius: "8px",
              padding: "10px 16px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#fb923c" }}>{counts.orange}</div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#cbd5e1" }}>Orange Alerts</div>
          </div>

          {/* Yellow Watch Card */}
          <div
            onClick={() => setSeverityFilter(severityFilter === "YELLOW" ? "ALL" : "ORANGE")}
            style={{
              background: severityFilter === "YELLOW" ? "rgba(234, 179, 8, 0.3)" : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${severityFilter === "YELLOW" ? "#facc15" : "rgba(255, 255, 255, 0.1)"}`,
              borderRadius: "8px",
              padding: "10px 16px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#fde047" }}>{counts.yellow}</div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#cbd5e1" }}>Yellow Watches</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "14px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "240px" }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search district or state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              fontSize: "13px",
              width: "100%",
              color: "#0f172a",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
            <Filter size={14} />
            <span>State:</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "4px 8px",
                fontSize: "12px",
                color: "#334155",
                background: "#f8fafc",
                outline: "none",
              }}
            >
              <option value="ALL">All States ({states.length})</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "4px" }}>
            {["ALL", "RED", "ORANGE", "YELLOW"].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: severityFilter === sev ? "#0284c7" : "#e2e8f0",
                  background: severityFilter === sev ? "#f0f9ff" : "#ffffff",
                  color: severityFilter === sev ? "#0369a1" : "#475569",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {sev === "ALL" ? "All Severities" : sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert Cards Grid */}
      {filteredAlerts.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "48px 24px",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <CheckCircle size={36} color="#16a34a" style={{ margin: "0 auto 12px auto" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px 0" }}>
            No Active Alerts for Selected Filter
          </h3>
          <p style={{ fontSize: "13px", margin: 0 }}>
            No districts currently exceed the selected severity threshold under the {leadHours}h forecast horizon.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "16px" }}>
          {filteredAlerts.map((d) => {
            const isRed = d.advisory.color_code === "RED";
            const isOrange = d.advisory.color_code === "ORANGE";
            const isWatched = watchlist.includes(d.district_id.toUpperCase());

            const badgeBg = isRed ? "#fef2f2" : isOrange ? "#fff7ed" : "#fefce8";
            const badgeBorder = isRed ? "#fecaca" : isOrange ? "#ffedd5" : "#fef08a";
            const badgeText = isRed ? "#991b1b" : isOrange ? "#9a3412" : "#854d0e";
            const sevLabel = isRed ? "RED WARNING (Take Action)" : isOrange ? "ORANGE ALERT (Be Prepared)" : "YELLOW WATCH (Be Updated)";

            return (
              <div
                key={d.district_id}
                style={{
                  background: "#ffffff",
                  border: `1px solid ${isRed ? "#fca5a5" : isOrange ? "#fdba74" : "#e2e8f0"}`,
                  borderRadius: "10px",
                  padding: "18px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div
                        style={{
                          display: "inline-block",
                          background: badgeBg,
                          border: `1px solid ${badgeBorder}`,
                          color: badgeText,
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: "4px",
                          marginBottom: "6px",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        {sevLabel}
                      </div>
                      <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                        {d.name}, <span style={{ fontWeight: 500, color: "#64748b" }}>{d.state}</span>
                      </h3>
                    </div>

                    <button
                      onClick={() => onToggleWatchlist(d.district_id)}
                      title={isWatched ? "Remove from Watchlist" : "Add to Watchlist"}
                      style={{
                        background: isWatched ? "#fef3c7" : "#f1f5f9",
                        border: `1px solid ${isWatched ? "#fde68a" : "#cbd5e1"}`,
                        borderRadius: "6px",
                        padding: "6px",
                        cursor: "pointer",
                        color: isWatched ? "#d97706" : "#64748b",
                      }}
                    >
                      <Star size={15} fill={isWatched ? "#d97706" : "none"} />
                    </button>
                  </div>

                  {/* Rainfall Metrics Summary */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      background: "#f8fafc",
                      padding: "10px",
                      borderRadius: "6px",
                      marginBottom: "12px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Expected Rainfall</div>
                      <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                        {d.forecast.mean_q50_mm}{" "}
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "#64748b" }}>mm/day</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Likely Range (q25-q75)</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
                        {d.forecast.likely_range_q25_q75
                          ? `${d.forecast.likely_range_q25_q75[0]} – ${d.forecast.likely_range_q25_q75[1]} mm`
                          : "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Probability Threshold Bars */}
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                      Threshold Exceedance Risk
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      {/* >64.5mm */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#334155", marginBottom: "2px" }}>
                          <span>Heavy Rain (&gt; 64.5 mm)</span>
                          <strong>{Math.round(d.forecast.prob_heavy_64_5mm * 100)}%</strong>
                        </div>
                        <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(100, Math.round(d.forecast.prob_heavy_64_5mm * 100))}%`,
                              background: "#f59e0b",
                            }}
                          />
                        </div>
                      </div>

                      {/* >115.6mm */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#334155", marginBottom: "2px" }}>
                          <span>Very Heavy (&gt; 115.6 mm)</span>
                          <strong>{Math.round(d.forecast.prob_very_heavy_115_6mm * 100)}%</strong>
                        </div>
                        <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(100, Math.round(d.forecast.prob_very_heavy_115_6mm * 100))}%`,
                              background: "#ea580c",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Why Highlighted / Meteorological Driver */}
                  <div style={{ background: "#f1f5f9", padding: "8px 10px", borderRadius: "6px", marginBottom: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#0284c7", fontSize: "11px", fontWeight: 700, marginBottom: "3px" }}>
                      <Compass size={13} />
                      {d.advisory.dominant_regime.replace(/_/g, " ")} Influence
                    </div>
                    <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.4 }}>
                      {d.explanation?.summary || d.advisory.action_text}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#64748b" }}>
                    <Clock size={12} />
                    <span>Next {leadHours} Hours</span>
                  </div>

                  <button
                    onClick={() => onSelectDistrict(d.district_id)}
                    style={{
                      background: "#0284c7",
                      color: "#ffffff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    View Intelligence
                    <ChevronRight size={14} />
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
