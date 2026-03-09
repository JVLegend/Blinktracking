"""
autoresearch/research.py
========================
Autoresearch loop for BlinkTracking — House-Brackmann grade prediction.

Inspired by Karpathy's autoresearch pattern:
  - Human iterates on prompt.md (research goal)
  - Agent (this script) iterates on feature engineering and model selection
  - Each run = one experiment, saved as git commit + JSON result

Usage:
  python autoresearch/research.py --run 1
  python autoresearch/research.py --run 2 --improve  # agent picks best direction from leaderboard

The script loads per-patient Excel results from resultados_paralisia/ and controle/,
merges with tabela_HB.xlsx, engineers features, trains models, and evaluates.
"""

import os
import json
import argparse
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.metrics import (
    roc_auc_score, f1_score, confusion_matrix,
    classification_report, roc_curve
)
from scipy.stats import spearmanr

warnings.filterwarnings("ignore")

# ─── Paths ───────────────────────────────────────────────────────────────────
ROOT         = Path(__file__).parent.parent
TMP          = ROOT / "tmp"
HB_FILE      = TMP / "tabela_HB.xlsx"
RESULTS_DIR  = Path(__file__).parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)
LEADERBOARD  = RESULTS_DIR / "leaderboard.csv"

# Folders with pre-computed patient Excel files (one per patient)
PARALISIA_DIR = TMP / "resultados_paralisia"
CONTROLE_DIR  = TMP / "resultados_controle"


# ─── Feature extraction ───────────────────────────────────────────────────────

def load_patient_metrics(excel_path: Path, olho_afetado: str = None) -> dict:
    """
    Load summary metrics from a single patient Excel file.
    Returns a flat dict of features.
    olho_afetado: 'DIR.' or 'ESQ.' — which eye has palsy (None for controls)
    """
    try:
        df = pd.read_excel(excel_path, sheet_name="Resumo por Olho")
    except Exception as e:
        print(f"  [WARN] Could not read {excel_path.name}: {e}")
        return None

    # Normalize eye labels
    df["Olho"] = df["Olho"].str.upper().str.strip()

    rows = {}
    for _, row in df.iterrows():
        olho = row["Olho"]  # "DIREITO" or "ESQUERDO"
        rows[olho] = row

    if len(rows) < 2:
        # Missing one eye — fill with NaN
        for missing in ["DIREITO", "ESQUERDO"]:
            if missing not in rows:
                rows[missing] = pd.Series(dtype=float)

    def safe(row, col):
        try:
            v = row[col]
            return float(v) if pd.notna(v) else np.nan
        except Exception:
            return np.nan

    d = {}
    e_dir = rows.get("DIREITO", pd.Series())
    e_esq = rows.get("ESQUERDO", pd.Series())

    for eye_label, eye_row in [("dir", e_dir), ("esq", e_esq)]:
        d[f"taxa_{eye_label}"]       = safe(eye_row, "Taxa (piscadas/min)")
        d[f"vel_fech_{eye_label}"]   = safe(eye_row, "Vel. Fechamento Média")
        d[f"vel_aber_{eye_label}"]   = safe(eye_row, "Vel. Abertura Média")
        d[f"amplitude_{eye_label}"]  = safe(eye_row, "Amplitude Média")
        d[f"rba_{eye_label}"]        = safe(eye_row, "RBA Médio (%)")
        d[f"pct_comp_{eye_label}"]   = safe(eye_row, "% Completas")
        d[f"baseline_{eye_label}"]   = safe(eye_row, "Baseline EAR")
        d[f"duracao_{eye_label}"]    = safe(eye_row, "Duração Média (s)")

        # Velocity ratio (most discriminative known feature)
        vf = d[f"vel_fech_{eye_label}"]
        va = d[f"vel_aber_{eye_label}"]
        if va and va != 0 and not np.isnan(va):
            d[f"razao_vel_{eye_label}"] = vf / va
        else:
            d[f"razao_vel_{eye_label}"] = np.nan

    # ── Derived bilateral asymmetry features ──────────────────────────────
    def asym(a, b):
        if np.isnan(a) or np.isnan(b):
            return np.nan
        denom = max(abs(a), abs(b), 1e-6)
        return abs(a - b) / denom  # 0 = symmetric, 1 = fully asymmetric

    d["asym_taxa"]      = asym(d["taxa_dir"],      d["taxa_esq"])
    d["asym_vel_fech"]  = asym(d["vel_fech_dir"],  d["vel_fech_esq"])
    d["asym_vel_aber"]  = asym(d["vel_aber_dir"],  d["vel_aber_esq"])
    d["asym_razao_vel"] = asym(d["razao_vel_dir"], d["razao_vel_esq"])
    d["asym_amplitude"] = asym(d["amplitude_dir"], d["amplitude_esq"])
    d["asym_pct_comp"]  = asym(d["pct_comp_dir"],  d["pct_comp_esq"])

    # ── Affected eye vs healthy eye (for palsy patients) ──────────────────
    if olho_afetado:
        afetado = "dir" if "DIR" in olho_afetado.upper() else "esq"
        saudavel = "esq" if afetado == "dir" else "dir"
        for metric in ["taxa", "vel_fech", "vel_aber", "razao_vel", "amplitude", "pct_comp"]:
            a = d.get(f"{metric}_{afetado}", np.nan)
            s = d.get(f"{metric}_{saudavel}", np.nan)
            if not np.isnan(a) and not np.isnan(s) and s != 0:
                d[f"{metric}_ratio_afetado_saudavel"] = a / s
            else:
                d[f"{metric}_ratio_afetado_saudavel"] = np.nan
    else:
        for metric in ["taxa", "vel_fech", "vel_aber", "razao_vel", "amplitude", "pct_comp"]:
            d[f"{metric}_ratio_afetado_saudavel"] = np.nan

    return d


