# Mapeamento de Pontos do MediaPipe para CSV

Este documento explica o mapeamento entre os índices dos pontos do MediaPipe Face Mesh e as colunas do arquivo CSV gerado.

## Visão Geral

O projeto utiliza **dois conjuntos diferentes de pontos** do MediaPipe:

1. **Pontos de Extração (CSV)** - Usados para gerar dados de análise
2. **Pontos de Visualização (Vídeo)** - Usados apenas para renderizar o vídeo processado

Este documento foca nos **pontos de extração** que aparecem no CSV.

## Pontos Extraídos para CSV

### Olho Direito

#### Pálpebra Superior (Right Upper)
| Coluna CSV | Índice MediaPipe | Descrição |
|------------|------------------|-----------|
| `right_upper_1_x`, `right_upper_1_y` | 27 | Canto interno superior |
| `right_upper_2_x`, `right_upper_2_y` | 29 | Ponto 2 da pálpebra superior |
| `right_upper_3_x`, `right_upper_3_y` | 30 | Ponto 3 da pálpebra superior |
| `right_upper_4_x`, `right_upper_4_y` | 31 | Ponto central superior |
| `right_upper_5_x`, `right_upper_5_y` | 32 | Ponto 5 da pálpebra superior |
| `right_upper_6_x`, `right_upper_6_y` | 33 | Ponto 6 da pálpebra superior |
| `right_upper_7_x`, `right_upper_7_y` | 34 | Canto externo superior |

**Índices MediaPipe:** `[27, 29, 30, 31, 32, 33, 34]`

#### Pálpebra Inferior (Right Lower)
| Coluna CSV | Índice MediaPipe | Descrição |
|------------|------------------|-----------|
| `right_lower_1_x`, `right_lower_1_y` | 35 | Canto interno inferior |
| `right_lower_2_x`, `right_lower_2_y` | 36 | Ponto 2 da pálpebra inferior |
| `right_lower_3_x`, `right_lower_3_y` | 37 | Ponto 3 da pálpebra inferior |
| `right_lower_4_x`, `right_lower_4_y` | 38 | Ponto 4 da pálpebra inferior |
| `right_lower_5_x`, `right_lower_5_y` | 39 | Ponto central inferior |
| `right_lower_6_x`, `right_lower_6_y` | 40 | Ponto 6 da pálpebra inferior |
| `right_lower_7_x`, `right_lower_7_y` | 41 | Ponto 7 da pálpebra inferior |
| `right_lower_8_x`, `right_lower_8_y` | 42 | Ponto 8 da pálpebra inferior |
| `right_lower_9_x`, `right_lower_9_y` | 43 | Canto externo inferior |

**Índices MediaPipe:** `[35, 36, 37, 38, 39, 40, 41, 42, 43]`

### Olho Esquerdo

#### Pálpebra Superior (Left Upper)
| Coluna CSV | Índice MediaPipe | Descrição |
|------------|------------------|-----------|
| `left_upper_1_x`, `left_upper_1_y` | 257 | Canto interno superior |
| `left_upper_2_x`, `left_upper_2_y` | 259 | Ponto 2 da pálpebra superior |
| `left_upper_3_x`, `left_upper_3_y` | 260 | Ponto 3 da pálpebra superior |
| `left_upper_4_x`, `left_upper_4_y` | 261 | Ponto central superior |
| `left_upper_5_x`, `left_upper_5_y` | 262 | Ponto 5 da pálpebra superior |
| `left_upper_6_x`, `left_upper_6_y` | 263 | Ponto 6 da pálpebra superior |
| `left_upper_7_x`, `left_upper_7_y` | 264 | Canto externo superior |

**Índices MediaPipe:** `[257, 259, 260, 261, 262, 263, 264]`

#### Pálpebra Inferior (Left Lower)
| Coluna CSV | Índice MediaPipe | Descrição |
|------------|------------------|-----------|
| `left_lower_1_x`, `left_lower_1_y` | 265 | Canto interno inferior |
| `left_lower_2_x`, `left_lower_2_y` | 266 | Ponto 2 da pálpebra inferior |
| `left_lower_3_x`, `left_lower_3_y` | 267 | Ponto 3 da pálpebra inferior |
| `left_lower_4_x`, `left_lower_4_y` | 268 | Ponto 4 da pálpebra inferior |
| `left_lower_5_x`, `left_lower_5_y` | 269 | Ponto central inferior |
| `left_lower_6_x`, `left_lower_6_y` | 270 | Ponto 6 da pálpebra inferior |
| `left_lower_7_x`, `left_lower_7_y` | 271 | Ponto 7 da pálpebra inferior |
| `left_lower_8_x`, `left_lower_8_y` | 272 | Ponto 8 da pálpebra inferior |
| `left_lower_9_x`, `left_lower_9_y` | 273 | Canto externo inferior |

**Índices MediaPipe:** `[265, 266, 267, 268, 269, 270, 271, 272, 273]`

## Estrutura do CSV

O arquivo CSV gerado tem a seguinte estrutura de colunas:

```
frame, method,
right_upper_1_x, right_upper_1_y, ..., right_upper_7_x, right_upper_7_y,
right_lower_1_x, right_lower_1_y, ..., right_lower_9_x, right_lower_9_y,
left_upper_1_x, left_upper_1_y, ..., left_upper_7_x, left_upper_7_y,
left_lower_1_x, left_lower_1_y, ..., left_lower_9_x, left_lower_9_y
```

**Total de colunas:**
- 2 colunas de metadados (frame, method)
- 7 pontos × 2 coordenadas = 14 colunas (right_upper)
- 9 pontos × 2 coordenadas = 18 colunas (right_lower)
- 7 pontos × 2 coordenadas = 14 colunas (left_upper)
- 9 pontos × 2 coordenadas = 18 colunas (left_lower)

**Total: 66 colunas**

## Código Fonte

Os pontos são extraídos no arquivo:
- **`scripts/extract_points_mediapipe.py`** (linhas 41-44)

```python
right_eye_upper = [27, 29, 30, 31, 32, 33, 34]
right_eye_lower = [35, 36, 37, 38, 39, 40, 41, 42, 43]
left_eye_upper = [257, 259, 260, 261, 262, 263, 264]
left_eye_lower = [265, 266, 267, 268, 269, 270, 271, 272, 273]
```

## Diferença: Extração vs Visualização

⚠️ **IMPORTANTE:** Os pontos usados para visualização do vídeo são diferentes!

### Pontos de Visualização (apenas para o vídeo processado)
Arquivo: `scripts/process_video_mediapipe.py`

- Inclui pontos adicionais como **íris** e **contorno completo**
- Usa índices diferentes: 159, 160, 161, 163, 144, 145, etc.
- **NÃO** são salvos no CSV

## Diagrama Visual

Para gerar um diagrama visual mostrando os pontos, execute:

```bash
python scripts/generate_diagram_pil.py
```

Ou use o arquivo batch:

```bash
generate_diagram.bat
```

O diagrama será salvo em: `public/docs/mediapipe-csv-points-diagram.png`

## Referências

- [MediaPipe Face Mesh](https://google.github.io/mediapipe/solutions/face_mesh.html)
- [MediaPipe Face Mesh Canonical Model](https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png)

---

**Última atualização:** 2025-12-09
**Versão da documentação:** 2.0
