# Architecture Audit & System Specification
**Project:** Regime-Aware AI/ML Rainfall Forecast Correction and Decision-Support System  
**Smart India Hackathon 2026 — Problem Statement 80**  
**Audit Date:** September 2026  
**Auditor:** Antigravity Senior Engineering Team  
**Status:** Initial System Assessment & Architecture Baseline Complete  

---

## 1. Executive Summary

This document presents the complete architectural audit and technical baseline for Smart India Hackathon (SIH) 2026 Problem Statement 80. The objective is to design, implement, rigorously verify, and deploy a scientifically defensible, regime-aware rainfall forecast post-processing system for India.

The core scientific premise rests on an empirical meteorological reality: **numerical weather prediction (NWP) precipitation errors are non-stationary and weather-regime dependent.** A single global correction function (such as standard unconditioned quantile mapping) inevitably degrades in extreme or transitional atmospheric states. By conditioning the post-processing pipeline on an objectively classified, probabilistic weather regime vector and applying a soft-gated Mixture-of-Experts (MoE) architecture with dedicated extreme-tail handling, the system produces calibrated probabilistic rainfall forecasts and district-level decision-support products.

---

## 2. Workspace & Initial Repository State

### 2.1 Findings Upon Workspace Inspection
1. **Repository Origin:** The workspace (`SIH_80`) is a newly initialized repository for SIH 2026 Problem Statement 80.
2. **Prior Codebase Status:** No legacy or conflicting application code was present. No partial or broken legacy microservices exist.
3. **Execution Environment:**
   - **Host OS:** Windows 11
   - **Python Interpreter:** Python 3.13.1 (CPython)
   - **Package Management:** `uv` 0.9.1 (high-performance virtual environment `.venv` configured)
   - **Node.js Environment:** Node v22.14.0, npm 10.9.2
   - **Version Control:** Git initialized with comprehensive `.gitignore` for ML artifacts and caches.

---

## 3. High-Level System Architecture

```
                       ┌───────────────────────────────┐
                       │  Operational Forecast Ingest  │
                       │   (NCUM 12km / GFS Fallback)  │
                       └──────────────┬────────────────┘
                                      │
                                      ▼
                       ┌───────────────────────────────┐
                       │ Atmospheric State & Dynamics  │
                       │    (IMDAA / ERA5 Fallback)    │
                       └──────────────┬────────────────┘
                                      │
                                      ▼
                       ┌───────────────────────────────┐
                       │   Forecast-Time Features      │
                       │  (Circulation, Moisture, OLR) │
                       │   *STRICT LEAKAGE AUDIT*      │
                       └──────────────┬────────────────┘
                                      │
                                      ▼
                       ┌───────────────────────────────┐
                       │ Probabilistic Regime Model    │
                       │  (ClimaX / Lightweight Enc.)  │
                       │     + Temperature Scaling     │
                       └──────────────┬────────────────┘
                                      │
                     Regime Probability Vector P(k), k=1..6
                                      │
                                      ▼
                       ┌───────────────────────────────┐
                       │  Soft Mixture-of-Experts MoE  │
                       │  ┌─────────────────────────┐  │
                       │  │ Expert 1: Active Mon.   │  │
                       │  │ Expert 2: Break Mon.    │  │
                       │  │ Expert 3: Depression/Low│  │
                       │  │ Expert 4: Orographic    │  │
                       │  │ Expert 5: Coastal Conv. │  │
                       │  │ Expert 6: Western Dist. │  │
                       │  └─────────────────────────┘  │
                       └──────────────┬────────────────┘
                                      │
                                      ▼
                       ┌───────────────────────────────┐
                       │ Predictive Distribution &     │
                       │ Tail Extrapolation Engine     │
                       │  (q10..q99, P>64.5, P>115.6)  │
                       └──────────────┬────────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│ District Decision Support     │             │ Scientific Verification       │
│  - IMD Rainfall Categories    │             │  - pySTEPS (ETS, CSI, FSS)    │
│  - Area Exceedance %          │             │  - CRPS, Brier Score          │
│  - Advisory Color Codes       │             │  - Three-Way Comparison       │
│  - Human-in-the-Loop Indicator│             │  - Block-Bootstrap Signif.    │
└──────────────┬────────────────┘             └──────────────┬────────────────┘
               │                                             │
               ▼                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│ FastAPI Operational Services  │             │ React/Vite Operational UI     │
│  (/health, /forecast, /eval)  │◄───────────►│  (MapLibre/GeoJSON, Charts)   │
└───────────────────────────────┘             └───────────────────────────────┘
```

---

## 4. Reusable Components & Upstream References

In accordance with strict engineering guidelines, the system directly leverages and adapts mature upstream scientific libraries rather than attempting crude manual re-implementations:

