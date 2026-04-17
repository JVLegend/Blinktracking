# Gemma4 Autoresearch Experiments — BlinkTracking

**Data**: 15-16 Abril 2026
**Infraestrutura**: DGX Spark (NVIDIA GB10) + Gemma4 via Ollama
**Status**: 12/12 tasks COMPLETAS

## Arquivos nesta pasta

### CSVs recriados a partir dos logs (SSH DGX indisponivel)

| Arquivo | Conteudo |
|---------|----------|
| `autoencoder_results.csv` | AUC 0.9214 — erro reconstrucao paralisia 33.88x maior |
| `augmentation_comparison.csv` | Comparacao Original/SMOTE/Noise/Bootstrap |
| `shap_feature_importance.csv` | Ranking Mean\|SHAP\| das 8 features |
| `stats_demographics.csv` | N pacientes, olhos, duracao media/std |
| `stats_comparison.csv` | Mann-Whitney U Paralisia vs Controle |
| `stats_paired.csv` | Paired t-test Olho Afetado vs Contralateral |
| `comparison_metrics_summary.csv` | Leaderboard completo dos modelos |
| `paired_comparison_summary.csv` | Estatisticas descritivas pareadas |
| `BlinkTracking_Temporal_Features_Summary.csv` | Features temporais extraidas |

### Arquivos pendentes de copia da DGX (quando SSH voltar)

| Arquivo | Por que precisa da DGX |
|---------|------------------------|
| `stats_for_paper.html` | HTML com imagens base64 |
| `shap_report.html` | HTML com plots SHAP |
| `autoencoder_report.html` | HTML com histogramas de erro |
| `stats_correlation.csv` | Matriz de correlacao 8x8 |
| `blinktracking_classification_results.csv` | Per-patient predictions |
| `leaderboard.csv` | Leaderboard do pipeline original |

### Como copiar quando SSH estiver OK

```bash
scp -P 2222 oftalmousp@dgx.retina.ia.br:~/jv-teste/blinktracking/autoresearch/gemma4_experiments/*.html \
    /Users/jv/Documents/GitHub/Blinktracking/autoresearch/gemma4_experiments/

scp -P 2222 oftalmousp@dgx.retina.ia.br:~/jv-teste/blinktracking/autoresearch/gemma4_experiments/stats_correlation.csv \
    /Users/jv/Documents/GitHub/Blinktracking/autoresearch/gemma4_experiments/
```

## Principais Resultados

- **Autoencoder AUC 0.9214** — melhor modelo, clinicamente interpretavel
- **Vel. Abertura** e feature #1 no SHAP (0.045)
- **Baseline EAR** e o mais forte no design pareado (p=2.7e-5)
- **Total Piscadas** tem maior Cohen's d (-0.82) — paralisia pisca MENOS

Ver `../../01_Projects/PhD_Consolidated_JV/01_Projetos_Ativos/Resumo_Experimentos_DGX_Abril2026.md` para detalhes.

#PhD #BlinkTracking #HCFMUSP #Academia #Tecnologia
