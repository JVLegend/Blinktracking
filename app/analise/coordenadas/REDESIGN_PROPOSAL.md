# Proposta de Redesign - Página de Coordenadas
## � Novo Conceito: "Clinical Precision Suite"

### Visão
Uma interface **clara, cirúrgica e altamente profissional**, projetada especificamente para oftalmologistas. O design prioriza a legibilidade, a confiança nos dados e uma estética de "equipamento médico de última geração".

### 🎨 Estética Visual

#### **Filosofia: "Light & Clean"**
Ao contrário do modo escuro "hacker", este tema utiliza luz, espaços em branco e transparências sutis para criar uma sensação de higiene, precisão e modernidade.

#### **Paleta de Cores (Medical Grade)**
- **Background Principal**:
  - `Linear Gradient`: Topo `#F0F9FF` (Alice Blue suave) → Base `#F8FAFC` (Slate muito claro).
- **Superfícies (Cards)**:
  - `#FFFFFF` com 80% de opacidade e *backdrop-blur*.
  - Bordas sutis em `#E2E8F0` (Slate 200).
- **Acentos (Cores de Ação e Dados)**:
  - **Primary (Dados Principais)**: `#0284C7` (Sky 600) - Confiança, tecnologia.
  - **Secondary (Destalhes)**: `#0D9488` (Teal 600) - Saúde, precisão.
  - **Alert/Attention**: `#F59E0B` (Amber 500) - Suave, não alarmista.
- **Tipografia**:
  - Principais: `#0F172A` (Slate 900) - Máximo contraste.
  - Secundários: `#64748B` (Slate 500) - Informação de suporte.

#### **Tipografia**
- **Inter Tight**: Para títulos e interface (Humanista, moderna, excelente legibilidade).
- **JetBrains Mono**: Para coordenadas e dados numéricos (Tabular nums).

### �️ Elementos de UI

1.  **Cards "Soft Glass"**:
    - Fundo branco semitransparente.
    - Sombra difusa e suave: `box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.05)`.
    - Cantos arredondados elegantes (16px).

2.  **Visualização (Canvas)**:
    - Fundo branco limpo com grid milimétrico muito sutil (apenas 3% de opacidade).
    - Contornos dos olhos precisos em linhas finas.
    - Pontos de rastreamento nítidos, sem "glow" excessivo, focando na localização exata.

3.  **Métricas e Dados**:
    - Números grandes, fonte fina (Light/Regular), transmitindo elegância.
    - Rótulos em caixa alta, pequenos e espaçados (tracking-wide).

### 🚀 Melhorias de Experiência (UX)

- **Hierarquia Visual Clara**: O vídeo/canvas é o herói. Métricas laterais apoiam a análise sem competir.
- **Micro-interações Suaves**: Botões com feedback tátil visual (scale down sutil), sem brilhos exagerados.
- **Feedback de Status**: Badges "pill" (pílula) com cores pastéis e bordas finas.

### 📊 Comparativo
| Elemento | Anterior (Dark/Cyber) | Novo (Clinical Light) |
| :--- | :--- | :--- |
| **Ambiente** | Escuro, Neon, Contraste Alto | Claro, Arejado, Suave |
| **Emoção** | Tecnologia, Gaming | Medicina, Confiança, Ciência |
| **Cores** | Roxo, Preto, Cyan Neon | Branco, Azul Real, Teal |
| **Dados** | Estilo Terminal | Estilo Relatório Médico |
| **Público** | Devs, Tech | Médicos, Pesquisadores |

---
**Status**: 🚧 Em desenvolvimento (Implementando `preview-design.html`)