| Component | Upstream Authority / Reference | Adaptation & Usage Strategy |
| :--- | :--- | :--- |
| **Categorical & Spatial Verification** | **pySTEPS** (`pysteps.verification`) | Used for ETS (Equitable Threat Score), CSI (Critical Success Index), POD, FAR, and FSS (Fraction Skill Score). Interface adapter ensures graceful fallback for headless tests. |
| **Statistical Baseline Bias Adjustment** | **xsdba** (`Ouranosinc/xsdba`) / `xclim` | Primary standalone bias-adjustment package for Quantile Mapping (QM) and Quantile Delta Mapping (QDM). Serves as Model B baseline. |
| **Alternative Bias Correction** | **python-cmethods** (Alan Turing Institute) | Documented secondary reference if xsdba distributional extensions require comparative cross-checks. |
| **IMD Rainfall Ingestion** | **imdR** (`Subhradip25/imdR`) | Utility for IMD 0.25° gridded binary file conversion and boundary masking. |
| **Atmospheric Backbone** | **Microsoft ClimaX** | Default foundation-model backbone for atmospheric spatio-temporal representations. Documented lightweight residual encoder fallback for constrained compute environments. |
| **Weather Regime Seeds** | **Raut et al. 2026** (WCD / Zenodo: `10.5281/zenodo.20099064`) | Objective synoptic clusters utilized as seed/weak-supervision labels mapped transparently into our 6 operational prototype classes. |
| **Operational NWP Baseline** | **NCMRWF NCUM / NOAA GFS** | NCUM 12km global model primary; GFS 0.25° public open-data fallback with explicit provenance logging. |
| **Terminology & Warning Standards**| **IMD (India Meteorological Department)** | Official rainfall intensity classes (Light <15.5mm, Moderate 15.6-64.4mm, Heavy 64.5-115.5mm, Very Heavy 115.6-204.4mm, Extremely Heavy >=204.5mm) and Color Warning Conventions (Green, Yellow, Orange, Red). |

---

## 5. Current Component Status Audit

### 5.1 Backend Status
- **Framework:** FastAPI with Pydantic v2 and modular routing.
- **Status:** Initial structure established; core endpoints (`/health`, `/api/v1/status`, `/api/v1/provenance`, `/api/v1/model-info`) configured.
- **Configuration:** Centralized YAML configuration loader reading `config/system.yaml` and `.env`.

### 5.2 Frontend Status
- **Framework:** React 19 + TypeScript + Vite.
- **Design Philosophy:** Scientific and operational meteorology interface. Pure CSS design tokens, dark slate theme with IMD warning colors, Lucide icons, responsive map and district detail inspector.
- **Status:** Initialized in Phase 0; builds and connects to backend health check.

### 5.3 Machine Learning Status
- **Regime Taxonomy:** Six operational prototype regimes codified with seed mapping from Raut et al. 2026.
- **MoE Architecture:** Defined with 6 differentiable residual experts, soft gating, and quantile loss formulations.
- **Leakage Prevention:** Explicit design separation between forecast-time atmospheric states and valid-period IMD ground truth.

### 5.4 Data Status
- **Registry:** Fully configured in `data/source_registry.yaml`.
- **Integrity Rule:** Strict provenance tracking. Explicit distinction between actual operational feeds, public fallbacks (GFS/ERA5), and synthetic test fixtures. Zero fabricated metrics or data.

---

## 6. Technical Debt & Design Constraints

1. **Python 3.13 Compatibility:** Python 3.13 is modern; specific legacy geospatial packages may have binary wheel constraints. We utilize modern wheels (`xarray`, `pandas`, `scipy`, `scikit-learn`, `numpy 2.x`).
2. **Compute Realism:** Large foundation models like ClimaX require substantial GPU memory. An explicit, high-performing residual convolutional encoder fallback is mandatory for reproducible CPU/GPU execution without masking its identity.
3. **No Temporal Leakage:** Time-series validation must be strictly chronological (e.g. 2018–2022 train, 2023 validation, 2024 test). Rolling-origin evaluation will prevent future observation contamination.

---

## 7. Phased Implementation Roadmap

- **Phase 0:** Repository Audit, Directory Normalization, Centralized Configuration & Environment Validation. *(Current)*
- **Phase 1:** Data Ingestion, Schema Normalization, and Provenance Tracking.
- **Phase 2:** Leakage-Safe Feature Engineering & Spatial/Temporal Anomaly Processing.
- **Phase 3:** Probabilistic Weather Regime Classifier with Calibration (ECE, Temperature Scaling).
- **Phase 4:** Baseline Global Quantile Mapping (xsdba) Implementation.
- **Phase 5:** Soft-Gated Regime-Aware Mixture-of-Experts (MoE) Architecture.
- **Phase 6:** Extreme Rainfall Modeling & Heavy Tail Exceedance Probabilities ($P > 64.5$, $115.6$, $204.5$ mm).
- **Phase 7:** Differentiable Quantile Optimization & Joint Parameter Tuning.
- **Phase 8:** Probabilistic Verification Framework (Brier, CRPS, pySTEPS ETS/CSI/FSS).
- **Phase 9:** Three-Way Core Verification Experiment (Raw NWP vs Global QM vs Regime MoE).
- **Phase 10:** Comprehensive Ablation Study.
- **Phase 11:** Block-Bootstrap Statistical Significance Testing.
- **Phase 12:** District Aggregation & Spatial Exceedance Decision Products.
- **Phase 13:** Human-in-the-Loop Risk Advisory Engine (IMD Color Coding).
- **Phase 14:** Production-Grade FastAPI Backend & Contract Validation.
- **Phase 15:** Operational Decision-Support Frontend with Interactive Maps.
- **Phase 16:** Frontend QA, Accessibility, and Mobile Usability Verification.
- **Phase 17:** End-to-End Pipeline Integration & Demonstration Harness.
- **Phase 18:** Prototype MLOps, Data Drift & Service Monitoring.
- **Phase 19:** Robust Operational Fallback Mechanisms.
- **Phase 20:** Security, Sanitization & Secret Auditing.
- **Phase 21:** Complete Scientific Documentation, Model Cards & Reproducibility Suite.
