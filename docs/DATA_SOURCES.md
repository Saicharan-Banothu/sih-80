# Data Sources & Provenance Catalog
**Project:** Regime-Aware AI/ML Rainfall Forecast Correction System (SIH 2026 PS-80)  
**Policy:** Absolute Data Integrity — Zero Fabrication Rule  
**Document Version:** 1.0.0  

---

## 1. Data Integrity & Provenance Policy

In strict adherence to scientific and operational ethics:
1. **Zero Fabrication:** Neither rainfall observations, atmospheric circulation states, nor verification scores are ever fabricated or deceptively altered.
2. **Explicit Fallback Tracking:** Whenever operational sources requiring institutional authorization (such as NCMRWF NCUM-G or IMDAA) are unavailable, public open-data fallbacks (NOAA-GFS, ECMWF ERA5) are engaged. The fallback status is explicitly logged in API responses and artifact metadata (`is_synthetic`, `data_source`, `provenance_note`).
3. **Forecast-Time Leakage Separation:** Observations for a forecast's valid accumulation window are strictly segregated. IMD gridded rainfall is designated solely as a **post-forecast verification target** and is strictly prohibited from entering forecast-time feature pipelines.
4. **Development Data Labeling:** All synthetic or mock fixture arrays created for reproducible software testing are explicitly watermarked:
   > `DEVELOPMENT / SYNTHETIC DATA — NOT FOR OPERATIONAL FORECASTING`

---

## 2. Source-by-Source Catalog

### 2.1 Numerical Weather Prediction (NWP) Forecasts

| Attribute | Primary Source | Operational Fallback |
| :--- | :--- | :--- |
| **Name** | **NCUM-G** (NCMRWF Unified Model Global) | **NOAA-GFS** (Global Forecast System) |
| **Provider** | National Centre for Medium Range Weather Forecasting (NCMRWF), MoES | National Oceanic and Atmospheric Administration (NOAA / NCEP) |
| **Dataset** | Operational Global Forecast System ~12 km | Global Forecast System 0.25° Gridded Forecast |
| **Period** | Real-time operational cycles (00 & 12 UTC) | Continuous archive & real-time cycles (00, 06, 12, 18 UTC) |
| **Resolution** | ~12 km (~0.12° grid) | 0.25° (~27 km grid) |
| **Variables** | Precipitation flux, 850 hPa $u/v$ winds, 200 hPa winds, MSLP, 850 hPa specific humidity, 500 hPa geopotential height | `prate_surface`, `ugrd_850mb`, `vgrd_850mb`, `prmsl_msl`, `spfh_850mb`, `hgt_500mb` |
| **Access Method** | OPeNDAP / Secure FTP (Institutional MoES access) | AWS Open Data (`s3://noaa-gfs-bdp-pds/`) & NOMADS HTTPS |
| **License** | Government of India / MoES Data Policy | Public Domain (CC0 equivalent) |
| **Download Status** | Authorized restricted | **Active Public Fallback** |
| **Fallback Status** | Transitions to NOAA-GFS if credentials unavailable | Fallback active; no authorization barrier |

---

### 2.2 Atmospheric State & Regional Reanalysis

| Attribute | Primary Source | Operational Fallback |
| :--- | :--- | :--- |
| **Name** | **IMDAA** (Indian Monsoon Data Assimilation and Analysis) | **ECMWF ERA5** |
| **Provider** | NCMRWF & IMD with UK Met Office | European Centre for Medium-Range Weather Forecasts (ECMWF) / Copernicus |
| **Dataset** | High-Resolution Regional Reanalysis over India | Global Atmospheric Reanalysis (v5) |
| **Period** | 1979 – Present | 1940 – Present |
| **Resolution** | ~12 km (~0.12° grid) | 0.25° (~31 km grid) |
| **Variables** | Surface pressure, MSLP, multi-level $u/v$ winds, specific humidity, temperature | Total precipitation, MSLP, $u/v$ winds, specific humidity, geopotential |
| **Access Method** | NCMRWF Data Portal (Authorized access) | Copernicus Climate Data Store (CDS) API |
| **License** | MoES Non-Commercial Research License | Creative Commons Attribution 4.0 (CC-BY-4.0) |
| **Download Status** | Authorized restricted | **Active Public Fallback** |
| **Fallback Status** | Transitions to ERA5 if unavailable | Fallback active |

---

### 2.3 Observational Ground Truth Rainfall

| Attribute | Specification |
| :--- | :--- |
| **Name** | **IMD 0.25° Daily Gridded Rainfall** |
| **Provider** | India Meteorological Department (IMD Pune) |
| **Dataset** | High-resolution daily gridded rainfall dataset over the Indian region (Pai et al., Rajeevan et al.) |
| **Spatial Extent** | 6.5°N – 38.5°N, 66.5°E – 100.0°E (129 $\times$ 121 cells covering mainland India) |
| **Temporal Frequency** | Daily, representing 24-hour accumulation ending at 08:30 IST (03:00 UTC) |
| **Units** | Millimeters per day ($\text{mm/day}$) |
| **Pipeline Role** | **POST-FORECAST VERIFICATION TARGET ONLY** (Strictly excluded from forecast-time features) |
| **Access Method** | Subhradip25/imdR package adapter & IMD Climate Data Services Portal |
| **License** | MoES / IMD Research Usage |
| **Download Status** | Active via local binary format parser (`.GRD`) and NetCDF adapter |

---

### 2.4 Weather Regime Seed Information

| Attribute | Specification |
| :--- | :--- |
| **Name** | **Raut et al. 2026 Synoptic Weather Clusters** |
| **Provider** | Raut et al., *Weather and Climate Dynamics* (WCD), 2026 |
| **Archive DOI** | [10.5281/zenodo.20099064](https://doi.org/10.5281/zenodo.20099064) |
| **Paper URL** | https://wcd.copernicus.org/articles/7/1173/2026/ |
| **Type** | 11 objectively derived synoptic weather clusters over India |
| **Role in Pipeline** | Weak-supervision seed information for the 6-class operational prototype taxonomy |
| **Taxonomy Mapping** | Documented probabilistic mapping matrix $M \in \mathbb{R}^{11 \times 6}$ preserving cluster uncertainty |
| **License** | Open Access (Creative Commons CC-BY 4.0) |

---

### 2.5 District Administrative Boundaries

| Attribute | Specification |
| :--- | :--- |
| **Name** | **Survey of India Indian Revenue District Boundaries** |
| **Provider** | Survey of India / Open Government Data (OGD) Platform India |
| **Coverage** | Revenue districts across 28 States and 8 Union Territories |
| **Coordinate System** | EPSG:4326 (WGS84) |
| **Meteorological Zones** | Stratified into Western Ghats, Coastal Convective, Monsoon Depression Path, Central Monsoon Core, Northeast Orographic, and Northern Western Disturbance zones |
| **License** | Open Government Data (OGD) India |