def load_dataset() -> pd.DataFrame:
    """
    Loads all patients (paralisia + controle) with their metrics and HB labels.
    Returns a DataFrame ready for ML.
    """
    hb_df = pd.read_excel(HB_FILE)
    hb_df.columns = hb_df.columns.str.strip()

    # Normalize HB grade to integer 1-6
    def parse_hb(val):
        if pd.isna(val):
            return np.nan
        s = str(val).upper().strip()
        mapping = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6}
        # Handle ranges like "II/III" or "V-VI" → take the higher grade
        for sep in ["/", "-"]:
            if sep in s:
                parts = [p.strip() for p in s.split(sep)]
                grades = [mapping.get(p) for p in parts if mapping.get(p)]
                return max(grades) if grades else np.nan
        return mapping.get(s, np.nan)

    hb_df["hb_grade"] = hb_df["house-brackmann"].apply(parse_hb)
    hb_df = hb_df[hb_df["remover"].str.lower().str.strip() != "sim"]

    records = []

    # ── Load paralysis patients ────────────────────────────────────────────
    if PARALISIA_DIR.exists():
        for excel_file in sorted(PARALISIA_DIR.glob("*.xlsx")):
            patient_id = excel_file.stem  # filename without extension = patient ID

            # Match to HB table — try by ID or by name fragment
            hb_row = None
            if patient_id.isdigit():
                # numeric ID — look for match in nome column (may have ID prefix)
                matches = hb_df[hb_df["nome"].str.contains(patient_id, na=False)]
                if len(matches) == 1:
                    hb_row = matches.iloc[0]
            if hb_row is None:
                # Try filename as partial name match
                matches = hb_df[hb_df["nome"].str.upper().str.contains(
                    patient_id.upper().replace("_", " "), na=False)]
                if len(matches) == 1:
                    hb_row = matches.iloc[0]

            olho_afetado = hb_row["olho_paralisado"] if hb_row is not None else None
            hb_grade     = hb_row["hb_grade"]        if hb_row is not None else np.nan
            idade        = hb_row["idade"]            if hb_row is not None else np.nan
            sexo         = 1 if (hb_row is not None and str(hb_row["sexo"]).strip().upper() == "M") else 0

            metrics = load_patient_metrics(excel_file, olho_afetado)
            if metrics is None:
                continue

            metrics["patient_id"] = patient_id
            metrics["grupo"]      = "paralisia"
            metrics["hb_grade"]   = hb_grade
            metrics["idade"]      = idade
            metrics["sexo"]       = sexo
            metrics["label_bin"]  = 1  # has palsy

            records.append(metrics)
    else:
        print(f"  [WARN] {PARALISIA_DIR} not found — no palsy patients loaded")

    # ── Load control patients ──────────────────────────────────────────────
    if CONTROLE_DIR.exists():
        for excel_file in sorted(CONTROLE_DIR.glob("*.xlsx")):
            metrics = load_patient_metrics(excel_file, olho_afetado=None)
            if metrics is None:
                continue

            metrics["patient_id"] = excel_file.stem
            metrics["grupo"]      = "controle"
            metrics["hb_grade"]   = 0  # controls = grade 0 (no palsy)
            metrics["idade"]      = np.nan
            metrics["sexo"]       = np.nan
            metrics["label_bin"]  = 0  # no palsy

            records.append(metrics)
    else:
        print(f"  [WARN] {CONTROLE_DIR} not found — no controls loaded")

    if not records:
        raise RuntimeError(
            "No patient data found.\n"
            f"  Expected paralysis Excels in: {PARALISIA_DIR}\n"
            f"  Expected control  Excels in: {CONTROLE_DIR}\n"
            "Run analisar_pasta_metricas.py on each group folder first."
        )

    df = pd.DataFrame(records)
    print(f"\n  Loaded: {len(df)} patients "
          f"({(df.label_bin==1).sum()} palsy, {(df.label_bin==0).sum()} controls)")
    return df


