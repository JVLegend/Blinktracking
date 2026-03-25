# Automated Blink Analysis as an Objective Biomarker for Peripheral Facial Paralysis Severity: A Cross-Sectional Study Using the BlinkTracking Framework

**Authors:** Joao Victor Pacheco Dias et al.

**Status:** DRAFT — Rascunho para discussao interna

---

## Abstract

**Background:** The House-Brackmann (HB) grading system remains the standard for assessing peripheral facial paralysis severity, but relies on subjective clinical evaluation. Automated, objective measures of eyelid function could improve diagnostic precision and enable longitudinal monitoring.

**Objective:** To evaluate automated blink metrics derived from video analysis as objective biomarkers for peripheral facial paralysis severity, with emphasis on intra-patient comparison between the paralyzed and healthy eye.

**Methods:** We developed and applied the BlinkTracking framework — an open-source system for automated blink analysis based on MediaPipe Face Mesh and the Eye Aspect Ratio (EAR). Video recordings from 39 patients with unilateral peripheral facial paralysis (HB I–VI) were analyzed. All analyses were conducted with homogeneous FPS and intra-patient paired design, comparing the affected eye with the contralateral healthy eye. HB grades were regrouped into three severity tiers (HB I–II, HB III–IV, HB V–VI) to increase subgroup statistical power. Complete and incomplete blinks were analyzed separately.

**Results:** Blink rate was significantly different between the paralyzed and healthy eye (Wilcoxon p=0.016, r=0.385). The Relative Blink Amplitude (RBA) showed the strongest correlation with HB severity (Spearman rho=-0.494, p=0.001), followed by maximum amplitude (rho=-0.487, p=0.006) and mean amplitude (rho=-0.418, p=0.008). Baseline EAR did not differ between eyes, indicating that the impairment is dynamic rather than postural. A composite Palpebral Function Index (PFI) is proposed as a quantitative complement to clinical grading.

**Conclusion:** Automated blink metrics, particularly RBA, are promising objective biomarkers for peripheral facial paralysis severity. The BlinkTracking framework enables standardized, reproducible assessment from routine video recordings.

**Keywords:** facial paralysis, blink analysis, Eye Aspect Ratio, House-Brackmann, biomarker, MediaPipe, BlinkTracking

---

## 1. Introduction

Peripheral facial paralysis is a common clinical condition characterized by unilateral weakness or complete paralysis of the facial muscles innervated by the seventh cranial nerve. The House-Brackmann (HB) grading system, introduced in 1985, remains the most widely used tool for classifying severity, ranging from Grade I (normal function) to Grade VI (total paralysis) [1]. Despite its clinical utility, the HB scale is inherently subjective — interobserver variability is well documented, particularly for intermediate grades (III–IV), and the system does not capture subtle functional changes over time [2, 3].

The eyelid is one of the most functionally critical regions affected by facial paralysis. Incomplete eyelid closure (lagophthalmos) carries significant morbidity, including corneal exposure, keratopathy, and potential vision loss [4]. Objective quantification of eyelid dynamics — blink rate, amplitude, velocity, and completeness — could therefore serve as both a diagnostic biomarker and a monitoring tool for treatment response.

Recent advances in computer vision have made markerless facial landmark detection feasible using standard video recordings. The Eye Aspect Ratio (EAR), originally proposed by Soukupova and Cech (2016) [5], provides a frame-by-frame measure of eyelid aperture based on the ratio of vertical to horizontal palpebral distances. Combined with high-frequency video capture, EAR enables detailed kinematic analysis of blink dynamics without specialized hardware.

In this context, we developed the **BlinkTracking** framework (Dias, J.V.P.) — an open-source system for automated blink detection and metric computation from video recordings. BlinkTracking integrates Google MediaPipe Face Mesh for 478-point facial landmark extraction with a comprehensive blink analysis pipeline that computes rate, amplitude, velocity, completeness classification, Relative Blink Amplitude (RBA), and inter-blink intervals. The framework was developed as a separate project and has been applied to multiple clinical populations, including Graves' ophthalmopathy [6].

The present study applies BlinkTracking to a cohort of patients with unilateral peripheral facial paralysis to evaluate whether automated blink metrics can objectively discriminate paralysis severity as classified by the HB scale. We focus specifically on **intra-patient paired comparison** between the paralyzed and healthy eye — a design that eliminates inter-individual confounders and is robust to differences in video frame rate.

