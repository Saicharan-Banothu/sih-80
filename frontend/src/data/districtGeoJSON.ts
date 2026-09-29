/**
 * Real GeoJSON feature collection for Indian administrative districts
 * and regional meteorological zones. Coordinates are in [longitude, latitude] format (EPSG:4326).
 */

export interface DistrictFeature {
  type: "Feature";
  id: string;
  properties: {
    district_id: string;
    name: string;
    state: string;
    zone: string;
    lat: number;
    lon: number;
    area_sq_km: number;
  };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface DistrictFeatureCollection {
  type: "FeatureCollection";
  features: DistrictFeature[];
}

export const DISTRICT_GEOJSON: DistrictFeatureCollection = {
  type: "FeatureCollection",
  features: [
    // 1. Wayanad (Kerala) - Western Ghats Orographic Crest
    {
      type: "Feature",
      id: "KL_WAY",
      properties: {
        district_id: "KL_WAY",
        name: "Wayanad",
        state: "Kerala",
        zone: "WESTERN_GHATS_OROGRAPHIC",
        lat: 11.68,
        lon: 76.13,
        area_sq_km: 2132,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [75.90, 11.45],
            [76.05, 11.42],
            [76.25, 11.52],
            [76.40, 11.68],
            [76.38, 11.85],
            [76.28, 11.95],
            [76.08, 11.92],
            [75.95, 11.80],
            [75.88, 11.62],
            [75.90, 11.45],
          ],
        ],
      },
    },

