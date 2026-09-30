import React, { useState } from "react";
import { CloudRain, ShieldCheck, Lock, User, CheckCircle, ArrowRight, AlertCircle, Sparkles, Building2, Activity, Globe } from "lucide-react";
import { useAuth, DEMO_PRESETS } from "../context/AuthContext";

export const LoginPage: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState<string>("district.officer@demo.regimerain");
  const [password, setPassword] = useState<string>("demo2026");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (!success) {
      setErrorMsg("Invalid credentials. For demonstration access, use password 'demo2026' or select a role card below.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #090e17 0%, #0d1929 50%, #112238 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: "#f8fafc",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top Institutional Header */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(10, 15, 26, 0.6)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 4px 12px rgba(2, 132, 199, 0.35)",
            }}
          >
            <CloudRain size={20} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: "8px" }}>
              RegimeRain-AI
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  background: "rgba(2, 132, 199, 0.2)",
                  color: "#38bdf8",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                }}
              >
                SIH 2026 · PS-80
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              Ministry of Earth Sciences · India Rainfall Intelligence
            </div>
          </div>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#fbbf24",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }}></span>
          DEMONSTRATION ENVIRONMENT
        </div>
      </header>

      {/* Main Login / Role Grid */}
      <main
        style={{
          flex: 1,
          maxWidth: "1160px",
          width: "100%",
          margin: "0 auto",
          padding: "40px 24px",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "48px",
          alignItems: "center",
        }}
      >
        {/* Left Side: System Narrative & Role Cards */}
        <div>
          <div style={{ marginBottom: "28px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#38bdf8",
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "8px",
              }}
            >
              <Globe size={14} />
              Geospatial Decision Support
            </div>
            <h1
              style={{
                fontSize: "30px",
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.25,
                letterSpacing: "-0.5px",
                margin: "0 0 12px 0",
              }}
            >
              Regime-Aware Rainfall Forecast Correction Platform
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              Correcting numerical weather prediction biases using soft-gated mixture of experts across India's six synoptic weather regimes.
            </p>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
              Select Demonstration Role (Instant Access)
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Role: District Officer */}
              <div
                onClick={() => quickLogin("district_officer")}
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#38bdf8")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "rgba(56, 189, 248, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>District Officer</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Local risk intelligence, Puri/Wayanad watchlist & advisories</div>
                  </div>
                </div>
                <ArrowRight size={14} color="#64748b" />
              </div>

              {/* Role: Forecast Analyst */}
              <div
                onClick={() => quickLogin("forecaster")}
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#38bdf8")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "rgba(245, 158, 11, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24" }}>
                    <Activity size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>Forecast Analyst (IMD)</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Raw NWP vs MoE comparison, uncertainty diagnostics, duty forecaster override</div>
                  </div>
                </div>
                <ArrowRight size={14} color="#64748b" />
              </div>

              {/* Role: Disaster Management */}
              <div
                onClick={() => quickLogin("disaster_manager")}
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#38bdf8")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171" }}>
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>Disaster Management (NDRF)</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>National priority ranking, high-risk alerts, 24/48/72h severe outlook</div>
                  </div>
                </div>
                <ArrowRight size={14} color="#64748b" />
              </div>

              {/* Role: Research User */}
              <div
                onClick={() => quickLogin("research")}
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#38bdf8")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "rgba(168, 85, 247, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#c084fc" }}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>Research User (IITM / Academic)</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>6-model leaderboard, ablation diagnostics, bootstrap validation stats</div>
                  </div>
                </div>
                <ArrowRight size={14} color="#64748b" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Institutional Sign In Form */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "14px",
            padding: "32px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff", margin: "0 0 6px 0" }}>
              Sign In to Official Console
            </h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
              Enter demonstration credentials to access the geospatial rainfall dashboard.
            </p>
          </div>

          {errorMsg && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                padding: "10px 12px",
                borderRadius: "8px",
                color: "#fca5a5",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "18px",
              }}
            >
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                Official ID / Email
              </label>
              <div style={{ position: "relative" }}>
                <User size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "#64748b" }} />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. district.officer@demo.regimerain"
                  required
                  style={{
                    width: "100%",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    padding: "10px 12px 10px 38px",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "22px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                Security Credential (Password)
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "#64748b" }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Demo password: demo2026"
                  required
                  style={{
                    width: "100%",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    padding: "10px 12px 10px 38px",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b" }}>
                Default demo password: <code style={{ color: "#38bdf8" }}>demo2026</code>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "#ffffff",
                border: "none",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
                transition: "opacity 0.15s ease",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Authenticating..." : "Sign In to Platform"}
            </button>
          </form>

          <div style={{ marginTop: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "14px", textAlign: "center" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Institutional Evaluation Suite · SIH 2026 Problem Statement 80
            </span>
          </div>
        </div>
      </main>

      {/* Institutional Disclaimer Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "14px 32px",
          textAlign: "center",
          fontSize: "11px",
          color: "#64748b",
          background: "rgba(10, 15, 26, 0.8)",
        }}
      >
        <span>
          <strong>Notice:</strong> This is an academic and technological prototype developed for Smart India Hackathon 2026. Does not issue official statutory warnings. Not connected to live IMD statutory dispatch.
        </span>
      </footer>
    </div>
  );
};
