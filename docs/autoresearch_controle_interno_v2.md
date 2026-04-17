# Autoresearch v2 — Controle Interno (Olho Contralateral)

**Data:** 15 Abril 2026
**Autor:** Joao Victor Pacheco Dias
**Status:** Resultados preliminares — 11 pacientes (DGX Spark)

---

## Resumo Executivo

Esta iteração do pipeline autoresearch implementou uma mudança fundamental no design experimental: **substituição de controles externos por controle interno pareado** (olho saudável contralateral do próprio paciente). O melhor modelo atingiu **AUC 0.76** com apenas 3 features cinemáticas (vel_fech, vel_aber, razao_vel) usando SVM + minmax.

---

## O que mudou em relação à v1

### Design Experimental

| Aspecto | v1 (Original) | v2 (Controle Interno) |
|---------|---------------|----------------------|
| **Controle** | 9 voluntários saudáveis | Olho contralateral do mesmo paciente |
| **Design** | Entre-sujeitos | Pareado intra-paciente |
| **Confounders** | Idade, sexo, FPS, iluminação | Eliminados (mesmo vídeo, mesmo momento) |
| **n amostras** | 25 paralisia + 9 controles = 34 | 13 olhos afetados + 22 saudáveis = 35 |
| **Features** | Bilaterais (vel_fech_dir, vel_fech_esq) | Por olho genérico (vel_fech, vel_aber) |
| **Assimetria** | Feature importante | Não aplicável no design pareado |

### Justificativa Científica

O paper draft (Dias et al., 2026) já demonstrou que o design intra-paciente é metodologicamente superior:

1. **Elimina viés de FPS** — ambos os olhos no mesmo vídeo, mesma taxa de amostragem
2. **Elimina confounders inter-individuais** — idade, sexo, ambiente, iluminação
3. **Consistente com achados do paper** — blink rate foi a única métrica com diferença significativa no teste pareado (Wilcoxon p=0.016)
4. **Alinhado com a literatura** — comparação intrapaciente é padrão-ouro em estudos de paralisia facial unilateral

### Mudanças Técnicas no Código

1. **`load_dataset()`** — Reescrita para gerar 2 registros por paciente:
   - Olho afetado → `label_bin=1`, grupo="paralisia"
   - Olho saudável → `label_bin=0`, grupo="controle_interno"

2. **`FEATURE_SETS`** — Nomes genéricos (sem `_dir`/`_esq`):
   - `vel_fech` ao invés de `vel_fech_dir`, `vel_fech_esq`
   - Cada record representa UM olho

3. **Matching de pacientes** — Novo sistema baseado em mapeamento de pastas:
   - `video_patient_mapping.json` construído a partir da estrutura de pastas do Google Drive
   - Resolve: `Cópia_de_IMG_3763` → `Ivanilda dos Santos` → tabela HB

4. **Compatibilidade de encoding** — Fix para colunas corrompidas nos Excels (`Mdia` → `Média`)

---

## Resultados — Leaderboard Completo (20 runs)

### Top 10

| Rank | AUC (CV) | AUC (test) | Features | Modelo | Norm | n_feat |
|------|----------|------------|----------|--------|------|--------|
| **1** | **0.7617** | **0.6667** | **core** | **SVM** | **minmax** | **3** |
| 2 | 0.7450 | 0.6667 | core | SVM | none | 3 |
| 3 | 0.7283 | 0.6667 | core | SVM | zscore | 3 |
| 4 | 0.7083 | 0.5833 | core | RF | zscore | 3 |
| 5 | 0.7083 | 0.5833 | core | RF | minmax | 3 |
| 6 | 0.7083 | 0.5833 | core | RF | none | 3 |
| 7 | 0.6350 | 0.5000 | core | GBM | * | 3 |
| 8 | 0.5283 | 0.2500 | asymmetry | LogReg | none | 6 |
| 9 | 0.5117 | 0.2500 | asymmetry | LogReg | minmax | 6 |
| 10 | 0.4683 | 0.0000 | core | LogReg | none | 3 |

### Features "core" (as 3 melhores)

```
vel_fech   — Velocidade de fechamento (EAR/s)
vel_aber   — Velocidade de abertura (EAR/s)
razao_vel  — Razão velocidade fechamento/abertura
```

**Importância relativa (RF, run 1):**
- `vel_fech`: 0.348
- `vel_aber`: 0.329
- `razao_vel`: 0.323