# ─── Experiment configurations ────────────────────────────────────────────────

FEATURE_SETS = {
    "core": [
        "razao_vel_dir", "razao_vel_esq",
        "vel_fech_dir", "vel_fech_esq",
        "vel_aber_dir", "vel_aber_esq",
    ],
    "asymmetry": [
        "asym_taxa", "asym_vel_fech", "asym_vel_aber",
        "asym_razao_vel", "asym_amplitude", "asym_pct_comp",
    ],
    "affected_ratio": [
        "taxa_ratio_afetado_saudavel",
        "vel_fech_ratio_afetado_saudavel",
        "vel_aber_ratio_afetado_saudavel",
        "razao_vel_ratio_afetado_saudavel",
        "amplitude_ratio_afetado_saudavel",
        "pct_comp_ratio_afetado_saudavel",
    ],
    "full_summary": [
        "taxa_dir", "taxa_esq",
        "vel_fech_dir", "vel_fech_esq",
        "vel_aber_dir", "vel_aber_esq",
        "razao_vel_dir", "razao_vel_esq",
        "amplitude_dir", "amplitude_esq",
        "rba_dir", "rba_esq",
        "pct_comp_dir", "pct_comp_esq",
        "baseline_dir", "baseline_esq",
        "duracao_dir", "duracao_esq",
    ],
    "core+asymmetry": [
        "razao_vel_dir", "razao_vel_esq",
        "vel_fech_dir", "vel_fech_esq",
        "asym_razao_vel", "asym_vel_fech",
        "asym_amplitude", "asym_pct_comp",
    ],
    "all": None,  # will be filled dynamically
}

MODELS = {
    "logreg":  LogisticRegression(max_iter=1000, random_state=42),
    "svm":     SVC(kernel="rbf", probability=True, random_state=42),
    "rf":      RandomForestClassifier(n_estimators=200, random_state=42),
    "gbm":     GradientBoostingClassifier(n_estimators=200, random_state=42),
}

NORMALIZERS = {
    "zscore":  StandardScaler(),
    "minmax":  MinMaxScaler(),
    "none":    None,
}


# ─── Run experiment ───────────────────────────────────────────────────────────

