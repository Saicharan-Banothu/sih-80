import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Layers, RotateCcw, ShieldAlert, CloudRain, AlertTriangle, Compass, Activity } from "lucide-react";
import { DISTRICT_GEOJSON, DistrictFeature } from "../data/districtGeoJSON";

export type MapLayerType = "RAINFALL" | "HEAVY_PROB" | "VERY_HEAVY_PROB" | "REGIME" | "UNCERTAINTY";

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
      case "RAINFALL": {
        const r = d.forecast.mean_q50_mm;
        if (r >= 204.5) return "#991b1b"; // Extremely heavy - dark crimson
        if (r >= 115.6) return "#ea580c"; // Very heavy - orange/red
        if (r >= 64.5) return "#f59e0b";  // Heavy - amber
        if (r >= 35.5) return "#0284c7";  // Moderate-high - ocean blue
        if (r >= 15.6) return "#38bdf8";  // Moderate - sky blue
        return "#bae6fd";                 // Light - light blue
      }
      case "HEAVY_PROB": {
        const p = d.forecast.prob_heavy_64_5mm;
        if (p >= 0.70) return "#b91c1c";
        if (p >= 0.50) return "#ea580c";
        if (p >= 0.25) return "#f59e0b";
        if (p >= 0.10) return "#fde047";
        return "#e2e8f0";
      }
      case "VERY_HEAVY_PROB": {
        const p = d.forecast.prob_very_heavy_115_6mm;
        if (p >= 0.60) return "#881337";
        if (p >= 0.40) return "#b91c1c";
        if (p >= 0.20) return "#ea580c";
        if (p >= 0.05) return "#fed7aa";
        return "#e2e8f0";
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
      case "UNCERTAINTY": {
        // Spread = max_q90 - mean_q50
        const spread = d.forecast.max_q90_mm - d.forecast.mean_q50_mm;
        if (spread >= 60.0) return "#f43f5e"; // Wide spread
        if (spread >= 35.0) return "#fb923c"; // Moderate spread
        if (spread >= 15.0) return "#38bdf8"; // Modest spread
        return "#a7f3d0";                     // Low spread / tight confidence
      }
      default:
        return "#3b82f6";
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
      maxZoom: 10,
      zoomControl: true,
      attributionControl: false,
    });

    // CartoDB Positron clean map tiles (high clarity, zero neon clutter)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
      subdomains: "abcd",
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update GeoJSON layer when layer type, districts, or selection changes
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
          color: isSelected ? "#0f172a" : "#64748b",
          dashArray: isSelected ? "" : "2",
          fillOpacity: isSelected ? 0.88 : 0.72,
        };
      },
      onEachFeature: (feature, layer) => {
        const districtId = feature.properties.district_id;
        const d = districtMap.get(districtId.toUpperCase());
        const name = d?.name || feature.properties.name;
        const state = d?.state || feature.properties.state;
        const rain = d ? `${d.forecast.mean_q50_mm} mm` : "N/A";
        const alert = d?.advisory?.color_code || "GREEN";
        const pHeavy = d ? `${(d.forecast.prob_heavy_64_5mm * 100).toFixed(0)}%` : "0%";

        const tooltipContent = `
          <div style="font-family: inherit; font-size: 12px; padding: 4px; line-height: 1.4;">
            <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${name}</div>
            <div style="color: #64748b; font-size: 11px;">${state}</div>
            <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${
                alert === "RED" ? "#ef4444" : alert === "ORANGE" ? "#f97316" : alert === "YELLOW" ? "#eab308" : "#22c55e"
              };"></span>
              <strong style="color: #1e293b;">${alert}</strong>
            </div>
            <div style="margin-top: 3px; color: #334155;">Expected Rain: <strong>${rain}</strong></div>
            <div style="color: #334155;">P(>64.5mm): <strong>${pHeavy}</strong></div>
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
              color: "#1e293b",
              fillOpacity: 0.9,
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
      mapInstanceRef.current.flyTo([d.lat, d.lon], 7, { duration: 1.2 });
    }
  }, [selectedDistrictId]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([22.0, 79.5], 5, { duration: 0.8 });
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "560px", borderRadius: "12px", overflow: "hidden", border: "1px solid #cbd5e1", background: "#f8fafc" }}>
      {/* Map Canvas Container */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: "560px" }} />

      {/* Top Left: Reset View Button & Layer Badge */}
      <div style={{ position: "absolute", top: "14px", left: "14px", zIndex: 1000, display: "flex", gap: "8px" }}>
        <button
          onClick={handleResetView}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#ffffff",
            color: "#0f172a",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 600,
          }}
          title="Reset map view to India domain"
        >
          <RotateCcw size={14} />
          Reset View
        </button>
      </div>

      {/* Top Right: Layer Switcher Toolbar */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(6px)",
          padding: "6px",
          borderRadius: "10px",
          border: "1px solid #cbd5e1",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          display: "flex",
          gap: "4px",
        }}
      >
        <button
          onClick={() => onChangeLayer("RAINFALL")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 10px",
            borderRadius: "6px",
            border: "none",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            background: activeLayer === "RAINFALL" ? "#0284c7" : "transparent",
            color: activeLayer === "RAINFALL" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <CloudRain size={13} />
          Rainfall (q50)
        </button>
        <button
          onClick={() => onChangeLayer("HEAVY_PROB")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 10px",
            borderRadius: "6px",
            border: "none",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            background: activeLayer === "HEAVY_PROB" ? "#ea580c" : "transparent",
            color: activeLayer === "HEAVY_PROB" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <AlertTriangle size={13} />
          P(&gt;64.5mm)
        </button>
        <button
          onClick={() => onChangeLayer("VERY_HEAVY_PROB")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 10px",
            borderRadius: "6px",
            border: "none",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            background: activeLayer === "VERY_HEAVY_PROB" ? "#be123c" : "transparent",
            color: activeLayer === "VERY_HEAVY_PROB" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <ShieldAlert size={13} />
          P(&gt;115.6mm)
        </button>
        <button
          onClick={() => onChangeLayer("REGIME")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 10px",
            borderRadius: "6px",
            border: "none",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            background: activeLayer === "REGIME" ? "#10b981" : "transparent",
            color: activeLayer === "REGIME" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <Compass size={13} />
          Regimes
        </button>
        <button
          onClick={() => onChangeLayer("UNCERTAINTY")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "6px 10px",
            borderRadius: "6px",
            border: "none",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            background: activeLayer === "UNCERTAINTY" ? "#6366f1" : "transparent",
            color: activeLayer === "UNCERTAINTY" ? "#ffffff" : "#475569",
            transition: "all 0.15s ease",
          }}
        >
          <Activity size={13} />
          Uncertainty
        </button>
      </div>

      {/* Bottom Left: Meteorological Dynamic Legend */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(6px)",
          padding: "10px 14px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          maxWidth: "280px",
          fontSize: "11px",
        }}
      >
        <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {activeLayer === "RAINFALL" && "Expected Rainfall (q50)"}
          {activeLayer === "HEAVY_PROB" && "Heavy Rain Probability P(>64.5mm)"}
          {activeLayer === "VERY_HEAVY_PROB" && "Very Heavy Rain Probability P(>115.6mm)"}
          {activeLayer === "REGIME" && "Dominant Synoptic Regimes"}
          {activeLayer === "UNCERTAINTY" && "Ensemble Uncertainty (q90 - q50)"}
        </div>

        {activeLayer === "RAINFALL" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#bae6fd", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&lt; 15.6 mm (Light)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#38bdf8", borderRadius: "2px", display: "inline-block" }}></span>
              <span>15.6 - 35.5 mm (Moderate)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#0284c7", borderRadius: "2px", display: "inline-block" }}></span>
              <span>35.5 - 64.4 mm (Active)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#f59e0b", borderRadius: "2px", display: "inline-block" }}></span>
              <span>64.5 - 115.5 mm (Heavy Alert)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#ea580c", borderRadius: "2px", display: "inline-block" }}></span>
              <span>115.6 - 204.4 mm (Very Heavy)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#991b1b", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&gt; 204.5 mm (Extremely Heavy)</span>
            </div>
          </div>
        )}

        {activeLayer === "HEAVY_PROB" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#e2e8f0", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&lt; 10% (Unlikely)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#fde047", borderRadius: "2px", display: "inline-block" }}></span>
              <span>10% - 25% (Low Probability)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#f59e0b", borderRadius: "2px", display: "inline-block" }}></span>
              <span>25% - 50% (Moderate Risk)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#ea580c", borderRadius: "2px", display: "inline-block" }}></span>
              <span>50% - 70% (High Risk)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#b91c1c", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&gt; 70% (Very High Risk)</span>
            </div>
          </div>
        )}

        {activeLayer === "VERY_HEAVY_PROB" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#e2e8f0", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&lt; 5% (Low)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#fed7aa", borderRadius: "2px", display: "inline-block" }}></span>
              <span>5% - 20% (Isolated Threat)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#ea580c", borderRadius: "2px", display: "inline-block" }}></span>
              <span>20% - 40% (Significant Threat)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#b91c1c", borderRadius: "2px", display: "inline-block" }}></span>
              <span>40% - 60% (Severe Threat)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#881337", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&gt; 60% (Critical Risk)</span>
            </div>
          </div>
        )}

        {activeLayer === "REGIME" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#ea580c", borderRadius: "2px", display: "inline-block" }}></span>
              <span>Monsoon Depression / Low</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#10b981", borderRadius: "2px", display: "inline-block" }}></span>
              <span>Western Ghats Orographic</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#3b82f6", borderRadius: "2px", display: "inline-block" }}></span>
              <span>Active Monsoon Trough</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#06b6d4", borderRadius: "2px", display: "inline-block" }}></span>
              <span>Coastal Convective</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#8b5cf6", borderRadius: "2px", display: "inline-block" }}></span>
              <span>Western Disturbance</span>
            </div>
          </div>
        )}

        {activeLayer === "UNCERTAINTY" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#a7f3d0", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&lt; 15 mm (Tight / High Confidence)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#38bdf8", borderRadius: "2px", display: "inline-block" }}></span>
              <span>15 - 35 mm (Moderate Spread)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#fb923c", borderRadius: "2px", display: "inline-block" }}></span>
              <span>35 - 60 mm (Substantial Spread)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "10px", background: "#f43f5e", borderRadius: "2px", display: "inline-block" }}></span>
              <span>&gt; 60 mm (Wide Ensemble Spread)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
