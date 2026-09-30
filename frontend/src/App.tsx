import React, { useEffect, useState, useCallback } from "react";
import {
  CloudRain,
  Compass,
  AlertTriangle,
  Clock,
  ListOrdered,
  Search,
  Star,
  RefreshCw,
  MapPin,
  CheckCircle,
  Bell,
  GitCompare,
  BarChart2,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { ForecastView } from "./components/ForecastView";
import { DistrictsCatalogView } from "./components/DistrictsCatalogView";
import { AlertsView } from "./components/AlertsView";
import { RawVsCorrectedView } from "./components/RawVsCorrectedView";
import { PerformanceView } from "./components/PerformanceView";
import { DistrictDetailDrawer } from "./components/DistrictDetailDrawer";
import { ForecasterOverrideModal } from "./components/ForecasterOverrideModal";
import { MapLayerType, DistrictAdvisory } from "./components/IndiaMap";
import { LoginPage } from "./components/LoginPage";
import { useAuth } from "./context/AuthContext";

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
  mode_label?: string;
}

export const App: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"forecast" | "districts" | "alerts" | "comparison" | "benchmarks">("forecast");
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [districts, setDistricts] = useState<DistrictAdvisory[]>([]);
  const [prediction, setPrediction] = useState<ForecastPrediction | null>(null);
  const [leadHours, setLeadHours] = useState<number>(24);
  const [activeMapLayer, setActiveMapLayer] = useState<MapLayerType>("RAIN");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);


  // Watchlist state
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("regimerain_watchlist");
      return saved ? JSON.parse(saved) : ["OD_PUR", "KL_WAY"];
    } catch {
      return ["OD_PUR", "KL_WAY"];
    }
  });

  const toggleWatchlist = (id: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem("regimerain_watchlist", JSON.stringify(next));
      } catch (e) {
        console.warn("Storage error", e);
      }
      return next;
    });
  };

  // Deep dive drawer state
  const [drawerDistrict, setDrawerDistrict] = useState<DistrictAdvisory | null>(null);

  // Forecaster override modal state
  const [overrideModalOpen, setOverrideModalOpen] = useState<boolean>(false);
  const [districtToOverride, setDistrictToOverride] = useState<DistrictAdvisory | null>(null);

  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toISOString());

  // Search in header
  const [headerSearch, setHeaderSearch] = useState<string>("");

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
      // High-quality fallback operational scenario
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
        model_version: "JointRegimeAware-v1",
        mode_label: "OPERATIONAL DEMONSTRATION",
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
            prob_heavy_64_5mm: 0.762,
            prob_very_heavy_115_6mm: 0.641,
            prob_extreme_204_5mm: 0.395,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "RED",
            severity: 4,
            action_text: "Take Action (RED WARNING): Landfall of monsoon depression. Severe urban and coastal inundation expected.",
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
            summary: "Coastal landfall of monsoon depression with deep cyclonic circulation and high Bay of Bengal moisture influx.",
            synoptic_regime: "Monsoon Depression / Low Pressure",
            primary_driver: "Intense 850 hPa cyclonic vorticity coupled with direct onshore moisture convergence.",
            bias_adjustment: "Standard numerical forecasts underrepresented inner-core convective rainbands; corrected based on observed regime behavior.",
            risk_verdict: "High flash flood and tidal waterlogging hazard. Immediate response and drainage clearing required.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 114.2, risk_color: "#ef4444" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 78.4, risk_color: "#f97316" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 32.1, risk_color: "#eab308" },
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
            prob_heavy_64_5mm: 0.715,
            prob_very_heavy_115_6mm: 0.584,
            prob_extreme_204_5mm: 0.342,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "RED",
            severity: 4,
            action_text: "Take Action (RED WARNING): Extremely heavy orographic rainfall. Severe risk of flash floods and landslides on slopes.",
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
            summary: "Vigorous low-level cross-equatorial monsoon jet impingement on steep Western Ghats mountain slopes.",
            synoptic_regime: "Western Ghats Topographic Uplift",
            primary_driver: "Westerly winds exceeding 35 knots with moisture flux > 400 kg/(m s).",
            bias_adjustment: "Standard numerical models smoothed topography; regime correction captures windward valley concentration.",
            risk_verdict: "High landslide susceptibility on tea plantation slopes. Evacuation of vulnerable hillside communities advised.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 113.0, risk_color: "#ef4444" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 92.5, risk_color: "#ef4444" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 45.0, risk_color: "#eab308" },
          ],
        },
        {
          district_id: "MH_RAT",
          name: "Ratnagiri",
          state: "Maharashtra",
          zone: "WESTERN_GHATS_OROGRAPHIC",
          lat: 16.99,
          lon: 73.3,
          area_sq_km: 8208,
          forecast: {
            mean_q50_mm: 96.5,
            likely_range_q25_q75: [72.0, 122.0],
            max_q90_mm: 148.0,
            peak_q99_mm: 215.0,
            prob_heavy_64_5mm: 0.69,
            prob_very_heavy_115_6mm: 0.52,
            prob_extreme_204_5mm: 0.28,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "RED",
            severity: 4,
            action_text: "Take Action (RED WARNING): Intense coastal orographic surge. Risk of riverine flash inundation.",
            dominant_regime: "OROGRAPHIC_WESTERN_GHATS",
          },
          comparison: {
            raw_nwp_median_mm: 55.0,
            global_qm_median_mm: 72.0,
            moe_corrected_median_mm: 96.5,
            correction_delta_mm: 41.5,
            nwp_bias_corrected: "Coastal slope underestimation corrected",
          },
          explanation: {
            summary: "Konkan coastal convergence channel feeding sustained rainbands into coastal foothills.",
            synoptic_regime: "Western Ghats Topographic Uplift",
            primary_driver: "Offshore trough along the west coast sustaining moist convective towers.",
            bias_adjustment: "Regime-based correction restores intense precipitation on western slopes.",
            risk_verdict: "High risk of flash flooding in coastal rivers. Keep relief teams alerted.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 96.5, risk_color: "#ef4444" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 82.0, risk_color: "#ef4444" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 38.0, risk_color: "#eab308" },
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
            global_qm_median_mm: 61.0,
            moe_corrected_median_mm: 79.5,
            correction_delta_mm: 31.5,
            nwp_bias_corrected: "Underestimation (+31.5 mm correction applied)",
          },
          explanation: {
            summary: "Coastal convergence feeder bands wrapping into the depression circulation.",
            synoptic_regime: "Coastal Convective Convergence",
            primary_driver: "Localized onshore breeze convergence interacting with tropical depression outer bands.",
            bias_adjustment: "Corrected for coastal thermal boundary moisture pooling.",
            risk_verdict: "Moderate-to-high urban waterlogging in low-lying coastal areas.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 79.5, risk_color: "#f97316" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 52.0, risk_color: "#eab308" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 20.0, risk_color: "#22c55e" },
          ],
        },
        {
          district_id: "MH_MUM",
          name: "Mumbai Suburban",
          state: "Maharashtra",
          zone: "WESTERN_GHATS_OROGRAPHIC",
          lat: 19.12,
          lon: 72.85,
          area_sq_km: 446,
          forecast: {
            mean_q50_mm: 72.0,
            likely_range_q25_q75: [48.0, 95.0],
            max_q90_mm: 110.0,
            peak_q99_mm: 160.0,
            prob_heavy_64_5mm: 0.58,
            prob_very_heavy_115_6mm: 0.35,
            prob_extreme_204_5mm: 0.08,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "ORANGE",
            severity: 3,
            action_text: "Be Prepared (ORANGE ALERT): Heavy downpours during high tide windows. Urban transit disruptions likely.",
            dominant_regime: "COASTAL_CONVECTIVE",
          },
          comparison: {
            raw_nwp_median_mm: 42.0,
            global_qm_median_mm: 54.0,
            moe_corrected_median_mm: 72.0,
            correction_delta_mm: 30.0,
            nwp_bias_corrected: "Urban-coastal rainfall enhancement corrected",
          },
          explanation: {
            summary: "Active monsoon offshore trough generating episodic heavy rain squalls.",
            synoptic_regime: "Coastal Convective Convergence",
            primary_driver: "Banded convective lines over Arabian Sea moving onshore.",
            bias_adjustment: "Corrected for urban heat and barrier moisture convergence.",
            risk_verdict: "High probability of localized road waterlogging and local rail slowdowns.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 72.0, risk_color: "#f97316" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 58.0, risk_color: "#eab308" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 30.0, risk_color: "#22c55e" },
          ],
        },
        {
          district_id: "WB_KOL",
          name: "Kolkata",
          state: "West Bengal",
          zone: "MONSOON_DEPRESSION_PATH",
          lat: 22.57,
          lon: 88.36,
          area_sq_km: 206,
          forecast: {
            mean_q50_mm: 54.0,
            likely_range_q25_q75: [35.0, 74.0],
            max_q90_mm: 88.0,
            peak_q99_mm: 125.0,
            prob_heavy_64_5mm: 0.42,
            prob_very_heavy_115_6mm: 0.18,
            prob_extreme_204_5mm: 0.04,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "YELLOW",
            severity: 2,
            action_text: "Be Aware (YELLOW ALERT): Moderate to heavy rain spells with squally winds.",
            dominant_regime: "MONSOON_DEPRESSION_LOW",
          },
          comparison: {
            raw_nwp_median_mm: 38.0,
            global_qm_median_mm: 45.0,
            moe_corrected_median_mm: 54.0,
            correction_delta_mm: 16.0,
            nwp_bias_corrected: "Depression perimeter correction applied",
          },
          explanation: {
            summary: "Outer spiral bands from northern Bay of Bengal depression.",
            synoptic_regime: "Monsoon Depression / Low Pressure",
            primary_driver: "Southeasterly maritime wind convergence.",
            bias_adjustment: "Slight positive adjustment to account for convective band clustering.",
            risk_verdict: "Localized waterlogging in low-lying city streets during high-intensity bursts.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 54.0, risk_color: "#eab308" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 40.0, risk_color: "#eab308" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 22.0, risk_color: "#22c55e" },
          ],
        },
        {
          district_id: "CH_BIL",
          name: "Bilaspur",
          state: "Chhattisgarh",
          zone: "MONSOON_DEPRESSION_PATH",
          lat: 22.08,
          lon: 82.14,
          area_sq_km: 3508,
          forecast: {
            mean_q50_mm: 48.0,
            likely_range_q25_q75: [30.0, 68.0],
            max_q90_mm: 82.0,
            peak_q99_mm: 115.0,
            prob_heavy_64_5mm: 0.35,
            prob_very_heavy_115_6mm: 0.12,
            prob_extreme_204_5mm: 0.02,
            confidence: "MODERATE",
          },
          advisory: {
            color_code: "YELLOW",
            severity: 2,
            action_text: "Be Aware (YELLOW ALERT): Thunderstorms and moderate rain. Localized catchment inflow.",
            dominant_regime: "ACTIVE_MONSOON",
          },
          comparison: {
            raw_nwp_median_mm: 36.0,
            global_qm_median_mm: 42.0,
            moe_corrected_median_mm: 48.0,
            correction_delta_mm: 12.0,
            nwp_bias_corrected: "Moderate adjustment applied",
          },
          explanation: {
            summary: "Monsoon trough axis positioned close to the district, encouraging steady precipitation.",
            synoptic_regime: "Active Monsoon Surge",
            primary_driver: "Mid-tropospheric cyclonic shear zone across central India.",
            bias_adjustment: "Regime bias adjustment for inland moisture retention.",
            risk_verdict: "Beneficial agricultural rain; minor waterlogging in drainage culverts.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 48.0, risk_color: "#eab308" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 65.0, risk_color: "#f97316" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 35.0, risk_color: "#eab308" },
          ],
        },
        {
          district_id: "KA_UDU",
          name: "Udupi",
          state: "Karnataka",
          zone: "WESTERN_GHATS_OROGRAPHIC",
          lat: 13.34,
          lon: 74.74,
          area_sq_km: 3575,
          forecast: {
            mean_q50_mm: 68.0,
            likely_range_q25_q75: [46.0, 92.0],
            max_q90_mm: 114.0,
            peak_q99_mm: 165.0,
            prob_heavy_64_5mm: 0.54,
            prob_very_heavy_115_6mm: 0.28,
            prob_extreme_204_5mm: 0.06,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "YELLOW",
            severity: 2,
            action_text: "Be Aware (YELLOW ALERT): Coastal squalls and sustained orographic showers.",
            dominant_regime: "OROGRAPHIC_WESTERN_GHATS",
          },
          comparison: {
            raw_nwp_median_mm: 45.0,
            global_qm_median_mm: 56.0,
            moe_corrected_median_mm: 68.0,
            correction_delta_mm: 23.0,
            nwp_bias_corrected: "Coastal slope underestimation corrected",
          },
          explanation: {
            summary: "Coastal Karnataka receiving steady onshore moisture surge.",
            synoptic_regime: "Western Ghats Topographic Uplift",
            primary_driver: "Strong southwesterly maritime winds.",
            bias_adjustment: "Elevation-aware correction enhances windward rainfall estimates.",
            risk_verdict: "High sea swells and rough surf. Fishermen advised against venturing into deep sea.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 68.0, risk_color: "#eab308" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 62.0, risk_color: "#eab308" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 40.0, risk_color: "#eab308" },
          ],
        },
        {
          district_id: "AS_KAM",
          name: "Kamrup Metropolitan",
          state: "Assam",
          zone: "NORTHEAST_OROGRAPHIC",
          lat: 26.14,
          lon: 91.73,
          area_sq_km: 1528,
          forecast: {
            mean_q50_mm: 52.0,
            likely_range_q25_q75: [32.0, 72.0],
            max_q90_mm: 88.0,
            peak_q99_mm: 130.0,
            prob_heavy_64_5mm: 0.38,
            prob_very_heavy_115_6mm: 0.16,
            prob_extreme_204_5mm: 0.03,
            confidence: "MODERATE",
          },
          advisory: {
            color_code: "YELLOW",
            severity: 2,
            action_text: "Be Aware (YELLOW ALERT): Spells of moderate to heavy rain in Brahmaputra basin.",
            dominant_regime: "BREAK_MONSOON",
          },
          comparison: {
            raw_nwp_median_mm: 36.0,
            global_qm_median_mm: 44.0,
            moe_corrected_median_mm: 52.0,
            correction_delta_mm: 16.0,
            nwp_bias_corrected: "Valley confinement bias adjusted",
          },
          explanation: {
            summary: "Moisture trapped along the Assam valley foothills triggering localized showers.",
            synoptic_regime: "Break Monsoon Condition",
            primary_driver: "Southern moist airflow impinging on Himalayan foothills.",
            bias_adjustment: "Corrected for steep terrain moisture confinement.",
            risk_verdict: "River water levels elevated; monitor local embankment points.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 52.0, risk_color: "#eab308" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 45.0, risk_color: "#eab308" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 30.0, risk_color: "#22c55e" },
          ],
        },
        {
          district_id: "DL_DEL",
          name: "New Delhi",
          state: "Delhi",
          zone: "INDO_GANGETIC_PLAINS",
          lat: 28.61,
          lon: 77.2,
          area_sq_km: 1483,
          forecast: {
            mean_q50_mm: 18.0,
            likely_range_q25_q75: [8.0, 32.0],
            max_q90_mm: 45.0,
            peak_q99_mm: 68.0,
            prob_heavy_64_5mm: 0.08,
            prob_very_heavy_115_6mm: 0.02,
            prob_extreme_204_5mm: 0.0,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "GREEN",
            severity: 1,
            action_text: "Normal Weather (GREEN): Light to moderate passing showers. No severe warning.",
            dominant_regime: "ACTIVE_MONSOON",
          },
          comparison: {
            raw_nwp_median_mm: 15.0,
            global_qm_median_mm: 17.0,
            moe_corrected_median_mm: 18.0,
            correction_delta_mm: 3.0,
            nwp_bias_corrected: "Normal calibration",
          },
          explanation: {
            summary: "Scattered clouds with intermittent light drizzles.",
            synoptic_regime: "Active Monsoon Surge",
            primary_driver: "Peripheral moisture diffusion along Indo-Gangetic Plains.",
            bias_adjustment: "Standard baseline calibration.",
            risk_verdict: "No major weather impact expected.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 18.0, risk_color: "#22c55e" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 22.0, risk_color: "#22c55e" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 12.0, risk_color: "#22c55e" },
          ],
        },
        {
          district_id: "TN_CHE",
          name: "Chennai",
          state: "Tamil Nadu",
          zone: "COASTAL_CONVECTIVE",
          lat: 13.08,
          lon: 80.27,
          area_sq_km: 426,
          forecast: {
            mean_q50_mm: 12.0,
            likely_range_q25_q75: [4.0, 22.0],
            max_q90_mm: 34.0,
            peak_q99_mm: 52.0,
            prob_heavy_64_5mm: 0.05,
            prob_very_heavy_115_6mm: 0.01,
            prob_extreme_204_5mm: 0.0,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "GREEN",
            severity: 1,
            action_text: "Normal Weather (GREEN): Partly cloudy sky with brief isolated showers.",
            dominant_regime: "COASTAL_CONVECTIVE",
          },
          comparison: {
            raw_nwp_median_mm: 10.0,
            global_qm_median_mm: 11.5,
            moe_corrected_median_mm: 12.0,
            correction_delta_mm: 2.0,
            nwp_bias_corrected: "Minor sea breeze adjustment",
          },
          explanation: {
            summary: "Rain shadow during active southwest monsoon phase.",
            synoptic_regime: "Coastal Convective Convergence",
            primary_driver: "Localized afternoon sea-breeze convection.",
            bias_adjustment: "Minimal adjustment applied.",
            risk_verdict: "No weather warnings active.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 12.0, risk_color: "#22c55e" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 15.0, risk_color: "#22c55e" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 8.0, risk_color: "#22c55e" },
          ],
        },
        {
          district_id: "KA_BLR",
          name: "Bengaluru Urban",
          state: "Karnataka",
          zone: "INDO_GANGETIC_PLAINS",
          lat: 12.97,
          lon: 77.59,
          area_sq_km: 741,
          forecast: {
            mean_q50_mm: 14.5,
            likely_range_q25_q75: [6.0, 26.0],
            max_q90_mm: 38.0,
            peak_q99_mm: 55.0,
            prob_heavy_64_5mm: 0.06,
            prob_very_heavy_115_6mm: 0.01,
            prob_extreme_204_5mm: 0.0,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "GREEN",
            severity: 1,
            action_text: "Normal Weather (GREEN): Breezy and overcast with light passing drizzle.",
            dominant_regime: "ACTIVE_MONSOON",
          },
          comparison: {
            raw_nwp_median_mm: 12.0,
            global_qm_median_mm: 13.5,
            moe_corrected_median_mm: 14.5,
            correction_delta_mm: 2.5,
            nwp_bias_corrected: "Plateau elevation adjustment",
          },
          explanation: {
            summary: "Southern interior plateau shielded by Western Ghats ridge.",
            synoptic_regime: "Active Monsoon Surge",
            primary_driver: "Breezy westerly moisture plume over Deccan plateau.",
            bias_adjustment: "Plateau dry-shadow correction.",
            risk_verdict: "No risk of flooding. Favorable urban weather.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 14.5, risk_color: "#22c55e" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 18.0, risk_color: "#22c55e" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 10.0, risk_color: "#22c55e" },
          ],
        },
        {
          district_id: "TS_HYD",
          name: "Hyderabad",
          state: "Telangana",
          zone: "INDO_GANGETIC_PLAINS",
          lat: 17.38,
          lon: 78.48,
          area_sq_km: 217,
          forecast: {
            mean_q50_mm: 22.0,
            likely_range_q25_q75: [10.0, 36.0],
            max_q90_mm: 50.0,
            peak_q99_mm: 72.0,
            prob_heavy_64_5mm: 0.12,
            prob_very_heavy_115_6mm: 0.03,
            prob_extreme_204_5mm: 0.0,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "GREEN",
            severity: 1,
            action_text: "Normal Weather (GREEN): Light to moderate spells. No major alert.",
            dominant_regime: "ACTIVE_MONSOON",
          },
          comparison: {
            raw_nwp_median_mm: 18.0,
            global_qm_median_mm: 20.0,
            moe_corrected_median_mm: 22.0,
            correction_delta_mm: 4.0,
            nwp_bias_corrected: "Minor calibration",
          },
          explanation: {
            summary: "Interior convergence leading to short showers.",
            synoptic_regime: "Active Monsoon Surge",
            primary_driver: "Mid-level moisture advection.",
            bias_adjustment: "Standard calibration.",
            risk_verdict: "Safe conditions. Standard city traffic.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 22.0, risk_color: "#22c55e" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 25.0, risk_color: "#22c55e" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 15.0, risk_color: "#22c55e" },
          ],
        },
        {
          district_id: "UP_LUK",
          name: "Lucknow",
          state: "Uttar Pradesh",
          zone: "INDO_GANGETIC_PLAINS",
          lat: 26.84,
          lon: 80.94,
          area_sq_km: 2528,
          forecast: {
            mean_q50_mm: 28.0,
            likely_range_q25_q75: [14.0, 44.0],
            max_q90_mm: 58.0,
            peak_q99_mm: 85.0,
            prob_heavy_64_5mm: 0.18,
            prob_very_heavy_115_6mm: 0.04,
            prob_extreme_204_5mm: 0.0,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "GREEN",
            severity: 1,
            action_text: "Normal Weather (GREEN): Moderate rain spells with occasional thunder.",
            dominant_regime: "ACTIVE_MONSOON",
          },
          comparison: {
            raw_nwp_median_mm: 24.0,
            global_qm_median_mm: 26.0,
            moe_corrected_median_mm: 28.0,
            correction_delta_mm: 4.0,
            nwp_bias_corrected: "Calibrated plains estimation",
          },
          explanation: {
            summary: "Gangetic plains easterly moisture flow.",
            synoptic_regime: "Active Monsoon Surge",
            primary_driver: "Trough orientation through eastern UP.",
            bias_adjustment: "Slight adjustment for convective cells.",
            risk_verdict: "Standard monsoon showers.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 28.0, risk_color: "#22c55e" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 32.0, risk_color: "#22c55e" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 18.0, risk_color: "#22c55e" },
          ],
        },
        {
          district_id: "BR_PAT",
          name: "Patna",
          state: "Bihar",
          zone: "INDO_GANGETIC_PLAINS",
          lat: 25.59,
          lon: 85.13,
          area_sq_km: 3202,
          forecast: {
            mean_q50_mm: 31.0,
            likely_range_q25_q75: [16.0, 48.0],
            max_q90_mm: 62.0,
            peak_q99_mm: 92.0,
            prob_heavy_64_5mm: 0.22,
            prob_very_heavy_115_6mm: 0.05,
            prob_extreme_204_5mm: 0.0,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "GREEN",
            severity: 1,
            action_text: "Normal Weather (GREEN): Occasional rain spells along Ganga basin.",
            dominant_regime: "ACTIVE_MONSOON",
          },
          comparison: {
            raw_nwp_median_mm: 26.0,
            global_qm_median_mm: 29.0,
            moe_corrected_median_mm: 31.0,
            correction_delta_mm: 5.0,
            nwp_bias_corrected: "Plains riverine calibration",
          },
          explanation: {
            summary: "Active monsoon trough over central-eastern Gangetic belt.",
            synoptic_regime: "Active Monsoon Surge",
            primary_driver: "Low-level easterly wind convergence.",
            bias_adjustment: "Calibrated for sub-basin drainage.",
            risk_verdict: "Normal agricultural conditions.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 31.0, risk_color: "#22c55e" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 38.0, risk_color: "#22c55e" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 22.0, risk_color: "#22c55e" },
          ],
        },
        {
          district_id: "UK_DEH",
          name: "Dehradun",
          state: "Uttarakhand",
          zone: "WESTERN_HIMALAYAN",
          lat: 30.31,
          lon: 78.03,
          area_sq_km: 3088,
          forecast: {
            mean_q50_mm: 35.0,
            likely_range_q25_q75: [18.0, 56.0],
            max_q90_mm: 74.0,
            peak_q99_mm: 110.0,
            prob_heavy_64_5mm: 0.25,
            prob_very_heavy_115_6mm: 0.07,
            prob_extreme_204_5mm: 0.01,
            confidence: "MODERATE",
          },
          advisory: {
            color_code: "GREEN",
            severity: 1,
            action_text: "Normal Weather (GREEN): Foothill showers; watch for localized runoff in hilly streams.",
            dominant_regime: "WESTERN_DISTURBANCE",
          },
          comparison: {
            raw_nwp_median_mm: 28.0,
            global_qm_median_mm: 32.0,
            moe_corrected_median_mm: 35.0,
            correction_delta_mm: 7.0,
            nwp_bias_corrected: "Foothill orographic adjustment",
          },
          explanation: {
            summary: "Intermittent rain showers across Shivalik range.",
            synoptic_regime: "Western Disturbance Trough",
            primary_driver: "Mid-level westerly trough interactions.",
            bias_adjustment: "Elevation correction for foothill runoff.",
            risk_verdict: "Moderate rainfall; vigilance on hill roads.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 35.0, risk_color: "#22c55e" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 42.0, risk_color: "#eab308" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 25.0, risk_color: "#22c55e" },
          ],
        },
        {
          district_id: "RJ_JAI",
          name: "Jaipur",
          state: "Rajasthan",
          zone: "INDO_GANGETIC_PLAINS",
          lat: 26.91,
          lon: 75.78,
          area_sq_km: 11117,
          forecast: {
            mean_q50_mm: 10.0,
            likely_range_q25_q75: [3.0, 18.0],
            max_q90_mm: 28.0,
            peak_q99_mm: 42.0,
            prob_heavy_64_5mm: 0.03,
            prob_very_heavy_115_6mm: 0.0,
            prob_extreme_204_5mm: 0.0,
            confidence: "HIGH",
          },
          advisory: {
            color_code: "GREEN",
            severity: 1,
            action_text: "Normal Weather (GREEN): Dry to lightly overcast; isolated light sprinkle.",
            dominant_regime: "BREAK_MONSOON",
          },
          comparison: {
            raw_nwp_median_mm: 8.0,
            global_qm_median_mm: 9.0,
            moe_corrected_median_mm: 10.0,
            correction_delta_mm: 2.0,
            nwp_bias_corrected: "Arid zone boundary adjustment",
          },
          explanation: {
            summary: "Semi-arid zone experiencing subdued precipitation.",
            synoptic_regime: "Break Monsoon Condition",
            primary_driver: "Subsiding mid-tropospheric air preventing deep vertical convection.",
            bias_adjustment: "Standard arid baseline calibration.",
            risk_verdict: "No weather hazard.",
          },
          timeline: [
            { lead_hours: 24, label: "Day 1 (+24h)", expected_rain_mm: 10.0, risk_color: "#22c55e" },
            { lead_hours: 48, label: "Day 2 (+48h)", expected_rain_mm: 14.0, risk_color: "#22c55e" },
            { lead_hours: 72, label: "Day 3 (+72h)", expected_rain_mm: 6.0, risk_color: "#22c55e" },
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
    fetchData(hours);
  };

  const handleSelectDistrictFromMap = (districtId: string) => {
    setSelectedDistrictId(districtId);
    const d = districts.find(
      (item) => item.district_id.toUpperCase() === districtId.toUpperCase()
    );
    if (d) {
      setDrawerDistrict(d);
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

  const handleApplyOverride = async (
    districtId: string,
    color: string,
    scale: number,
    reason: string
  ) => {
    setDistricts((prev) =>
      prev.map((d) => {
        if (d.district_id === districtId) {
          const actionText =
            color === "RED"
              ? `Take Action (RED WARNING - Forecaster Override): ${reason}`
              : color === "ORANGE"
              ? `Be Prepared (ORANGE ALERT - Forecaster Override): ${reason}`
              : color === "YELLOW"
              ? `Be Aware (YELLOW ALERT - Forecaster Override): ${reason}`
              : `Normal Weather (GREEN - Forecaster Override): ${reason}`;

          return {
            ...d,
            forecast: {
              ...d.forecast,
              mean_q50_mm: Math.round(d.forecast.mean_q50_mm * scale * 10) / 10,
            },
            advisory: {
              ...d.advisory,
              color_code: color as any,
              action_text: actionText,
            },
          };
        }
        return d;
      })
    );

    if (drawerDistrict && drawerDistrict.district_id === districtId) {
      setDrawerDistrict((prev) =>
        prev
          ? {
              ...prev,
              forecast: {
                ...prev.forecast,
                mean_q50_mm: Math.round(prev.forecast.mean_q50_mm * scale * 10) / 10,
              },
              advisory: {
                ...prev.advisory,
                color_code: color as any,
                action_text: `Forecaster Override (${color}): ${reason}`,
              },
            }
          : null
      );
    }
  };

  // Header quick search matches
  const searchResults = headerSearch.trim()
    ? districts.filter(
        (d) =>
          d.name.toLowerCase().includes(headerSearch.toLowerCase()) ||
          d.state.toLowerCase().includes(headerSearch.toLowerCase())
      )
    : [];

  // If not authenticated, render institutional login screen
  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  const activeAlertCount = districts.filter((d) => d.advisory?.color_code && d.advisory.color_code !== "GREEN").length;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0b1120", color: "#f8fafc" }}>

      {/* Loading Overlay */}
      {loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "rgba(11, 17, 32, 0.8)",
            backdropFilter: "blur(4px)",
            padding: "8px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#38bdf8" }}>
            <RefreshCw size={14} className="animate-spin" />
            <span>Executing Neural Inference Pipeline (lead_hours={leadHours}h)...</span>
          </div>
          <div
            style={{
              width: "120px",
              height: "3px",
              background: "#1e293b",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: "40%",
                background: "linear-gradient(90deg, #0284c7, #38bdf8)",
                borderRadius: "2px",
                animation: "shimmer 1.2s infinite ease-in-out",
              }}
            />
          </div>
        </div>
      )}

      {/* Main Institutional Header */}
      <header
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          borderBottom: "1px solid #334155",
          padding: "10px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          zIndex: 100,
        }}
      >
        {/* Brand & Cycle Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 10px rgba(56, 189, 248, 0.3)",
              }}
            >
              <CloudRain size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.3px", color: "#f8fafc" }}>
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
                    marginLeft: "8px",
                  }}
                >
                  SIH 2026 · PS-80
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                Ministry of Earth Sciences · {new Date(currentTime).toUTCString().slice(0, 22)} UTC
              </div>
            </div>
          </div>
        </div>

        {/* Center: Forecast Horizon Switcher */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#1e293b",
            padding: "4px",
            borderRadius: "8px",
            border: "1px solid #334155",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, padding: "0 8px" }}>
            Horizon:
          </span>
          {[24, 48, 72].map((hours) => (
            <button
              key={hours}
              onClick={() => handleLeadChange(hours)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: leadHours === hours ? "#0284c7" : "transparent",
                color: leadHours === hours ? "#ffffff" : "#94a3b8",
                fontWeight: leadHours === hours ? 700 : 500,
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {hours}h (Day {hours / 24})
            </button>
          ))}
        </div>

        {/* Right: Quick Search, Status, & User Account */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
          {/* Header Quick Search */}
          <div style={{ position: "relative", width: "200px" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "9px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
              }}
            />
            <input
              type="text"
              placeholder="Find district..."
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              style={{
                width: "100%",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "6px",
                padding: "6px 10px 6px 28px",
                fontSize: "12px",
                color: "#f8fafc",
                outline: "none",
              }}
            />
            {/* Search Dropdown */}
            {headerSearch.trim() && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  width: "280px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  marginTop: "6px",
                  zIndex: 2000,
                  maxHeight: "280px",
                  overflowY: "auto",
                }}
              >
                {searchResults.length === 0 ? (
                  <div style={{ padding: "10px", fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>
                    No matching districts
                  </div>
                ) : (
                  searchResults.map((d) => (
                    <div
                      key={d.district_id}
                      onClick={() => {
                        handleSelectDistrictFromMap(d.district_id);
                        setHeaderSearch("");
                      }}
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid #334155",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>
                          {d.name}
                        </div>
                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>{d.state}</div>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color:
                            d.advisory.color_code === "RED"
                              ? "#ef4444"
                              : d.advisory.color_code === "ORANGE"
                              ? "#f97316"
                              : d.advisory.color_code === "YELLOW"
                              ? "#eab308"
                              : "#22c55e",
                        }}
                      >
                        {d.forecast.mean_q50_mm} mm
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Operational Feed Status Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: backendConnected ? "rgba(34, 197, 94, 0.12)" : "rgba(234, 179, 8, 0.12)",
              border: backendConnected ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(234, 179, 8, 0.3)",
              padding: "5px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 600,
              color: backendConnected ? "#4ade80" : "#facc15",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: backendConnected ? "#22c55e" : "#eab308",
              }}
            />
            {backendConnected ? "Live Operational Feed" : "Operational Demo Mode"}
          </div>

          {/* User Account Menu Button */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "5px 10px",
                color: "#f8fafc",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "12px", fontWeight: 700 }}>{user.name}</div>
                <div style={{ fontSize: "10px", color: "#38bdf8" }}>{user.role}</div>
              </div>
              <ChevronDown size={14} color="#94a3b8" />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  width: "260px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  marginTop: "6px",
                  zIndex: 2000,
                  padding: "12px",
                }}
              >
                <div style={{ borderBottom: "1px solid #334155", paddingBottom: "10px", marginBottom: "10px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>{user.name}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>{user.email}</div>
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: "6px",
                      background: "rgba(56, 189, 248, 0.15)",
                      color: "#38bdf8",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {user.role}
                  </div>
                </div>

                <div style={{ fontSize: "11px", color: "#cbd5e1", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <Building2 size={12} color="#64748b" />
                    <span>{user.organization}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldCheck size={12} color="#64748b" />
                    <span>Assigned: {user.assigned_districts.join(", ")}</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setActiveTab("districts");
                    setUserMenuOpen(false);
                  }}
                  style={{
                    padding: "8px 10px",
                    background: "rgba(234, 179, 8, 0.1)",
                    border: "1px solid rgba(234, 179, 8, 0.2)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#facc15",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "10px",
                  }}
                >
                  <Star size={13} />
                  <span>My Watched Districts ({watchlist.length})</span>
                </div>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  style={{
                    width: "100%",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#fca5a5",
                    padding: "8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <LogOut size={13} />
                  Sign Out Session
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Navigation (Primary Tabs + Role Protected Views) */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 24px",
          background: "#0f172a",
          borderBottom: "1px solid #1e293b",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {/* Primary Tab 1: Forecast */}
          <button
            onClick={() => setActiveTab("forecast")}
            style={{
              padding: "7px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              border: activeTab === "forecast" ? "1px solid #38bdf8" : "1px solid transparent",
              background: activeTab === "forecast" ? "rgba(56, 189, 248, 0.15)" : "transparent",
              color: activeTab === "forecast" ? "#38bdf8" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <Compass size={15} /> Forecast & Spatial Map
          </button>

          {/* Primary Tab 2: Districts */}
          <button
            onClick={() => setActiveTab("districts")}
            style={{
              padding: "7px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              border: activeTab === "districts" ? "1px solid #38bdf8" : "1px solid transparent",
              background: activeTab === "districts" ? "rgba(56, 189, 248, 0.15)" : "transparent",
              color: activeTab === "districts" ? "#38bdf8" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <ListOrdered size={15} /> District Directory ({districts.length})
          </button>

          {/* Primary Tab 3: Alerts */}
          <button
            onClick={() => setActiveTab("alerts")}
            style={{
              padding: "7px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              border: activeTab === "alerts" ? "1px solid #ef4444" : "1px solid transparent",
              background: activeTab === "alerts" ? "rgba(239, 68, 68, 0.15)" : "transparent",
              color: activeTab === "alerts" ? "#f87171" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <Bell size={15} /> Active Alerts
            {activeAlertCount > 0 && (
              <span
                style={{
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: "10px",
                }}
              >
                {activeAlertCount}
              </span>
            )}
          </button>

          {/* Role-Specific Tab: MoE Raw vs Corrected (For Forecaster & Research) */}
          {(user.role_key === "forecaster" || user.role_key === "research") && (
            <button
              onClick={() => setActiveTab("comparison")}
              style={{
                padding: "7px 14px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                border: activeTab === "comparison" ? "1px solid #a855f7" : "1px solid rgba(168, 85, 247, 0.2)",
                background: activeTab === "comparison" ? "rgba(168, 85, 247, 0.2)" : "rgba(168, 85, 247, 0.05)",
                color: activeTab === "comparison" ? "#c084fc" : "#cbd5e1",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <GitCompare size={14} /> Forecast Correction
            </button>
          )}

          {/* Role-Specific Tab: Scientific Benchmarks (For Research User) */}
          {user.role_key === "research" && (
            <button
              onClick={() => setActiveTab("benchmarks")}
              style={{
                padding: "7px 14px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                border: activeTab === "benchmarks" ? "1px solid #10b981" : "1px solid rgba(16, 185, 129, 0.2)",
                background: activeTab === "benchmarks" ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.05)",
                color: activeTab === "benchmarks" ? "#34d399" : "#cbd5e1",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <BarChart2 size={14} /> Scientific Verification
            </button>
          )}
        </div>

        {/* Watchlist Quick Count indicator */}
        <div
          onClick={() => setActiveTab("districts")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "12px",
            color: watchlist.length > 0 ? "#eab308" : "#64748b",
            cursor: "pointer",
            background: "rgba(234, 179, 8, 0.1)",
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid rgba(234, 179, 8, 0.2)",
          }}
        >
          <Star size={13} fill={watchlist.length > 0 ? "#eab308" : "none"} />
          <span style={{ fontWeight: 600 }}>Watchlist: {watchlist.length} districts</span>
        </div>
      </nav>

      {/* Main View Body */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* DEMONSTRATION MODE Banner */}
        {!backendConnected && (
          <div
            style={{
              background: "rgba(234, 179, 8, 0.06)",
              borderBottom: "1px solid rgba(234, 179, 8, 0.2)",
              padding: "6px 24px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11px",
              color: "#d4a017",
            }}
          >
            <AlertTriangle size={13} />
            <strong>DEMONSTRATION MODE</strong>
            &mdash; Running on reproducible simulated synoptic scenario (GFS/ERA5 baseline). Not official IMD output. All advisories require certified human forecaster review.
          </div>
        )}

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
            onViewDistrictDetails={handleSelectDistrictFromCatalog}
            watchlist={watchlist}
            onToggleWatchlist={toggleWatchlist}
          />
        )}

        {activeTab === "districts" && (
          <DistrictsCatalogView
            districts={districts}
            onSelectDistrict={handleSelectDistrictFromCatalog}
            watchlist={watchlist}
            onToggleWatchlist={toggleWatchlist}
          />
        )}

        {activeTab === "alerts" && (
          <AlertsView
            districts={districts}
            leadHours={leadHours}
            watchlist={watchlist}
            onToggleWatchlist={toggleWatchlist}
            onSelectDistrict={handleSelectDistrictFromMap}
          />
        )}

        {activeTab === "comparison" && <RawVsCorrectedView />}

        {activeTab === "benchmarks" && <PerformanceView />}
      </main>

      {/* District Intelligence Panel (Slide-over Drawer) */}
      <DistrictDetailDrawer
        district={drawerDistrict}
        onClose={() => setDrawerDistrict(null)}
        onOpenOverride={(dist) => handleOpenOverride(dist as any)}
        isWatchlisted={drawerDistrict ? watchlist.includes(drawerDistrict.district_id) : false}
        onToggleWatchlist={toggleWatchlist}
      />

      {/* Forecaster Operational Override Modal */}
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