---

## Insights Principais

### 1. SVM domina em dataset pequeno
Com apenas 35 amostras, o SVM com kernel RBF tem melhor capacidade de generalização que modelos baseados em árvores. O RF ficou próximo (AUC 0.71) mas sem ganho sobre SVM.

### 2. Core features >> Asymmetry
No design pareado, cada registro é um olho individual. As features de assimetria (`asym_taxa`, `asym_vel_fech`, etc.) perderam completamente o sentido — elas comparam os dois olhos, mas agora cada record é só um olho. **Resultado: assimetria com AUC 0.17-0.53** (pior que aleatório em muitos casos).

### 3. Velocidade de fechamento é a feature mais importante
Consistente com o paper: a paralisia afeta primariamente a **dinâmica** do piscar (velocidade, amplitude), não a postura estática (baseline EAR).

### 4. Normalização importa pouco
MinMax (0.76), none (0.75), z-score (0.73) — diferença mínima. O SVM é relativamente robusto à escala com kernel RBF.

### 5. Limitações atuais
- **n=11 pacientes** (apenas pacientes 1, 10-19 tinham vídeos processados no DGX)
- **35 amostras** é borderline para ML — resultados precisam validação com n>30
- **Spearman ρ não calculado** — sem variação suficiente de HB grades
- **Rosemary Jerk e Edimar** excluídos (problemas de matching)

---

## Comparação com Paper Original

| Métrica | Paper (n=39, estatístico) | Autoresearch v2 (n=11, ML) |
|---------|--------------------------|----------------------------|
| Melhor biomarcador | RBA (rho=-0.494, p=0.001) | vel_fech (importância 0.35) |
| Design | Pareado (Wilcoxon) | Pareado (classificação) |
| Força | Teste estatístico robusto | Grid search automático |
| Limitação | Sem predição | n pequeno |

O resultado do ML **corrobora** o paper: features cinemáticas (velocidade) são mais discriminativas que features estáticas (baseline EAR).

---

## Próximos Passos

### Imediatos
1. [ ] Processar os 32 pacientes restantes (Pacientes 2-9, 20-43) no DGX
2. [ ] Re-rodar autoresearch com n>30 pacientes
3. [ ] Adicionar feature sets `kinematic`, `full_summary`, `full+asymmetry`
4. [ ] Calcular Spearman ρ vs HB grade

### Otimização (resultados parciais)
5. [ ] Benchmark: MediaPipe vs ONNX Runtime (GPU) vs dlib para extração de landmarks
6. [x] Otimizar pipeline para GPUs fracas → **`extract_optimized.py`** (skip + downscale + ROI)
7. [ ] Testar modelos mais leves (TFLite) para mobile

#### Benchmark Real (DGX Spark, vídeo 1920x1080 @ 153fps, 28683 frames):
| Config | Tempo | FPS total | Detecção |
|--------|-------|-----------|----------|
| Full (1080p, todo frame) | 148.5s | 193 fps | 100% |
| **Otimizado (480p, skip=4, ROI)** | **71.6s** | **401 fps** | **100%** |
| **Ganho** | **2.1x mais rápido** | — | **Sem perda** |

### Aplicação Clínica
8. [ ] Prototipar PWA (Progressive Web App) para análise de vídeo no celular
9. [ ] Integrar com Google AI Edge Gallery (Gemma4 offline para interpretação)
10. [ ] Plano de viabilidade para app iOS

---

## Infraestrutura Utilizada

- **DGX Spark** (NVIDIA GB10 Grace Blackwell, CUDA 12.8)
- **MediaPipe Face Mesh** (478 landmarks, refine_landmarks=True)
- **scikit-learn** (SVM, RF, GBM, LogReg)
- **Autoresearch loop** (20 runs, grid search automático)
- **Acesso remoto**: cloudflared tunnel → SSH

---

## Referências

1. Dias JVP et al. (2026). Automated Blink Analysis as an Objective Biomarker for Peripheral Facial Paralysis Severity. [Draft]
2. House JW, Brackmann DE (1985). Facial nerve grading system. Otolaryngol Head Neck Surg.
3. Soukupova T, Cech J (2016). Real-time eye blink detection using facial landmarks.
4. Karpathy A (2025). autoresearch — minimal single-GPU autoresearch loop.

---

#PhD #BlinkTracking #HCFMUSP #Tecnologia #Academia
