# Autoresearch Pipeline — BlinkTracking PhD

> **Conceito**: inspirado em [karpathy/autoresearch](https://github.com/karpathy/autoresearch)
> O humano define a hipótese. O agente itera nos experimentos. Cada run vira um commit git.

---

## O que é isso?

É um loop de pesquisa autônomo aplicado ao BlinkTracking. Em vez de rodar manualmente cada combinação de métricas e modelos, o agente percorre o espaço de experimentos sozinho, registrando os resultados em JSON e no leaderboard.

```
você edita         →    prompt.md       (hipótese e critérios)
agente itera       →    research.py     (feature engineering + modelos)
cada run gera      →    run_001.json    (AUC, Spearman ρ, features usadas)
progresso rastreado →   leaderboard.csv (ranking por AUC)
cada run = commit  →    git log         (histórico auditável)
```

---

## Problema científico

**Pergunta**: quais métricas cinemáticas palpebrais — extraídas automaticamente via MediaPipe — melhor predizem o grau House-Brackmann (HB I–VI) em pacientes com paralisia facial unilateral?

**Dataset**:
- 43 pacientes com paralisia facial (HB I–VI, etiologias mistas: Bell, Ramsay Hunt, tumores, TCE)
- Grupo controle sem patologia ocular
- Dados: CSVs com EAR frame-a-frame por olho, processados por `analisar_metricas_completas.py`

**Hipótese principal**:
> O velocity ratio (velocidade fechamento ÷ abertura) combinado com métricas de assimetria bilateral atingirá **AUC > 0.90** para separar HB III–VI de controles, e **Spearman ρ > 0.75** para predição ordinal do grau HB.

---

## Estrutura dos arquivos

```
autoresearch/
├── prompt.md           ← hipótese de pesquisa (você edita)
├── research.py         ← agente: carrega dados, engenharia features, treina, avalia
├── preparar_dados.py   ← roda 1x: processa CSVs → Excels de métricas
├── run_loop.py         ← loop autônomo com N runs + git commit
└── results/
    ├── run_001.json    ← resultado de cada experimento
    ├── run_002.json
    └── leaderboard.csv ← ranking por AUC, atualizado a cada run
```

---

## Features que o agente explora

Todas derivadas do EAR (Eye Aspect Ratio) calculado quadro a quadro:

| Categoria | Features |
|---|---|
| **Core cinemático** | `vel_fechamento`, `vel_abertura`, `razao_vel` (por olho) |
| **Assimetria bilateral** | `asym_taxa`, `asym_vel_fech`, `asym_razao_vel`, `asym_amplitude` |
| **Olho afetado vs saudável** | `razao_vel_ratio_afetado_saudavel`, `taxa_ratio_afetado_saudavel` |
| **Sumário completo** | taxa, amplitude, RBA, % completas, baseline EAR, duração |
| **Demográficos** | idade, sexo (opcionais) |

---

## Modelos testados

| Sigla | Modelo |
|---|---|
| `logreg` | Regressão Logística |
| `svm` | SVM kernel RBF |
| `rf` | Random Forest (200 árvores) |
| `gbm` | Gradient Boosting (200 estimators) |

---

## Como rodar

### Pré-requisitos

```bash
pip install scikit-learn scipy openpyxl pandas numpy
```

### 1. Organizar os CSVs

```
tmp/
├── paralisia/     ← um CSV por paciente (nome do arquivo = ID do paciente)
│   ├── 4474.csv
│   └── ...
├── controle/      ← CSVs dos controles
└── tabela_HB.xlsx ← já existe
```

### 2. Preparar dados (roda uma vez)

```bash
python autoresearch/preparar_dados.py
```

Gera `tmp/resultados_paralisia/` e `tmp/resultados_controle/` com Excels de métricas por paciente.

### 3. Primeiro experimento

```bash
python autoresearch/research.py --run 1
```

### 4. Loop autônomo

```bash
# 20 experimentos, cada um escolhe sozinho a próxima config não testada
python autoresearch/run_loop.py --runs 20

# Continuar de onde parou
python autoresearch/run_loop.py --runs 10 --start 21

# Sem commits git
python autoresearch/run_loop.py --runs 5 --no-git
```

### 5. Experimento manual com config específica

```bash
python autoresearch/research.py --run 5 --features core+asymmetry --model rf --norm zscore --notes "testando sem idade"
```

### 6. Ver leaderboard

```bash
python -c "import pandas as pd; print(pd.read_csv('autoresearch/results/leaderboard.csv').to_string())"
```

---

## O que cada run registra

```json
{
  "run": 3,
  "auc_cv": 0.9210,
  "auc_test": 0.8950,
  "spearman_rho": 0.7840,
  "sensitivity": 0.8800,
  "specificity": 0.9000,
  "f1_cv": 0.8900,
  "feature_set": "core+asymmetry",
  "model": "rf",
  "normalization": "zscore",
  "features_used": ["razao_vel_dir", "razao_vel_esq", "asym_razao_vel", ...],
  "feature_importances": {"razao_vel_dir": 0.312, "asym_razao_vel": 0.241, ...},
  "notes": ""
}
```

---

## Conexão com o paper

Os resultados deste pipeline alimentam diretamente o **Paper 1**:

> *"Automated Kinematic Analysis of Eyelid Blink in Facial Palsy Using Computer Vision: A Novel Biomarker for House-Brackmann Grading"*

O leaderboard documenta o processo de descoberta do melhor biomarcador — útil para a seção de Métodos do artigo e para transparência reproduzível.

---

## Referência do conceito

Karpathy, A. (2025). *autoresearch* — minimal single-GPU autoresearch loop.
GitHub: [karpathy/autoresearch](https://github.com/karpathy/autoresearch)

> "The goal is to engineer your agents to make the fastest research progress indefinitely and without any of your own involvement."
