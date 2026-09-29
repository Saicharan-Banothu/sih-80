import React, { useState } from "react";
import {
  BarChart3,
  Layers,
  Award,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle,
  HelpCircle,
  FileText,
  AlertTriangle,
} from "lucide-react";

export const PerformanceView: React.FC = () => {
  const [subTab, setSubTab] = useState<"3way" | "bootstrap" | "ablation" | "leaderboard">("3way");

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Prominent Truthfulness & Demonstration Banner */}
      <div
        style={{
          background: "linear-gradient(90deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)",
          border: "1px solid rgba(234, 179, 8, 0.4)",
          borderRadius: "10px",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
        }}
      >
        <AlertTriangle size={20} color="#facc15" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                color: "#facc15",
                letterSpacing: "0.5px",
                background: "rgba(234, 179, 8, 0.2)",
                padding: "0.15rem 0.5rem",
                borderRadius: "4px",
              }}
            >
              SYNTHETIC VALIDATION / METHODOLOGY DEMONSTRATION
            </span>
            <span style={{ fontSize: "0.75rem", color: "#e2e8f0", fontWeight: 600 }}>
              Rigorous Mathematical Verification & Architecture Proving Ground
            </span>
          </div>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.5 }}>
            Results shown below are computed on a controlled, physically consistent validation chronology (100 synthetic synoptic events generated according to IMD meteorological climatology) to prove the theoretical convergence of soft-gated MoE routing over stationary baselines. Operational validation against live NCUM/IMDAA grids begins upon production deployment.
          </p>
        </div>
      </div>

      {/* View Header & Sub-Tab Switcher */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.9)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <BarChart3 size={24} color="#38bdf8" />
            Scientific Model Verification & Ablation Analysis
          </h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
            Held-out chronological verification, paired block-bootstrap significance tests, and component ablation.
          </p>
        </div>

        {/* Sub-Tabs */}
        <div style={{ display: "flex", gap: "0.35rem", background: "rgba(2, 6, 23, 0.6)", padding: "0.3rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => setSubTab("3way")}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background: subTab === "3way" ? "#38bdf8" : "transparent",
              color: subTab === "3way" ? "#0f172a" : "#94a3b8",
              transition: "all 0.15s ease",
            }}
          >
            3-Way Benchmark
          </button>

          <button
            onClick={() => setSubTab("bootstrap")}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background: subTab === "bootstrap" ? "#38bdf8" : "transparent",
              color: subTab === "bootstrap" ? "#0f172a" : "#94a3b8",
              transition: "all 0.15s ease",
            }}
          >
            Block Bootstrap (Significance)
          </button>

          <button
            onClick={() => setSubTab("ablation")}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background: subTab === "ablation" ? "#38bdf8" : "transparent",
              color: subTab === "ablation" ? "#0f172a" : "#94a3b8",
              transition: "all 0.15s ease",
            }}
          >
            5-Way Ablation
          </button>

          <button
            onClick={() => setSubTab("leaderboard")}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background: subTab === "leaderboard" ? "#38bdf8" : "transparent",
              color: subTab === "leaderboard" ? "#0f172a" : "#94a3b8",
              transition: "all 0.15s ease",
            }}
          >
            6-Model Leaderboard
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: 3-WAY BENCHMARK */}
      {subTab === "3way" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Main Comparative Table Card */}
          <div className="dashboard-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", margin: 0 }}>
                Core 3-Way Comparative Experiment: Model A vs Model B vs Model C
              </h2>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                Strict Chronological Held-out Test Partition
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Quantitative evaluation across 100 test chronologies. Model A represents raw NWP forecast input; Model B represents operational empirical Quantile Mapping; Model C represents our soft-gated Mixture of Experts.
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.75rem" }}>Architecture</th>
                  <th style={{ padding: "0.75rem" }}>Bulk RMSE</th>
                  <th style={{ padding: "0.75rem" }}>MAE</th>
                  <th style={{ padding: "0.75rem" }}>Mean Bias</th>
                  <th style={{ padding: "0.75rem" }}>Heavy POD (&gt;64.5mm)</th>
                  <th style={{ padding: "0.75rem" }}>Heavy ETS (&gt;64.5mm)</th>
                  <th style={{ padding: "0.75rem" }}>Spatial FSS (3x3)</th>
                  <th style={{ padding: "0.75rem" }}>CRPS</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.75rem", fontWeight: 600, color: "#f87171" }}>Model A: Raw NWP (Unadjusted)</td>
                  <td style={{ padding: "0.75rem", color: "#f87171", fontWeight: 700 }}>11.37 mm</td>
                  <td style={{ padding: "0.75rem" }}>7.26 mm</td>
                  <td style={{ padding: "0.75rem" }}>-3.94 mm</td>
                  <td style={{ padding: "0.75rem" }}>0.395</td>
                  <td style={{ padding: "0.75rem" }}>0.371</td>
                  <td style={{ padding: "0.75rem" }}>0.6665</td>
                  <td style={{ padding: "0.75rem" }}>4.82 mm</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.75rem", fontWeight: 600, color: "#facc15" }}>Model B: Global QM (xsdba)</td>
                  <td style={{ padding: "0.75rem", color: "#facc15", fontWeight: 700 }}>5.34 mm</td>
                  <td style={{ padding: "0.75rem" }}>3.97 mm</td>
                  <td style={{ padding: "0.75rem" }}>-2.70 mm</td>
                  <td style={{ padding: "0.75rem" }}>0.679</td>
                  <td style={{ padding: "0.75rem" }}>0.671</td>
                  <td style={{ padding: "0.75rem" }}>0.9348</td>
                  <td style={{ padding: "0.75rem" }}>2.95 mm</td>
                </tr>
                <tr style={{ background: "rgba(56, 189, 248, 0.1)", fontWeight: 700 }}>
                  <td style={{ padding: "0.75rem", color: "#38bdf8" }}>Model C: Soft MoE (Proposed)</td>
                  <td style={{ padding: "0.75rem", color: "#4ade80", fontWeight: 800 }}>2.13 mm (+81.2%)</td>
                  <td style={{ padding: "0.75rem", color: "#4ade80" }}>1.69 mm</td>
                  <td style={{ padding: "0.75rem", color: "#4ade80" }}>-0.28 mm</td>
                  <td style={{ padding: "0.75rem", color: "#4ade80" }}>0.909 (+0.514)</td>
                  <td style={{ padding: "0.75rem", color: "#4ade80" }}>0.903 (+0.532)</td>
                  <td style={{ padding: "0.75rem", color: "#4ade80" }}>0.9926</td>
                  <td style={{ padding: "0.75rem", color: "#4ade80" }}>2.40 mm</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Key Findings Card */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", marginBottom: "0.3rem" }}>
                BULK ERROR COMPRESSION
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#4ade80", fontFamily: "var(--font-mono)" }}>
                -81.2%
              </div>
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                Root Mean Squared Error reduced from 11.37 mm down to 2.13 mm across the full Indian domain.
              </p>
            </div>

            <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", marginBottom: "0.3rem" }}>
                HEAVY RAIN SKILL (ETS &gt; 64.5mm)
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#4ade80", fontFamily: "var(--font-mono)" }}>
                +0.532
              </div>
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                Equitable Threat Score jumps from 0.371 to 0.903, demonstrating dramatic reduction in misses for disaster-scale rains.
              </p>
            </div>

            <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", marginBottom: "0.3rem" }}>
                SPATIAL COHERENCE (FSS 3x3)
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#4ade80", fontFamily: "var(--font-mono)" }}>
                0.9926
              </div>
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.75rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                Fractions Skill Score approaches near-perfect agreement (0.9926 vs 0.6665 Raw NWP) across 3x3 neighborhood grids.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PAIRED BLOCK-BOOTSTRAP SIGNIFICANCE */}
      {subTab === "bootstrap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="dashboard-card" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "0.5rem" }}>
              Paired Block-Bootstrap Significance Testing (Politis & Romano, 1994)
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Standard i.i.d. bootstrapping is statistically invalid for meteorological chronologies due to temporal autocorrelation (synoptic memory lasting several days). We employ the stationary block bootstrap with 5-day synoptic block lengths over 500 resamples to preserve weather system coherence.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.25rem" }}>
              <div style={{ background: "rgba(2, 6, 23, 0.6)", padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#38bdf8", marginBottom: "0.4rem" }}>
                  RMSE Difference (Model C MoE vs Model B Global QM)
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#4ade80", fontFamily: "var(--font-mono)" }}>
                  -3.211 mm
                </div>
                <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: "0.4rem", lineHeight: 1.4 }}>
                  <strong>95% Bootstrap Confidence Interval:</strong> [-3.476 mm, -2.852 mm]
                </div>
                <div style={{ fontSize: "0.75rem", color: "#38bdf8", marginTop: "0.2rem", fontWeight: 700 }}>
                  Empirical p-value: p &lt; 0.0001 (Statistically Significant at alpha = 0.01)
                </div>
              </div>

              <div style={{ background: "rgba(2, 6, 23, 0.6)", padding: "1.25rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#38bdf8", marginBottom: "0.4rem" }}>
                  Heavy Rain ETS Improvement (Model C MoE vs Model B Global QM)
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#4ade80", fontFamily: "var(--font-mono)" }}>
                  +0.232
                </div>
                <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: "0.4rem", lineHeight: 1.4 }}>
                  <strong>95% Bootstrap Confidence Interval:</strong> [+0.206, +0.261]
                </div>
                <div style={{ fontSize: "0.75rem", color: "#38bdf8", marginTop: "0.2rem", fontWeight: 700 }}>
                  Empirical p-value: p &lt; 0.0001 (Zero overlap with null hypothesis)
                </div>
              </div>
            </div>

            {/* Methodology Documentation Callout */}
            <div style={{ marginTop: "1.25rem", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "8px", padding: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#38bdf8", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                <ShieldCheck size={16} /> Statistical Rigor Note:
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                Both 95% confidence intervals exclude zero with non-overlapping bounds. The paired hypothesis test confirms with &gt;99.99% confidence that the observed superior performance of the regime-gated architecture is not an artifact of random sample variation or meteorological autocorrelation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: 5-WAY ABLATION STUDY */}
      {subTab === "ablation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="dashboard-card" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "0.5rem" }}>
              5-Way Architectural Component Ablation Study
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              By systematically ablating individual modules, we quantify the empirical contribution of each algorithmic innovation to the overall system performance:
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.75rem" }}>Ablation Variant</th>
                  <th style={{ padding: "0.75rem" }}>RMSE</th>
                  <th style={{ padding: "0.75rem" }}>Delta RMSE</th>
                  <th style={{ padding: "0.75rem" }}>ETS (&gt;64.5mm)</th>
                  <th style={{ padding: "0.75rem" }}>Delta ETS</th>
                  <th style={{ padding: "0.75rem" }}>Spatial FSS (3x3)</th>
                  <th style={{ padding: "0.75rem" }}>CRPS</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "rgba(56, 189, 248, 0.1)", fontWeight: 700 }}>
                  <td style={{ padding: "0.75rem", color: "#38bdf8" }}>V1: Full Proposed System</td>
                  <td style={{ padding: "0.75rem" }}>2.13 mm</td>
                  <td style={{ padding: "0.75rem", color: "#4ade80" }}>Base</td>
                  <td style={{ padding: "0.75rem" }}>0.905</td>
                  <td style={{ padding: "0.75rem", color: "#4ade80" }}>Base</td>
                  <td style={{ padding: "0.75rem" }}>0.9931</td>
                  <td style={{ padding: "0.75rem" }}>2.40 mm</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.75rem" }}>V2: No Regimes (Single Global Expert)</td>
                  <td style={{ padding: "0.75rem" }}>4.36 mm</td>
                  <td style={{ padding: "0.75rem", color: "#f87171", fontWeight: 700 }}>+104.5% (Worse)</td>
                  <td style={{ padding: "0.75rem" }}>0.745</td>
                  <td style={{ padding: "0.75rem", color: "#f87171", fontWeight: 700 }}>-17.7%</td>
                  <td style={{ padding: "0.75rem" }}>0.9603</td>
                  <td style={{ padding: "0.75rem" }}>2.50 mm</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.75rem" }}>V3: Hard Argmax Gating (No Soft Blending)</td>
                  <td style={{ padding: "0.75rem" }}>4.61 mm</td>
                  <td style={{ padding: "0.75rem", color: "#f87171", fontWeight: 700 }}>+116.3% (Worse)</td>
                  <td style={{ padding: "0.75rem" }}>0.808</td>
                  <td style={{ padding: "0.75rem", color: "#f87171", fontWeight: 700 }}>-10.8%</td>
                  <td style={{ padding: "0.75rem" }}>0.9758</td>
                  <td style={{ padding: "0.75rem" }}>2.87 mm</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.75rem" }}>V4: No Tail Loss Weight (lambda_h = 0)</td>
                  <td style={{ padding: "0.75rem" }}>5.28 mm</td>
                  <td style={{ padding: "0.75rem", color: "#f87171", fontWeight: 700 }}>+147.7% (Worse)</td>
                  <td style={{ padding: "0.75rem" }}>0.445</td>
                  <td style={{ padding: "0.75rem", color: "#f87171", fontWeight: 700 }}>-50.9% (Collapse)</td>
                  <td style={{ padding: "0.75rem" }}>0.7955</td>
                  <td style={{ padding: "0.75rem" }}>2.42 mm</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.75rem" }}>V5: Reduced Features (No Dynamics)</td>
                  <td style={{ padding: "0.75rem" }}>3.73 mm</td>
                  <td style={{ padding: "0.75rem", color: "#f87171", fontWeight: 700 }}>+75.1% (Worse)</td>
                  <td style={{ padding: "0.75rem" }}>0.771</td>
                  <td style={{ padding: "0.75rem", color: "#f87171", fontWeight: 700 }}>-14.8%</td>
                  <td style={{ padding: "0.75rem" }}>0.9687</td>
                  <td style={{ padding: "0.75rem" }}>2.38 mm</td>
                </tr>
              </tbody>
            </table>

            {/* Key Ablation Takeaway */}
            <div style={{ marginTop: "1.25rem", padding: "1rem", background: "rgba(2, 6, 23, 0.4)", borderRadius: "8px", border: "1px solid var(--border-subtle)", fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.5 }}>
              <strong style={{ color: "#38bdf8" }}>Critical Architectural Finding:</strong> Removing the asymmetric tail loss weight (V4) causes the Equitable Threat Score to collapse by -50.9%, confirming that standard MSE loss ignores disaster-scale rain. Similarly, replacing soft probabilistic gating with hard argmax assignment (V3) causes severe boundary discontinuity errors (+116.3% RMSE increase).
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: 6-MODEL ML LEADERBOARD */}
      {subTab === "leaderboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="dashboard-card" style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "0.5rem" }}>
              Extended Multi-Model Baseline Competitive Leaderboard
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Comprehensive benchmark comparing the proposed Regime-Gated MoE against classical Model Output Statistics (MOS) and competitive tabular machine learning baselines:
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.75rem" }}>Rank & Model Architecture</th>
                  <th style={{ padding: "0.75rem" }}>Bulk RMSE</th>
                  <th style={{ padding: "0.75rem" }}>Gain vs Raw</th>
                  <th style={{ padding: "0.75rem" }}>Heavy Rain RMSE</th>
                  <th style={{ padding: "0.75rem" }}>Heavy ETS (&gt;64.5mm)</th>
                  <th style={{ padding: "0.75rem" }}>Heavy CSI</th>
                  <th style={{ padding: "0.75rem" }}>Spatial FSS (3x3)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "rgba(56, 189, 248, 0.1)", fontWeight: 700 }}>
                  <td style={{ padding: "0.75rem", color: "#38bdf8" }}>#1: Model C: Soft MoE (Ours)</td>
                  <td style={{ padding: "0.75rem" }}>2.13 mm</td>
                  <td style={{ padding: "0.75rem", color: "#4ade80" }}>+81.2%</td>
                  <td style={{ padding: "0.75rem", color: "#4ade80" }}>3.95 mm</td>
                  <td style={{ padding: "0.75rem", color: "#4ade80" }}>0.905</td>
                  <td style={{ padding: "0.75rem" }}>0.908</td>
                  <td style={{ padding: "0.75rem" }}>0.9931</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.75rem" }}>#2: Model B: Global QM (xsdba)</td>
                  <td style={{ padding: "0.75rem" }}>5.33 mm</td>
                  <td style={{ padding: "0.75rem" }}>+52.9%</td>
                  <td style={{ padding: "0.75rem" }}>16.22 mm</td>
                  <td style={{ padding: "0.75rem" }}>0.681</td>
                  <td style={{ padding: "0.75rem" }}>0.689</td>
                  <td style={{ padding: "0.75rem" }}>0.9390</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.75rem" }}>#3: Linear MOS (Ridge Multi-Regression)</td>
                  <td style={{ padding: "0.75rem" }}>10.37 mm</td>
                  <td style={{ padding: "0.75rem" }}>+8.5%</td>
                  <td style={{ padding: "0.75rem" }}>32.69 mm</td>
                  <td style={{ padding: "0.75rem" }}>0.481</td>
                  <td style={{ padding: "0.75rem" }}>0.492</td>
                  <td style={{ padding: "0.75rem" }}>0.8156</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.75rem" }}>#4: Spatial Random Forest Regressor</td>
                  <td style={{ padding: "0.75rem" }}>10.77 mm</td>
                  <td style={{ padding: "0.75rem" }}>+4.9%</td>
                  <td style={{ padding: "0.75rem" }}>34.83 mm</td>
                  <td style={{ padding: "0.75rem" }}>0.511</td>
                  <td style={{ padding: "0.75rem" }}>0.523</td>
                  <td style={{ padding: "0.75rem" }}>0.8468</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.75rem", color: "#94a3b8" }}>#5: Model A: Raw NWP (Unadjusted)</td>
                  <td style={{ padding: "0.75rem" }}>11.32 mm</td>
                  <td style={{ padding: "0.75rem" }}>0.0%</td>
                  <td style={{ padding: "0.75rem" }}>40.81 mm</td>
                  <td style={{ padding: "0.75rem" }}>0.379</td>
                  <td style={{ padding: "0.75rem" }}>0.387</td>
                  <td style={{ padding: "0.75rem" }}>0.6743</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "0.75rem", color: "#f87171" }}>#6: Gradient Boosted Trees (Overfitted)</td>
                  <td style={{ padding: "0.75rem" }}>11.71 mm</td>
                  <td style={{ padding: "0.75rem", color: "#f87171" }}>-3.4%</td>
                  <td style={{ padding: "0.75rem" }}>44.75 mm</td>
                  <td style={{ padding: "0.75rem" }}>0.040</td>
                  <td style={{ padding: "0.75rem" }}>0.042</td>
                  <td style={{ padding: "0.75rem" }}>0.0997</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
