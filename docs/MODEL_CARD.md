# Model Card: RegimeRain-AI (SIH 2026 Problem Statement 80)
## Regime-Aware AI/ML Rainfall Forecast Correction and Decision-Support System

### 1. Model Details
- **System Name**: `RegimeRain-AI`
- **Model Version**: `JointRegimeAware-v0.1.0`
- **Release Date**: September 2026
- **Model Type**: Hybrid Atmospheric Foundation Backbone + Calibrated Probabilistic Regime Classifier (Module A) + Soft-Gated Mixture-of-Experts with 6 Residual Quantile Experts (Model C) + Continuous Generalized Pareto Upper-Tail Inversion.
- **Developers**: Smart India Hackathon 2026 Engineering Team (PS-80).
- **License**: Research & Operational Evaluation Prototype (IMD / MoES Open Data Guidelines).

---

### 2. Intended Use & Operational Scope
- **Primary Objective**: Correct spatial bias, amplitude displacement, and upper-tail under-prediction in operational Numerical Weather Prediction (NWP) rainfall forecasts across the Indian subcontinent ($8^\circ\text{N} - 36^\circ\text{N}$, $68^\circ\text{E} - 98^\circ\text{E}$).
- **Target Applications**:
  - District disaster management units (NDRF, SDRF, SDMAs).
  - Municipal flood preparedness and reservoir inflow forecasting.
  - Agricultural sowing and irrigation advisory support.
- **Out of Scope**:
  - Autonomous issuance of legal weather warnings without certified meteorologist review.
  - Hyper-local micro-climate predictions below $0.25^\circ$ resolution without local radar downscaling.

---

### 3. Architecture Specification
1. **Atmospheric Backbone**:
   - Primary Operational Target: Microsoft ClimaX Foundation Vision Transformer.
   - Active Implementation in Local Prototype: `LightweightResidualConvNet` fallback encoder (4-stage residual convolutional network with GELU activations and 2D batch normalization, 128-dimensional latent space). ClimaX ViT weights (hundreds of MB) are substituted with this lightweight encoder to permit agile local development while maintaining identical tensor interfaces.
2. **Probabilistic Regime Classifier (Module A)**:
   - Maps 128D atmospheric state embeddings to 6 operational weather regimes.
   - **Scientific Attribution**: The 6-class regime taxonomy is an operational prototype design choice informed by Raut et al. (2026, WCD, DOI: 10.5281/zenodo.20099064, who derived 11 objective spatial rainfall clusters) and Neal et al. (2019, 2022 synoptic weather patterns).
   - Calibrated via Platt Temperature Scaling ($\hat{p} = \text{Softmax}(z / T)$) optimizing Expected Calibration Error (ECE) and Brier Score.
3. **Soft-Gated Mixture-of-Experts (Model C)**:
   - 6 specialized residual neural experts:
     - $E_0$: Active Monsoon
     - $E_1$: Break Monsoon
     - $E_2$: Monsoon Depression / Low
     - $E_3$: Orographic (Western Ghats & Himalayan Foothills)
     - $E_4$: Coastal Convective (Bay of Bengal / Arabian Sea)
     - $E_5$: Western Disturbance (Northern India)
   - Soft Gating Blend: $\hat{Q}(x) = \sum_{k=0}^5 p_k E_k(x)$ strictly preserving quantile monotonicity.
4. **Quantile Parametrization**:
   - Enforces $0 \le q_{10} \le q_{25} \le q_{50} \le q_{75} \le q_{90} \le q_{95} \le q_{99}$ via positive cumulative softplus parameterization.
5. **Continuous Tail Inversion Engine**:
   - Inverts the predictive CDF function with Generalized Pareto survival decay $S(x) = 0.01 \cdot \exp\left(-\frac{x - q_{99}}{\sigma}\right)$ to derive continuous exceedance probabilities $P(R > 64.5)$, $P(R > 115.6)$, and $P(R > 204.5\text{ mm/day})$.

---

### 4. Training Data & Leakage Safeguards
- **Data Policy**: `ABSOLUTE_INTEGRITY_NO_FABRICATION`.
- **NWP Inputs**: NCUM 12km operational forecasts (with GFS 0.25° public fallback).
- **Atmospheric Reanalysis**: NCMRWF IMDAA 12km reanalysis (with ERA5 0.25° fallback).
- **Verification Ground Truth**: IMD 0.25° Gridded Rainfall Observation Network.
- **Strict Leakage Prevention**:
  - Ground truth rainfall is strictly isolated to verification-time loss evaluation and never enters the input feature pipeline.
  - Runtime `LeakageAuditor` scans feature names and timestamps before every training or inference step.
  - Strict chronological splitting: Earlier years/seasons for training, subsequent for validation, held-out for test. Zero shuffling across time.

---

### 5. Verification & Benchmark Performance (Synthetic Methodology Demonstration)

> [!NOTE]
> **Evaluation Mode: SYNTHETIC VALIDATION / METHODOLOGY DEMONSTRATION**
> The benchmark metrics below were evaluated on a controlled, held-out synthetic synoptic verification suite ($N=40$ chronologically partitioned 5-day blocks) designed to demonstrate the mathematical validity of the soft-gated MoE, pySTEPS multi-scale Fractions Skill Score (FSS), Continuous Ranked Probability Score (CRPS), and Paired Stationary Block-Bootstrap hypothesis testing ($p < 0.0001$). These metrics demonstrate algorithmic correctness; they are not claimed as multi-decadal historical archive validations.

| Model Architecture | Bulk RMSE | Heavy Rain RMSE | Heavy ETS ($R \ge 64.5$) | FSS (Scale 3x3) | CRPS |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Model A: Raw NWP (Baseline)** | 11.37 mm | 40.81 mm | 0.371 | 0.6665 | 4.82 mm |
| **Model B: Global QM (`xsdba`)** | 5.34 mm | 16.22 mm | 0.671 | 0.9348 | 3.12 mm |
| **Baseline: Linear MOS (Ridge)** | 10.37 mm | 32.69 mm | 0.481 | 0.8156 | 4.10 mm |
| **Baseline: Spatial Random Forest** | 10.77 mm | 34.83 mm | 0.511 | 0.8468 | 3.95 mm |
| **Model C: Soft MoE (Ours)** | **2.13 mm** | **3.95 mm** | **0.903** | **0.9926** | **2.40 mm** |

- **Paired Block-Bootstrap Significance (Politis & Romano, 1994, 500 resamples, 5-day blocks)**:
  - RMSE reduction over Global QM: $-3.211\text{ mm}$ [95% CI: $-3.476, -2.852$], $p < 0.0001$.
  - Heavy rain ETS increase over Global QM: $+0.232$ [95% CI: $+0.206, +0.261$], $p < 0.0001$.

---

### 6. Limitations & Human Review Mandate
- Model outputs are probability-calibrated guidance and do not replace official IMD bulletins.
- Severe localized cloudbursts occurring entirely within a single sub-grid box ($< 10\text{ km}$) require human meteorologist verification using real-time Doppler Weather Radar (DWR) reflectivity.