def run_experiment(
    run_id: int,
    feature_set_name: str = "core+asymmetry",
    model_name: str = "rf",
    normalization: str = "zscore",
    include_demographics: bool = False,
    notes: str = "",
) -> dict:
    """
    Run a single experiment and return results dict.
    """
    print(f"\n{'='*60}")
    print(f"  RUN {run_id} | features={feature_set_name} | model={model_name} | norm={normalization}")
    print(f"{'='*60}")

    df = load_dataset()

    # ── Select features ────────────────────────────────────────────────────
    feature_cols = FEATURE_SETS.get(feature_set_name)
    if feature_cols is None:  # "all"
        exclude = {"patient_id", "grupo", "hb_grade", "label_bin", "idade", "sexo"}
        feature_cols = [c for c in df.columns if c not in exclude and df[c].dtype in [float, np.float64, int, np.int64]]

    if include_demographics:
        feature_cols = feature_cols + ["idade", "sexo"]

    # Keep only available columns
    feature_cols = [c for c in feature_cols if c in df.columns]
    print(f"\n  Features ({len(feature_cols)}): {feature_cols}")

    # Drop rows where ALL features are NaN
    X = df[feature_cols].copy()
    y_bin = df["label_bin"].values
    y_hb  = df["hb_grade"].values

    mask = X.notna().any(axis=1)
    X = X[mask]
    y_bin = y_bin[mask]
    y_hb  = y_hb[mask]

    # Impute remaining NaN with median
    for col in X.columns:
        X[col] = X[col].fillna(X[col].median())

    X_arr = X.values

    # ── Normalize ──────────────────────────────────────────────────────────
    if normalization != "none" and NORMALIZERS[normalization] is not None:
        scaler = NORMALIZERS[normalization]
        X_arr = scaler.fit_transform(X_arr)

    # ── Binary classification (palsy vs control) ───────────────────────────
    model = MODELS[model_name]
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    auc_scores = cross_val_score(model, X_arr, y_bin, cv=cv, scoring="roc_auc")
    f1_scores  = cross_val_score(model, X_arr, y_bin, cv=cv, scoring="f1_macro")

    auc_mean = float(np.mean(auc_scores))
    f1_mean  = float(np.mean(f1_scores))

    print(f"\n  Binary classification (5-fold CV):")
    print(f"    AUC  = {auc_mean:.4f} ± {np.std(auc_scores):.4f}")
    print(f"    F1   = {f1_mean:.4f} ± {np.std(f1_scores):.4f}")

    # ── Train full model for confusion matrix ──────────────────────────────
    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(
        X_arr, y_bin, test_size=0.2, stratify=y_bin, random_state=42)

    m = MODELS[model_name].__class__(**MODELS[model_name].get_params())
    m.fit(X_train, y_train)
    y_pred      = m.predict(X_test)
    y_pred_prob = m.predict_proba(X_test)[:, 1]

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (0, 0, 0, 0)
    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    auc_test    = roc_auc_score(y_test, y_pred_prob) if len(np.unique(y_test)) > 1 else 0.0

    print(f"\n  Hold-out test set:")
    print(f"    AUC         = {auc_test:.4f}")
    print(f"    Sensitivity = {sensitivity:.4f}")
    print(f"    Specificity = {specificity:.4f}")
    print(f"\n  Confusion matrix (test):\n    {cm}")

    # ── Ordinal: Spearman rho vs HB grade ─────────────────────────────────
    # Use predicted probability as ordinal score
    palsy_mask = y_hb > 0
    spearman_rho = np.nan
    if palsy_mask.sum() >= 5:
        X_palsy = X_arr[palsy_mask]
        y_hb_palsy = y_hb[palsy_mask]
        m_ord = MODELS[model_name].__class__(**MODELS[model_name].get_params())
        m_ord.fit(X_arr, y_bin)  # train on all
        scores_palsy = m_ord.predict_proba(X_palsy)[:, 1]
        rho, pval = spearmanr(scores_palsy, y_hb_palsy)
        spearman_rho = float(rho)
        print(f"\n  Ordinal (Spearman rho vs HB grade, palsy only):")
        print(f"    rho = {spearman_rho:.4f}  (p={pval:.4f})")

    # ── Feature importances (RF/GBM only) ─────────────────────────────────
    fi = {}
    if hasattr(m, "feature_importances_"):
        fi = dict(sorted(
            zip(feature_cols, m.feature_importances_.tolist()),
            key=lambda x: -x[1]
        ))
        print(f"\n  Top-5 feature importances:")
        for feat, imp in list(fi.items())[:5]:
            print(f"    {feat}: {imp:.4f}")

    # ── Save results ──────────────────────────────────────────────────────
    result = {
        "run":            run_id,
        "timestamp":      datetime.now().isoformat(),
        "feature_set":    feature_set_name,
        "features_used":  feature_cols,
        "model":          model_name,
        "normalization":  normalization,
        "demographics":   include_demographics,
        "n_patients":     int(len(df)),
        "n_palsy":        int((df.label_bin == 1).sum()),
        "n_controls":     int((df.label_bin == 0).sum()),
        "auc_cv":         round(auc_mean, 4),
        "auc_test":       round(auc_test, 4),
        "f1_cv":          round(f1_mean, 4),
        "sensitivity":    round(sensitivity, 4),
        "specificity":    round(specificity, 4),
        "spearman_rho":   round(spearman_rho, 4) if not np.isnan(spearman_rho) else None,
        "feature_importances": {k: round(v, 4) for k, v in list(fi.items())[:10]},
        "notes":          notes,
    }

    out_file = RESULTS_DIR / f"run_{run_id:03d}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"\n  Saved: {out_file}")

    # ── Update leaderboard ─────────────────────────────────────────────────
    row = {
        "run": run_id,
        "auc_cv": result["auc_cv"],
        "auc_test": result["auc_test"],
        "f1_cv": result["f1_cv"],
        "sensitivity": result["sensitivity"],
        "specificity": result["specificity"],
        "spearman_rho": result["spearman_rho"],
        "feature_set": feature_set_name,
        "model": model_name,
        "normalization": normalization,
        "n_features": len(feature_cols),
        "notes": notes,
        "timestamp": result["timestamp"],
    }

    lb_df = pd.read_csv(LEADERBOARD) if LEADERBOARD.exists() else pd.DataFrame()
    lb_df = pd.concat([lb_df, pd.DataFrame([row])], ignore_index=True)
    lb_df = lb_df.sort_values("auc_cv", ascending=False)
    lb_df.to_csv(LEADERBOARD, index=False)
    print(f"  Leaderboard updated: {LEADERBOARD}")

    return result