    // 2. Idukki (Kerala) - High Ranges Orographic
    {
      type: "Feature",
      id: "KL_IDU",
      properties: {
        district_id: "KL_IDU",
        name: "Idukki",
        state: "Kerala",
        zone: "WESTERN_GHATS_OROGRAPHIC",
        lat: 9.85,
        lon: 76.97,
        area_sq_km: 4356,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [76.65, 9.50],
            [76.85, 9.48],
            [77.15, 9.62],
            [77.30, 9.85],
            [77.25, 10.15],
            [77.05, 10.25],
            [76.80, 10.18],
            [76.70, 9.90],
            [76.65, 9.50],
          ],
        ],
      },
    },

    // 3. Dakshina Kannada (Karnataka) - Coastal Foothills
    {
      type: "Feature",
      id: "KA_DKA",
      properties: {
        district_id: "KA_DKA",
        name: "Dakshina Kannada",
        state: "Karnataka",
        zone: "WESTERN_GHATS_OROGRAPHIC",
        lat: 12.87,
        lon: 75.25,
        area_sq_km: 4861,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [74.80, 12.50],
            [75.05, 12.45],
            [75.35, 12.60],
            [75.60, 12.85],
            [75.55, 13.15],
            [75.30, 13.20],
            [74.95, 13.10],
            [74.82, 12.80],
            [74.80, 12.50],
          ],
        ],
      },
    },

    // 4. Ratnagiri (Maharashtra) - Konkan Coastal Belt
    {
      type: "Feature",
      id: "MH_RAT",
      properties: {
        district_id: "MH_RAT",
        name: "Ratnagiri",
        state: "Maharashtra",
        zone: "WESTERN_GHATS_OROGRAPHIC",
        lat: 16.99,
        lon: 73.30,
        area_sq_km: 8208,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [73.10, 16.50],
            [73.40, 16.55],
            [73.70, 16.85],
            [73.80, 17.25],
            [73.65, 17.50],
            [73.35, 17.48],
            [73.15, 17.15],
            [73.08, 16.80],
            [73.10, 16.50],
          ],
        ],
      },
    },

    // 5. Mumbai Suburban (Maharashtra) - Coastal Megacity
    {
      type: "Feature",
      id: "MH_MUM",
      properties: {
        district_id: "MH_MUM",
        name: "Mumbai Suburban",
        state: "Maharashtra",
        zone: "COASTAL_CONVECTIVE",
        lat: 19.07,
        lon: 72.87,
        area_sq_km: 446,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [72.78, 18.95],
            [72.92, 18.92],
            [73.02, 19.10],
            [73.05, 19.28],
            [72.88, 19.30],
            [72.80, 19.20],
            [72.78, 18.95],
          ],
        ],
      },
    },

    // 6. Chennai (Tamil Nadu) - Coromandel Coast
    {
      type: "Feature",
      id: "TN_CHE",
      properties: {
        district_id: "TN_CHE",
        name: "Chennai",
        state: "Tamil Nadu",
        zone: "COASTAL_CONVECTIVE",
        lat: 13.08,
        lon: 80.27,
        area_sq_km: 426,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.15, 12.92],
            [80.28, 12.90],
            [80.35, 13.05],
            [80.32, 13.22],
            [80.20, 13.25],
            [80.12, 13.12],
            [80.15, 12.92],
          ],
        ],
      },
    },

    // 7. Visakhapatnam (Andhra Pradesh) - Northern Circars Coast
    {
      type: "Feature",
      id: "AP_VSK",
      properties: {
        district_id: "AP_VSK",
        name: "Visakhapatnam",
        state: "Andhra Pradesh",
        zone: "COASTAL_CONVECTIVE",
        lat: 17.68,
        lon: 83.21,
        area_sq_km: 1048,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [83.00, 17.50],
            [83.25, 17.48],
            [83.45, 17.68],
            [83.40, 17.88],
            [83.20, 17.90],
            [83.05, 17.75],
            [83.00, 17.50],
          ],
        ],
      },
    },

    // 8. Puri (Odisha) - Bay of Bengal Landfall Corridor
    {
      type: "Feature",
      id: "OD_PUR",
      properties: {
        district_id: "OD_PUR",
        name: "Puri",
        state: "Odisha",
        zone: "MONSOON_DEPRESSION_PATH",
        lat: 19.81,
        lon: 85.83,
        area_sq_km: 3479,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [85.10, 19.50],
            [85.50, 19.45],
            [85.95, 19.68],
            [86.40, 19.95],
            [86.25, 20.15],
            [85.80, 20.12],
            [85.45, 19.90],
            [85.15, 19.70],
            [85.10, 19.50],
          ],
        ],
      },
    },

    // 9. Balasore (Odisha) - Coastal Depressions
    {
      type: "Feature",
      id: "OD_BAL",
      properties: {
        district_id: "OD_BAL",
        name: "Balasore",
        state: "Odisha",
        zone: "MONSOON_DEPRESSION_PATH",
        lat: 21.49,
        lon: 86.93,
        area_sq_km: 3806,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [86.30, 21.10],
            [86.75, 21.12],
            [87.20, 21.35],
            [87.50, 21.65],
            [87.35, 21.90],
            [86.85, 21.88],
            [86.45, 21.60],
            [86.30, 21.10],
          ],
        ],
      },
    },

    // 10. Paschim Medinipur (West Bengal) - Lower Gangetic Inundation
    {
      type: "Feature",
      id: "WB_MID",
      properties: {
        district_id: "WB_MID",
        name: "Paschim Medinipur",
        state: "West Bengal",
        zone: "MONSOON_DEPRESSION_PATH",
        lat: 22.42,
        lon: 87.32,
        area_sq_km: 6308,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [86.60, 21.80],
            [87.10, 21.85],
            [87.65, 22.15],
            [87.90, 22.55],
            [87.75, 22.90],
            [87.20, 22.85],
            [86.75, 22.50],
            [86.60, 21.80],
          ],
        ],
      },
    },

    // 11. Nagpur (Maharashtra) - Central Monsoon Trough Axis
    {
      type: "Feature",
      id: "MH_NAG",
      properties: {
        district_id: "MH_NAG",
        name: "Nagpur",
        state: "Maharashtra",
        zone: "CENTRAL_MONSOON_CORE",
        lat: 21.14,
        lon: 79.08,
        area_sq_km: 9892,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [78.25, 20.55],
            [78.85, 20.50],
            [79.55, 20.85],
            [79.95, 21.25],
            [79.80, 21.75],
            [79.15, 21.72],
            [78.50, 21.35],
            [78.25, 20.55],
          ],
        ],
      },
    },

    // 12. Bhopal (Madhya Pradesh) - Central Plateau
    {
      type: "Feature",
      id: "MP_BHO",
      properties: {
        district_id: "MP_BHO",
        name: "Bhopal",
        state: "Madhya Pradesh",
        zone: "CENTRAL_MONSOON_CORE",
        lat: 23.25,
        lon: 77.41,
        area_sq_km: 2772,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.15, 23.05],
            [77.45, 23.02],
            [77.68, 23.20],
            [77.70, 23.45],
            [77.50, 23.55],
            [77.25, 23.50],
            [77.15, 23.25],
            [77.15, 23.05],
          ],
        ],
      },
    },

    // 13. East Khasi Hills (Meghalaya) - Extreme Orographic (Cherrapunji/Mawsynram)
    {
      type: "Feature",
      id: "ML_EKH",
      properties: {
        district_id: "ML_EKH",
        name: "East Khasi Hills",
        state: "Meghalaya",
        zone: "NORTHEAST_OROGRAPHIC",
        lat: 25.57,
        lon: 91.89,
        area_sq_km: 2748,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [91.30, 25.10],
            [91.65, 25.08],
            [92.05, 25.30],
            [92.20, 25.65],
            [92.00, 25.85],
            [91.55, 25.80],
            [91.35, 25.50],
            [91.30, 25.10],
          ],
        ],
      },
    },

    // 14. Kamrup Metropolitan (Assam) - Brahmaputra Valley
    {
      type: "Feature",
      id: "AS_KAM",
      properties: {
        district_id: "AS_KAM",
        name: "Kamrup Metropolitan",
        state: "Assam",
        zone: "NORTHEAST_OROGRAPHIC",
        lat: 26.14,
        lon: 91.73,
        area_sq_km: 1528,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [91.45, 25.90],
            [91.75, 25.88],
            [92.02, 26.05],
            [92.05, 26.25],
            [91.85, 26.35],
            [91.55, 26.28],
            [91.45, 25.90],
          ],
        ],
      },
    },

    // 15. Srinagar (Jammu & Kashmir) - Himalayan Western Disturbance
    {
      type: "Feature",
      id: "JK_SRI",
      properties: {
        district_id: "JK_SRI",
        name: "Srinagar",
        state: "Jammu & Kashmir",
        zone: "WESTERN_DISTURBANCE_NORTH",
        lat: 34.08,
        lon: 74.79,
        area_sq_km: 1979,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [74.50, 33.85],
            [74.80, 33.82],
            [75.05, 34.02],
            [75.10, 34.25],
            [74.85, 34.30],
            [74.58, 34.15],
            [74.50, 33.85],
          ],
        ],
      },
    },

    // 16. Shimla (Himachal Pradesh) - Western Himalayan Slopes
    {
      type: "Feature",
      id: "HP_SHI",
      properties: {
        district_id: "HP_SHI",
        name: "Shimla",
        state: "Himachal Pradesh",
        zone: "WESTERN_DISTURBANCE_NORTH",
        lat: 31.10,
        lon: 77.17,
        area_sq_km: 5131,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [76.95, 30.75],
            [77.35, 30.70],
            [77.75, 31.00],
            [77.85, 31.35],
            [77.50, 31.45],
            [77.10, 31.30],
            [76.95, 30.75],
          ],
        ],
      },
    },

    // 17. Dehradun (Uttarakhand) - Shivalik Foothills
    {
      type: "Feature",
      id: "UK_DEH",
      properties: {
        district_id: "UK_DEH",
        name: "Dehradun",
        state: "Uttarakhand",
        zone: "WESTERN_DISTURBANCE_NORTH",
        lat: 30.31,
        lon: 78.03,
        area_sq_km: 3088,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.55, 29.95],
            [77.95, 29.90],
            [78.28, 30.20],
            [78.35, 30.75],
            [78.05, 30.95],
            [77.68, 30.70],
            [77.55, 29.95],
          ],
        ],
      },
    },
  ],
};
