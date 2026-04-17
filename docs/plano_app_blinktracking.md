# BlinkTracking App — Plano de Viabilidade e Prototipagem

**Data:** 15 Abril 2026
**Autor:** Joao Victor Pacheco Dias
**Status:** Plano estratégico — pré-desenvolvimento

---

## 1. Visão do Produto

**Uma sentença:** App móvel que analisa vídeos de pacientes com paralisia facial e gera automaticamente um score objetivo de severidade (complementar ao House-Brackmann), com todo o processamento local — sem dados saindo do dispositivo.

**Proposta de valor:**
- Para **oftalmologistas/neurologistas**: score objetivo e reprodutível, eliminando variabilidade inter-observador
- Para **pacientes**: monitoramento longitudinal em casa, sem deslocamento
- Para **pesquisadores**: dados padronizados para estudos multicêntricos

---

## 2. Arquitetura Proposta

### 2.1 Stack Técnico (Atualizado — sem MediaPipe Web)

```
┌──────────────────────────────────────────────┐
│               iPhone/iPad                      │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │  BlinkTracking PWA (Safari/WebView)     │  │
│  │  - Upload de video pre-gravado          │  │
│  │  - UI/UX (Next.js + TailwindCSS)       │  │
│  │  - Resultado visual + PDF report        │  │
│  └───────────┬─────────────────────────────┘  │
│              │                                  │
│  ┌───────────▼─────────────────────────────┐  │
│  │  Backend Local (Python API)             │  │
│  │                                          │  │
│  │  MediaPipe Face Mesh (Python, server)   │  │
│  │  - 478 landmarks, processamento local   │  │
│  │  - EAR + metricas + blink detection     │  │
│  │  - Roda no Mac/PC do medico ou server   │  │
│  │  - Otimizado: skip frames + downscale   │  │
│  └───────────┬─────────────────────────────┘  │
│              │                                  │
│  ┌───────────▼─────────────────────────────┐  │
│  │  Interpretacao (offline, on-device)     │  │
│  │                                          │  │
│  │  Google AI Edge Gallery + Gemma 4       │  │
│  │  - LLM rodando 100% local no celular   │  │
│  │  - Interpreta metricas em linguagem     │  │
│  │    natural para o medico                │  │
│  │  - Nenhum dado sai do dispositivo       │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  🔒 ZERO dados saem do dispositivo             │
└──────────────────────────────────────────────┘
```

**Decisao arquitetural:** Nao usar MediaPipe no browser (WASM/WebGL).
Todo processamento ML e feito pelo backend Python local, garantindo:
- Mesma qualidade do pipeline de pesquisa
- Reprodutibilidade exata dos resultados
- Compatibilidade com qualquer navegador (sem WebGL necessario)
- O usuario apenas faz upload de video pre-gravado

### 2.2 Fluxo do Usuário

```
1. Abrir app → Tela inicial "Nova Análise"
2. Gravar vídeo (15-30s, câmera frontal, paciente piscando)
   - Guia visual: "Posicione o rosto no centro"
   - Timer automático
3. Processamento local (~10-30s):
   - Extração de landmarks (MediaPipe/TFLite)
   - Cálculo de EAR frame-a-frame
   - Detecção de piscadas
   - Cálculo de métricas
4. Resultado:
   - Score PFI (Palpebral Function Index): 0-100
   - Comparação olho afetado vs saudável
   - Gráfico de evolução (se análises anteriores)
   - Relatório PDF exportável
5. (Opcional) Interpretação via Gemma4:
   - "O paciente apresenta redução de 40% na velocidade
     de fechamento do olho esquerdo, consistente com
     HB grau III-IV. Recomenda-se acompanhamento mensal."
```

---

## 3. Fase 1 — PWA (Protótipo Rápido, 4-6 semanas)

### Por que PWA primeiro?

| Critério | PWA | App Nativo iOS |
|----------|-----|----------------|
| Tempo de dev | 4-6 semanas | 3-4 meses |
| App Store | Não precisa | Review ~2 semanas |
| Atualização | Instantânea | Via App Store |
| Camera API | ✅ (getUserMedia) | ✅ (AVFoundation) |
| MediaPipe | ✅ (WASM/WebGL) | ✅ (Swift SDK) |
| Offline | ✅ (Service Worker) | ✅ nativo |
| Performance | ~80% do nativo | 100% |
| GPU | WebGL (limitado) | Metal/ANE (full) |

