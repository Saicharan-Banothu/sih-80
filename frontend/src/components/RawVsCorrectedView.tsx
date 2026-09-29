import React, { useState } from "react";
import {
  GitCompare,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Info,
  Sliders,
  ShieldCheck,
  Compass,
} from "lucide-react";

interface DistrictComparison {
  district_id: string;
  name: string;
  state: string;
  zone: string;
  raw_nwp_median_mm: number;
  global_qm_median_mm: number;
  moe_corrected_median_mm: number;
  correction_delta_mm: number;
  raw_bias_nature: "UNDERESTIMATION" | "OVERESTIMATION" | "TIMING_ERROR";
  physical_mechanism: string;
}

const DISTRICT_COMPARISONS: DistrictComparison[] = [
  {
    district_id: "KL_WAY",
    name: "Wayanad",
    state: "Kerala",
    zone: "WESTERN_GHATS_OROGRAPHIC",
    raw_nwp_median_mm: 64.0,
    global_qm_median_mm: 82.0,
    moe_corrected_median_mm: 113.0,
    correction_delta_mm: +49.0,
    raw_bias_nature: "UNDERESTIMATION",
    physical_mechanism: "Sub-grid steep orographic uplift along windward escarpment underestimated by coarse NWP grid.",
  },
  {
    district_id: "OD_PUR",
    name: "Puri",
    state: "Odisha",
    zone: "MONSOON_DEPRESSION_PATH",
    raw_nwp_median_mm: 68.4,
    global_qm_median_mm: 88.2,
    moe_corrected_median_mm: 114.2,
    correction_delta_mm: +45.8,
    raw_bias_nature: "UNDERESTIMATION",
    physical_mechanism: "Inner convective core of Bay of Bengal monsoon depression smeared across oceanic coastal boundary.",
  },
  {
    district_id: "AP_VSK",
    name: "Visakhapatnam",
    state: "Andhra Pradesh",
    zone: "COASTAL_CONVECTIVE",
    raw_nwp_median_mm: 48.0,
    global_qm_median_mm: 62.0,
    moe_corrected_median_mm: 79.5,
    correction_delta_mm: +31.5,
    raw_bias_nature: "UNDERESTIMATION",
    physical_mechanism: "Mesoscale coastal sea-breeze convergence front underrepresented in hydrostatic NWP parameterization.",
  },
  {
    district_id: "OD_BAL",
    name: "Balasore",
    state: "Odisha",
    zone: "MONSOON_DEPRESSION_PATH",
    raw_nwp_median_mm: 44.0,
    global_qm_median_mm: 54.0,
    moe_corrected_median_mm: 68.4,
    correction_delta_mm: +24.4,
    raw_bias_nature: "UNDERESTIMATION",
    physical_mechanism: "Outer spiral rainband convergence zone bias corrected via soft-gated depression expert.",
  },
  {
    district_id: "MH_NAG",
    name: "Nagpur",
    state: "Maharashtra",
    zone: "CENTRAL_MONSOON_CORE",
    raw_nwp_median_mm: 42.0,
    global_qm_median_mm: 38.0,
    moe_corrected_median_mm: 35.6,
    correction_delta_mm: -6.4,
    raw_bias_nature: "OVERESTIMATION",
    physical_mechanism: "NWP persistent light drizzle bias in lee-side central plateau pruned by neural expert.",
  },
  {
    district_id: "MP_BHO",
    name: "Bhopal",
    state: "Madhya Pradesh",
    zone: "CENTRAL_MONSOON_CORE",
    raw_nwp_median_mm: 36.5,
    global_qm_median_mm: 32.0,
    moe_corrected_median_mm: 28.2,
    correction_delta_mm: -8.3,
    raw_bias_nature: "OVERESTIMATION",
    physical_mechanism: "Convective parameterization scheme triggered premature daytime precipitation over inland plains.",
  },
  {
    district_id: "UP_LKO",
    name: "Lucknow",
    state: "Uttar Pradesh",
    zone: "INDO_GANGETIC_PLAINS",
    raw_nwp_median_mm: 18.0,
    global_qm_median_mm: 14.5,
    moe_corrected_median_mm: 12.0,
    correction_delta_mm: -6.0,
    raw_bias_nature: "OVERESTIMATION",
    physical_mechanism: "Monsoon trough axis displaced south; dry bias corrected for northern plains flank.",
  },
];

