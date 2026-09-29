# Scientific Verification Methodology & Statistical Standards
## Standard Operating Procedures for Post-Processing Verification

### 1. Overview
Evaluating weather post-processing models solely using traditional point-wise continuous metrics (such as Mean Squared Error or bulk RMSE) is scientifically flawed in high-resolution meteorology due to the **"double penalty problem"**:
A forecast that correctly predicts the intensity and structure of an intense storm but is spatially displaced by a few grid boxes will receive a double penalty (once for predicting rain where none fell, and once for missing the true event), scoring worse than a smooth, uninformative forecast that underpredicts peak rain everywhere.

To overcome this, our verification framework adheres to **WMO (World Meteorological Organization)** and **pySTEPS spatial verification standards**.

---

### 2. Multi-Scale Spatial Verification: Fractions Skill Score (FSS)
Following **Roberts and Lean (2008)**, the Fractions Skill Score evaluates forecast skill as a function of spatial scale.

#### Mathematical Formulation:
For a given precipitation threshold $u$ (e.g. $64.5\text{ mm/day}$) and a spatial neighborhood box of length $s \times s$:
1. Binary thresholding:
   $$I_f(x, y) = \mathbf{1}_{\{F(x, y) \ge u\}}, \quad I_o(x, y) = \mathbf{1}_{\{O(x, y) \ge u\}}$$
2. Fraction computation over neighborhood $N(s)$:
   $$F_{(s)}(x, y) = \frac{1}{s^2} \sum_{(i, j) \in N(s)} I_f(i, j), \quad O_{(s)}(x, y) = \frac{1}{s^2} \sum_{(i, j) \in N(s)} I_o(i, j)$$
3. Mean Squared Error of fractions:
   $$\text{MSE}_{(s)} = \frac{1}{N_x N_y} \sum_{x, y} \left( F_{(s)}(x, y) - O_{(s)}(x, y) \right)^2$$
4. Worst-case reference MSE:
   $$\text{MSE}_{(s), \text{ref}} = \frac{1}{N_x N_y} \sum_{x, y} \left( F_{(s)}(x, y)^2 + O_{(s)}(x, y)^2 \right)$$
5. Fractions Skill Score:
   $$\text{FSS}_{(s)} = 1 - \frac{\text{MSE}_{(s)}}{\text{MSE}_{(s), \text{ref}}}$$

#### Interpretation:
- $\text{FSS} = 0$: Complete lack of skill.
- $\text{FSS} = 1$: Perfect spatial skill.
- $\text{FSS}_{\text{useful}} = 0.5 + \frac{f_0}{2}$ (where $f_0$ is the domain-wide observed rain fraction): Scale at which the forecast provides actionable operational skill over random noise.

---

### 3. Categorical Contingency Metrics
Evaluated across official IMD thresholds ($2.5, 15.6, 64.5, 115.6, 204.5\text{ mm/day}$):

- **Probability of Detection (POD)**:
  $$\text{POD} = \frac{\text{Hits}}{\text{Hits} + \text{Misses}}$$
- **False Alarm Ratio (FAR)**:
  $$\text{FAR} = \frac{\text{False Alarms}}{\text{Hits} + \text{False Alarms}}$$
- **Critical Success Index (CSI / Threat Score)**:
  $$\text{CSI} = \frac{\text{Hits}}{\text{Hits} + \text{False Alarms} + \text{Misses}}$$
- **Equitable Threat Score (ETS / Gilbert Skill Score)**:
  Accounts for hits occurring by random chance:
  $$\text{ETS} = \frac{\text{Hits} - \text{Hits}_{\text{random}}}{\text{Hits} + \text{False Alarms} + \text{Misses} - \text{Hits}_{\text{random}}}$$
  where:
  $$\text{Hits}_{\text{random}} = \frac{(\text{Hits} + \text{Misses})(\text{Hits} + \text{False Alarms})}{N_{\text{total}}}$$

---

### 4. Continuous Probabilistic Verification: CRPS
Following **Hersbach (2000)** and **Gneiting & Raftery (2007)**, the Continuous Ranked Probability Score (CRPS) measures both calibration and sharpness of the predictive cumulative distribution $F$:

$$\text{CRPS}(F, y) = \int_{-\infty}^{\infty} \left( F(x) - \mathbf{1}_{\{x \ge y\}} \right)^2 dx$$

For operational predictive quantiles $q_1, \dots, q_K$ at nominal levels $\tau_1, \dots, \tau_K$:
$$\text{CRPS}(F, y) \approx \frac{2}{K} \sum_{k=1}^K \rho_{\tau_k}(y - q_k)$$
where $\rho_\tau(u) = u(\tau - \mathbf{1}_{\{u < 0\}})$ is the pinball loss.

---

### 5. Paired Stationary Block-Bootstrap Testing
To prove statistical significance on weather time series without false positives from synoptic autocorrelation:
- **Block Length $L = 5\text{ days}$**: Preserves synoptic depression and active/break duration memory.
- **Replications $B = 500-1000$**: Resamples contiguous temporal blocks with replacement.
- **Empirical 95% Confidence Interval**: $[\Delta^*_{0.025}, \Delta^*_{0.975}]$.
- Rejects null hypothesis $H_0: \Delta = 0$ if $0 \notin [CI_{\text{lower}}, CI_{\text{upper}}]$ and $p < 0.05$.
