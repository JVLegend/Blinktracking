# Cálculo do EAR (Eye Aspect Ratio)

Este documento detalha a metodologia utilizada para a detecção de piscadas no projeto BlinkTracking, especificamente a aplicação da métrica **EAR (Eye Aspect Ratio)** utilizando os marcos faciais do **MediaPipe Face Mesh**.

## 1. O Conceito

O EAR é um escalar simples que descreve a abertura do olho. Ele é baseado na relação geométrica entre a altura e a largura do olho. A fórmula original foi proposta por **Tereza Soukupová e Jan Čech** no paper *"Real-Time Eye Blink Detection using Facial Landmarks"* (2016).

A principal vantagem do EAR é que ele é relativamente **invariante à escala** da imagem e à rotação da cabeça, tornando a detecção robusta a variações de distância entre o usuário e a câmera.

## 2. A Fórmula Matemática

A equação do EAR é definida por:

$$
\text{EAR} = \frac{||p_2 - p_6|| + ||p_3 - p_5||}{2 \times ||p_1 - p_4||}
$$

Onde:
*   $p_1, \dots, p_6$ são os pontos de referência 2D do olho.
*   $||p_i - p_j||$ é a Distância Euclidiana entre os pontos.
*   O **numerador** calcula a altura média do olho (usando dois pares de pontos verticais).
*   O **denominador** calcula a largura do olho (distância horizontal).

### Comportamento da Métrica
*   **Olho Aberto**: O EAR é constante e alto (geralmente entre **0.25** e **0.35**).
*   **Olho Fechado**: A distância vertical tende a zero, fazendo o EAR cair drasticamente para algo próximo de **0.05** ou **0.00**.

## 3. Marcos Faciais do MediaPipe (Landmarks)

No projeto, utilizamos o **MediaPipe Face Mesh** que fornece 478 pontos. Para o cálculo do EAR, selecionamos os 6 pontos que melhor representam o contorno das pálpebras, mapeando-os para a fórmula acima.

### 👁️ Olho Direito

| Ponto na Fórmula | Descrição | Índice MediaPipe (ID) |
| :--- | :--- | :--- |
| **P1** | Canto Externo (Horizontal) | **33** |
| **P2** | Pálpebra Superior (Vertical) | **160** |
| **P3** | Pálpebra Superior (Vertical) | **158** |
| **P4** | Canto Interno (Horizontal) | **133** |
| **P5** | Pálpebra Inferior (Vertical) | **153** |
| **P6** | Pálpebra Inferior (Vertical) | **144** |

### 👁️ Olho Esquerdo

| Ponto na Fórmula | Descrição | Índice MediaPipe (ID) |
| :--- | :--- | :--- |
| **P1** | Canto Interno (Horizontal) | **362** |
| **P2** | Pálpebra Superior (Vertical) | **385** |
| **P3** | Pálpebra Superior (Vertical) | **387** |
| **P4** | Canto Externo (Horizontal) | **263** |
| **P5** | Pálpebra Inferior (Vertical) | **373** |
| **P6** | Pálpebra Inferior (Vertical) | **380** |

---

## 4. Visualização dos Pontos

Imagine o olho mapeado da seguinte forma, onde as linhas verticais representam a altura e a horizontal a largura:


      P2   P3
      /     \
   P1 ------- P4
      \     /
      P6   P5


*   A soma das distâncias **P2-P6** e **P3-P5** nos dá a abertura vertical.
*   A distância **P1-P4** nos dá a largura horizontal.

## 5. Critérios de Classificação

O algoritmo analisa a curva do EAR ao longo do tempo para classificar os eventos:

1.  **Início da Piscada**: Quando o EAR cai abaixo de um limiar (`EAR_THRESHOLD`), tipicamente **0.20 - 0.22**.
2.  **Piscada Completa**: O valor mínimo do EAR atinge um ponto muito baixo (ex: < **0.16**), indicando toque total das pálpebras.
3.  **Piscada Incompleta**: O EAR diminui significativamente, indicando intenção de piscar, mas não atinge o limiar de fechamento total.
4.  **Duração**: O tempo em que o EAR permanece abaixo do limiar é contabilizado como a duração da piscada.

---
*Referência: Soukupová, Tereza, and Jan Čech. "Real-time eye blink detection using facial landmarks." 21st computer vision winter workshop. Vol. 1. 2016.*
