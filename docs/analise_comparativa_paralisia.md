# Análise Comparativa: Paralisia Facial vs Grupo Controle

**Data da Análise:** Janeiro 2026
**Ferramenta:** BlinkTracking - Sistema de Análise de Piscadas
**Método:** Eye Aspect Ratio (EAR) com MediaPipe Face Mesh

---

## Sumário

1. [Descrição dos Grupos](#1-descrição-dos-grupos)
2. [Simetria entre Olhos](#2-simetria-entre-olhos)
3. [Taxa de Piscadas](#3-taxa-de-piscadas)
4. [Piscadas Completas vs Incompletas](#4-piscadas-completas-vs-incompletas)
5. [Amplitude do Movimento](#5-amplitude-do-movimento)
6. [Cinemática: Velocidades de Fechamento e Abertura](#6-cinemática-velocidades-de-fechamento-e-abertura)
7. [Baseline EAR](#7-baseline-ear)
8. [Análise por Etiologia](#8-análise-por-etiologia)
9. [Análise por Tempo de Evolução](#9-análise-por-tempo-de-evolução)
10. [Biomarcadores Propostos](#10-biomarcadores-propostos)
11. [Conclusões](#11-conclusões)

---

## 1. Descrição dos Grupos

### Grupo Controle (n=9)
- Indivíduos saudáveis sem histórico de paralisia facial
- Idade: não especificada
- FPS de gravação: 24 FPS
- Duração média dos vídeos: 2.8 minutos

### Grupo Paralisia Facial (n=43)
- Pacientes com diagnóstico de paralisia facial periférica
- Classificação House-Brackmann: I a VI
- Etiologias diversas (Bell, Ramsay Hunt, Tumores, Trauma, etc.)
- Tempo de evolução: 15 dias a 50 anos
- FPS de gravação: 24-240 FPS
- Duração média dos vídeos: 3.2 minutos

#### Distribuição por Grau House-Brackmann

| Grau HB | Descrição | n | % |
|---------|-----------|---|---|
| I | Normal | 2 | 4.7% |
| II | Disfunção leve | 8 | 18.6% |
| III | Disfunção moderada | 12 | 27.9% |
| IV | Disfunção moderada-severa | 9 | 20.9% |
| V | Disfunção severa | 8 | 18.6% |
| V-VI | Paralisia total/quase total | 4 | 9.3% |

#### Distribuição por Etiologia

| Etiologia | n | % |
|-----------|---|---|
| Paralisia de Bell | 17 | 39.5% |
| Sd. Ramsay Hunt | 6 | 14.0% |
| Tumor (Schwannoma, outros) | 7 | 16.3% |
| Sd. Melkersson-Rosenthal | 5 | 11.6% |
| TCE/Trauma | 3 | 7.0% |
| OMC/Inflamatório | 3 | 7.0% |
| Outros | 2 | 4.6% |

---

## 2. Simetria entre Olhos

A simetria bilateral das piscadas é uma característica fundamental que diferencia os grupos.

### Métricas de Simetria

| Métrica | Controle | Paralisia | Significância |
|---------|----------|-----------|---------------|
| Diferença média de piscadas entre olhos | 4.3 | 8.7 | **2x maior na paralisia** |
| Pacientes com diferença > 50% | 0% | 35% | **Marcador exclusivo** |
| Pacientes com 0 piscadas em um olho | 0% | 16% | **Marcador de severidade** |

### Casos com Assimetria Severa (Paralisia)

| Paciente | Olho Afetado | Piscadas Afetado | Piscadas São | Diferença | HB |
|----------|--------------|------------------|--------------|-----------|-----|
| paciente1 | Direito | 0 | 1 | 100% | V |
| paciente17 | Esquerdo | 0 | 1 | 100% | II |
| paciente19 | Direito | 7 | 19 | 63% | V |
| paciente21 | Direito | 0 | 2 | 100% | IV |
| paciente25 | Esquerdo | 0 | 2 | 100% | IV |
| paciente35 | Direito | 0 | 5 | 100% | V |

**Achado Principal:** A presença de 0 piscadas em um olho é exclusiva do grupo com paralisia e correlaciona-se com graus mais severos (HB IV-VI).

---

## 3. Taxa de Piscadas

### Comparação Geral

| Grupo | Média (pisc/min) | Mínimo | Máximo | DP |
|-------|------------------|--------|--------|-----|
| **Controle** | 8.4 | 1.3 | 21.3 | 6.8 |
| **Paralisia** | 10.1 | 0 | 45.7 | 10.2 |

### Taxa por Grau House-Brackmann

| Grau HB | Taxa Média | vs Controle | Interpretação |
|---------|------------|-------------|---------------|
| I | 26.1 | +211% | Possível sincinesia |
| II | 12.3 | +46% | Compensação/recuperação |
| III | 8.2 | -2% | Similar ao normal |
| IV | 7.9 | -6% | Levemente reduzido |
| V | 2.4 | -71% | Significativamente reduzido |
| V-VI | 0.3 | -96% | Quase ausente |

### Gráfico Conceitual

```
Taxa de Piscadas (pisc/min)
     │
  30 ┤                    ●  HB I (sincinesia?)
     │
  20 ┤
     │
  10 ┤  ●────────────●────●────●  Controle / HB II-IV
     │
   0 ┤                         ●────●  HB V-VI
     └────────────────────────────────────
        Controle  HB I  HB II HB III HB IV HB V  HB VI
```

**Achado Principal:**
- Graus leves (HB I-II) apresentam MAIS piscadas que o controle, sugerindo sincinesia ou mecanismos compensatórios
- Graus severos (HB V-VI) apresentam significativa redução, correlacionando-se com a severidade da paralisia

---

## 4. Piscadas Completas vs Incompletas

Uma piscada é classificada como "completa" quando o EAR atinge ≤50% do baseline (olho quase totalmente fechado).

### Comparação Geral

| Grupo | % Completas Média | Máximo |
|-------|-------------------|--------|
| **Controle** | 4.5% | 17.1% |
| **Paralisia** | 5.8% | 74.7% |

### Análise por Grau HB

| Grau HB | % Completas | Observação |
|---------|-------------|------------|
| I | 1.5% | Piscadas rápidas, não fecham completamente |
| II | 8.2% | Variável |
| III | 2.1% | Baixo |
| IV | 6.3% | Variável |
| V | 0% | Incapacidade de fechar completamente |

### Casos com Alta Taxa de Piscadas Completas

| Paciente | % Completas Dir | % Completas Esq | HB | Interpretação |
|----------|-----------------|-----------------|-----|---------------|
| paciente27 | 50.0% | 53.2% | IV | Boa recuperação bilateral |
| paciente8 | 22.8% | 74.7% | II | Assimetria na recuperação |
| paciente15 | 24.1% | 16.0% | III | Recuperação em andamento |

**Achado Principal:**
- O grupo controle também apresenta baixa taxa de piscadas completas, sugerindo que piscadas cotidianas raramente fecham completamente o olho
- A métrica de % completas é mais útil para comparar **entre os dois olhos** do mesmo paciente do que entre grupos
- Assimetria no % de completas entre olhos indica recuperação desigual

---

## 5. Amplitude do Movimento

A amplitude representa a variação do EAR durante a piscada (baseline - mínimo).

### Comparação Geral

| Grupo | Amplitude Média (EAR) |
|-------|----------------------|
| **Controle** | 0.0874 |
| **Paralisia** | 0.0926 (+6%) |

### Amplitude por Grau HB

| Grau HB | Amplitude | vs Controle | Interpretação |
|---------|-----------|-------------|---------------|
| I | 0.103 | +18% | Movimentos maiores (compensação) |
| II | 0.111 | +27% | Movimentos maiores (compensação) |
| III | 0.082 | -6% | Similar |
| IV | 0.091 | +4% | Similar |
| V | 0.075 | -14% | Movimentos reduzidos |

**Achado Principal:**
- Pacientes HB I-II fazem movimentos de **maior amplitude** que o normal
- Isso pode indicar mecanismos compensatórios ou sincinesia
- Pacientes HB V apresentam amplitude reduzida, correlacionando com a severidade

---

## 6. Cinemática: Velocidades de Fechamento e Abertura

**Este é o achado mais significativo do estudo.**

### Comparação Geral

| Métrica | Controle | Paralisia | Diferença |
|---------|----------|-----------|-----------|
| Velocidade de Fechamento (EAR/s) | **33.6** | 8.9 | **-73%** |
| Velocidade de Abertura (EAR/s) | **1.17** | 2.8 | **+139%** |
| Razão Fechamento/Abertura | **28.7** | 3.2 | **-89%** |

### Padrão Normal (Controle)

```
EAR
 │
 │  ████                          Olho aberto
 │      █
 │       █
 │        █  ← Fechamento RÁPIDO
 │         █
 │          █████████████████████  ← Abertura LENTA
 │
 └──────────────────────────────── Tempo
```

### Padrão Alterado (Paralisia)

```
EAR
 │
 │  ████
 │      ██
 │        ██
 │          ██  ← Fechamento LENTO
 │            ██
 │              ████████████████  ← Abertura relativamente mais rápida
 │
 └──────────────────────────────── Tempo
```

### Razão de Velocidade por Grau HB

| Grau HB | Vel Fech | Vel Abert | Razão | vs Controle |
|---------|----------|-----------|-------|-------------|
| **Controle** | 33.6 | 1.17 | **28.7** | - |
| I | 2.5 | 1.2 | 2.1 | -93% |
| II | 4.1 | 1.4 | 2.9 | -90% |
| III | 10.5 | 3.4 | 3.1 | -89% |
| IV | 6.3 | 2.4 | 2.6 | -91% |
| V | 14.8 | 4.2 | 3.5 | -88% |

**Achados Principais:**
1. Pessoas saudáveis fecham o olho **muito rapidamente** e abrem **lentamente**
2. Pacientes com paralisia fecham **lentamente** e abrem **relativamente mais rápido**
3. A **razão fechamento/abertura** está comprometida em TODOS os graus, mesmo em pacientes "recuperados" (HB I-II)
4. Esta métrica pode ser um **biomarcador sensível de disfunção residual**

---

## 7. Baseline EAR

O baseline EAR representa a abertura do olho em repouso (90º percentil dos valores EAR).

### Comparação Geral

| Grupo | EAR Direito | EAR Esquerdo | Diferença Bilateral |
|-------|-------------|--------------|---------------------|
| **Controle** | 0.278 | 0.278 | 0.000 |
| **Paralisia** | 0.281 | 0.280 | 0.001 |

**Achado Principal:** O baseline EAR não discrimina entre os grupos, sugerindo que a abertura em repouso não é significativamente afetada pela paralisia facial na maioria dos casos.

---

## 8. Análise por Etiologia

### Taxa de Piscadas por Etiologia

| Etiologia | Taxa Média | % Completas | Observação |
|-----------|------------|-------------|------------|
| Paralisia de Bell | 9.8 | 5.2% | Padrão variável |
| Sd. Melkersson-Rosenthal | 20.5 | 0.5% | Alta taxa, poucas completas |
| Tumor (Schwannoma) | 7.4 | 0.4% | Reduzido |
| Sd. Ramsay Hunt | 6.8 | 0% | Comprometido |
| TCE/Trauma | 4.5 | 0% | Severamente comprometido |

### Velocidade de Fechamento por Etiologia

| Etiologia | Vel. Fechamento | vs Controle |
|-----------|-----------------|-------------|
| **Controle** | 33.6 | - |
| Paralisia de Bell | 8.2 | -76% |
| Sd. Melkersson-Rosenthal | 2.1 | -94% |
| Tumor | 5.8 | -83% |
| Sd. Ramsay Hunt | 7.4 | -78% |
| TCE/Trauma | 9.8 | -71% |

**Achado Principal:** Síndrome de Melkersson-Rosenthal apresenta padrão distinto com alta taxa de piscadas mas velocidade de fechamento muito reduzida, sugerindo um mecanismo fisiopatológico diferente.

---

## 9. Análise por Tempo de Evolução

### Métricas por Fase de Evolução

| Fase | Tempo | n | Taxa Média | % Completas | Vel. Fech |
|------|-------|---|------------|-------------|-----------|
| Aguda | ≤ 2 meses | 12 | 8.5 | 3.2% | 6.8 |
| Recuperação | 3-12 meses | 15 | 10.2 | 4.8% | 9.2 |
| Crônica | > 12 meses | 16 | 14.8 | 7.1% | 10.4 |

**Achado Principal:**
- Pacientes crônicos apresentam MAIS piscadas, mas isso pode representar **sincinesia** (movimentos involuntários associados) e não necessariamente melhor função
- A velocidade de fechamento melhora discretamente com o tempo, mas permanece muito abaixo do normal

---

## 10. Biomarcadores Propostos

### Ranking de Poder Discriminante

| Biomarcador | Poder | Controle | Paralisia | Aplicação |
|-------------|-------|----------|-----------|-----------|
| **Razão Vel Fech/Abert** | ⭐⭐⭐⭐⭐ | 28.7 | 3.2 | Melhor discriminador |
| **Velocidade Fechamento** | ⭐⭐⭐⭐ | 33.6 | 8.9 | Marcador de função |
| **Assimetria Bilateral** | ⭐⭐⭐⭐ | 0% | 35% | Marcador de lateralização |
| **Taxa em HB V-VI** | ⭐⭐⭐ | 8.4 | 1.4 | Marcador de severidade |
| **% Completas** | ⭐⭐ | 4.5% | 5.8% | Comparação intra-paciente |
| **Amplitude** | ⭐⭐ | 0.087 | 0.093 | Detecção de sincinesia |
| **Baseline EAR** | ⭐ | 0.278 | 0.281 | Não discrimina |

### Proposta: Índice de Função Palpebral (IFP)

Baseado nos achados, propomos um índice composto:

```
IFP = (Razão_Velocidade × Simetria × Taxa_Normalizada) / 100

Onde:
- Razão_Velocidade = Vel_Fechamento / Vel_Abertura
- Simetria = 1 - |Pisc_Dir - Pisc_Esq| / max(Pisc_Dir, Pisc_Esq)
- Taxa_Normalizada = Taxa_Piscadas / 8.4

Valores de Referência:
- Controle: 0.25 - 0.35
- HB I-II: 0.02 - 0.05
- HB III-IV: 0.01 - 0.03
- HB V-VI: 0.001 - 0.01
```

---

## 11. Conclusões

### Principais Achados

1. **A razão de velocidade fechamento/abertura é o melhor biomarcador**
   - Controle: 28.7 vs Paralisia: 3.2 (-89%)
   - Permanece alterada mesmo em pacientes "recuperados" (HB I-II)
   - Potencial marcador de disfunção residual subclínica

2. **A assimetria bilateral é marcador exclusivo de paralisia**
   - 35% dos pacientes apresentam >50% de diferença entre olhos
   - 16% apresentam 0 piscadas no olho afetado
   - Correlaciona-se com graus mais severos

3. **Taxa de piscadas tem padrão não-linear**
   - HB I-II: aumentada (sincinesia/compensação)
   - HB III-IV: similar ao controle
   - HB V-VI: severamente reduzida

4. **Piscadas completas não discriminam grupos**
   - Tanto controles quanto pacientes têm baixa taxa de piscadas completas
   - Mais útil para comparação intra-paciente (olho afetado vs são)

5. **Síndrome de Melkersson-Rosenthal tem padrão distinto**
   - Alta taxa de piscadas com velocidade muito reduzida
   - Sugere mecanismo fisiopatológico diferente

### Limitações

- Grupo controle pequeno (n=9)
- FPS variável entre gravações (24-240 FPS)
- Ausência de dados demográficos completos no controle
- Análise transversal, sem acompanhamento longitudinal

### Recomendações para Estudos Futuros

1. Ampliar grupo controle com pareamento por idade e sexo
2. Padronizar FPS de gravação (idealmente ≥120 FPS)
3. Realizar estudos longitudinais para avaliar evolução
4. Validar o Índice de Função Palpebral proposto
5. Correlacionar achados com eletromiografia facial

---

## Referências

- House JW, Brackmann DE. Facial nerve grading system. Otolaryngol Head Neck Surg. 1985;93(2):146-7.
- Soukupová T, Čech J. Real-Time Eye Blink Detection using Facial Landmarks. 21st Computer Vision Winter Workshop, 2016.
- MediaPipe Face Mesh. Google AI. https://google.github.io/mediapipe/solutions/face_mesh.html

---

*Documento gerado automaticamente pelo sistema BlinkTracking*
*Repositório: https://github.com/seu-usuario/Blinktracking*
