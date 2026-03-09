# Autoresearch: Blink Kinematics as Biomarker for House-Brackmann Grading

## Research Goal

Identify the best combination of palpebral kinematic metrics — derived from automated EAR-based blink analysis — that most accurately predicts House-Brackmann (HB) grade in patients with unilateral facial palsy.

## Clinical Context

- **Dataset A (paralisia/)**: 43 patients with unilateral facial palsy, classified HB I–VI
- **Dataset B (controle/)**: Healthy controls, no facial or ocular pathology
- **HB table**: `tmp/tabela_HB.xlsx` — columns: nome, sexo, idade, olho_paralisado, lesoes, house-brackmann, tratamento, remover
- **Per-patient metrics**: pre-computed Excel files in `resultados_paralisia/` (one per patient, from `analisar_metricas_completas.py`)

## Available Features (per eye, per patient)

From sheet "Resumo por Olho" in each patient Excel:
- `taxa_piscadas_min` — blink rate
- `vel_fechamento_media` — mean closing velocity (EAR/s)
- `vel_abertura_media` — mean opening velocity (EAR/s)
- `razao_vel` — closing/opening velocity ratio (most discriminative known feature)
- `amplitude_media` — mean blink amplitude
- `rba_medio` — relative blink amplitude (%)
- `pct_completas` — % complete blinks
- `baseline_ear` — resting eye opening (90th percentile EAR)
- `duracao_media` — mean blink duration (s)

## Derived Features to Engineer

The agent should explore combinations and derivations including:
- `assimetria_vel_ratio` — difference in razao_vel between affected vs healthy eye
- `assimetria_taxa` — difference in blink rate between eyes
- `assimetria_amplitude` — difference in amplitude between eyes
- `olho_afetado_vs_controle` — ratio of affected eye metric vs normative mean from control group
- `ifp_score` — Índice de Função Palpebral: composite score to optimize (formula is a free parameter)

## Prediction Targets

Run two experiments in parallel:

1. **Binary classification**: paralisy (HB II–VI) vs control (HB I + controls)
2. **Ordinal regression**: predict HB grade I → VI (treat as ordered: 1, 2, 3, 4, 5, 6)

## Evaluation Metric (Objective Function)

Primary: **AUC-ROC** for binary classification
Secondary: **Spearman correlation** between predicted score and HB grade (ordinal)
Both metrics should be reported on held-out test set (stratified 80/20 split by HB grade).

## Constraints

- Do NOT use patient name as a feature
- Do NOT use etiology (lesoes) as a feature — focus on kinematic features only
- Age and sex may be used as covariates if they improve AUC
- Must handle missing data (some patients may have 0 blinks in affected eye)
- Prefer interpretable models (logistic regression, SVM, random forest) over black boxes

## What the Agent Should Iterate On

Each experiment run should try a different combination of:
1. Feature set (which metrics to include, which derived features to engineer)
2. Normalization strategy (z-score, min-max, per-eye relative)
3. Model type (LogReg, SVM, RF, GBM)
4. Threshold for "complete blink" detection (currently 50% of baseline — try 40–60%)
5. Whether to use per-blink statistics (mean, median, std, IQR) vs summary only

## Success Criteria

A run is "better" than the previous if it achieves higher AUC on the test set.
Track: AUC, Sensitivity, Specificity, F1, Spearman-rho, and which features were selected.

## Output per Run

The agent must save to `autoresearch/results/run_<N>.json`:
```json
{
  "run": N,
  "auc": 0.00,
  "spearman_rho": 0.00,
  "sensitivity": 0.00,
  "specificity": 0.00,
  "f1": 0.00,
  "features_used": [],
  "model": "",
  "normalization": "",
  "notes": ""
}
```

And append a summary line to `autoresearch/results/leaderboard.csv`.

## Research Hypothesis

The velocity ratio (closing/opening) combined with bilateral asymmetry metrics will achieve AUC > 0.90 for distinguishing HB III–VI from controls, and Spearman rho > 0.75 for ordinal HB grade prediction.
