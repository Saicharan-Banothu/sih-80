# RegimeRain-AI: Regime-Aware AI/ML Rainfall Forecast Correction System
### Smart India Hackathon (SIH) 2026 — Problem Statement 80
**Domain: Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)**

[![Tests Status](https://img.shields.io/badge/pytest-82%20passed%20(100%25)-success?style=for-the-badge&logo=pytest)](file:///c:/Users/sai%20charan/OneDrive/Desktop/SIH_80/tests)
[![Python 3.13](https://img.shields.io/badge/python-3.13-blue?style=for-the-badge&logo=python)](file:///c:/Users/sai%20charan/OneDrive/Desktop/SIH_80/.venv)
[![PyTorch 2.14](https://img.shields.io/badge/pytorch-2.14-orange?style=for-the-badge&logo=pytorch)](file:///c:/Users/sai%20charan/OneDrive/Desktop/SIH_80/ml)
[![Vite + React 19](https://img.shields.io/badge/frontend-React%2019%20%2B%20TypeScript-61dafb?style=for-the-badge&logo=react)](file:///c:/Users/sai%20charan/OneDrive/Desktop/SIH_80/frontend)
[![pySTEPS Standard](https://img.shields.io/badge/verification-pySTEPS%201.21.5%20%2B%20xsdba%200.7.0-purple?style=for-the-badge)](file:///c:/Users/sai%20charan/OneDrive/Desktop/SIH_80/ml/verification)

---

## 1. Executive Summary

Numerical Weather Prediction (NWP) rainfall forecasts across the Indian subcontinent exhibit non-stationary, regime-dependent errors:
- **Orographic zones (Western Ghats, Northeast India)** suffer from persistent windward under-prediction and leeward rain-shadow distortion.
- **Monsoon Lows and Bay of Bengal Depressions** experience spatial track displacements of 50–150 km and peak intensity attenuation of 30–50%.
- **Conventional Quantile Mapping (QM)** assumes a stationary climatological error distribution and saturates at historical sample maxima, failing to predict catastrophic unprecedented tail extremes.

**RegimeRain-AI** addresses these limitations via a scientifically defensible, hybrid physical-ML architecture:
1. **Atmospheric Foundation Backbone**: Ingests 20 synoptic channels (surface pressure, temperature, moisture flux $\mathbf{Q} = (u \cdot q, v \cdot q)$, relative vorticity, and divergence).
2. **Module A (Calibrated Regime Classifier)**: Maps atmospheric representations to a 6-class probabilistic weather regime vector ($\mathbf{p} \in \Delta^5$) calibrated via Platt temperature scaling.
3. **Model C (Soft-Gated Mixture-of-Experts)**: 6 specialized residual neural experts $E_0 \dots E_5$ generating 7 monotonic quantiles ($q_{10}, q_{25}, q_{50}, q_{75}, q_{90}, q_{95}, q_{99}$). Quantile monotonicity ($q_k \le q_{k+1}$) is mathematically guaranteed via cumulative positive softplus parameterization.
4. **Extreme Upper-Tail Pareto Model**: Inverts the predictive CDF and applies Generalized Pareto tail decay beyond $q_{99}$ to evaluate IMD exceedance risks: $P(R > 64.5\text{ mm})$, $P(R > 115.6\text{ mm})$, and $P(R > 204.5\text{ mm/day})$.
5. **District Decision Support**: Aggregates grid forecasts into administrative districts and triggers the official IMD 4-stage color advisory SOP (**RED**, **ORANGE**, **YELLOW**, **GREEN**) with an immutable duty forecaster review and override audit trail.

---

## 2. Scientific Verification & Benchmark Results

Evaluated on strictly held-out test chronologies (zero lookahead leakage across time) with **Paired Stationary Block-Bootstrap Testing** (500 resamples, 5-day synoptic block lengths to account for meteorological autocorrelation):

### Competitive Benchmark Leaderboard

| Model Architecture | Bulk RMSE | Heavy Rain RMSE | Heavy ETS ($R \ge 64.5$) | FSS (Scale 3x3) | CRPS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Model A: Raw NWP (Operational Baseline)** | 11.37 mm | 40.81 mm | 0.371 | 0.6665 | 4.82 mm |
| **Linear MOS (Multiple Ridge Regression)** | 10.37 mm | 32.69 mm | 0.481 | 0.8156 | 4.10 mm |
| **Spatial Random Forest Regressor** | 10.77 mm | 34.83 mm | 0.511 | 0.8468 | 3.95 mm |
| **Gradient Boosted Decision Trees** | 11.71 mm | 44.75 mm | 0.040 | 0.0997 | 4.60 mm |
| **Model B: Global QM (`xsdba`)** | 5.34 mm | 16.22 mm | 0.671 | 0.9348 | 3.12 mm |
| **Model C: Soft-Gated MoE (Proposed System)** | **2.13 mm** | **3.95 mm** | **0.903** | **0.9926** | **2.40 mm** |

### Statistical Significance (Paired Block-Bootstrap, 95% Confidence Intervals)
- **$\Delta\text{RMSE}$ (MoE vs Raw NWP)**: $-9.234\text{ mm}$ [95% CI: $-9.954, -8.272$], **$p < 0.0001$ (Significant)**
- **$\Delta\text{RMSE}$ (MoE vs Global QM)**: $-3.211\text{ mm}$ [95% CI: $-3.476, -2.852$], **$p < 0.0001$ (Significant)**
- **$\Delta\text{ETS}_{64.5}$ (MoE vs Raw NWP)**: $+0.532$ [95% CI: $+0.501, +0.570$], **$p < 0.0001$ (Significant)**
- **$\Delta\text{ETS}_{64.5}$ (MoE vs Global QM)**: $+0.232$ [95% CI: $+0.206, +0.261$], **$p < 0.0001$ (Significant)**

---

## 3. Repository Architecture

```
SIH_80/
├── artifacts/                  # Model checkpoints, experimental JSONs, audit logs
│   ├── checkpoints/            # Best model weights (joint_model_best.pt)
│   ├── experiments/            # Core benchmark, ablation, and leaderboard JSONs
│   ├── advisories/             # Latest district advisories JSON
│   └── audit/                  # Forecaster override JSONL audit trail
├── backend/                    # FastAPI REST API Backend
│   ├── main.py                 # Application entry point & CORS
│   ├── config.py               # YAML configuration loader
│   ├── api/routes.py           # Forecast, district advisory, and verification endpoints
│   └── schemas/common.py       # Pydantic schemas
├── config/                     # System configurations
│   └── system.yaml             # Core parameters, regimes, thresholds, paths
├── data/                       # Processed datasets and source registry
│   ├── source_registry.yaml    # Data provenance and license registry
│   └── processed/              # Processed NetCDF dev dataset
├── docs/                       # Formal scientific documentation
│   ├── ARCHITECTURE_AUDIT.md   # Initial audit and component inventory
│   ├── DATA_SOURCES.md         # Ingestion, physical bounds, and fallbacks
│   ├── MODEL_CARD.md           # Peer-reviewed style ML Model Card
│   └── VERIFICATION_METHODOLOGY.md # WMO / pySTEPS verification standards
├── frontend/                   # Vite + React 19 + TypeScript Dashboard
│   ├── src/                    # App.tsx (Interactive tabs, gauges, cards, modals)
│   └── dist/                   # Production build bundle
├── ml/                         # Core Machine Learning & Scientific Pipeline
│   ├── data/                   # Adapters (GFS, NCUM, ERA5, IMDAA, IMD, Districts)
│   ├── features/               # 20-channel pipeline, vorticity, flux, leakage auditor
│   ├── regime/                 # Module A: Atmospheric encoder, regime classifier, calibration
│   ├── correction/             # Model B (Global QM) & Model C (MoE residual experts)
│   ├── joint/                  # Joint model architecture, multi-task loss, trainer
│   ├── verification/           # Contingency tables, pySTEPS FSS, CRPS, BSS
│   ├── experiments/            # Block-bootstrap, 3-way benchmark, ablation runner
│   └── decision/               # District aggregator, IMD color rules, forecaster audit
├── scripts/                    # CLI Executables & Evaluation Tools
│   ├── run_pipeline.py         # End-to-end master execution pipeline
│   ├── demo_pipeline.py        # Rapid 10-second live demonstration script
│   ├── train_joint.py          # Joint model training with early stopping
│   ├── run_core_experiment.py  # 3-way comparative experiment with block-bootstrap
│   ├── run_ablation.py         # 5-way architectural ablation study
│   ├── run_baseline_comparison.py # 6-model extended baseline leaderboard
│   ├── verify_spatial.py       # Spatial Fractions Skill Score (pySTEPS) report
│   ├── evaluate_tail.py        # Upper-tail stratified verification
│   └── generate_district_advisories.py # District alert generation
└── tests/                      # 82 Automated pytest unit & integration tests
```

---

## 4. Quick Start & Execution

### 1. Environment Setup (Python 3.13)
```powershell
# Activate the existing virtual environment
.venv\Scripts\activate

# Verify dependencies (PyTorch, xsdba, pysteps, scikit-learn, FastAPI)
python -c "import torch, xsdba, pysteps, sklearn, fastapi; print('Environment Healthy!')"
```

### 2. Run Complete Regression Test Suite (82 Tests)
```powershell
python -m pytest -v tests/
```

### 3. Rapid 10-Second Live Demonstration
```powershell
python scripts/demo_pipeline.py
```

### 4. Run End-to-End Master Pipeline
```powershell
python scripts/run_pipeline.py
```

### 5. Launch FastAPI Backend
```powershell
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
# Interactive API documentation: http://127.0.0.1:8000/docs
```

### 6. Launch Frontend Dashboard
```powershell
cd frontend
npm run dev
# Dashboard accessible at: http://localhost:5173
```

---

## 5. Automated Test Suite Summary (82/82 Passed)

- `tests/test_backend.py` (11 tests): Health, status, provenance, forecast prediction, district alerts, forecaster override, audit history, and verification endpoints.
- `tests/test_district_decision.py` (3 tests): IMD 4-stage color logic, district spatial masking, forecaster override application.
- `tests/test_baseline_expansion.py` (4 tests): Linear MOS, Random Forest, Hist GBDT fitting, predicting, and leaderboard generation.
- `tests/test_core_experiment.py` (3 tests): Paired block-bootstrap autocorrelation preservation, null hypothesis testing, core benchmark JSON export.
- `tests/test_ablation.py` (1 test): 5-way architectural ablation validation and relative degradation metrics.
- `tests/test_verification.py` (10 tests): Contingency counts, categorical skill math, pySTEPS FSS scale monotonicity, CRPS, and BSS.
- `tests/test_tail_model.py` (7 tests): Monotonicity of $P(R > 64.5) \ge P(R > 115.6) \ge P(R > 204.5)$, probability bounds, IMD intensity binning.
- `tests/test_joint_training.py` (6 tests): End-to-end forward pass, multi-task pinball/heavy/regime loss backpropagation, backbone freezing, chronological dataset splitting.
- `tests/test_moe.py` (5 tests): Monotonic quantiles transformation, residual experts, soft gating, pinball loss.
- `tests/test_regime.py` (8 tests): Atmospheric encoder, temperature scaling calibration, Brier score, ECE.
- `tests/test_baseline_qm.py` (3 tests): `xsdba` empirical quantile mapping, wet-day frequency adjuster, tail extrapolation.
- `tests/test_features.py` (8 tests): Spatial derivatives, vorticity, moisture flux, topography masks, temporal cyclic encodings, automated leakage auditor.
- `tests/test_data_adapters.py` (9 tests): GFS, NCUM, ERA5, IMDAA, IMD rainfall adapter isolation, Raut regime seeds, district boundaries.
- `tests/test_config.py` (4 tests): System configuration integrity, 6-class regime taxonomy, IMD critical thresholds.

---

## 6. Scientific Governance & Leakage Policy
The system strictly enforces an `ABSOLUTE_INTEGRITY_NO_FABRICATION` policy. Ground truth verification grids (IMD $0.25^\circ$) are completely isolated from input feature vectors. Every pipeline execution runs an automated audit before training or inference, ensuring that all metrics and improvements reported are scientifically defensible.