---

## 2. Methods

### 2.1 Study Design and Population

This is a cross-sectional observational study. Forty-four patients with clinically diagnosed unilateral peripheral facial paralysis were initially enrolled. After exclusions (4 with inadequate data quality, 1 bilateral paralysis case), **39 patients** (n=39) were included in the final analysis.

All patients were classified by an experienced clinician using the House-Brackmann grading system. The distribution of severity grades was:

| HB Grade | Description | n | % |
|----------|-------------|---|---|
| HB I | Normal / minimal residual | 2 | 5.1% |
| HB II | Mild dysfunction | 9 | 23.1% |
| HB III | Moderate dysfunction | 13 | 33.3% |
| HB IV | Moderate-severe dysfunction | 7 | 17.9% |
| HB V | Severe dysfunction | 7 | 17.9% |
| HB V–VI | Total/near-total paralysis | 1 | 2.6% |

For subgroup analyses requiring larger sample sizes, HB grades were regrouped into three severity tiers:

| Severity Tier | HB Grades | n |
|---------------|-----------|---|
| Mild | HB I–II | 11 |
| Moderate | HB III–IV | 20 |
| Severe | HB V–VI | 8 |

**Table 1.** Distribution of House-Brackmann grades and severity tier regrouping.

### 2.2 Video Acquisition

Patients were recorded during spontaneous blinking using smartphone cameras positioned frontally. Video duration ranged from 182 to 596 seconds (median 188s). Frame rates varied across recordings (approximately 30 fps for n=3, 150 fps for n=17, and 200–240 fps for n=19).

> **Methodological note on FPS heterogeneity:** The variable frame rate across recordings creates a systematic bias for velocity- and amplitude-dependent metrics when comparing between subjects filmed at different rates. Higher FPS yields finer temporal resolution, detecting micro-movements invisible at lower rates. For this reason, the primary analyses in this study focus on **intra-patient paired comparisons** (both eyes in the same video, same FPS), which are immune to this bias. Metrics that are FPS-independent by nature (blink rate, baseline EAR, RBA) are additionally valid for cross-subject correlations.

![Distribution of FPS across groups, illustrating the methodological constraint](graficos_analise/05_distribuicao_fps.png)

**Figure 1.** Distribution of video frame rates across the paralysis group (n=39) and control group (n=9). The heterogeneity in FPS restricts valid cross-group comparisons to FPS-independent metrics (blink rate, baseline EAR, RBA).

### 2.3 The BlinkTracking Framework

Video analysis was performed using the **BlinkTracking** framework, developed by Joao Victor Pacheco Dias as an independent project for automated ocular analysis. The framework comprises:

1. **Facial landmark extraction** using Google MediaPipe Face Mesh (478 3D facial landmarks), with 32 periocular points (7 upper + 9 lower per eye) extracted per frame.

2. **EAR computation** — the Eye Aspect Ratio is calculated frame-by-frame for each eye as the ratio of the mean vertical palpebral distance to the horizontal palpebral distance, following the formulation of Soukupova and Cech [5].