# ─── Auto-improve: pick next experiment based on leaderboard ──────────────────

def pick_next_config(run_id: int) -> dict:
    """
    Read leaderboard and pick the next experiment configuration
    by exploring the most promising direction from prior runs.
    """
    if not LEADERBOARD.exists() or run_id == 1:
        return {
            "feature_set_name": "core+asymmetry",
            "model_name":       "rf",
            "normalization":    "zscore",
            "include_demographics": False,
            "notes":            "Baseline run",
        }

    lb = pd.read_csv(LEADERBOARD)
    best = lb.iloc[0]  # already sorted by auc_cv

    # Grid of options to try
    options_features = ["core", "asymmetry", "affected_ratio", "core+asymmetry", "full_summary", "all"]
    options_models   = ["logreg", "svm", "rf", "gbm"]
    options_norm     = ["zscore", "minmax", "none"]

    # Find what hasn't been tried yet
    tried = set(zip(lb["feature_set"], lb["model"], lb["normalization"]))

    for fs in options_features:
        for mod in options_models:
            for norm in options_norm:
                if (fs, mod, norm) not in tried:
                    return {
                        "feature_set_name":    fs,
                        "model_name":          mod,
                        "normalization":       norm,
                        "include_demographics": False,
                        "notes":               f"Grid search — improving from run {best['run']} (AUC={best['auc_cv']})",
                    }

    # If all tried, try with demographics
    for fs in options_features:
        for mod in options_models:
            for norm in options_norm:
                if (fs, mod, norm) not in tried:
                    return {
                        "feature_set_name":    fs,
                        "model_name":          mod,
                        "normalization":       norm,
                        "include_demographics": True,
                        "notes":               f"With demographics — improving from run {best['run']}",
                    }

    return {
        "feature_set_name": best["feature_set"],
        "model_name":       best["model"],
        "normalization":    best["normalization"],
        "include_demographics": False,
        "notes":            "Re-run best config (all combinations exhausted)",
    }


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Autoresearch: Blink kinematics → HB grade prediction"
    )
    parser.add_argument("--run",       type=int,  default=1,              help="Run ID (integer, increments per experiment)")
    parser.add_argument("--improve",   action="store_true",               help="Auto-pick next config from leaderboard")
    parser.add_argument("--features",  type=str,  default="core+asymmetry", help="Feature set name")
    parser.add_argument("--model",     type=str,  default="rf",           help="Model: logreg, svm, rf, gbm")
    parser.add_argument("--norm",      type=str,  default="zscore",       help="Normalization: zscore, minmax, none")
    parser.add_argument("--demo",      action="store_true",               help="Include age+sex as features")
    parser.add_argument("--notes",     type=str,  default="",             help="Notes for this run")
    args = parser.parse_args()

    if args.improve:
        config = pick_next_config(args.run)
        print(f"\n  Auto-picked config: {config}")
    else:
        config = {
            "feature_set_name":    args.features,
            "model_name":          args.model,
            "normalization":       args.norm,
            "include_demographics": args.demo,
            "notes":               args.notes,
        }

    result = run_experiment(run_id=args.run, **config)

    print(f"\n{'='*60}")
    print(f"  DONE — Run {args.run}")
    print(f"  AUC (CV):   {result['auc_cv']}")
    print(f"  AUC (test): {result['auc_test']}")
    print(f"  Spearman ρ: {result['spearman_rho']}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
