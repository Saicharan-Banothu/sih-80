import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { CloudRain, AlertTriangle, ShieldAlert, Compass, RotateCcw, AlertCircle } from "lucide-react";
import { DISTRICT_GEOJSON } from "../data/districtGeoJSON";

export type MapLayerType = "RAIN" | "HEAVY_RAIN" | "VERY_HEAVY" | "RISK" | "REGIME";

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
}

interface IndiaMapProps {
  districts: DistrictAdvisory[];
  selectedDistrictId: string | null;
  onSelectDistrict: (districtId: string) => void;
  activeLayer: MapLayerType;
  onChangeLayer: (layer: MapLayerType) => void;
}

export const IndiaMap: React.FC<IndiaMapProps> = ({
  districts,
  selectedDistrictId,
  onSelectDistrict,
  activeLayer,
  onChangeLayer,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  // Map districts by ID for instant lookup
  const districtMap = React.useMemo(() => {
    const map = new Map<string, DistrictAdvisory>();
    districts.forEach((d) => map.set(d.district_id.toUpperCase(), d));
    return map;
  }, [districts]);

  // Color functions per layer
  const getFeatureColor = (districtId: string): string => {
    const d = districtMap.get(districtId.toUpperCase());
    if (!d) return "#94a3b8";

    switch (activeLayer) {
      case "RAIN": {
        const r = d.forecast.mean_q50_mm;
        if (r >= 204.5) return "#991b1b"; // Extreme: Dark Crimson
        if (r >= 115.6) return "#ea580c"; // Very heavy: Orange-red
        if (r >= 64.5) return "#f59e0b";  // Heavy: Amber
        if (r >= 35.5) return "#0284c7";  // Moderate-high: Blue
        if (r >= 15.6) return "#38bdf8";  // Moderate: Cyan
        return "#bae6fd";                 // Normal/Light: Soft blue
      }
      case "HEAVY_RAIN": {
        const p = d.forecast.prob_heavy_64_5mm;
        if (p >= 0.70) return "#b91c1c";
        if (p >= 0.50) return "#ea580c";
        if (p >= 0.25) return "#f59e0b";
        if (p >= 0.10) return "#fde047";
        return "#cbd5e1";
      }
      case "VERY_HEAVY": {
        const p = d.forecast.prob_very_heavy_115_6mm;
        if (p >= 0.60) return "#881337";
        if (p >= 0.40) return "#b91c1c";
        if (p >= 0.20) return "#ea580c";
        if (p >= 0.05) return "#fed7aa";
        return "#cbd5e1";
      }
      case "RISK": {
        const c = d.advisory.color_code;
        if (c === "RED") return "#dc2626";     // High Attention
        if (c === "ORANGE") return "#ea580c";  // Elevated Risk
        if (c === "YELLOW") return "#eab308";  // Watch
        return "#16a34a";                      // Normal
      }
      case "REGIME": {
        const r = d.advisory.dominant_regime;
        if (r === "ACTIVE_MONSOON") return "#3b82f6";
        if (r === "BREAK_MONSOON") return "#eab308";
        if (r === "MONSOON_DEPRESSION_LOW") return "#ea580c";
        if (r === "OROGRAPHIC_WESTERN_GHATS" || r === "OROGRAPHIC") return "#10b981";
        if (r === "COASTAL_CONVECTIVE") return "#06b6d4";
        if (r === "WESTERN_DISTURBANCE") return "#8b5cf6";
        return "#64748b";
      }
      default:
        return "#0284c7";
    }
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.0, 79.5],
      zoom: 5,
      minZoom: 4,
      maxZoom: 9,
      zoomControl: true,
      attributionControl: false,
    });

    // Reliable, free, unwatermarked basemap tiles (Esri World Light Gray Canvas)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 16,
        attribution: "Esri, HERE, Garmin, (c) OpenStreetMap contributors",
      }
    ).addTo(map);

    // Optional reference labels for cities and boundaries
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 16,
      }
    ).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update GeoJSON layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }

    const geoLayer = L.geoJSON(DISTRICT_GEOJSON as any, {
      style: (feature) => {
        const districtId = feature?.properties?.district_id || "";
        const isSelected = selectedDistrictId?.toUpperCase() === districtId.toUpperCase();
        const fillColor = getFeatureColor(districtId);

        return {
          fillColor: fillColor,
          weight: isSelected ? 3.5 : 1.5,
          opacity: 1,
          color: isSelected ? "#0f172a" : "#475569",
          dashArray: isSelected ? "" : "2",
          fillOpacity: isSelected ? 0.90 : 0.75,
        };
      },
      onEachFeature: (feature, layer) => {
        const districtId = feature.properties.district_id;
        const d = districtMap.get(districtId.toUpperCase());
        const name = d?.name || feature.properties.name;
        const state = d?.state || feature.properties.state;
        const rain = d ? `${d.forecast.mean_q50_mm} mm` : "N/A";
        const alert = d?.advisory?.color_code || "GREEN";
        const riskLabel = alert === "RED" ? "High Attention" : alert === "ORANGE" ? "Elevated Risk" : alert === "YELLOW" ? "Watch" : "Normal";

        const tooltipContent = `
          <div style="font-family: inherit; font-size: 12px; padding: 6px 8px; line-height: 1.4;">
            <div style="font-weight: 800; color: #0f172a; font-size: 13px;">${name}</div>
            <div style="color: #64748b; font-size: 11px;">${state}</div>
            <div style="margin-top: 5px; display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${
                alert === "RED" ? "#ef4444" : alert === "ORANGE" ? "#f97316" : alert === "YELLOW" ? "#eab308" : "#22c55e"
              };"></span>
              <strong style="color: #0f172a;">${riskLabel}</strong>
            </div>
            <div style="margin-top: 3px; color: #334155;">Expected Rain: <strong>${rain}</strong></div>
          </div>
        `;

        layer.bindTooltip(tooltipContent, {
          sticky: true,
          className: "custom-leaflet-tooltip",
        });

        layer.on({
          click: () => {
            onSelectDistrict(districtId);
          },
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({
              weight: 3,
              color: "#0f172a",
              fillOpacity: 0.95,
            });
          },
          mouseout: (e) => {
            geoLayer.resetStyle(e.target);
          },
        });
      },
    }).addTo(map);

    geoJsonLayerRef.current = geoLayer;
  }, [activeLayer, districts, selectedDistrictId]);

  // Center on selected district if provided
  useEffect(() => {
    if (!selectedDistrictId || !mapInstanceRef.current) return;
    const d = districtMap.get(selectedDistrictId.toUpperCase());
    if (d && d.lat && d.lon) {
      mapInstanceRef.current.flyTo([d.lat, d.lon], 7, { duration: 1.0 });
    }
  }, [selectedDistrictId]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([22.0, 79.5], 5, { duration: 0.8 });
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "520px", borderRadius: "12px", overflow: "hidden" }}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: "520px" }} />

      {/* Top Left: Reset View Button */}
      <div style={{ position: "absolute", top: "16px", left: "16px", zIndex: 1000 }}>
        <button
          onClick={handleResetView}
          title="Reset to All-India View"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #cbd5e1",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#334155",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
        >
          <RotateCcw size={13} />
          All India
        </button>
      </div>

      {/* Top Right: Simple Human-Readable Layer Selector */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.96)",
          padding: "4px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          display: "flex",
          gap: "4px",
        }}
      >
        <button
          onClick={() => onChangeLayer("RAIN")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 11px",
            borderRadius: "6px",
            border: "none",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeLayer === "RAIN" ? "#0284c7" : "transparent",
            color: activeLayer === "RAIN" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <CloudRain size={14} />
          Rain
        </button>

        <button
          onClick={() => onChangeLayer("HEAVY_RAIN")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 11px",
            borderRadius: "6px",
            border: "none",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeLayer === "HEAVY_RAIN" ? "#ea580c" : "transparent",
            color: activeLayer === "HEAVY_RAIN" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <AlertTriangle size={14} />
          Heavy Rain
        </button>

        <button
          onClick={() => onChangeLayer("VERY_HEAVY")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 11px",
            borderRadius: "6px",
            border: "none",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeLayer === "VERY_HEAVY" ? "#be123c" : "transparent",
            color: activeLayer === "VERY_HEAVY" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <ShieldAlert size={14} />
          Very Heavy
        </button>

        <button
          onClick={() => onChangeLayer("RISK")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 11px",
            borderRadius: "6px",
            border: "none",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeLayer === "RISK" ? "#dc2626" : "transparent",
            color: activeLayer === "RISK" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <AlertCircle size={14} />
          Risk
        </button>

        <button
          onClick={() => onChangeLayer("REGIME")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 11px",
            borderRadius: "6px",
            border: "none",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            background: activeLayer === "REGIME" ? "#10b981" : "transparent",
            color: activeLayer === "REGIME" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <Compass size={14} />
          Weather Situation
        </button>
      </div>

      {/* Bottom Left: Clean User-Facing Legend */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(6px)",
          padding: "10px 14px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          maxWidth: "280px",
          fontSize: "11px",
        }}
      >
        <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {activeLayer === "RAIN" && "Expected Rainfall (24h)"}
          {activeLayer === "HEAVY_RAIN" && "Heavy Rainfall Risk (>64.5 mm)"}
          {activeLayer === "VERY_HEAVY" && "Very Heavy Rain Probability (>115.6 mm)"}
          {activeLayer === "RISK" && "Decision-Support Risk Level"}
          {activeLayer === "REGIME" && "Dominant Weather Situation"}
        </div>

        {activeLayer === "RAIN" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", color: "#334155" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#bae6fd", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&lt; 15.6 mm (Normal / Light)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#38bdf8", borderRadius: "2px", display: "inline-block" }}></span>
              <span>15.6 – 35.5 mm (Moderate)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#0284c7", borderRadius: "2px", display: "inline-block" }}></span>
              <span>35.5 – 64.4 mm (Active Showers)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#f59e0b", borderRadius: "2px", display: "inline-block" }}></span>
              <span>64.5 – 115.5 mm (Heavy Rainfall)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#ea580c", borderRadius: "2px", display: "inline-block" }}></span>
              <span>115.6 – 204.4 mm (Very Heavy Rain)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#991b1b", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&gt; 204.5 mm (Extremely Heavy)</span>
            </div>
          </div>
        )}

        {activeLayer === "HEAVY_RAIN" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", color: "#334155" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#cbd5e1", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&lt; 10% (Low Chance)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#fde047", borderRadius: "2px", display: "inline-block" }}></span>
              <span>10% – 25% (Slight Chance)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#f59e0b", borderRadius: "2px", display: "inline-block" }}></span>
              <span>25% – 50% (Moderate Risk)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#ea580c", borderRadius: "2px", display: "inline-block" }}></span>
              <span>50% – 70% (High Probability)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#b91c1c", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&gt; 70% (Very Likely)</span>
            </div>
          </div>
        )}

        {activeLayer === "VERY_HEAVY" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", color: "#334155" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#cbd5e1", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&lt; 5% (Unlikely)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#fed7aa", borderRadius: "2px", display: "inline-block" }}></span>
              <span>5% – 20% (Watch Level)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#ea580c", borderRadius: "2px", display: "inline-block" }}></span>
              <span>20% – 40% (Elevated Risk)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#b91c1c", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&gt; 40% (Severe Potential)</span>
            </div>
          </div>
        )}

        {activeLayer === "RISK" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", color: "#334155" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#dc2626", borderRadius: "2px", display: "inline-block" }}></span>
              <strong>High Attention (Red)</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#ea580c", borderRadius: "2px", display: "inline-block" }}></span>
              <strong>Elevated (Orange)</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#eab308", borderRadius: "2px", display: "inline-block" }}></span>
              <strong>Watch (Yellow)</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#16a34a", borderRadius: "2px", display: "inline-block" }}></span>
              <strong>Normal (Green)</strong>
            </div>
          </div>
        )}

        {activeLayer === "REGIME" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", color: "#334155" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "12px", height: "8px", background: "#ea580c", borderRadius: "2px" }}></span>
              <span>Monsoon Depression</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "12px", height: "8px", background: "#10b981", borderRadius: "2px" }}></span>
              <span>Western Ghats Orographic</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "12px", height: "8px", background: "#06b6d4", borderRadius: "2px" }}></span>
              <span>Coastal Convective</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "12px", height: "8px", background: "#3b82f6", borderRadius: "2px" }}></span>
              <span>Active Monsoon Surge</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