### Stack PWA

```
Frontend:  Next.js 14 + TailwindCSS + shadcn/ui
ML:        @mediapipe/tasks-vision (WASM)
Storage:   IndexedDB (histórico local)
Export:    jsPDF + html2canvas (relatórios)
Install:   manifest.json + Service Worker
Hosting:   Vercel (ou self-hosted)
```

### MVP Features (Fase 1)

- [ ] Captura de vídeo (câmera frontal, 15-30s)
- [ ] Extração de landmarks via MediaPipe Web
- [ ] Cálculo de EAR e métricas básicas (taxa, amplitude, vel_fech, vel_aber)
- [ ] Comparação bilateral (olho direito vs esquerdo)
- [ ] Score PFI simplificado
- [ ] Relatório em tela + export PDF
- [ ] Funciona offline (Service Worker)
- [ ] Histórico local (IndexedDB)

### Estimativa de Performance (iPhone 15)

| Operação | Tempo estimado |
|----------|----------------|
| MediaPipe init | ~2s |
| Landmark extraction (30fps, 15s = 450 frames) | ~15s |
| EAR + métricas | ~1s |
| Score + relatório | ~0.5s |
| **Total** | **~18s** |

---

## 4. Fase 2 — App Nativo iOS (após validação do PWA)

### Vantagens sobre PWA
- **Apple Neural Engine** (ANE) — 15.8 TOPS no iPhone 15
- **Core ML** — inferência otimizada para modelos on-device
- **ARKit/Vision** — face tracking nativo da Apple
- **HealthKit** — integração com dados de saúde

### Stack Nativo
```
UI:        SwiftUI
ML:        Core ML (modelo convertido de MediaPipe/TFLite)
Camera:    AVFoundation + Vision framework
Storage:   Core Data + CloudKit (sync opcional)
LLM:       Gemma 4 via Google AI Edge SDK (ou Apple Intelligence)
```

---

## 5. Integração com Google AI Edge Gallery + Gemma4

### Conceito

