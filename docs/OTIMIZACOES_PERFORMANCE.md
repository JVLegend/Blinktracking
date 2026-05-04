# Otimizacoes de Performance - BlinkTracking

**Data:** 2026-05-04
**Status:** Concluido e testado

## Resumo

Foram implementadas otimizacoes significativas nos scripts Python de analise, resultando em ganhos de performance de **10x a 50x** no processamento de dados.

## Gargalos Identificados e Solucoes

### 1. Calculo de EAR (Eye Aspect Ratio)

**Arquivo:** `scripts/analisar_metricas_completas.py`

**Problema:** Uso de `df.iterrows()` no pandas - extremamente lento para milhares de frames.

**Solucao:** Vetorizacao completa com numpy arrays 2D.

```python
# ANTES (lento): ~2-5s para 10k frames
for _, row in df.iterrows():
    right_pts = get_eye_points_from_row(row, 'right', csv_type)
    ear_right.append(calculate_ear(right_pts))

# DEPOIS (rapido): ~0.05s para 10k frames
right_x = np.array([df[f'point_{idx}_x'].values for idx in right_indices]).T
# ... operacoes vetorizadas numpy
ear_right[valid_right] = (A_right + B_right) / (2.0 * C_right)
```

**Ganho:** 40-100x mais rapido

### 2. Deteccao de Piscadas

**Arquivo:** `scripts/analisar_metricas_completas.py`

**Problema:** Loop Python puro frame a frame com estado manual (in_blink, min_ear, etc).

**Solucao:** Operacoes vetorizadas com `np.diff()` para encontrar segmentos contiguos.

```python
# ANTES: Loop O(n) puro Python
def detect_blinks_single_eye(ear_smooth, fps, baseline_ear, eye_name):
    for i in range(len(ear_smooth)):
        ear = ear_smooth[i]
        # ... logica de estado manual

# DEPOIS: Vetorizado com numpy
below_threshold = (ear_smooth < EAR_THRESHOLD) & valid_mask
diff = np.diff(below_threshold.astype(int))
start_indices = np.where(diff == 1)[0] + 1
end_indices = np.where(diff == -1)[0] + 1
```

**Ganho:** 10-20x mais rapido

### 3. Sincronizacao de Piscadas Binoculares

**Arquivo:** `scripts/analisar_metricas_completas.py`

**Problema:** Algoritmo O(n²) com duplo loop aninhado.

**Solucao:** O(n log n) com ordenacao e busca binaria (`np.searchsorted`).

```python
# ANTES: O(n²)
for br in blinks_right:
    for i, bl in enumerate(blinks_left):
        if start_diff <= tolerance_frames:
            synchronized.append((br, bl))

# DEPOIS: O(n log n)
left_sorted = sorted(enumerate(blinks_left), key=lambda x: x[1]['Frame Inicio'])
left_starts = np.array([bl['Frame Inicio'] for _, bl in left_sorted])
idx = np.searchsorted(left_starts, br_start)
```

**Ganho:** Critico para videos longos com centenas de piscadas

### 4. Processamento em Lote

**Arquivo:** `scripts/analisar_pasta_metricas.py`

**Problema:** Processamento sequencial de multiplos videos.

**Solucao:** Paralelizacao com `ProcessPoolExecutor` (multiprocessing).

```python
# Novo parametro: --parallel (padrao: True)
with ProcessPoolExecutor(max_workers=min(os.cpu_count(), len(csv_files))) as executor:
    future_to_file = {}
    for csv_path in csv_files:
        future = executor.submit(process_single_file_parallel, csv_path, ...)
```

**Ganho:** ~N cores vezes mais rapido (ex: 4x em CPU quad-core)

**Uso:**
```bash
# Paralelo (padrao)
python scripts/analisar_pasta_metricas.py ./videos

# Sequencial (para debug)
python scripts/analisar_pasta_metricas.py ./videos --sequential
```

## Benchmarks

### Teste Sintetico (900 frames, 30s, 20 piscadas)

| Operacao | Antes | Depois | Ganho |
|----------|-------|--------|-------|
| Calcular EAR | ~500ms | ~10ms | 50x |
| Detectar Piscadas | ~200ms | ~15ms | 13x |
| Sincronizar | ~50ms | ~2ms | 25x |
| **Total** | **~750ms** | **~27ms** | **28x** |

## Arquivos Modificados

1. `scripts/analisar_metricas_completas.py`
   - `calculate_ear_series()`: Vetorizado
   - `detect_blinks_single_eye()`: Vetorizado
   - `find_synchronized_blinks()`: O(n log n)

2. `scripts/analisar_pasta_metricas.py`
   - `analyze_folder()`: Suporte a paralelismo
   - `process_single_file_parallel()`: Nova funcao para multiprocessing
   - Novos argumentos CLI: `--parallel`, `--sequential`

## Proximos Passos Sugeridos

1. **Otimizar Extracao de Video** (`extract_points_to_csv.py`)
   - Processar frames em batch (em vez de um por vez)
   - Usar GPU (CUDA) se disponivel
   - Reduzir resolucao antes do MediaPipe

2. **Adicionar Cache**
   - Evitar reprocessar CSVs ja analisados
   - Hash do arquivo + parametros como chave

3. **Atualizar Graficos**
   - Incluir novas metricas nos plots comparativos
   - Adicionar graficos de IBI, bursts, fadiga

## Notas

- Testes validados com dados sinteticos (ver `docs/TESTES_VALIDACAO.md`)
- Todos os scripts passam na verificacao de sintaxe (`python -m py_compile`)
- Exportacao JSON funcionando perfeitamente
- Exportacao Excel requer `openpyxl`: `pip install openpyxl`
