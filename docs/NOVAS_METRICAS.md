# Novas Metricas de Analise - BlinkTracking

**Data:** 2026-05-04
**Status:** Implementado e testado

## Resumo

Foram adicionadas **11 novas metricas avancadas** para analise clinica de piscadas, proporcionando insights mais profundos sobre saude ocular, fadiga e padroes de comportamento.

---

## 1. Inter-Blink Interval (IBI)

**O que e:** Tempo entre piscadas consecutivas.

**Metricas calculadas:**
- IBI Medio (s)
- IBI Mediana (s)
- IBI Desvio Padrao (s)
- IBI Minimo (s)
- IBI Maximo (s)
- IBI CV (%) - Coeficiente de Variacao
- IBI P10 (s) - Percentil 10
- IBI P90 (s) - Percentil 90

**Valor clinico:**
- IBI curto (< 1s): Pode indicar fadiga ou irritacao ocular
- IBI longo (> 5s): Pode indicar blefaroespasmo ou uso de tela
- CV alto: Irregularidade, possivel patologia
- CV baixo: Padrao regular, saudavel

**Implementacao:** `calculate_ibi_stats()` em `analisar_metricas_completas.py`

---

## 2. Burst Detection (Clusters de Piscadas)

**O que e:** Detecta grupos de piscadas rapidas em sequencia (clusters).

**Parametros:**
- Intervalo maximo entre piscadas no burst: 2 segundos
- Minimo de piscadas para considerar burst: 3

**Metricas por burst:**
- Inicio (s) / Fim (s)
- Duracao (s)
- Numero de Piscadas
- Taxa no Burst (piscadas/min)
- Amplitude Media
- % Completas

**Valor clinico:**
- Bursts frequentes: Pode indicar resposta a irritacao ou fadiga
- Ausencia de bursts: Padrao regular
- Taxa alta no burst: > 60/min pode indicar patologia

**Implementacao:** `detect_blink_bursts()` em `analisar_metricas_completas.py`

---

## 3. Assimetria Bilateral

**O que e:** Mede diferencas entre olho direito e esquerdo.

**Metricas:**
- Assimetria Amplitude (%)
- Assimetria Velocidade Fechamento (%)
- Assimetria Velocidade Abertura (%)
- Assimetria Duracao (%)
- Correlacao Amplitude (Pearson r)

**Valor clinico:**
- Assimetria < 20%: Normal
- Assimetria 20-30%: Leve assimetria, monitorar
- Assimetria > 30%: Possivel paralisia facial ou blefaroespasmo unilateral
- Correlacao baixa: Olhos trabalhando de forma independente

**Implementacao:** `calculate_amplitude_asymmetry()` em `analisar_metricas_completas.py`

---

## 4. Indice de Fadiga

**O que e:** Score composto (0-100) que detecta fadiga ocular ao longo do tempo.

**Componentes:**
1. Aumento de piscadas incompletas (+40 pts max)
2. Diminuicao de amplitude (+30 pts max)
3. Aumento de duracao (+20 pts max)
4. Aumento de taxa (+10 pts max)

**Metricas adicionais:**
- Tendencia Taxa (piscadas/min/min)
- Tendencia Amplitude
- Tendencia Duracao
- Razao Incompletas Final/Inicial

**Valor clinico:**
- Score < 10: Sem fadiga
- Score 10-30: Fadiga leve
- Score 30-50: Fadiga moderada
- Score > 50: Fadiga severa (pausa recomendada)

**Implementacao:** `calculate_fatigue_index()` em `analisar_metricas_completas.py`

---

## 5. Percentis de Velocidade

**O que e:** Distribuicao das velocidades de fechamento e abertura.

**Metricas:**
- Vel Fechamento: P10, P50, P90
- Vel Abertura: P10, P50, P90

**Valor clinico:**
- P50 (mediana): Velocidade tipica
- P10: Velocidade lenta (piscadas lentas)
- P90: Velocidade rapida (piscadas rapidas)
- Diferenca P90-P10: Variabilidade (alta = irregular)

**Implementacao:** `calculate_velocity_percentiles()` em `analisar_metricas_completas.py`

---

## 6. Latencia Pos-Piscada

**O que e:** Tempo ate o EAR retornar a 95% do baseline apos a piscada.

**Metricas:**
- Latencia Media (ms)
- Latencia Mediana (ms)
- Latencia Max (ms)