O usuário instala o app [Google AI Edge Gallery](https://ai.google.dev/edge/gallery) no iPhone, que permite rodar modelos como Gemma4 localmente. Nosso app BlinkTracking se comunica com o modelo via API local.

### Arquitetura de Integração

```
BlinkTracking App                Google AI Edge Gallery
┌──────────────┐                ┌──────────────────┐
│ Métricas     │  ──JSON───►   │ Gemma 4 (2B)     │
│ calculadas   │                │ Rodando local     │
│              │  ◄──texto──   │ (4GB RAM)         │
│ Interpretação│                │                    │
│ em tela      │                │ Prompt:            │
└──────────────┘                │ "Analise estas     │
                                │  métricas de       │
                                │  paralisia facial" │
                                └──────────────────┘
```

### Prompt Template para Gemma4

```
Você é um assistente médico especializado em paralisia facial.
Analise as seguintes métricas de piscada de um paciente:

Olho afetado (esquerdo):
- Velocidade de fechamento: {vel_fech_afetado} EAR/s
- Velocidade de abertura: {vel_aber_afetado} EAR/s
- Amplitude: {amplitude_afetado}
- RBA: {rba_afetado}%
- Taxa de piscadas: {taxa_afetado}/min

Olho saudável (direito):
- Velocidade de fechamento: {vel_fech_saudavel} EAR/s
- Velocidade de abertura: {vel_aber_saudavel} EAR/s
- Amplitude: {amplitude_saudavel}
- RBA: {rba_saudavel}%
- Taxa de piscadas: {taxa_saudavel}/min

Assimetria bilateral:
- Redução de velocidade: {pct_reducao_vel}%
- Redução de amplitude: {pct_reducao_amp}%

Forneça:
1. Estimativa de grau House-Brackmann (I-VI)
2. Principais achados
3. Recomendação de acompanhamento
Responda em português, tom profissional.
```

### Limitações da Abordagem Gemma4

- **Não é diagnóstico** — ferramenta de suporte, não substitui o médico
- **Alucinações** — LLMs podem gerar interpretações incorretas
- **Latência** — Gemma4 2B no iPhone leva ~5-10s por resposta
- **Dependência de app externo** — usuário precisa instalar Google AI Edge Gallery
- **Alternativa futura**: Apple Intelligence (iOS 18.4+) com modelo on-device nativo

---

## 6. Segurança e Privacidade (LGPD/HIPAA)

### Princípio: Zero Cloud

| Dado | Armazenamento | Transmissão |
|------|---------------|-------------|
| Vídeo do paciente | Temporário (RAM), deletado após análise | NENHUMA |
| Landmarks (478 pontos) | Local (IndexedDB/CoreData) | NENHUMA |
| Métricas calculadas | Local | NENHUMA |
| Score PFI | Local | Opcional (export manual) |
| Relatório PDF | Local | Via AirDrop/email pelo usuário |

### Compliance

- **LGPD**: Dados de saúde = categoria especial. Processamento local = base legal de legítimo interesse do profissional de saúde
- **HIPAA**: Protected Health Information (PHI) nunca sai do dispositivo
- **ANVISA**: Classificação como software de suporte clínico (Classe I) — não requer registro para uso em pesquisa
- **CEP/IRB**: Dados anônimos processados localmente reduzem significativamente os requisitos éticos

---

## 7. Modelo de Negócio

### Fase 1: Pesquisa (gratuito)
- PWA open-source para validação clínica
- Publicação científica com dados de uso
- Feedback de oftalmologistas

### Fase 2: Freemium
- **Gratuito**: Análise básica (score PFI, comparação bilateral)
- **Pro** (R$29.90/mês): Histórico longitudinal, relatórios PDF, integração LLM, múltiplos pacientes
- **Institucional** (R$199/mês): Multi-usuário, dashboard, export em massa

### Fase 3: B2B / SaMD
- Software as Medical Device (SaMD) — registro ANVISA Classe II
- Integração com prontuário eletrônico (HL7 FHIR)
- Licenciamento para hospitais e clínicas

---

## 8. Cronograma

| Fase | Duração | Entregável |
|------|---------|------------|
| **Fase 1a**: PWA MVP | 4-6 sem | App funcional com MediaPipe Web |
| **Fase 1b**: Validação clínica | 8-12 sem | Paper com n>50 pacientes |
| **Fase 2**: App iOS nativo | 12-16 sem | App Store + Core ML |
| **Fase 3**: Gemma4 integration | 4-6 sem | Interpretação on-device |
| **Fase 4**: SaMD / ANVISA | 6-12 meses | Registro regulatório |

---

## 9. Benchmark Planejado: Modelos de Face Landmarks

| Modelo | Pontos | GPU | FPS estimado (iPhone 15) | Precisão EAR |
|--------|--------|-----|--------------------------|--------------|
| MediaPipe Face Mesh | 478 | WebGL/ANE | ~30 fps | Referência |
| MediaPipe (TFLite) | 478 | ANE | ~45 fps | = MediaPipe |
| dlib (68 pontos) | 68 | CPU | ~15 fps | Reduzida (sem iris) |
| ONNX FaceMesh | 478 | CUDA/ANE | ~50 fps | ≈ MediaPipe |
| Apple Vision (ARKit) | 52 | ANE | ~60 fps | A testar |
| YOLOv8-Face | 5 | ANE | ~120 fps | Insuficiente |

**Plano**: rodar benchmark no DGX Spark (CUDA) e no iPhone (ANE) comparando tempo de processamento e concordância de EAR com o MediaPipe como referência.

---

## 10. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| MediaPipe Web lento em iPhones antigos | Usabilidade | Frame skipping adaptativo |
| Gemma4 muito grande para RAM | Feature indisponível | Usar Gemma 2B (2GB) ou desabilitar |
| Qualidade de vídeo variável | Precisão | Guia de captura + validação automática |
| App Store rejeição (medical device) | Lançamento | Lançar como "ferramenta educacional" inicialmente |
| Competidor (ex: eFace, FaceGram) | Market | Diferencial: 100% offline + open-source |

---

*Este documento é um plano vivo — será atualizado conforme o desenvolvimento progride.*

#PhD #BlinkTracking #WingsAI #Tecnologia #Negocios
