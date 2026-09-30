import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  role: string;
  role_key: "district_officer" | "forecaster" | "disaster_manager" | "policy" | "research";
  organization: string;
  assigned_districts: string[];
  capabilities: string[];
}

export const DEMO_PRESETS: Record<string, UserProfile> = {
  district_officer: {
    user_id: "usr_dist_01",
    email: "district.officer@demo.regimerain",
    name: "Dr. A. Verma",
    role: "District Officer",
    role_key: "district_officer",
    organization: "Odisha Disaster Management Authority (OSDMA)",
    assigned_districts: ["OD_PUR", "KL_WAY"],
    capabilities: [
      "view_forecast",
      "view_districts",
      "view_alerts",
      "manage_watchlist",
      "district_intelligence",
    ],
  },
  forecaster: {
    user_id: "usr_fcst_01",
    email: "forecaster@demo.regimerain",
    name: "S. Banerjee",
    role: "Forecast Analyst",
    role_key: "forecaster",
    organization: "India Meteorological Department (IMD)",
    assigned_districts: ["ALL"],
    capabilities: [
      "view_forecast",
      "view_districts",
      "view_alerts",
      "manage_watchlist",
      "view_regimes",
      "view_diagnostics",
      "forecaster_override",
      "view_audit_trail",
    ],
  },
  disaster_manager: {
    user_id: "usr_ndrf_01",
    email: "disaster.manager@demo.regimerain",
    name: "R. K. Meena",
    role: "Disaster Management",
    role_key: "disaster_manager",
    organization: "National Disaster Response Force (NDRF)",
    assigned_districts: ["ALL"],
    capabilities: [
      "view_forecast",
      "view_districts",
      "view_alerts",
      "manage_watchlist",
      "national_overview",
      "priority_dispatch",
      "multi_horizon_outlook",
    ],
  },
  policy: {
    user_id: "usr_moes_01",
    email: "policy@demo.regimerain",
    name: "P. Iyer",
    role: "Policy / Administration",
    role_key: "policy",
    organization: "Ministry of Earth Sciences (MoES)",
    assigned_districts: ["ALL"],
    capabilities: [
      "view_forecast",
      "view_districts",
      "view_alerts",
      "state_summaries",
      "national_risk_overview",
    ],
  },
  research: {
    user_id: "usr_res_01",
    email: "research@demo.regimerain",
    name: "Dr. K. Swaminathan",
    role: "Research User",
    role_key: "research",
    organization: "Indian Institute of Tropical Meteorology (IITM)",
    assigned_districts: ["ALL"],
    capabilities: [
      "view_forecast",
      "view_districts",
      "view_alerts",
      "view_regimes",
      "view_verification",
      "model_diagnostics",
      "ablation_benchmarks",
    ],
  },
};

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  quickLogin: (roleKey: keyof typeof DEMO_PRESETS) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem("regimerain_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("regimerain_token") || null;
  });

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: pass }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem("regimerain_user", JSON.stringify(data.user));
        localStorage.setItem("regimerain_token", data.token);
        return true;
      }
    } catch (err) {
      console.warn("Backend login failed, attempting local fallback verification:", err);
    }

    // Local client-side demo fallback if backend offline
    const cleanEmail = email.trim().toLowerCase();
    const matchedRole = Object.values(DEMO_PRESETS).find((p) => p.email === cleanEmail);
    if (matchedRole && pass === "demo2026") {
      const simulatedToken = `demo_jwt_${matchedRole.user_id}`;
      setUser(matchedRole);
      setToken(simulatedToken);
      localStorage.setItem("regimerain_user", JSON.stringify(matchedRole));
      localStorage.setItem("regimerain_token", simulatedToken);
      return true;
    }

    return false;
  };

  const quickLogin = (roleKey: keyof typeof DEMO_PRESETS) => {
    const preset = DEMO_PRESETS[roleKey];
    if (preset) {
      const simulatedToken = `demo_jwt_${preset.user_id}`;
      setUser(preset);
      setToken(simulatedToken);
      localStorage.setItem("regimerain_user", JSON.stringify(preset));
      localStorage.setItem("regimerain_token", simulatedToken);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("regimerain_user");
    localStorage.removeItem("regimerain_token");
    fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        quickLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
