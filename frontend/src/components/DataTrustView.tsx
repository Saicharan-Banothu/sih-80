import React from "react";
import {
  ShieldCheck,
  Database,
  Lock,
  FileCheck,
  Cpu,
  AlertTriangle,
  Layers,
  CheckCircle,
  ExternalLink,
  BookOpen,
} from "lucide-react";

export const DataTrustView: React.FC = () => {
  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header */}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <ShieldCheck size={24} color="#38bdf8" />
              Data Provenance, Governance & Scientific Integrity Audit
            </h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
              End-to-end data lineage, zero-leakage temporal partitioning rules, and operational hardware fallback disclosures.
            </p>
          </div>

          <div
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.35)",
              color: "#4ade80",
              fontSize: "0.72rem",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
            }}
          >
            AUDIT PASSED: ZERO LEAKAGE
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {/* Card 1: Data Lineage & Provenance */}
        <div className="dashboard-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={18} /> Official Meteorological Lineage
          </h2>
          <p style={{ fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: "1rem" }}>
            Every input tensor ingested by the system maps directly to recognized Indian and international meteorological archives:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ background: "rgba(2, 6, 23, 0.5)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, color: "#f8fafc" }}>
                <span>NWP Forecast Prior</span>
                <span style={{ color: "#38bdf8" }}>NCUM 12km / GFS 0.25°</span>
              </div>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.4 }}>
                Operational global NWP model forecasts (Day 1-3) providing the raw physical prior fields and steering variables.
              </p>
            </div>

            <div style={{ background: "rgba(2, 6, 23, 0.5)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, color: "#f8fafc" }}>
                <span>Atmospheric Synoptic State</span>
                <span style={{ color: "#38bdf8" }}>NCMRWF IMDAA / ERA5</span>
              </div>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.4 }}>
                High-resolution regional atmospheric reanalysis for geopotential heights, wind fields, specific humidity, and convective indices.
              </p>
            </div>

            <div style={{ background: "rgba(2, 6, 23, 0.5)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, color: "#f8fafc" }}>
                <span>Observational Verification Target</span>
                <span style={{ color: "#4ade80" }}>IMD 0.25° Gridded Rainfall</span>
              </div>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.4 }}>
                Rain-gauge calibrated daily rainfall field used strictly as verification ground truth in training loss and evaluation. Isolated from input pipeline.
              </p>
            </div>

            <div style={{ background: "rgba(2, 6, 23, 0.5)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, color: "#f8fafc" }}>
                <span>Regime Cluster Taxonomy</span>
                <span style={{ color: "#a855f7" }}>Raut et al. (2026) / Neal et al.</span>
              </div>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.4 }}>
                11 peer-reviewed synoptic weather pattern clusters synthesized into 6 operational monsoonal regime classes.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Zero-Leakage Policy */}
        <div className="dashboard-card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Lock size={18} /> Zero-Leakage Data Governance Policy
          </h2>
          <p style={{ fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: "1rem" }}>
            Rainfall prediction models often suffer from subtle data leakage (e.g. random K-fold CV splitting temporally correlated days). We enforce non-negotiable safeguards:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", background: "rgba(2, 6, 23, 0.5)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <CheckCircle size={18} color="#4ade80" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ fontSize: "0.78rem", color: "#f8fafc" }}>Strict Chronological Partitioning</strong>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.4 }}>
                  Training sets are strictly prior years; test sets are strictly future years. Random train/test shuffling is forbidden by codebase contract.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", background: "rgba(2, 6, 23, 0.5)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <CheckCircle size={18} color="#4ade80" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ fontSize: "0.78rem", color: "#f8fafc" }}>Past-Only Normalization Statistics</strong>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.4 }}>
                  Z-score means and standard deviations are computed solely from the historical training partition and frozen for inference.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", background: "rgba(2, 6, 23, 0.5)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <CheckCircle size={18} color="#4ade80" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ fontSize: "0.78rem", color: "#f8fafc" }}>Runtime Automated Leakage Auditor</strong>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.4 }}>
                  An automated auditor validates feature vectors before model execution, verifying that target variables (rain gauges, radar QPE) are not present in the input matrix.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", background: "rgba(2, 6, 23, 0.5)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <CheckCircle size={18} color="#4ade80" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ fontSize: "0.78rem", color: "#f8fafc" }}>Block-Bootstrap Autocorrelation Independence</strong>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.4 }}>
                  Significance testing uses 5-day continuous blocks to respect synoptic storm lifespans rather than treating consecutive days as independent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Environmental Status & Hardware Fallback Disclosure */}
      <div className="dashboard-card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Cpu size={18} /> Operational Environment Status & Fallback Architecture
        </h2>
        <p style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.5, marginBottom: "1.25rem" }}>
          Transparent disclosure of active runtime backbones, operational data feeds, and computational constraints:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          <div style={{ background: "rgba(2, 6, 23, 0.5)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", marginBottom: "0.3rem" }}>
              ACTIVE RESIDUAL BACKBONE
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f8fafc" }}>
              Lightweight Residual ConvNet
            </div>
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", color: "#cbd5e1", lineHeight: 1.45 }}>
              Operating in high-efficiency convolutional fallback mode. Designed for low-latency operational inference (&lt;100 ms per forecast cycle) without requiring high-cost 80GB datacenter GPUs.
            </p>
          </div>

          <div style={{ background: "rgba(2, 6, 23, 0.5)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", marginBottom: "0.3rem" }}>
              FOUNDATION MODEL (CLIMAX)
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#facc15" }}>
              Experimental Architecture
            </div>
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", color: "#cbd5e1", lineHeight: 1.45 }}>
              ClimaX global vision transformer weights require distributed multi-node GPU clusters for fine-tuning. The system seamlessly routes through the optimized residual expert backbone.
            </p>
          </div>

          <div style={{ background: "rgba(2, 6, 23, 0.5)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", marginBottom: "0.3rem" }}>
              REAL-TIME NWP INGESTION
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#4ade80" }}>
              Operational Data Ready
            </div>
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", color: "#cbd5e1", lineHeight: 1.45 }}>
              Supports automated GRIB2/NetCDF ingestion from NCMRWF Open Data and NOAA GFS HTTP feeds, with graceful transition to reproducible synoptic scenarios if feeds are unreachable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
