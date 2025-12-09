# Mapeamento de Pontos do MediaPipe para CSV

Este documento explica o mapeamento entre os índices dos pontos do MediaPipe Face Mesh e as colunas do arquivo CSV gerado.

## Visão Geral

O projeto utiliza os **pontos oficiais do contorno do olho** do MediaPipe Face Mesh:

- `rightEyeUpper0` e `rightEyeLower0` para o olho direito
- `leftEyeUpper0` e `leftEyeLower0` para o olho esquerdo

## Pontos Extraídos para CSV

### Olho Direito

#### Pálpebra Superior (Right Upper) - `rightEyeUpper0`
| Coluna CSV | Índice MediaPipe | Descrição |
|------------|------------------|-----------|
| `right_upper_1_x`, `right_upper_1_y` | 246 | Canto externo superior |
| `right_upper_2_x`, `right_upper_2_y` | 161 | Ponto 2 da pálpebra superior |
| `right_upper_3_x`, `right_upper_3_y` | 160 | Ponto 3 da pálpebra superior |
| `right_upper_4_x`, `right_upper_4_y` | 159 | Ponto central superior |
| `right_upper_5_x`, `right_upper_5_y` | 158 | Ponto 5 da pálpebra superior |
| `right_upper_6_x`, `right_upper_6_y` | 157 | Ponto 6 da pálpebra superior |
| `right_upper_7_x`, `right_upper_7_y` | 173 | Canto interno superior |

**Índices MediaPipe:** `[246, 161, 160, 159, 158, 157, 173]`

#### Pálpebra Inferior (Right Lower) - `rightEyeLower0`
| Coluna CSV | Índice MediaPipe | Descrição |
|------------|------------------|-----------|
| `right_lower_1_x`, `right_lower_1_y` | 33 | Canto interno inferior |
| `right_lower_2_x`, `right_lower_2_y` | 7 | Ponto 2 da pálpebra inferior |
| `right_lower_3_x`, `right_lower_3_y` | 163 | Ponto 3 da pálpebra inferior |
| `right_lower_4_x`, `right_lower_4_y` | 144 | Ponto 4 da pálpebra inferior |
| `right_lower_5_x`, `right_lower_5_y` | 145 | Ponto central inferior |
| `right_lower_6_x`, `right_lower_6_y` | 153 | Ponto 6 da pálpebra inferior |
| `right_lower_7_x`, `right_lower_7_y` | 154 | Ponto 7 da pálpebra inferior |
| `right_lower_8_x`, `right_lower_8_y` | 155 | Ponto 8 da pálpebra inferior |
| `right_lower_9_x`, `right_lower_9_y` | 133 | Canto externo inferior |

**Índices MediaPipe:** `[33, 7, 163, 144, 145, 153, 154, 155, 133]`

### Olho Esquerdo

#### Pálpebra Superior (Left Upper) - `leftEyeUpper0`
| Coluna CSV | Índice MediaPipe | Descrição |
|------------|------------------|-----------|
| `left_upper_1_x`, `left_upper_1_y` | 466 | Canto externo superior |
| `left_upper_2_x`, `left_upper_2_y` | 388 | Ponto 2 da pálpebra superior |
| `left_upper_3_x`, `left_upper_3_y` | 387 | Ponto 3 da pálpebra superior |
| `left_upper_4_x`, `left_upper_4_y` | 386 | Ponto central superior |
| `left_upper_5_x`, `left_upper_5_y` | 385 | Ponto 5 da pálpebra superior |
| `left_upper_6_x`, `left_upper_6_y` | 384 | Ponto 6 da pálpebra superior |
| `left_upper_7_x`, `left_upper_7_y` | 398 | Canto interno superior |

**Índices MediaPipe:** `[466, 388, 387, 386, 385, 384, 398]`

#### Pálpebra Inferior (Left Lower) - `leftEyeLower0`
| Coluna CSV | Índice MediaPipe | Descrição |
|------------|------------------|-----------|
| `left_lower_1_x`, `left_lower_1_y` | 263 | Canto interno inferior |
| `left_lower_2_x`, `left_lower_2_y` | 249 | Ponto 2 da pálpebra inferior |
| `left_lower_3_x`, `left_lower_3_y` | 390 | Ponto 3 da pálpebra inferior |
| `left_lower_4_x`, `left_lower_4_y` | 373 | Ponto 4 da pálpebra inferior |
| `left_lower_5_x`, `left_lower_5_y` | 374 | Ponto central inferior |
| `left_lower_6_x`, `left_lower_6_y` | 380 | Ponto 6 da pálpebra inferior |
| `left_lower_7_x`, `left_lower_7_y` | 381 | Ponto 7 da pálpebra inferior |
| `left_lower_8_x`, `left_lower_8_y` | 382 | Ponto 8 da pálpebra inferior |
| `left_lower_9_x`, `left_lower_9_y` | 362 | Canto externo inferior |

**Índices MediaPipe:** `[263, 249, 390, 373, 374, 380, 381, 382, 362]`

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
- **`scripts/extract_points_mediapipe.py`** (linhas 41-48)

```python
# rightEyeUpper0 e rightEyeLower0 da documentação oficial
right_eye_upper = [246, 161, 160, 159, 158, 157, 173]
right_eye_lower = [33, 7, 163, 144, 145, 153, 154, 155, 133]

# leftEyeUpper0 e leftEyeLower0 da documentação oficial
left_eye_upper = [466, 388, 387, 386, 385, 384, 398]
left_eye_lower = [263, 249, 390, 373, 374, 380, 381, 382, 362]
```

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
- [Face Mesh Landmarks](https://github.com/google/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py)

---

**Última atualização:** 2025-12-09
**Versão da documentação:** 3.0 (Índices corrigidos para pontos oficiais do contorno do olho)