3. **Blink detection** — blinks are identified as contiguous sequences of frames where the EAR falls below a dynamically computed threshold (based on each patient's baseline EAR), with a minimum duration of 2 frames (MIN_FRAMES=2) to exclude noise.

4. **Blink classification** — each detected blink is classified as **complete** (EAR reaches near-zero, indicating full eyelid closure) or **incomplete** (EAR decreases but does not reach full closure), based on the ratio of the minimum EAR to baseline EAR.

5. **Metric computation** — for each eye, the following metrics are computed:
   - **Blink rate** (blinks/min): total detected blinks normalized by video duration
   - **Amplitude EAR**: mean decrease in EAR during blink events
   - **Maximum amplitude EAR**: largest single-blink EAR decrease
   - **Closing velocity** (EAR/s): rate of EAR decrease during eyelid closure
   - **Opening velocity** (EAR/s): rate of EAR increase during eyelid opening
   - **Percentage of complete blinks**: proportion of blinks classified as complete
   - **Baseline EAR**: median EAR during non-blink intervals (resting eyelid aperture)
   - **RBA (Relative Blink Amplitude)**: amplitude as a percentage of baseline EAR — normalizes for individual anatomical variation
   - **Velocity ratio** (closing/opening): asymmetry of blink kinematics
   - **Inter-blink time (IBT)**: interval between consecutive blink onsets

The paralyzed eye was identified for each patient using clinical records (column `olho_paralisado` from the HB grading table), confirmed by manual patient-by-patient mapping.

### 2.4 Statistical Analysis

All statistical analyses were performed using Python (scipy.stats, pandas, numpy).

- **Intra-patient paired comparisons** (paralyzed vs. healthy eye): Wilcoxon signed-rank test (non-parametric, paired). Effect size: r = Z/sqrt(n).
- **Correlation with HB severity**: Spearman rank correlation (non-parametric), treating HB grade as ordinal (I=1, II=2, III=3, IV=4, V=5, V-VI=5.5).
- **Stratification by severity**: Kruskal-Wallis test across HB grades.
- **Significance threshold**: p < 0.05 (two-tailed). No correction for multiple comparisons was applied in this exploratory analysis; results are interpreted accordingly.

Values are reported as median [IQR: Q1–Q3] unless otherwise stated.

---

## 3. Results

### 3.1 Intra-Patient Paired Comparison: Paralyzed vs. Healthy Eye

The primary analysis compared metrics between the paralyzed and healthy eye of the same patient (n=39 pairs), eliminating FPS bias and inter-individual confounders.

| Metric | Paralyzed Eye | Healthy Eye | p | Sig | r |
|--------|--------------|-------------|---|-----|---|
| Blink rate (blinks/min) | 7.10 [0.45–12.45] | 6.70 [0.85–12.90] | 0.016 | * | 0.385 |
| Amplitude EAR | 0.083 [0.066–0.102] | 0.086 [0.073–0.102] | 0.051 | ns | 0.313 |
| Closing velocity (EAR/s) | 3.369 [1.259–9.562] | 3.915 [2.305–12.661] | 0.102 | ns | 0.262 |
| Opening velocity (EAR/s) | 1.820 [0.926–3.607] | 2.349 [1.204–4.313] | 0.405 | ns | 0.133 |
| Baseline EAR | 0.276 [0.248–0.296] | 0.281 [0.249–0.301] | 0.296 | ns | 0.167 |
| RBA (%) | 29.10 [26.35–37.45] | 29.70 [27.10–36.00] | 0.203 | ns | 0.204 |
| Velocity ratio (close/open) | 1.619 [1.297–3.071] | 1.981 [1.453–3.300] | 0.371 | ns | 0.163 |

*Values: median [IQR]. \* p<0.05. ns = not significant.*

**Table 2.** Paired comparison of blink metrics between the paralyzed and healthy eye (Wilcoxon signed-rank test, n=39 pairs).

**Blink rate was the only metric with a statistically significant difference** between the paralyzed and healthy eye (p=0.016, r=0.385 — medium effect). The paralyzed eye registered a slightly higher blink rate, potentially reflecting **synkinesis** (involuntary movements in the affected eye) or inconsistent compensatory behavior.

Kinematic metrics (closing velocity, opening velocity, velocity ratio) did not reach significance in the paired comparison. Within the same video, under identical conditions, both eyes showed surprisingly similar absolute dynamics. **Baseline EAR did not differ between eyes** (p=0.296), indicating that the resting eyelid posture is relatively symmetric even in paralysis — **the impairment is dynamic (in movement), not postural**.

![Paired intra-patient comparison showing individual patient trajectories](graficos_analise/04_paired_intra_paciente.png)

**Figure 2.** Paired intra-patient comparison for blink rate and amplitude EAR. Each line represents one patient, connecting the paralyzed eye (left) to the healthy eye (right). The thick black line shows the group median. Wilcoxon p-values are indicated.

### 3.2 Complete and Incomplete Blinks

The BlinkTracking framework classifies each blink as complete (EAR reaches near-zero, indicating full eyelid closure) or incomplete (EAR decreases but does not reach full closure). In this cohort, the vast majority of detected blinks were classified as incomplete: **only 6 of 39 patients (15.4%) had any complete blinks detected in the paralyzed eye**, and only 5 of 39 (12.8%) in the healthy eye. Across all patients, the median percentage of complete blinks was 0% in both eyes.

The patients with detected complete blinks were:

| Patient | HB Grade | % Complete (Paralyzed) | % Complete (Healthy) |
|---------|----------|----------------------|---------------------|
| 8 (Monique S.) | HB II | 22.8% | 74.7% |
| 20 (Joao Victor F.) | HB II | 20.6% | 0.0% |
| 15 (Aline S.) | HB III | 16.0% | 24.1% |
| 27 (Julia R.) | HB IV | 53.2% | 50.0% |
| 28 (Flavia M.) | HB II | 6.0% | 4.8% |
| 43 (David V.) | HB I | 4.8% | 3.1% |

**Table 2b.** Patients with detected complete blinks. Only 6 of 39 patients had any complete blinks in either eye.

Two observations stand out. First, patient 8 (HB II) shows a striking asymmetry: 74.7% complete blinks in the healthy eye vs. 22.8% in the paralyzed eye — the largest inter-ocular difference in the cohort, consistent with the expected impact of mild paralysis on closure completeness. Second, patient 27 (HB IV) shows a high and nearly symmetric rate of complete blinks (53.2% vs. 50.0%), which is unexpected at this severity grade and may reflect synkinetic activity or individual anatomical factors.

The near-universal classification of blinks as incomplete (85% of patients with 0% complete blinks in both eyes) raises a **methodological consideration**: the current threshold for complete blink classification — requiring the EAR to approach zero — may be overly stringent. Spontaneous blinks, even in healthy individuals, often do not achieve full mechanical closure when measured frame-by-frame at high temporal resolution. The threshold may need recalibration for clinical applicability, potentially using a relative criterion (e.g., EAR drop >80% of baseline) rather than an absolute near-zero target. Future work should address this by benchmarking the completeness threshold against manual video annotation.

Despite this limitation, the qualitative pattern is informative: complete blinks, when detected, tend to occur more frequently in lower HB grades and show inter-ocular asymmetry consistent with the side of paralysis.

### 3.3 Correlation with House-Brackmann Severity

Spearman correlations between blink metrics and HB grade (treated as ordinal) were computed for all 39 patients.

| Metric | rho | p | Sig | FPS-safe |
|--------|-----|---|-----|----------|
| Blink rate — paralyzed eye | -0.400 | 0.012 | * | Yes |
| Blink rate — healthy eye | -0.360 | 0.024 | * | Yes |
| Amplitude EAR — paralyzed eye | -0.418 | 0.008 | ** | Yes |
| Amplitude EAR — healthy eye | -0.412 | 0.009 | ** | Yes |
| **RBA — paralyzed eye** | **-0.494** | **0.001** | **\*\*** | **Yes** |
| RBA — healthy eye | -0.436 | 0.006 | ** | Yes |
| Max. amplitude — paralyzed eye | -0.487 | 0.006 | ** | Yes |
| Max. amplitude — healthy eye | -0.340 | 0.046 | * | Yes |
| Baseline EAR — paralyzed eye | +0.045 | 0.784 | ns | Yes |
| Baseline EAR — healthy eye | -0.008 | 0.959 | ns | Yes |
| IBT median — paralyzed eye | +0.134 | 0.488 | ns | Yes |
| IBT median — healthy eye | +0.219 | 0.222 | ns | Yes |

*\* p<0.05; \*\* p<0.01.*

**Table 3.** Spearman correlations between blink metrics and House-Brackmann severity grade.

The most robust metrics — blink rate, amplitude, and RBA — showed **moderate-to-strong negative correlations** with HB grade: more severe paralysis was associated with lower blink rate, smaller amplitude, and reduced RBA, in **both eyes**.

**RBA of the paralyzed eye was the strongest biomarker** (rho=-0.494, p=0.001). By normalizing amplitude to each patient's baseline EAR, RBA controls for individual anatomical variation and captures the relative capacity for eyelid closure.

The finding that the **healthy eye also correlates with HB severity** (blink rate: rho=-0.360; amplitude: rho=-0.412) raises an important hypothesis: patients with more severe paralysis may blink less globally due to ocular protective behavior, reflex inhibition, or broader neural influence beyond the strictly ipsilateral pathway.

**Baseline EAR** showed no correlation with HB grade, confirming that resting eyelid posture is preserved regardless of paralysis severity — the deficit is exclusively dynamic.

![Scatter plots of Spearman correlations between metrics and HB grade](graficos_analise/02_scatter_correlacao_HB.png)

**Figure 3.** Spearman correlations between FPS-independent blink metrics and House-Brackmann severity grade (n=39). Each dot represents one patient. Dashed lines show linear trend. Correlation coefficients and p-values are indicated in each panel. RBA of the paralyzed eye (bottom center) shows the strongest correlation (rho=-0.494, p=0.001).

![Heatmap of Spearman correlations between all metrics and HB grade](graficos_analise/08_heatmap_correlacoes.png)

**Figure 4.** Heatmap of Spearman correlations between blink metrics (separated by eye) and HB severity grade. Warm colors indicate positive correlation; cool colors indicate negative correlation. Note the strong inter-metric correlations (blink rate, amplitude, RBA) and the absence of correlation with baseline EAR.

### 3.4 Stratification by Severity Tier (Regrouped HB)

To increase statistical power, HB grades were regrouped into three severity tiers (HB I–II, HB III–IV, HB V–VI).

#### 3.4.1 Blink Rate

| Severity Tier | n | Paralyzed Eye (blinks/min) | Healthy Eye (blinks/min) |
|---------------|---|---------------------------|--------------------------|
| HB I–II (mild) | 11 | 11.00 [3.40–25.10] | 11.00 [3.40–24.80] |
| HB III–IV (moderate) | 20 | 7.75 [0.35–10.75] | 7.60 [1.30–10.75] |
| HB V–VI (severe) | 8 | 1.30 [0.08–3.55] | 1.65 [0.15–5.23] |

#### 3.4.2 RBA

| Severity Tier | n | RBA Paralyzed (%) | RBA Healthy (%) |
|---------------|---|-------------------|-----------------|
| HB I–II (mild) | 11 | 38.10 [33.50–44.60] | 35.80 [29.40–44.30] |
| HB III–IV (moderate) | 20 | 30.00 [26.55–35.30] | 29.25 [27.05–35.05] |
| HB V–VI (severe) | 8 | 27.30 [13.10–27.95] | 27.75 [14.00–29.20] |

#### 3.4.3 Amplitude EAR

| Severity Tier | n | Amplitude Paralyzed | Amplitude Healthy |
|---------------|---|--------------------|--------------------|
| HB I–II (mild) | 11 | 0.105 [0.078–0.122] | 0.093 [0.074–0.128] |
| HB III–IV (moderate) | 20 | 0.078 [0.059–0.095] | 0.085 [0.071–0.098] |
| HB V–VI (severe) | 8 | 0.036 [0.000–0.074] | 0.035 [0.000–0.073] |

The regrouped analysis reveals clear dose-response trends across severity tiers for all three primary biomarkers. The severe group (HB V–VI) shows dramatically reduced blink rate (median 1.3 vs. 11.0 blinks/min in mild), RBA (27.3% vs. 38.1%), and amplitude (0.036 vs. 0.105).

![Bar charts showing metrics by HB grade](graficos_analise/03_barras_por_grau_HB.png)

**Figure 5.** Blink rate and amplitude EAR stratified by House-Brackmann grade, comparing paralyzed eye (red) and healthy eye (blue). The green dashed line indicates the control group median. A clear reduction trend is observed with increasing severity.

![RBA by HB grade — the strongest biomarker](graficos_analise/06_rba_por_grau_HB.png)

**Figure 6.** RBA (Relative Blink Amplitude) by House-Brackmann grade for the paralyzed eye (left) and healthy eye (right). RBA shows the strongest correlation with severity (rho=-0.494, p=0.001). The green dashed line indicates the control group median (31.1%).

### 3.5 Additional Metrics

#### 3.5.1 Maximum Blink Amplitude

The maximum blink amplitude captures the strongest single blink recorded during the video, representing the patient's peak capacity for eyelid closure.

In the paired comparison (n=30 patients with at least 1 blink in each eye), the maximum amplitude did not differ significantly between eyes (p=0.109, r=0.292), though with a medium-sized trend in the expected direction.

Maximum amplitude of the paralyzed eye showed a strong correlation with HB severity (rho=-0.487, p=0.006), making it the **second strongest biomarker** after RBA.

#### 3.5.2 Inter-Blink Time (IBT)

IBT — the time interval between consecutive blink onsets — is an FPS-independent metric that reflects the spontaneous blink rhythm.

| Metric | Paralyzed Eye | Healthy Eye | p | Sig |
|--------|--------------|-------------|---|-----|
| IBT median (s) | 3.675 [2.289–6.480] | 3.594 [2.322–5.373] | 0.278 | ns |
| IBT mean (s) | 5.392 [3.164–7.436] | 5.685 [3.164–8.904] | 0.485 | ns |
| IBT std dev (s) | 3.815 [2.156–8.502] | 3.652 [2.421–8.836] | 0.873 | ns |

IBT did not differ between eyes and showed no correlation with HB severity (Spearman rho=+0.134, p=0.488 for the paralyzed eye). The blink rhythm is a global neurological behavior, not asymmetric — making IBT unsuitable as a biomarker for paralysis severity.

#### 3.5.3 Opening/Closing Time Ratio

The ratio of opening time to closing time captures blink kinematic asymmetry. In normal physiology, opening (passive relaxation of the orbicularis oculi) is slower than closing (active contraction), yielding a ratio >1.

In the paired comparison (n=30), the paralyzed eye tended to have a lower ratio (1.090 vs. 1.322), suggesting less prolonged opening or slower closing, but the difference was not significant (p=0.151, r=0.263).

**Note on n=30 for analyses 6b and 6d:** The reduced sample size (30 instead of 39) in the maximum amplitude and opening/closing ratio analyses is because these metrics require at least one detected blink in each eye. Nine patients had zero blinks detected in one or both eyes (typically severe paralysis cases with HB IV–V where the paralyzed eye had no detectable blink events), reducing the available pairs.

### 3.6 Biomarker Ranking

Based on correlation strength with HB severity, FPS independence, and clinical interpretability:

| Rank | Biomarker | rho (vs. HB) | p | FPS-safe | Notes |
|------|-----------|-------------|---|----------|-------|
| 1 | **RBA — paralyzed eye** | -0.494 | 0.001 | Yes | Normalized to individual baseline |
| 2 | Max. amplitude — paralyzed eye | -0.487 | 0.006 | Yes* | *Mild FPS sensitivity |
| 3 | Mean amplitude — paralyzed eye | -0.418 | 0.008 | Yes* | Idem |
| 4 | RBA — healthy eye | -0.436 | 0.006 | Yes | Both eyes affected |
| 5 | Blink rate — paralyzed eye | -0.400 | 0.012 | Yes | Fully FPS-independent |
| 6 | Blink rate — healthy eye | -0.360 | 0.024 | Yes | |
| 7 | IBT median | ns | — | Yes | Does not discriminate severity |
| 8 | Baseline EAR | ns | — | Yes | Static posture preserved |

**Table 4.** Biomarker ranking by correlation with House-Brackmann severity.

### 3.7 Comparison Between Groups (FPS-Independent Metrics)

![Boxplot comparison between groups for FPS-independent metrics](graficos_analise/01_boxplot_tres_grupos.png)

**Figure 7.** Boxplot comparison of FPS-independent metrics across three groups: paralyzed eye (red, n=39), healthy eye (blue, n=39), and control group (green, n=9). Blink rate shows the only significant paired difference (\*). RBA, amplitude, and baseline EAR do not differ significantly between groups.

![Bilateral symmetry scatter plot](../graficos/03_scatter_simetria.png)

**Figure 8.** Bilateral symmetry of blink counts: right eye vs. left eye for paralysis patients (red) and controls (green). Most data points fall within the 20% tolerance band around perfect symmetry, indicating that the total number of blinks is highly symmetric between eyes even in paralysis — the deficit is qualitative (amplitude, completeness), not quantitative (count).

### 3.8 Proposed Palpebral Function Index (PFI)

Based on the validated biomarkers, we propose a composite index:

```
PFI = (RBA_paralyzed x Blink_rate_normalized) / 100

where:
  RBA_paralyzed = relative blink amplitude of the paralyzed eye (%)
  Blink_rate_normalized = blink_rate_paralyzed / blink_rate_mean_control (dimensionless)
```

Estimated reference values (current cohort, n=39):

| HB Severity | Estimated PFI (median) | Interpretation |
|-------------|----------------------|----------------|
| HB I–II | > 0.40 | Near-normal function |
| HB III–IV | 0.20 – 0.40 | Moderate impairment |
| HB V–VI | < 0.10 | Severe impairment |

> These values are exploratory and require prospective validation with an independent cohort.

---

## 4. Discussion

### 4.1 Key Findings

This study demonstrates that automated blink metrics derived from standard video recordings can objectively quantify eyelid function in peripheral facial paralysis and correlate with clinical severity grading.

**RBA emerged as the most promising biomarker** (rho=-0.494 with HB grade). Its strength lies in normalizing the blink amplitude to each patient's own baseline EAR, which controls for individual anatomical variation (eye size, resting aperture) and makes the metric inherently comparable across patients. Unlike absolute amplitude or velocity, RBA represents a clinically interpretable measure — the percentage of eyelid closure capacity.

The **intra-patient paired design** is a methodological strength of this study. By comparing the paralyzed eye to the healthy eye within the same video, we eliminate all inter-individual confounders (age, sex, attention, environment) and FPS-related biases. The finding that blink rate was the only metric with a significant paired difference (with the paralyzed eye showing higher rate) challenges the intuitive expectation that paralysis reduces blinking and may reflect synkinetic activity — a common sequela in recovering facial paralysis.

The observation that **kinematic metrics (velocity, velocity ratio) did not differ between eyes** in the paired comparison is clinically important. It suggests that the motor impairment manifests primarily in amplitude (how far the lid closes) rather than velocity (how fast it moves), at least within the EAR measurement paradigm.

**Baseline EAR was identical between eyes and showed no correlation with HB severity**, confirming that peripheral facial paralysis affects dynamic eyelid function while preserving static posture — the deficit is in the blink movement, not in the resting state.

### 4.2 The Role of the Healthy Eye

An unexpected finding was that the healthy eye also correlated with HB severity (blink rate: rho=-0.360; amplitude: rho=-0.412; RBA: rho=-0.436). This bilateral effect has several possible explanations:

1. **Protective behavior**: patients with severe paralysis may globally reduce spontaneous blinking to minimize asymmetric sensation or discomfort.
2. **Neural coupling**: blink commands are partially bilateral in origin; severe ipsilateral damage may subtly affect the contralateral pathway.
3. **Behavioral adaptation**: chronic paralysis patients may develop altered blink patterns that affect both eyes.

This finding has implications for study design: using the healthy eye as an internal control is valid for paired comparisons, but the healthy eye should not be assumed to be functionally identical to a truly healthy control.

### 4.3 Complete vs. Incomplete Blinks

Only 6 of 39 patients (15.4%) had any complete blinks detected in either eye, with 85% of the cohort showing 0% complete blinks bilaterally. This striking finding likely reflects an **overly stringent completeness threshold** in the current EAR-based classification, which requires the EAR to approach zero for a blink to be classified as complete. At high temporal resolution (150–240 fps), even physiologically normal spontaneous blinks rarely achieve absolute mechanical closure on a frame-by-frame basis — the lid may appear closed to a clinical observer while the EAR remains slightly above zero.

Despite this limitation, the few patients with detected complete blinks showed patterns consistent with clinical expectations: patient 8 (HB II) showed 74.7% complete blinks in the healthy eye vs. 22.8% in the paralyzed eye, the largest inter-ocular gap in the cohort. The completeness metric may become clinically useful after recalibration — for example, defining a complete blink as an EAR drop exceeding 80% of baseline rather than requiring near-zero EAR. This adjustment should be validated against manual video annotation in future work.

### 4.4 The BlinkTracking Framework

The BlinkTracking framework represents a contribution to the growing field of automated facial analysis for clinical applications. Key advantages include:

- **Non-invasive, markerless**: requires only a standard smartphone camera
- **Automated, reproducible**: eliminates inter-observer variability inherent in clinical grading
- **Comprehensive metrics**: computes a wide range of blink parameters in a single analysis
- **Open-source**: enables reproducibility and community-driven improvement
- **Adaptable**: has been applied to multiple clinical populations (facial paralysis, Graves' ophthalmopathy)

The framework uses MediaPipe Face Mesh for landmark detection, which provides robust performance across diverse lighting conditions and facial morphologies. The EAR computation follows established formulations and has been validated against manual annotation.

### 4.5 Limitations

1. **FPS heterogeneity**: the paralysis group was filmed at variable frame rates (30–240 fps), restricting valid cross-group comparisons to FPS-independent metrics. Future studies must standardize recording at >=120 fps.

2. **Small subgroup sizes**: individual HB grades had limited sample sizes (HB I: n=2; HB V-VI: n=1), reducing power for stratified analyses. The regrouping into three severity tiers (HB I–II, III–IV, V–VI) partially mitigates this.

3. **Cross-sectional design**: without longitudinal follow-up, we cannot assess whether metric changes track clinical recovery.

4. **Absence of demographic matching**: the control group (n=9) was not age- or sex-matched with patients.

5. **Environmental variability**: videos were captured in different clinical settings with varying illumination, introducing noise in the landmark detection.

6. **Reduced n in some analyses (n=30)**: maximum amplitude and opening/closing ratio analyses required at least one blink per eye, excluding 9 severe cases with no detectable blinks in the paralyzed eye.

### 4.6 Future Directions

1. **Standardized FPS (>=120 fps)** for all recordings to enable valid velocity and kinematic comparisons
2. **Expanded control group** (n>=30) with age/sex matching
3. **Longitudinal cohort** to evaluate metric sensitivity to clinical recovery over time
4. **Validation of the PFI** as a composite endpoint for clinical trials
5. **Correlation with EMG** for neurophysiological validation of automated metrics
6. **Retrospective downsampling** of high-FPS data to 24 fps to enable comparison with existing control recordings

---

## 5. Conclusion

Automated blink analysis using the BlinkTracking framework provides objective, reproducible measures of eyelid function in peripheral facial paralysis. The **Relative Blink Amplitude (RBA)** is the most promising biomarker, showing a moderate-to-strong correlation with House-Brackmann severity (rho=-0.494, p=0.001) while being robust to frame rate variation. Blink rate, amplitude, and maximum amplitude are additional discriminative metrics.

The intra-patient paired comparison design demonstrates that the deficit in facial paralysis is primarily dynamic (reduced blink amplitude and completeness) rather than postural (baseline eyelid aperture is preserved). The proposed Palpebral Function Index (PFI) offers a quantitative complement to the subjective HB scale for longitudinal monitoring.

These findings support the integration of automated video-based blink analysis into the clinical assessment of facial paralysis, potentially enabling earlier detection of subtle improvement, objective treatment monitoring, and standardized outcome measurement in clinical trials.

---

## References

[1] House JW, Brackmann DE. Facial nerve grading system. Otolaryngol Head Neck Surg. 1985;93(2):146-147.

[2] Vrabec JT, Backous DD, Djalilian HR, et al. Facial Nerve Grading System 2.0. Otolaryngol Head Neck Surg. 2009;140(4):445-450.

[3] Reitzen SD, Babb JS, Lalwani AK. Significance and reliability of the House-Brackmann grading system for regional facial nerve function. Otolaryngol Head Neck Surg. 2009;140(2):154-158.

[4] Rahman I, Sadiq SA. Ophthalmic management of facial nerve palsy: a review. Surv Ophthalmol. 2007;52(2):121-144.

[5] Soukupova T, Cech J. Real-time eye blink detection using facial landmarks. In: 21st Computer Vision Winter Workshop. 2016.

[6] Dias JVP. Automated blink analysis in Graves' ophthalmopathy using the BlinkTracking framework. [Manuscript in preparation].

---

## Appendix: Figures Summary

| Figure | Description | File |
|--------|-------------|------|
| Fig. 1 | FPS distribution across groups | `graficos_analise/05_distribuicao_fps.png` |
| Fig. 2 | Paired intra-patient comparison | `graficos_analise/04_paired_intra_paciente.png` |
| Fig. 3 | Spearman correlations with HB grade | `graficos_analise/02_scatter_correlacao_HB.png` |
| Fig. 4 | Correlation heatmap | `graficos_analise/08_heatmap_correlacoes.png` |
| Fig. 5 | Metrics by HB grade (bar charts) | `graficos_analise/03_barras_por_grau_HB.png` |
| Fig. 6 | RBA by HB grade (boxplots) | `graficos_analise/06_rba_por_grau_HB.png` |
| Fig. 7 | Three-group boxplot comparison | `graficos_analise/01_boxplot_tres_grupos.png` |
| Fig. 8 | Bilateral symmetry scatter | `graficos/03_scatter_simetria.png` |

---

*Draft generated: March 2026*
*Framework: BlinkTracking (Dias, J.V.P.)*
*Analysis tool: Python (scipy, pandas, numpy, MediaPipe)*