**Valor clinico:**
- < 100ms: Recuperacao rapida (normal)
- 100-300ms: Recuperacao lenta (fadiga ou ptose)
- > 300ms: Possivel paralisia ou problema neurologico

**Implementacao:** `calculate_post_blink_latency()` em `analisar_metricas_completas.py`

---

## 7. Score de Saude Ocular

**O que e:** Score composto (0-100) para avaliacao geral da saude ocular.

**Componentes:**
1. **Taxa** (10-20/min ideal): Score = 100 - |taxa - 15| * 2
2. **Simetria** (< 20% ideal): Score = 100 - assimetria * 2
3. **Fadiga** (< 30 ideal): Score = 100 - fadiga * 1.5
4. **Amplitude** (> 0.1 ideal): Score = min(100, amplitude * 1000)
5. **Completude** (> 80% ideal): Score = % completas

**Score Final:** Media ponderada dos componentes

**Interpretacao:**
- 80-100: Excelente
- 60-79: Bom
- 40-59: Regular (monitorar)
- 20-39: Ruim (investigar)
- 0-19: Critico (intervencao necessaria)

**Implementacao:** `calculate_eye_health_score()` em `analisar_metricas_completas.py`

---

## Novas Abas no Excel

O relatorio Excel agora inclui as seguintes abas adicionais:

1. **Score Saude Ocular** - Score composto e componentes individuais
2. **IBI** - Inter-Blink Interval por olho
3. **Percentis Velocidade** - P10, P50, P90
4. **Latencia** - Tempo de recuperacao pos-piscada
5. **Assimetria** - Metricas de comparacao bilateral
6. **Fadiga** - Indice e tendencias temporais
7. **Bursts** - Clusters de piscadas detectados

---

## JSON Output

O export JSON agora inclui as chaves:

```json
{
  "resumo": {
    "direito": {
      "IBI Medio (s)": 1.611,
      "IBI Mediana (s)": 1.5,
      "IBI Desvio Padrao (s)": 0.8,
      "IBI CV (%)": 15.2,
      "Vel Fech P10": 5.2,
      "Vel Fech P50": 11.6,
      "Vel Fech P90": 20.1,
      "Latencia Media (ms)": 150.0
    },
    "esquerdo": { ... },
    "assimetria": {
      "Assimetria Amplitude (%)": 4.3,
      "Assimetria Velocidade Fechamento (%)": 2.1,
      "Correlacao Amplitude": 0.85
    },
    "fadiga": {
      "Indice Fadiga": -2.0,
      "Tendencia Taxa": 0.5,
      "Tendencia Amplitude": -0.01
    },
    "score_saude_ocular": {
      "Score Saude Ocular": 70.0,
      "Componente Taxa": 85.0,
      "Componente Simetria": 91.4,
      "Componente Fadiga": 100.0
    }
  },
  "bursts": [
    {
      "Inicio (s)": 5.2,
      "Fim (s)": 6.8,
      "Numero Piscadas": 4,
      "Taxa no Burst": 150.0
    }
  ]
}
```

---

## Arquivos Modificados

1. `scripts/analisar_metricas_completas.py`
   - 7 novas funcoes de metricas
   - Atualizacao de `analyze_complete()` para incluir novas metricas
   - Novas abas no Excel
   - Novos campos no JSON

2. `scripts/analisar_pasta_metricas.py`
   - Import das novas funcoes
   - Novas colunas no resumo consolidado
   - Suporte a processamento paralelo

3. `scripts/generate_test_data.py` (novo)
   - Gerador de dados sinteticos para testes

---

## Exemplo de Uso

```bash
# Analise individual com novas metricas
python scripts/analisar_metricas_completas.py video.csv --saida resultado.json

# Analise em lote (paralelo)
python scripts/analisar_pasta_metricas.py ./videos --tipo eyes_only

# Gerar dados de teste
python scripts/generate_test_data.py test_data.csv
```

## Referencias Clinicas

- **IBI:** Padrao normal: 2-6 segundos (Bentivoglio et al., 1997)
- **Taxa de Piscadas:** Normal: 10-20/min (Doughty, 2001)
- **Assimetria:** > 20% pode indicar paralisia facial (Rahman et al., 2002)
- **Fadiga:** Aumento de piscadas incompletas e taxa (Gowrisankaran et al., 2007)
- **Score Ocular:** Baseado em metricas consagradas na literatura
