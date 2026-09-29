import React, { useEffect, useState, useCallback } from "react";
import {
  CloudRain,
  ShieldCheck,
  Activity,
  Layers,
  Info,
  Database,
  Compass,
  AlertTriangle,
  FileText,
  Clock,
  Radio,
  Sliders,
  CheckCircle,
  BarChart3,
  Award,
  Filter,
  RefreshCw,
  ExternalLink,
  MapPin,
  ListOrdered,
  GitCompare,
  BookOpen,
} from "lucide-react";
import { ForecastView } from "./components/ForecastView";
import { DistrictsCatalogView } from "./components/DistrictsCatalogView";
import { RawVsCorrectedView } from "./components/RawVsCorrectedView";
import { PerformanceView } from "./components/PerformanceView";
import { DataTrustView } from "./components/DataTrustView";
import { HowItWorksView } from "./components/HowItWorksView";
import { DistrictDetailDrawer } from "./components/DistrictDetailDrawer";
import { ForecasterOverrideModal } from "./components/ForecasterOverrideModal";
import { MapLayerType } from "./components/IndiaMap";

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
  forecaster_override?: any;
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
  model_version?: string;
  mode?: string;
  mode_label?: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "forecast" | "districts" | "comparison" | "performance" | "datatrust" | "methodology"
  >("forecast");

  const [districts, setDistricts] = useState<DistrictAdvisory[]>([]);
  const [prediction, setPrediction] = useState<ForecastPrediction | null>(null);
  const [leadHours, setLeadHours] = useState<number>(24);
  const [activeMapLayer, setActiveMapLayer] = useState<MapLayerType>("RAINFALL");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);

  // Deep dive drawer state
  const [drawerDistrict, setDrawerDistrict] = useState<DistrictAdvisory | null>(null);

  // Forecaster override modal state
  const [overrideModalOpen, setOverrideModalOpen] = useState<boolean>(false);
  const [districtToOverride, setDistrictToOverride] = useState<DistrictAdvisory | null>(null);

  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toISOString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async (currentLead: number = 24) => {
    setLoading(true);
    try {
      const [distRes, predRes] = await Promise.all([
        fetch(`/api/v1/forecast/districts?lead_hours=${currentLead}`),
        fetch(`/api/v1/forecast/predict?lead_hours=${currentLead}`),
      ]);

      if (distRes.ok) {
        const distData = await distRes.json();
        setDistricts(distData);
      }
      if (predRes.ok) {
        const predData = await predRes.json();
        setPrediction(predData);
      }

      setBackendConnected(true);
    } catch (err) {
      console.warn("Using offline simulated operational scenario:", err);
      setBackendConnected(false);
      // Fallback preview data
      setPrediction({
        dominant_regime: "MONSOON_DEPRESSION_LOW",
        regime_probabilities: {
          ACTIVE_MONSOON: 0.20,
          BREAK_MONSOON: 0.05,
          MONSOON_DEPRESSION_LOW: 0.55,
          OROGRAPHIC_WESTERN_GHATS: 0.15,
          COASTAL_CONVECTIVE: 0.03,
          WESTERN_DISTURBANCE: 0.02,
        },
        domain_stats: {
          mean_q50_mm: 42.5,
          peak_q50_mm: 145.2,
          peak_q90_mm: 210.4,
          peak_q99_mm: 285.0,
          max_p_heavy: 0.74,
          max_p_very_heavy: 0.62,
          max_p_extreme: 0.38,
        },
        district_alert_counts: { RED: 3, ORANGE: 2, YELLOW: 4, GREEN: 8 },
        total_districts: 17,
        model_version: "JointRegimeAware-v0.1.0",
        mode_label: "DEMONSTRATION SCENARIO",
      });

      setDistricts([
        {
          district_id: "OD_PUR",
          name: "Puri",
          state: "Odisha",
          zone: "MONSOON_DEPRESSION_PATH",
          lat: 19.81,
          lon: 85.83,
          area_sq_km: 3479,
          forecast: {
            mean_q50_mm: 114.2,
            likely_range_q25_q75: [88.5, 142.1],
            max_q90_mm: 184.6,
            peak_q99_mm: 265.4,
            quantiles: { q10: 52.1, q25: 88.5, q50: 114.2, q75: 142.1, q90: 184.6, q95: 218.4, q99: 265.4 },
            prob_heavy_64_5mm: 0.762,
            prob_very_heavy_115_6mm: 0.641,
            prob_extreme_204_5mm: 0.395,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "RED",
            severity: 4,
            action_text: "Take Action (RED WARNING): Landfall of monsoon depression. Severe urban and coastal inundation.",
            dominant_regime: "MONSOON_DEPRESSION_LOW",
          },
          comparison: {
            raw_nwp_median_mm: 68.4,
            global_qm_median_mm: 88.2,
            moe_corrected_median_mm: 114.2,
            correction_delta_mm: 45.8,
            nwp_bias_corrected: "Underestimation (+45.8 mm correction applied)",
          },
          explanation: {
            summary: "Coastal landfall of monsoon depression with 992 hPa central low pressure.",
            synoptic_regime: "MONSOON_DEPRESSION_LOW (55% probability)",
            primary_driver: "Vorticity max at 850 hPa combined with offshore convergence trough.",
            bias_adjustment: "Raw NWP underrepresented inner-core convective rainbands; neural residual expert compensated.",
            risk_verdict: "High flash flood and tidal storm surge probability. Immediate response required.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 114.2, risk_color: "#dc2626" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 78.4, risk_color: "#ea580c" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 32.1, risk_color: "#ca8a04" },
          ],
        },
        {
          district_id: "KL_WAY",
          name: "Wayanad",
          state: "Kerala",
          zone: "WESTERN_GHATS_OROGRAPHIC",
          lat: 11.68,
          lon: 76.13,
          area_sq_km: 2132,
          forecast: {
            mean_q50_mm: 113.0,
            likely_range_q25_q75: [85.0, 140.0],
            max_q90_mm: 164.2,
            peak_q99_mm: 237.8,
            quantiles: { q10: 48.0, q25: 85.0, q50: 113.0, q75: 140.0, q90: 164.2, q95: 195.0, q99: 237.8 },
            prob_heavy_64_5mm: 0.715,
            prob_very_heavy_115_6mm: 0.584,
            prob_extreme_204_5mm: 0.342,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "RED",
            severity: 4,
            action_text: "Take Action (RED WARNING): Extremely heavy orographic rainfall. Severe risk of flash floods and landslides.",
            dominant_regime: "OROGRAPHIC_WESTERN_GHATS",
          },
          comparison: {
            raw_nwp_median_mm: 64.0,
            global_qm_median_mm: 82.0,
            moe_corrected_median_mm: 113.0,
            correction_delta_mm: 49.0,
            nwp_bias_corrected: "Severe orographic windward underestimation corrected",
          },
          explanation: {
            summary: "Vigorous low-level cross-equatorial monsoon jet impingement on steep Western Ghats escarpment.",
            synoptic_regime: "OROGRAPHIC_WESTERN_GHATS (15% probability)",
            primary_driver: "850 hPa westerly winds exceeding 35 knots with moisture flux > 400 kg/(m s).",
            bias_adjustment: "Raw NWP smoothed sub-grid topographic uplift; neural expert upweighted orographic slope cells.",
            risk_verdict: "High landslide susceptibility in elevated tea plantation catchments. Evacuate vulnerable slopes.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 113.0, risk_color: "#dc2626" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 92.5, risk_color: "#dc2626" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 45.0, risk_color: "#ca8a04" },
          ],
        },
        {
          district_id: "AP_VSK",
          name: "Visakhapatnam",
          state: "Andhra Pradesh",
          zone: "COASTAL_CONVECTIVE",
          lat: 17.68,
          lon: 83.21,
          area_sq_km: 1048,
          forecast: {
            mean_q50_mm: 79.5,
            likely_range_q25_q75: [55.0, 102.0],
            max_q90_mm: 120.9,
            peak_q99_mm: 175.1,
            quantiles: { q10: 32.0, q25: 55.0, q50: 79.5, q75: 102.0, q90: 120.9, q95: 145.0, q99: 175.1 },
            prob_heavy_64_5mm: 0.613,
            prob_very_heavy_115_6mm: 0.412,
            prob_extreme_204_5mm: 0.125,
            confidence: "MODERATE",
          },
          advisory: {
            color_code: "ORANGE",
            severity: 3,
            action_text: "Be Prepared (ORANGE ALERT): Very heavy rainfall expected. Urban waterlogging and coastal squalls.",
            dominant_regime: "COASTAL_CONVECTIVE",
          },
          comparison: {
            raw_nwp_median_mm: 48.0,
            global_qm_median_mm: 62.0,
            moe_corrected_median_mm: 79.5,
            correction_delta_mm: 31.5,
            nwp_bias_corrected: "Convective initiation timing and amplitude corrected",
          },
          explanation: {
            summary: "Mesoscale convective cloud complex organized along coastal convergence zone.",
            synoptic_regime: "COASTAL_CONVECTIVE (3% probability, localized)",
            primary_driver: "High CAPE (> 2200 J/kg) coupled with land-sea thermal contrast.",
            bias_adjustment: "Convective expert intensified local rainfall clusters in urban coastal strip.",
            risk_verdict: "Substantial risk of localized urban flooding and low-lying water stagnation.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 79.5, risk_color: "#ea580c" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 52.0, risk_color: "#ca8a04" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 22.0, risk_color: "#16a34a" },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(leadHours);
  }, [fetchData, leadHours]);

  const handleLeadChange = (hours: number) => {
    setLeadHours(hours);
  };

  const handleSelectDistrictFromMap = (id: string) => {
    setSelectedDistrictId(id);
    const found = districts.find((d) => d.district_id === id);
    if (found) {
      setDrawerDistrict(found);
    }
  };

  const handleSelectDistrictFromCatalog = (district: DistrictAdvisory) => {
    setSelectedDistrictId(district.district_id);
    setDrawerDistrict(district);
  };

  const handleOpenOverride = (district: DistrictAdvisory) => {
    setDistrictToOverride(district);
    setOverrideModalOpen(true);
  };

  const handleApplyOverride = async (districtId: string, color: string, scale: number, reason: string) => {
    try {
      const res = await fetch("/api/v1/forecast/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district_id: districtId,
          forecaster_id: "DUTY_METEOROLOGIST_01",
          overridden_color: color,
          scaling_multiplier: scale,
          justification_reason: reason,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDistricts((prev) =>
          prev.map((d) => (d.district_id === districtId ? data.updated_advisory : d))
        );
        if (drawerDistrict && drawerDistrict.district_id === districtId) {
          setDrawerDistrict(data.updated_advisory);
        }
      } else {
        throw new Error("Backend override returned status " + res.status);
      }
    } catch (err) {
      console.warn("Applying optimistic client-side override:", err);
      setDistricts((prev) =>
        prev.map((d) => {
          if (d.district_id === districtId) {
            const updated = {
              ...d,
              advisory: {
                ...d.advisory,
                color_code: color as any,
                action_text: `[DUTY FORECASTER OVERRIDE] Alert modified to ${color}. Rationale: ${reason}`,
              },
              forecast: {
                ...d.forecast,
                mean_q50_mm: Math.round(d.forecast.mean_q50_mm * scale * 10) / 10,
                max_q90_mm: Math.round(d.forecast.max_q90_mm * scale * 10) / 10,
                peak_q99_mm: Math.round(d.forecast.peak_q99_mm * scale * 10) / 10,
              },
            };
            if (drawerDistrict && drawerDistrict.district_id === districtId) {
              setDrawerDistrict(updated);
            }
            return updated;
          }
          return d;
        })
      );
    }
  };

  return (
    <div className="app-container" style={{ minHeight: "100vh", background: "#0b1329", color: "#f8fafc" }}>
      {/* Operational Header */}
      <header className="operational-header">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <CloudRain size={24} />
          </div>
          <div className="brand-titles">
            <div className="brand-title">
              RegimeRain-AI
              <span className="brand-badge">SIH 2026 PS-80</span>
            </div>
            <div className="brand-subtitle">
              Regime-Aware Rainfall Forecast Correction & Decision-Support System
            </div>
          </div>
        </div>

        <div className="header-meta">
          <div className="meta-item">
            <span className="meta-label">Forecast Cycle</span>
            <span className="meta-value">00:00 UTC (Day 1-3)</span>
          </div>

          <div className="meta-item">
            <span className="meta-label">Active Lead</span>
            <span className="meta-value" style={{ color: "#38bdf8", fontWeight: 700 }}>+{leadHours}h</span>
          </div>

          <div className="meta-item">
            <span className="meta-label">Data Mode</span>
            <span
              className="meta-value"
              style={{
                color: backendConnected ? "#4ade80" : "#fbbf24",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
              }}
            >
              {backendConnected ? "FASTAPI OPERATIONAL PIPELINE" : "SYNTHETIC DEMO SCENARIO"}
            </span>
          </div>

          <div className="status-pill">
            <span className="status-dot" style={{ background: backendConnected ? "#22c55e" : "#eab308" }}></span>
            {backendConnected ? "SYSTEM ONLINE" : "DEMO PREVIEW"}
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav
        className="dashboard-nav"
        style={{
          display: "flex",
          gap: "0.5rem",
          padding: "0.75rem 1.5rem",
          background: "rgba(15, 23, 42, 0.8)",
          borderBottom: "1px solid var(--border-subtle)",
          overflowX: "auto",
        }}
      >
        <button
          onClick={() => setActiveTab("forecast")}
          className={`nav-tab-btn ${activeTab === "forecast" ? "active" : ""}`}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            border: activeTab === "forecast" ? "1px solid #38bdf8" : "1px solid transparent",
            background: activeTab === "forecast" ? "rgba(56, 189, 248, 0.15)" : "transparent",
            color: activeTab === "forecast" ? "#38bdf8" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
          }}
        >
          <Compass size={15} /> Forecast & Spatial Map
        </button>

        <button
          onClick={() => setActiveTab("districts")}
          className={`nav-tab-btn ${activeTab === "districts" ? "active" : ""}`}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            border: activeTab === "districts" ? "1px solid #38bdf8" : "1px solid transparent",
            background: activeTab === "districts" ? "rgba(56, 189, 248, 0.15)" : "transparent",
            color: activeTab === "districts" ? "#38bdf8" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
          }}
        >
          <ListOrdered size={15} /> District Advisories Dossier ({districts.length})
        </button>

        <button
          onClick={() => setActiveTab("comparison")}
          className={`nav-tab-btn ${activeTab === "comparison" ? "active" : ""}`}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            border: activeTab === "comparison" ? "1px solid #38bdf8" : "1px solid transparent",
            background: activeTab === "comparison" ? "rgba(56, 189, 248, 0.15)" : "transparent",
            color: activeTab === "comparison" ? "#38bdf8" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
          }}
        >
          <GitCompare size={15} /> Raw vs Corrected (3-Way)
        </button>

        <button
          onClick={() => setActiveTab("performance")}
          className={`nav-tab-btn ${activeTab === "performance" ? "active" : ""}`}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            border: activeTab === "performance" ? "1px solid #38bdf8" : "1px solid transparent",
            background: activeTab === "performance" ? "rgba(56, 189, 248, 0.15)" : "transparent",
            color: activeTab === "performance" ? "#38bdf8" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
          }}
        >
          <BarChart3 size={15} /> Scientific Verification & Leaderboard
        </button>

        <button
          onClick={() => setActiveTab("datatrust")}
          className={`nav-tab-btn ${activeTab === "datatrust" ? "active" : ""}`}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            border: activeTab === "datatrust" ? "1px solid #38bdf8" : "1px solid transparent",
            background: activeTab === "datatrust" ? "rgba(56, 189, 248, 0.15)" : "transparent",
            color: activeTab === "datatrust" ? "#38bdf8" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
          }}
        >
          <ShieldCheck size={15} /> Data Governance & Zero Leakage
        </button>

        <button
          onClick={() => setActiveTab("methodology")}
          className={`nav-tab-btn ${activeTab === "methodology" ? "active" : ""}`}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            border: activeTab === "methodology" ? "1px solid #38bdf8" : "1px solid transparent",
            background: activeTab === "methodology" ? "rgba(56, 189, 248, 0.15)" : "transparent",
            color: activeTab === "methodology" ? "#38bdf8" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
          }}
        >
          <BookOpen size={15} /> How It Works & Architecture
        </button>
      </nav>

      {/* Human-in-the-Loop Forecaster Banner */}
      <div className="disclaimer-banner">
        <div className="disclaimer-text">
          <AlertTriangle size={15} color="#eab308" />
          <span>
            <strong>IMD OPERATIONAL DECISION SUPPORT:</strong> Soft-gated Mixture of Experts residual architecture (q10 - q99). Continuous Pareto tail inversion (P &gt; 64.5, 115.6, 204.5 mm). All alerts require certified meteorologist sign-off.
          </span>
        </div>
        <div style={{ display: "flex", gap: "1rem", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
          <span>UTC: {currentTime.slice(11, 19)}</span>
          <span>DISTRICTS: {districts.length}</span>
        </div>
      </div>

      {/* TAB 1: FORECAST VIEW (HERO INDIA MAP + ATTENTION ALERTS + TIMELINE) */}
      {activeTab === "forecast" && (
        <ForecastView
          districts={districts}
          prediction={prediction}
          leadHours={leadHours}
          onChangeLeadHours={handleLeadChange}
          activeLayer={activeMapLayer}
          onChangeLayer={setActiveMapLayer}
          selectedDistrictId={selectedDistrictId}
          onSelectDistrict={handleSelectDistrictFromMap}
          onOpenOverride={handleOpenOverride}
          onViewDistrictDetails={handleSelectDistrictFromCatalog}
        />
      )}

      {/* TAB 2: DISTRICTS CATALOG VIEW (SEARCHABLE & FILTERABLE DOSSIER) */}
      {activeTab === "districts" && (
        <DistrictsCatalogView
          districts={districts}
          onSelectDistrict={handleSelectDistrictFromCatalog}
          onOpenOverride={handleOpenOverride}
        />
      )}

      {/* TAB 3: RAW VS CORRECTED COMPARISON */}
      {activeTab === "comparison" && <RawVsCorrectedView />}

      {/* TAB 4: SCIENTIFIC VERIFICATION & LEADERBOARD */}
      {activeTab === "performance" && <PerformanceView />}

      {/* TAB 5: DATA PROVENANCE & ZERO LEAKAGE */}
      {activeTab === "datatrust" && <DataTrustView />}

      {/* TAB 6: HOW IT WORKS & ARCHITECTURE */}
      {activeTab === "methodology" && <HowItWorksView />}

      {/* District Detail Deep-Dive Drawer */}
      <DistrictDetailDrawer
        district={drawerDistrict}
        onClose={() => setDrawerDistrict(null)}
        onOpenOverride={(dist) => handleOpenOverride(dist as any)}
      />

      {/* Certified Duty Forecaster Override Modal */}
      <ForecasterOverrideModal
        isOpen={overrideModalOpen}
        district={districtToOverride}
        onClose={() => setOverrideModalOpen(false)}
        onSubmit={handleApplyOverride}
      />
    </div>
  );
};
export default App;
