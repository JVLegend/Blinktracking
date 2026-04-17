# BlinkTracking V2.0 - Melhorias com Research Automation

Sistema refatorado de análise de piscadas com arquitetura modular, inspirado em princípios de research automation (estilo Karpathy).

## 🎯 Principais Melhorias

### 1. **Arquitetura Modular** (`blinktracking/`)
- `config.py` - Configuração centralizada e validada
- `filters.py` - Filtros de estabilização (Kalman + Moving Average)
- `metrics.py` - Sistema automático de métricas
- `tracker.py` - Tracker principal com API limpa
- `pipeline.py` - Processamento batch em paralelo

### 2. **Filtros de Estabilização** (Resolve problema do tremor)
```python
# Kalman Filter - Predição ótima de movimento
# Moving Average - Suavização simples
# Rotation Normalizer - Compensa rotação da cabeça

stabilizer = LandmarkStabilizer(
    use_kalman=True,
    use_moving_avg=True,
    moving_avg_window=5
)
```

### 3. **Sistema de Métricas Automatizado**
```python
# Detecta automaticamente:
- Total de piscadas
- Taxa por minuto
- Duração (mean, std, min, max)
- Completude (>90% fechamento)
- Intervalo interpiscadas
```

### 4. **Configuração Centralizada**
```yaml
# config.yaml
thresholds:
  blink_threshold_percent: 30.0
  complete_blink_threshold: 90.0
  
filters:
  enable_kalman: true
  enable_moving_average: true
  moving_average_window: 5
```

### 5. **Pipeline de Batch Processing**
```python
processor = BatchProcessor(config, max_workers=4)
results = processor.process_folder(
    "videos/", 
    "output/",
    parallel=True
)
```

## 🚀 Uso Rápido

### Processar um vídeo:
```python
from blinktracking import BlinkTracker, Config

config = Config()
tracker = BlinkTracker(config)

results = tracker.process_video(
    "video.mp4",
    output_dir="output/",
    save_csv=True,
    save_json=True
)

print(f"Piscadas: {results['metrics']['combined']['total_blinks']}")
```

### Processamento em lote:
```python
from blinktracking import BatchProcessor

processor = BatchProcessor(config, max_workers=4)
results = processor.process_folder(
    "videos/",
    "output/",
    recursive=True
)
```

### Com linha de comando:
```bash
# Processar um vídeo
python examples/process_single_video.py video.mp4 output/

# Processar pasta
python examples/process_batch.py videos/ output/

# Com config customizada
python examples/custom_config.py
```

## 📊 Resolução dos Problemas do V1

| Problema | Solução V2 |
|----------|-----------|
| Tremor ao fechar olhos | KalmanFilter + MovingAverageFilter |
| Rotação facial | RotationNormalizer (carúncula como referência) |
| Performance web lenta | Processamento batch + paralelização |
| Falta de métricas | BlinkDetector automático com estatísticas |
| Código espaguete | Arquitetura modular com classes claras |
| Configuração hardcoded | Config centralizada em YAML |

## 🔧 Estrutura de Arquivos

```
blinktracking/
├── __init__.py           # API pública
├── config.py             # Configuração tipada
├── filters.py            # Filtros de estabilização
├── metrics.py            # Cálculo de métricas
├── tracker.py            # Tracker principal
├── pipeline.py           # Batch processing
└── config_default.yaml   # Config padrão

examples/
├── process_single_video.py
├── process_batch.py
└── custom_config.py
```

## 📈 Métricas Calculadas Automaticamente

```json
{
  "metrics": {
    "combined": {
      "total_blinks": 45,
      "complete_blinks": 38,
      "blink_rate_per_minute": 12.5,
      "duration_ms": {
        "mean": 185.3,
        "std": 42.1,
        "min": 102.0,
        "max": 389.0
      },
      "completeness": {
        "mean": 94.2,
        "complete_ratio": 0.84
      }
    }
  }
}
```

## 🧪 Testes e Validação

O sistema inclui:
- Validação de configuração
- Logging estruturado
- Checkpoints (resume em caso de falha)
- Relatórios automáticos de batch

## 📝 Próximos Passos

1. **Validar com vídeos reais**
   - Dra. Larissa
   - Dra. Maria Antonieta

2. **Ajustar thresholds**
   - Calibrar por paciente
   - Validar métricas

3. **Otimizar performance**
   - GPU support (CUDA)
   - Frame skipping

4. **Melhorar visualização**
   - Gráficos em tempo real
   - Dashboard web

## 🎓 Créditos

- **Autor**: João Victor Dias
- **Orientador**: Dr. Pedro Carricondo
- **Instituição**: HC-FMUSP
- **Versão**: 2.0.0
