# Autoresearch — BlinkTracking

> Inspirado em [karpathy/autoresearch](https://github.com/karpathy/autoresearch)
> Human itera no `prompt.md` → Agent itera no `research.py` → cada run = 1 commit git

## Objetivo

Encontrar a melhor combinação de métricas cinemáticas palpebrais para predizer o grau House-Brackmann (HB) em pacientes com paralisia facial unilateral.

---

## Estrutura

```
autoresearch/
├── prompt.md           ← você edita isto (hipótese de pesquisa)
├── research.py         ← agente itera isto (feature eng + modelos)
├── preparar_dados.py   ← roda 1x para gerar os Excels de métricas
├── run_loop.py         ← loop autônomo (N runs + git commit automático)
└── results/
    ├── run_001.json    ← resultado de cada experimento
    ├── run_002.json
    └── leaderboard.csv ← ranking por AUC
```

---

## Pré-requisitos

```bash
pip install scikit-learn scipy openpyxl pandas numpy
```

---

## Passo a passo

### 1. Organizar os CSVs dos pacientes

```
tmp/
├── paralisia/          ← um CSV por paciente (nome = ID do paciente)
│   ├── 4474.csv
│   ├── 4501.csv
│   └── ...
├── controle/           ← um CSV por paciente controle
│   ├── ctrl_01.csv
│   └── ...
└── tabela_HB.xlsx      ← já existe
```

O nome do arquivo CSV (sem `.csv`) é o ID do paciente. O script tenta casar com a coluna `nome` em `tabela_HB.xlsx`.

### 2. Preparar dados (roda 1x)

```bash
python autoresearch/preparar_dados.py
```

Gera `tmp/resultados_paralisia/` e `tmp/resultados_controle/` com Excels de métricas.

### 3. Rodar um experimento manual

```bash
# Run 1 — config padrão
python autoresearch/research.py --run 1

# Run 2 — config específica
python autoresearch/research.py --run 2 --features core+asymmetry --model rf --norm zscore

# Run 3 — deixa o agente escolher a próxima config
python autoresearch/research.py --run 3 --improve
```

### 4. Loop autônomo (estilo Karpathy)

```bash
# 20 experimentos automáticos com git commit em cada um
python autoresearch/run_loop.py --runs 20

# Continuar de onde parou
python autoresearch/run_loop.py --runs 10 --start 21

# Sem git commits
python autoresearch/run_loop.py --runs 5 --no-git
```

---

## Feature sets disponíveis

| Nome | Descrição |
|------|-----------|
| `core` | Velocidade de fechamento/abertura e razão (por olho) |
| `asymmetry` | Métricas de assimetria bilateral |
| `affected_ratio` | Olho afetado ÷ olho saudável |
| `core+asymmetry` | Core + assimetria (default) |
| `full_summary` | Todas as métricas do resumo |
| `all` | Tudo disponível no dataset |

---

## Modelos disponíveis

| Nome | Modelo |
|------|--------|
| `logreg` | Regressão Logística |
| `svm` | SVM com kernel RBF |
| `rf` | Random Forest (200 árvores) |
| `gbm` | Gradient Boosting (200 estimators) |

---

## Ver leaderboard

```bash
python -c "import pandas as pd; print(pd.read_csv('autoresearch/results/leaderboard.csv').to_string())"
```

---

## Hipótese principal

O velocity ratio (fechamento/abertura) + assimetria bilateral → **AUC > 0.90** para paralisia HB III–VI vs controles, e **Spearman ρ > 0.75** para predição ordinal do grau HB.

## Próximo paper

**"Automated Kinematic Analysis of Eyelid Blink in Facial Palsy Using Computer Vision: A Novel Biomarker for House-Brackmann Grading"**