export const RawVsCorrectedView: React.FC = () => {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("KL_WAY");
  const [activeMetricTab, setActiveMetricTab] = useState<"bulk" | "extremes" | "spatial">("extremes");

  const activeDistrict = DISTRICT_COMPARISONS.find((d) => d.district_id === selectedDistrictId) || DISTRICT_COMPARISONS[0];

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Top Banner */}
      <div
        style={{
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.8) 100%)",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <GitCompare size={24} color="#38bdf8" />
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                Model Comparison: Raw NWP vs Global QM vs Regime-Gated MoE
              </h1>
            </div>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "#94a3b8", maxWidth: "900px" }}>
              Side-by-side scientific evaluation of deterministic Numerical Weather Prediction (Model A), state-of-the-art empirical Quantile Mapping (Model B), and our proposed synoptic regime-aware neural Mixture of Experts (Model C).
            </p>
          </div>

          <div
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              background: "rgba(234, 179, 8, 0.12)",
              border: "1px solid rgba(234, 179, 8, 0.35)",
              color: "#facc15",
              fontSize: "0.72rem",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
            }}
          >
            SYNTHETIC VALIDATION BENCHMARK
          </div>
        </div>

        {/* 3-Way Model Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginTop: "1.25rem" }}>
          {/* Model A */}
          <div
            style={{
              background: "rgba(2, 6, 23, 0.5)",
              border: "1px solid rgba(248, 113, 113, 0.3)",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f87171" }}>MODEL A: BASELINE</span>
              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Raw Numerical Model</span>
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#f8fafc" }}>Uncorrected Raw NWP</div>
            <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: "0.4rem", lineHeight: 1.4 }}>
              Direct GFS/NCUM model output. Subject to structural hydrostatic smoothing, under-predicting convective extremes and over-predicting light rain frequency.
            </div>
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.75rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
              <div>
                <span style={{ color: "#94a3b8" }}>RMSE:</span> <strong style={{ color: "#f87171" }}>11.37 mm</strong>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>ETS (&gt;64.5):</span> <strong style={{ color: "#f87171" }}>0.371</strong>
              </div>
            </div>
          </div>

          {/* Model B */}
          <div
            style={{
              background: "rgba(2, 6, 23, 0.5)",
              border: "1px solid rgba(250, 204, 21, 0.3)",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#facc15" }}>MODEL B: EMPIRICAL BENCHMARK</span>
              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>Global Quantile Mapping</span>
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#f8fafc" }}>Stationary Global QM (xsdba)</div>
            <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: "0.4rem", lineHeight: 1.4 }}>
              Static cumulative distribution function matching. Corrects bulk climatological distribution but cannot condition corrections on active synoptic regimes.
            </div>
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.75rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
              <div>
                <span style={{ color: "#94a3b8" }}>RMSE:</span> <strong style={{ color: "#facc15" }}>5.34 mm</strong>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>ETS (&gt;64.5):</span> <strong style={{ color: "#facc15" }}>0.671</strong>
              </div>
            </div>
          </div>

          {/* Model C */}
          <div
            style={{
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.5)",
              borderRadius: "8px",
              padding: "1rem",
              boxShadow: "0 4px 15px rgba(56, 189, 248, 0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#38bdf8" }}>MODEL C: PROPOSED SYSTEM</span>
              <span style={{ fontSize: "0.65rem", color: "#4ade80", fontWeight: 700 }}>+81.2% GAIN</span>
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#f8fafc" }}>Regime-Gated Soft MoE</div>
            <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: "0.4rem", lineHeight: 1.4 }}>
              Dynamic routing across 6 regime-conditioned neural experts with continuous Pareto tail inversion and non-crossing monotonic quantiles.
            </div>
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.75rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
              <div>
                <span style={{ color: "#94a3b8" }}>RMSE:</span> <strong style={{ color: "#4ade80" }}>2.13 mm</strong>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>ETS (&gt;64.5):</span> <strong style={{ color: "#4ade80" }}>0.903</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive District Deep-Dive Comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* District Selector List */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            borderRadius: "12px",
            border: "1px solid var(--border-subtle)",
            padding: "1.25rem",
          }}
        >
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 0.75rem" }}>
            Select District for Comparison
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {DISTRICT_COMPARISONS.map((d) => {
              const isSelected = d.district_id === selectedDistrictId;
              const isUnder = d.raw_bias_nature === "UNDERESTIMATION";

              return (
                <div
                  key={d.district_id}
                  onClick={() => setSelectedDistrictId(d.district_id)}
                  style={{
                    padding: "0.75rem 0.9rem",
                    borderRadius: "8px",
                    background: isSelected ? "rgba(56, 189, 248, 0.15)" : "rgba(2, 6, 23, 0.4)",
                    border: isSelected ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.05)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: isSelected ? "#38bdf8" : "#f8fafc" }}>
                        {d.name}
                      </span>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                        {d.state} • {d.zone.replace(/_/g, " ")}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          color: isUnder ? "#4ade80" : "#fbbf24",
                        }}
                      >
                        {d.correction_delta_mm > 0 ? `+${d.correction_delta_mm}` : d.correction_delta_mm} mm
                      </span>
                      <div style={{ fontSize: "0.62rem", color: isUnder ? "#86efac" : "#fde047" }}>
                        {isUnder ? "Boosted" : "Dampened"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Comparative Analysis for Selected District */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            borderRadius: "12px",
            border: "1px solid var(--border-subtle)",
            padding: "1.25rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                    {activeDistrict.name} ({activeDistrict.state})
                  </h2>
                  <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
                    {activeDistrict.district_id}
                  </span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                  Meteorological Zone: {activeDistrict.zone.replace(/_/g, " ")}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    padding: "0.3rem 0.6rem",
                    borderRadius: "6px",
                    background: activeDistrict.raw_bias_nature === "UNDERESTIMATION" ? "rgba(220, 38, 38, 0.15)" : "rgba(234, 179, 8, 0.15)",
                    border: `1px solid ${activeDistrict.raw_bias_nature === "UNDERESTIMATION" ? "#ef4444" : "#eab308"}`,
                    color: activeDistrict.raw_bias_nature === "UNDERESTIMATION" ? "#fca5a5" : "#fef08a",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                  }}
                >
                  Raw NWP: {activeDistrict.raw_bias_nature}
                </span>
              </div>
            </div>

            {/* Visual Value Progression Bar */}
            <div style={{ background: "rgba(2, 6, 23, 0.6)", padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--border-subtle)", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", marginBottom: "0.75rem" }}>
                COMPARATIVE RAINFALL PREDICTION (MEDIAN q50)
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Model A */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ color: "#f87171", fontWeight: 600 }}>Model A: Raw NWP (Uncorrected)</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#f87171", fontWeight: 700 }}>
                      {activeDistrict.raw_nwp_median_mm.toFixed(1)} mm
                    </span>
                  </div>
                  <div style={{ height: "10px", background: "rgba(30, 41, 59, 0.6)", borderRadius: "5px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(activeDistrict.raw_nwp_median_mm / 140) * 100}%`, background: "#f87171", borderRadius: "5px" }} />
                  </div>
                </div>

                {/* Model B */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ color: "#facc15", fontWeight: 600 }}>Model B: Global QM (Stationary)</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#facc15", fontWeight: 700 }}>
                      {activeDistrict.global_qm_median_mm.toFixed(1)} mm
                    </span>
                  </div>
                  <div style={{ height: "10px", background: "rgba(30, 41, 59, 0.6)", borderRadius: "5px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(activeDistrict.global_qm_median_mm / 140) * 100}%`, background: "#facc15", borderRadius: "5px" }} />
                  </div>
                </div>

                {/* Model C */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ color: "#38bdf8", fontWeight: 700 }}>Model C: Regime-Gated MoE (Ours)</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "#38bdf8", fontWeight: 800 }}>
                      {activeDistrict.moe_corrected_median_mm.toFixed(1)} mm
                    </span>
                  </div>
                  <div style={{ height: "12px", background: "rgba(30, 41, 59, 0.6)", borderRadius: "6px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(activeDistrict.moe_corrected_median_mm / 140) * 100}%`,
                        background: "linear-gradient(90deg, #38bdf8, #818cf8)",
                        borderRadius: "6px",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "0.75rem" }}>
                <span style={{ color: "#94a3b8" }}>Net Physics-Conditioned Correction:</span>
                <strong style={{ color: activeDistrict.correction_delta_mm > 0 ? "#4ade80" : "#fbbf24", fontFamily: "var(--font-mono)" }}>
                  {activeDistrict.correction_delta_mm > 0 ? `+${activeDistrict.correction_delta_mm}` : activeDistrict.correction_delta_mm} mm ({Math.abs(Math.round((activeDistrict.correction_delta_mm / activeDistrict.raw_nwp_median_mm) * 100))}%)
                </strong>
              </div>
            </div>

            {/* Physical Mechanism Explainer */}
            <div
              style={{
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                borderRadius: "8px",
                padding: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#38bdf8", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.3rem" }}>
                <Info size={16} /> Physical Diagnostic & Regime Driver:
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                {activeDistrict.physical_mechanism}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Educational Callout: Why Global Quantile Mapping Fails */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.8)",
          borderRadius: "12px",
          border: "1px solid var(--border-subtle)",
          padding: "1.5rem",
        }}
      >
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", margin: "0 0 0.5rem" }}>
          Meteorological Insight: Why Global Quantile Mapping Fails Under Extreme Regimes
        </h3>
        <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "1.25rem", lineHeight: 1.5 }}>
          Conventional post-processing methods rely on stationary transfer functions that map model climatology to observation climatology. In tropical monsoon systems, this assumption fails due to regime transitions:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          <div style={{ background: "rgba(2, 6, 23, 0.4)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <div style={{ fontWeight: 700, color: "#f87171", fontSize: "0.82rem", marginBottom: "0.4rem" }}>
              1. Non-Stationary Dynamics
            </div>
            <p style={{ fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.45, margin: 0 }}>
              The bias pattern during an Active Monsoon (widespread heavy rain) is completely inverted during Break Monsoon or Western Disturbance events. A single global mapping cannot fit both states.
            </p>
          </div>

          <div style={{ background: "rgba(2, 6, 23, 0.4)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <div style={{ fontWeight: 700, color: "#facc15", fontSize: "0.82rem", marginBottom: "0.4rem" }}>
              2. Tail Smearing & False Alarms
            </div>
            <p style={{ fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.45, margin: 0 }}>
              Global QM scales up all higher quantiles uniformly, creating massive false alarm areas in non-precipitating leeward regions whenever an isolated convective cluster occurs nearby.
            </p>
          </div>

          <div style={{ background: "rgba(2, 6, 23, 0.4)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <div style={{ fontWeight: 700, color: "#4ade80", fontSize: "0.82rem", marginBottom: "0.4rem" }}>
              3. The Regime-MoE Advantage
            </div>
            <p style={{ fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.45, margin: 0 }}>
              By dynamically predicting the synoptic regime probability vector and soft-blending specialized residual neural experts, our architecture applies localized corrections calibrated strictly to active physical dynamics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
