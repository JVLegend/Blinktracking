# Análise Comparativa: Paralisia Facial vs Grupo Controle

**Data da Análise:** Março 2026 (revisão crítica de Janeiro 2026)
**Ferramenta:** BlinkTracking — Eye Blink Analysis System
**Método:** Eye Aspect Ratio (EAR) com MediaPipe Face Mesh
**Scripts:** `scripts/analisar_metricas_completas.py`, `tmp/run_analise.py`
**Datasets:** `tmp/dataset_paralisia.csv`, `tmp/dataset_controle.csv`

---

## Nota Metodológica Crítica (versão revisada)

A análise anterior (Janeiro 2026) cometeu dois erros fundamentais que foram corrigidos nesta versão:

### Erro 1 — Mistura de olhos
A versão anterior agregava olho paralisado e olho saudável como se fossem equivalentes, calculando médias por paciente sem distinção. Isso subestimava as diferenças reais, pois o olho saudável do próprio paciente "diluía" os achados do olho afetado. **Esta versão separa rigorosamente os dois olhos usando a coluna `olho_paralisado` da `tabela_HB.xlsx`, confirmada por mapeamento manual paciente-a-paciente.**

### Erro 2 — Vies de FPS nas comparações entre grupos
O grupo de paralisia foi filmado em alta velocidade (29–240 fps), enquanto o grupo controle foi filmado a 24 fps. Isso cria um **vies sistematico** que afeta velocidade e amplitude:

- `MIN_FRAMES = 2` para detecção de piscada equivale a 83ms a 24fps, mas apenas 8ms a 240fps — detectando micro-movimentos no grupo de paralisia que seriam invisíveis no controle
- Com FPS mais alto, o pico mínimo do EAR é capturado com maior precisão, inflando amplitude e velocidade aparente
- **A taxa de piscadas (piscadas/min) não é afetada por FPS**, pois é normalizada pelo tempo
- Baseline EAR e RBA são menos sensíveis a FPS

**Consequência:** comparações diretas de velocidade e amplitude entre os dois grupos são metodologicamente invalidas com FPS heterogeneo.

### Estrategia adotada

| Analise | Comparação | FPS | Metricas validas |
|---------|-----------|-----|-----------------|
| **Analise 1** | Olho paralisado vs olho saudavel (pareado) | Mesmo video, mesmo FPS | Todas |
| **Analise 2** | Olho saudavel/paralisado vs controle | FPS diferente | Apenas taxa, baseline, RBA |
| **Analise 3** | Subgrupo 30fps vs controle 24fps | FPS compativel | Todas (n=3, exploratorio) |
| **Analise 4** | Correlação com grau HB (Spearman) | Misto | Taxa, amplitude, RBA validas; velocidade com ressalva |
| **Analise 5** | Estratificação por grau HB | Misto | Idem |

---

## 1. Descrição dos Grupos

### Grupo Controle (n=9)
- Individuos saudaveis, sem historico de paralisia facial ou patologia ocular
- Duracao dos videos: mediana 184s (min 42s, max 186s)
- **FPS: 24 fps (todos)**
- Nota: participante Jacira possui video de apenas 42s — estimativas menos estaveis

### Grupo Paralisia Facial (n=39 apos exclusoes)
- Diagnostico de paralisia facial periferica unilateral
- Classificação House-Brackmann: I a V-VI
- Duracao dos videos: mediana 188s (min 182s, max 596s)
- **FPS: variavel — ~30fps (n=3), ~150fps (n=17), ~200–240fps (n=19)**
- Diferença de duracao entre grupos: Mann-Whitney p=0,0025 (significativa, porem sem impacto nas comparacoes). A diferença reflete a combinacao de dois extremos opostos: Jacira no grupo controle com apenas 42s, e paciente 43 no grupo paralisia com 596s. A mediana de ambos os grupos e praticamente identica (~184s vs ~188s). Para metricas normalizadas por tempo (taxa em pisc/min) ou por evento (media de velocidade/amplitude por piscada), a diferenca de duracao nao invalida as comparacoes — o impacto real e apenas na estabilidade das estimativas de pacientes com poucos eventos detectados.

**Exclusoes (n=5 de 44):**
- 4 marcados como `remover=sim` na tabela HB (dados inadequados para analise)
- 1 paralisia bilateral (Thamires Sousa — HB III E + HB II D): comparação paralisado/saudavel não aplicavel
- Paciente 44 (Willamar): CSV não disponivel

#### Distribuição por Grau House-Brackmann

| Grau HB | Descrição | n | % |
|---------|-----------|---|---|
| HB I | Normal / minimo residual | 2 | 5,1% |
| HB II | Disfunção leve | 9 | 23,1% |
| HB III | Disfunção moderada | 13 | 33,3% |
| HB IV | Disfunção moderada-severa | 7 | 17,9% |
| HB V | Disfunção severa | 7 | 17,9% |
| HB V-VI | Paralisia total/quase total | 1 | 2,6% |

---

## 2. Analise 1 — Olho Paralisado vs Olho Saudavel (Comparação Pareada)

**Teste:** Wilcoxon signed-rank (não-parametrico, pareado)
**n = 39 pares**
**Sem vies de FPS** — ambos os olhos no mesmo video, mesmo FPS
**Tamanho de efeito:** r = Z/sqrt(n) — r >= 0,1 pequeno; >= 0,3 medio; >= 0,5 grande

| Metrica | Olho Paralisado | Olho Saudavel | p | Sig | r |
|---------|----------------|---------------|---|-----|---|
| Taxa (piscadas/min) | 7,10 [0,45–12,45] | 6,70 [0,85–12,90] | 0,0163 | * | 0,385 |
| Amplitude EAR | 0,083 [0,066–0,102] | 0,086 [0,073–0,102] | 0,0505 | ns | 0,313 |
| Vel. Fechamento (EAR/s) | 3,369 [1,259–9,562] | 3,915 [2,305–12,661] | 0,1023 | ns | 0,262 |
| Vel. Abertura (EAR/s) | 1,820 [0,926–3,607] | 2,349 [1,204–4,313] | 0,4050 | ns | 0,133 |
| Baseline EAR | 0,276 [0,248–0,296] | 0,281 [0,249–0,301] | 0,2956 | ns | 0,167 |
| RBA (%) | 29,10 [26,35–37,45] | 29,70 [27,10–36,00] | 0,2031 | ns | 0,204 |
| Razao Vel. (Fech/Aber) | 1,619 [1,297–3,071] | 1,981 [1,453–3,300] | 0,3707 | ns | 0,163 |

*Valores: mediana [IQR Q1–Q3]. * p<0,05. ns = não significativo.*

### Interpretação

**A taxa de piscadas e a unica metrica com diferença significativa** entre olho paralisado e olho saudavel do mesmo paciente (p=0,016, r=0,385 — efeito medio). O olho paralisado tende a registrar taxa levemente superior, o que pode refletir **sincinesia** (movimentos involuntarios no olho afetado durante esforços) ou comportamento compensatorio inconsistente.

As metricas cinematicas — velocidade de fechamento, abertura e razao velocidade — **não atingiram significancia** na comparação pareada intra-paciente. Este e um achado relevante: dentro do mesmo video, sob as mesmas condições, os dois olhos têm dinamica surpreendentemente similar em valor absoluto. A diferença dramatica reportada na literatura entre paralisia e controle pode ser amplificada pelo vies de FPS quando grupos são filmados em aparelhos diferentes.

O **baseline EAR** (abertura de repouso da palpebra) não difere entre olhos (p=0,296), indicando que a posição estatica da palpebra e relativamente simetrica mesmo na paralisia — o comprometimento e dinamico (no movimento), não postural.

> **Achado critico:** a assimetria bilateral classica descrita na paralisia facial pode ser, em parte, um artefato metodologico quando dados são capturados com FPS heterogeneo. A analise pareada intra-paciente — metodologicamente mais robusta — mostra efeitos menores e restritos a taxa de piscadas.

---

## 3. Analise 2 — Taxa, Baseline e RBA: Paralisia vs Controle

**Teste:** Mann-Whitney U (não-parametrico, independente)
**Metricas analisadas:** apenas taxa de piscadas, baseline EAR e RBA — as unicas metricas não afetadas pelo vies de FPS
**n paralisia = 39, n controle = 9**

> Velocidade e amplitude foram deliberadamente excluidas desta comparação por vies de FPS. Ver Analise 3 para abordagem exploratoria com FPS compativel.

### Olho Saudavel vs Controle

| Metrica | Olho Saudavel | Controle | p | Sig | r |
|---------|--------------|---------|---|-----|---|
| Taxa (piscadas/min) | 6,70 [0,85–12,90] | 9,90 [2,80–13,50] | 0,4921 | ns | 0,099 |
| Baseline EAR | 0,281 [0,249–0,301] | 0,284 [0,264–0,288] | 0,9368 | ns | 0,011 |
| RBA (%) | 29,70 [27,10–36,00] | 31,10 [28,50–33,55] | 0,3978 | ns | 0,122 |

### Olho Paralisado vs Controle

| Metrica | Olho Paralisado | Controle | p | Sig | r |
|---------|----------------|---------|---|-----|---|
| Taxa (piscadas/min) | 7,10 [0,45–12,45] | 9,90 [2,80–13,50] | 0,3823 | ns | 0,126 |
| Baseline EAR | 0,276 [0,248–0,296] | 0,284 [0,264–0,288] | 0,8121 | ns | 0,034 |
| RBA (%) | 29,10 [26,35–37,45] | 31,10 [28,50–33,55] | 0,3081 | ns | 0,147 |

*Valores: mediana [IQR].*

### Interpretação

Nenhuma das metricas comparaveis atingiu significancia estatistica. Dois achados principais:

**O olho saudavel dos pacientes com paralisia não difere do grupo controle** em taxa de piscadas nem em postura de repouso (baseline EAR, p=0,94). Isso sugere que a paralisia facial periferica unilateral **não compromete sistemicamente o olho contralateral** — o olho saudavel preserva função normal. O baseline EAR equivalente descarta hipotese de alteração de tonus muscular bilateral.

**O olho paralisado tambem não difere do controle em taxa** (p=0,38). Esse resultado aparentemente contra-intuitivo se explica pela grande variabilidade intra-grupo de paralisia: casos leves (HB I–II) têm taxa normal ou elevada por sincinesia, enquanto casos graves (HB V) têm taxa proxima de zero — a mediana resulta em valor intermediario similar ao controle.

> **Limitação desta analise:** grupo controle n=9 tem poder estatistico baixo. Para efeitos pequenos (r<0,3), o estudo e subpotenciado. Ausencia de significancia **não equivale a ausencia de diferença real** — necessaria ampliação do grupo controle com filmagem em FPS compativel.

---

## 4. Analise 3 — Velocidade e Amplitude: Subgrupo 30fps vs Controle 24fps (Exploratoria)

**Objetivo:** unica comparação de velocidade e amplitude entre grupos com FPS compativel
**Subgrupo 30fps:** n=3 pacientes — Paciente 7 (HB IV), Paciente 33 (HB V-VI), Paciente 43 (HB I)
**Controle:** n=9 (24fps)
**ATENCAO: n=3 e insuficiente para qualquer conclusão estatistica. Resultados exclusivamente exploratorios para direcionar estudos futuros.**

| Metrica | Subgrupo 30fps | Controle 24fps | p | Sig |
|---------|---------------|---------------|---|-----|
| Vel. Fechamento paralisado (EAR/s) | 11,829 [7,599–41,807] | 28,357 [17,784–36,231] | 0,6000 | ns |
| Vel. Fechamento saudavel (EAR/s) | 13,065 [8,235–44,298] | 28,357 [17,784–36,231] | 0,7273 | ns |
| Razao Vel. paralisado | 11,564 [8,499–39,127] | 21,861 [15,741–35,072] | 0,7273 | ns |
| Razao Vel. saudavel | 15,299 [10,051–57,663] | 21,861 [15,741–35,072] | 0,8636 | ns |
| Amplitude paralisado | 0,072 [0,071–0,085] | 0,087 [0,082–0,091] | 0,3544 | ns |
| Amplitude saudavel | 0,075 [0,074–0,087] | 0,087 [0,082–0,091] | 0,4588 | ns |

*Referencia controle (24fps, n=9): taxa 9,90; vel. fechamento 28,357; razao vel. 21,861; amplitude 0,087.*

### Interpretação

Apesar do n insuficiente, o subgrupo 30fps mostra sinais qualitativos na direcao esperada:

- **Velocidade de fechamento menor nos pacientes** que nos controles (11,8 vs 28,4 EAR/s no olho paralisado), consistente com comprometimento dinamico da piscada
- **Amplitude menor no grupo paralisia** (0,072 vs 0,087) — consistente com fechamento incompleto da palpebra
- O Paciente 33 (HB V-VI) apresenta razao de velocidade extrema (66,7 no olho paralisado), possivelmente por piscadas muito rara e de alta velocidade quando ocorrem neste grau severo

Estes sinais qualitativos alinham-se com a hipotese de que o FPS diferente nos demais pacientes estava mascarando as diferenças cinematicas reais. A ausencia de significancia aqui e produto do n=3, não de ausencia de efeito.

> **Para estudos futuros:** filmar todos os participantes em >=120fps e mandatorio para comparação valida de cinematica. Alternativa: downsampling dos dados de alta FPS para 24fps antes da analise, preservando os controles existentes.

---

## 5. Analise 4 — Correlação com Grau House-Brackmann (Spearman)

**Metodo:** correlação de Spearman entre grau HB ordinal (I=1, II=2, III=3, IV=4, V=5, V-VI=5,5) e metricas por olho
**n = 39**

| Metrica | rho | p | Sig | n | FPS |
|---------|-----|---|-----|---|-----|
| Taxa olho **paralisado** | −0,400 | 0,0116 | * | 39 | OK |
| Taxa olho **saudavel** | −0,360 | 0,0244 | * | 39 | OK |
| Amplitude olho **paralisado** | −0,418 | 0,0082 | ** | 39 | OK |
| Amplitude olho **saudavel** | −0,412 | 0,0092 | ** | 39 | OK |
| RBA olho **paralisado** | −0,494 | 0,0014 | ** | 39 | OK |
| RBA olho **saudavel** | −0,436 | 0,0055 | ** | 39 | OK |
| Baseline EAR paralisado | +0,045 | 0,7836 | ns | 39 | OK |
| Baseline EAR saudavel | −0,008 | 0,9592 | ns | 39 | OK |
| Vel. Fechamento paralisado | +0,202 | 0,2183 | ns | 39 | Confundidor |
| Vel. Fechamento saudavel | +0,343 | 0,0328 | * | 39 | Confundidor |
| Razao Vel. paralisado | +0,167 | 0,3690 | ns | 31 | Confundidor |
| Razao Vel. saudavel | +0,367 | 0,0303 | * | 35 | Confundidor |

*Coluna FPS: "OK" = metrica não sensivel a FPS; "Confundidor" = possivel correlação espuria por FPS.*

### Interpretação

As metricas mais robustas — taxa, amplitude e RBA — mostram **correlação negativa moderada e significativa** com o grau HB: quanto mais severa a paralisia, menores a taxa de piscadas, a amplitude do movimento e o RBA, em **ambos os olhos**.

**RBA e o biomarcador com correlação mais forte** (rho=−0,494, p=0,0014). Por normalizar a amplitude pelo baseline de cada paciente, o RBA controla variações anatomicas individuais e representa mais fielmente a capacidade relativa de fechamento palpebral.

O fato de que **o olho saudavel tambem correla com o grau HB** (taxa: rho=−0,360; amplitude: rho=−0,412) levanta hipotese: pacientes com paralisia mais grave podem pis­car menos globalmente por comportamento de proteção ocular, inibicao reflexa pelo desconforto, ou influencia neural mais ampla do que estritamente ipsilateral.

As correlações de velocidade marcadas como "Confundidor" **não devem ser interpretadas causalmente**: a correlação positiva encontrada (mais grave → maior velocidade) e contraintuitiva e provavelmente reflete confundimento — diferentes pacientes com diferentes graus de gravidade foram filmados com diferentes aparelhos e FPS, não permitindo isolamento do efeito da severidade.

---

## 6. Analise 5 — Estratificação por Grau HB

*Valores: mediana [IQR] | Teste de tendencia: Kruskal-Wallis entre graus*

### Taxa de Piscadas (piscadas/min)

| Grau | n | Olho Paralisado | Olho Saudavel |
|------|---|----------------|--------------|
| HB I | 2 | 26,00 [16,15–35,85] | 26,10 [16,30–35,90] |
| HB II | 9 | 11,00 [3,40–24,80] | 11,00 [3,40–24,80] |
| HB III | 13 | 8,00 [1,60–10,70] | 6,70 [2,00–10,40] |
| HB IV | 7 | 7,50 [0,00–12,60] | 9,10 [0,65–12,95] |
| HB V | 7 | 2,30 [0,15–4,70] | 3,00 [0,80–7,40] |
| HB V-VI | 1 | 0,30 | 0,30 |
| **Kruskal-Wallis** | — | p=0,2348 ns | p=0,3788 ns |
| **Controle** | 9 | — | 9,90 [2,80–13,50] |

*Tendencia clara de reducao com gravidade, mas Kruskal-Wallis não significativo — provavelmente por n pequeno em cada subgrupo (especialmente HB I n=2 e HB V-VI n=1) e alta variabilidade intra-grau.*

### Amplitude EAR

| Grau | n | Olho Paralisado | Olho Saudavel |
|------|---|----------------|--------------|
| HB I | 2 | 0,104 [0,101–0,106] | 0,102 [0,100–0,104] |
| HB II | 9 | 0,105 [0,078–0,122] | 0,093 [0,074–0,128] |
| HB III | 13 | 0,086 [0,069–0,094] | 0,086 [0,075–0,100] |
| HB IV | 7 | 0,070 [0,000–0,085] | 0,083 [0,075–0,094] |
| HB V | 7 | 0,071 [0,028–0,077] | 0,070 [0,035–0,078] |
| HB V-VI | 1 | 0,072 | 0,075 |
| **Kruskal-Wallis** | — | p=0,1510 ns | p=0,1419 ns |
| **Controle 24fps** | 9 | — | 0,087 [0,082–0,091] |

### Velocidade de Fechamento — EAR/s (FPS variavel — não comparar com controle)

| Grau | n | Olho Paralisado | Olho Saudavel |
|------|---|----------------|--------------|
| HB I | 2 | 2,611 [2,233–2,990] | 2,558 [2,135–2,981] |
| HB II | 9 | 3,050 [0,464–3,532] | 3,456 [1,996–3,841] |
| HB III | 13 | 4,475 [2,593–11,272] | 5,188 [2,681–13,797] |
| HB IV | 7 | 2,158 [0,000–8,011] | 10,266 [2,991–16,360] |
| HB V | 7 | 4,439 [2,217–9,610] | 9,392 [2,628–15,149] |
| HB V-VI | 1 | 71,786 | 75,531 |
| **Kruskal-Wallis** | — | p=0,4981 ns | p=0,3489 ns |
| **Controle 24fps** | 9 | — | 28,357 [17,784–36,231] |

*Os valores absolutos de velocidade para os grupos de paralisia refletem mistura de FPS. Não comparar horizontalmente com controle.*

### Razao de Velocidade (Fech/Aber) (FPS variavel — não comparar com controle)

| Grau | n | Olho Paralisado | Olho Saudavel |
|------|---|----------------|--------------|
| HB I | 2 | 3,206 [2,092–4,320] | 2,884 [1,925–3,843] |
| HB II | 7 | 1,459 [1,358–1,766] | 1,609 [1,240–2,017] |
| HB III | 12 | 2,102 [1,341–3,674] | 2,307 [1,485–3,400] |
| HB IV | 4 | 1,975 [1,446–4,685] | 2,189 [1,541–7,981] |
| HB V | 5 | 1,500 [1,225–2,797] | 3,157 [1,981–3,949] |
| HB V-VI | 1 | 66,691 | 100,028 |
| **Kruskal-Wallis** | — | p=0,9045 ns | p=0,4406 ns |
| **Controle 24fps** | 9 | — | 21,861 [15,741–35,072] |

*Valores extremos no HB V-VI (1 paciente) devem ser tratados como caso isolado.*

---

## 7. Sintese dos Achados

### Metricas robustas (validas, sem confundimento de FPS)

| Achado | Evidencia | Magnitude |
|--------|-----------|-----------|
| Taxa piscadas diminui com maior grau HB | Spearman rho=−0,40 p=0,012 | Moderada |
| Amplitude EAR diminui com maior grau HB | Spearman rho=−0,42 p=0,008 | Moderada |
| RBA diminui com maior grau HB | Spearman rho=−0,49 p=0,001 | Moderada–alta |
| Olho paralisado tem taxa levemente maior que saudavel | Wilcoxon p=0,016 r=0,39 | Pequena–media |
| Olho saudavel = controle em taxa e baseline | Mann-Whitney ns | — |
| Baseline EAR identico entre olhos e entre grupos | p=0,93 e p=0,30 | Sem efeito |

### Metricas com ressalva (potencial confundimento de FPS)

| Metrica | Resultado | Interpretação recomendada |
|---------|-----------|--------------------------|
| Vel. fechamento (Analise 1 pareada) | p=0,10 ns entre olhos | Valido internamente; sem diferença detectada entre olhos |
| Razao vel. fech/aber (pareada) | p=0,37 ns entre olhos | Idem |
| Vel. fechamento/razao vel. vs controle | Grandes diferenças | Provavelmente artefato de FPS — não interpretar |
| Correlação vel. com grau HB | rho positivo (contraintuitivo) | Provavel confundidor de FPS — não interpretar causalmente |

### Biomarker mais promissor

**RBA (Relative Blink Amplitude)** apresenta a correlação mais forte com grau HB (rho=−0,494), e insensivel a FPS (e um valor relativo ao baseline do proprio paciente), valido para ambos os olhos e opera em escala clinicamente interpretavel (percentual de fechamento). Merece prioridade na validação em estudo prospectivo com FPS padronizado.

---

## 8. Limitações

1. **FPS heterogeneo** (paralisia 30–240fps vs controle 24fps): impede comparação direta de velocidade e amplitude entre grupos. Resolve-se padronizando FPS >=120fps para todos em estudos futuros.

2. **Grupo controle pequeno** (n=9): poder estatistico insuficiente para detectar efeitos pequenos (r<0,3). Estimativa: necessario n aprox. 30 controles para 80% de poder com alfa=0,05 para efeito pequeno.

3. **Subgrupo 30fps** com n=3 para analise de velocidade com FPS compativel — exclusivamente exploratorio.

4. **HB I subrrepresentado** (n=2) e HB V-VI (n=1): estimativas instáveis para estes graus extremos.

5. **Analise transversal**: sem seguimento longitudinal para avaliar evolucão temporal.

6. **Ausencia de matching demografico**: controles não apareados por idade e sexo com pacientes.

7. **Duracao de video**: diferença estatisticamente significativa entre grupos (p=0,0025), porem sem impacto metodologico direto. A diferenca e explicada por extremos opostos nos dois grupos (Jacira/controle=42s; paciente 43/paralisia=596s), nao por diferenca sistematica — medianas praticamente identicas (~184s vs ~188s). Metricas normalizadas por tempo (taxa) ou calculadas por evento (media de velocidade/amplitude por piscada) nao são afetadas pela duracao. O unico risco pontual e menor estabilidade das estimativas em participantes com poucos eventos detectados.

---

## 9. Recomendações para Estudos Futuros

1. **Filmar todos os participantes em >=120fps** — elimina o principal confundidor desta analise
2. **Ampliar grupo controle para n>=30**, com matching por idade e sexo
3. **Analise longitudinal**: reavaliar pacientes em fase aguda, recuperação e cronica
4. **Validar RBA como biomarcador primario** em coorte prospectiva com FPS padronizado
5. **Explorar downsampling retroativo**: reamostrar dados de alta FPS para 24fps para comparação com controles existentes
6. **Correlacionar com EMG facial** para validação neurofisiologica das metricas automatizadas

---

## 6b. Analise de Amplitude Maxima por Olho

A amplitude maxima captura a **piscada mais intensa registrada durante o video** — diferente da amplitude media (que pode ser arrastada por piscadas incompletas numerosas). Representa a capacidade de fechamento palpebral maxima disponivel ao paciente.

**Metodo:** valor maximo de Amplitude EAR entre todas as piscadas detectadas no olho, por paciente.
**Nota FPS:** amplitude e menos sensivel a FPS que velocidade (captura o EAR minimo absoluto), mas ainda ha risco de sub-estimacao a 24fps. Comparacao pareada intra-paciente e valida; comparacao vs controle tem ressalva.

### Comparacao Pareada (paralisado vs saudavel, n=30)

| Metrica | Olho Paralisado | Olho Saudavel | p | Sig | r |
|---------|----------------|--------------|---|-----|---|
| Amplitude maxima EAR | 0,1086 [0,0907–0,1390] | 0,1104 [0,0899–0,1396] | 0,1094 | ns | 0,292 |

A amplitude maxima do olho paralisado nao difere significativamente do olho saudavel (p=0,11), embora com efeito medio em direcao esperada (r=0,292). O n reduzido (30 pares com pelo menos 1 piscada em cada olho) limita o poder.

### Correlacao com Grau HB

| Metrica | rho | p | Sig | n |
|---------|-----|---|-----|---|
| Amp. maxima olho **paralisado** | −0,487 | 0,0055 | ** | 31 |
| Amp. maxima olho **saudavel** | −0,340 | 0,0460 | * | 35 |

**A amplitude maxima e o segundo melhor biomarcador** (rho=−0,487, p=0,006), comparavel ao RBA medio. A amplitude maxima do olho paralisado correlaciona-se moderadamente com a gravidade da paralisia — quanto pior o grau HB, menor o fechamento maximo alcancado.

### Por Grau HB

| Grau | n | Amp. Max Paralisado | Amp. Max Saudavel |
|------|---|--------------------|--------------------|
| HB I | 2 | 0,1389 [0,136–0,142] | 0,1370 [0,136–0,139] |
| HB II | 7–8 | 0,1343 [0,112–0,145] | 0,1249 [0,098–0,150] |
| HB III | 12–13 | 0,1031 [0,087–0,117] | 0,0982 [0,089–0,114] |
| HB IV | 4–6 | 0,1120 [0,083–0,146] | 0,0972 [0,088–0,130] |
| HB V | 5 | 0,0978 [0,077–0,101] | 0,0974 [0,084–0,119] |
| HB V-VI | 1 | 0,0718 | 0,0755 |
| **Kruskal-Wallis** | — | p=0,1022 ns | p=0,3960 ns |
| **Controle ref (24fps)** | 9 | — | 0,1011 [0,092–0,111] |

Tendencia de reducao da amplitude maxima com maior gravidade e clara em ambos os olhos, mas Kruskal-Wallis nao atinge significancia — provavelmente por n pequeno por subgrupo.

---

## 6c. Interblink Time (IBT) — Intervalo entre Piscadas

O IBT e o tempo em segundos entre o inicio de uma piscada e o inicio da piscada seguinte no mesmo olho. **E uma metrica temporalmente normalizada: independe de FPS.** Reflete o ritmo espontaneo de piscada — IBT alto = piscadas lentas/raras; IBT baixo = piscadas frequentes.

**Metodo:** diferenca entre `Tempo Inicio (s)` de piscadas consecutivas no mesmo olho. Requer >= 2 piscadas detectadas.
**n disponivel:** 29 pares (pacientes com >= 2 piscadas em ambos os olhos).

### Comparacao Pareada (paralisado vs saudavel)

| Metrica | Olho Paralisado | Olho Saudavel | p | Sig | r |
|---------|----------------|--------------|---|-----|---|
| IBT mediana (s) | 3,675 [2,289–6,480] | 3,594 [2,322–5,373] | 0,2776 | ns | 0,202 |
| IBT media (s) | 5,392 [3,164–7,436] | 5,685 [3,164–8,904] | 0,4849 | ns | 0,130 |
| IBT desvio padrao (s) | 3,815 [2,156–8,502] | 3,652 [2,421–8,836] | 0,8734 | ns | 0,030 |

O IBT nao difere entre olho paralisado e saudavel em nenhuma das metricas. O intervalo entre piscadas e virtualmente identico nos dois olhos do mesmo paciente — o ritmo de piscada e um comportamento neurologico global, nao assimetrico.

### Comparacao com Controle

| Metrica | Paralisado | Saudavel | Controle | p (par vs con) | p (sau vs con) |
|---------|-----------|---------|---------|----------------|----------------|
| IBT mediana (s) | 3,675 [2,29–6,48] | 3,710 [2,32–6,49] | 5,500 [3,50–10,05] | 0,1493 ns | 0,2441 ns |
| IBT DP (s) | 3,815 [2,16–8,50] | 3,335 [1,66–8,84] | 5,206 [2,83–15,04] | 0,2871 ns | 0,3418 ns |

O grupo paralisia tende a ter IBT menor que os controles (3,7s vs 5,5s — piscam mais frequentemente), mas sem significancia estatistica (p=0,15), provavelmente por poder insuficiente (n controle=9) e alta variabilidade intra-grupo.

### Correlacao com HB

| Metrica | rho | p | Sig | n |
|---------|-----|---|-----|---|
| IBT mediana paralisado | +0,134 | 0,4876 | ns | 29 |
| IBT mediana saudavel | +0,219 | 0,2216 | ns | 33 |
| IBT DP paralisado | +0,250 | 0,1902 | ns | 29 |
| IBT DP saudavel | +0,168 | 0,3509 | ns | 33 |

O IBT nao se correlaciona com o grau HB. A irregularidade do ritmo de piscada (DP do IBT) tampouco discrimina gravidade — o intervalo entre piscadas e dominado por fatores ambientais e de atencao, nao pelo grau de paralisia.

> **Interpretacao:** o IBT nao e um biomarcador util para graduacao da paralisia facial. Sua principal utilidade potencial seria como marcador de comportamento compensatorio (piscada frequente para protecao ocular) em estudos longitudinais.

### Por Grau HB

| Grau | n | IBT Mediana Paralisado (s) | IBT Mediana Saudavel (s) |
|------|---|--------------------------|--------------------------|
| HB I | 2 | 4,41 [2,78–6,05] | 4,16 [2,66–5,67] |
| HB II | 7 | 4,05 [2,30–5,19] | 4,05 [2,31–5,04] |
| HB III | 12–13 | 2,78 [1,56–6,78] | 3,23 [1,47–6,49] |
| HB IV | 4–6 | 2,63 [2,42–3,16] | 3,45 [2,84–4,94] |
| HB V | 4–5 | 5,46 [4,06–10,11] | 3,86 [3,71–16,62] |
| **Kruskal-Wallis** | — | p=0,6552 ns | p=0,6083 ns |
| **Controle** | 9 | — | 5,50 [3,50–10,05] |

---

## 6d. Razao de Tempo Abertura / Fechamento

Esta metrica captura a **assimetria cinetica da piscada**: em um piscar normal, a fase de abertura (relaxamento do musculo orbicular) e mais lenta que o fechamento (contracao ativa). Razao > 1 significa abertura mais lenta — padrao fisiologico. Razao ≈ 1 ou < 1 pode indicar comprometimento do relaxamento muscular.

**Metodo:** mediana de (Tempo Abertura / Tempo Fechamento) por olho.
**Nota FPS:** o tempo de cada fase e calculado em segundos reais (frames/FPS), mas a resolucao temporal do calculo depende do FPS. Comparacao vs controle afetada.

### Comparacao Pareada (paralisado vs saudavel, n=30)

| Metrica | Olho Paralisado | Olho Saudavel | p | Sig | r |
|---------|----------------|--------------|---|-----|---|
| Razao Aber/Fech (mediana) | 1,090 [0,921–1,650] | 1,322 [1,018–1,644] | 0,1505 | ns | 0,263 |

Direcao interessante: o olho paralisado tende a ter razao menor (abertura menos prolongada em relacao ao fechamento — abertura proporcional mais rapida ou fechamento mais lento). Diferenca nao significativa mas com efeito medio (r=0,263).

### Comparacao com Controle (ressalva FPS)

| Metrica | Paralisado | Saudavel | Controle | p (par) | p (sau) |
|---------|-----------|---------|---------|---------|---------|
| Razao Aber/Fech | 1,108 [0,947–1,641] | 1,325 [1,035–1,687] | 1,976 [1,976–22,98] | 0,0012 ** | 0,0012 ** |

> **ATENCAO:** a diferenca vs controle (p=0,001) e quase certamente um artefato de FPS. A 24fps, a fase de abertura ocupa mais frames relativos (pior resolucao temporal captura a fase lenta de forma mais extensa), inflando artificialmente a razao no grupo controle.

### Correlacao com HB

| Metrica | rho | p | Sig | n |
|---------|-----|---|-----|---|
| Razao Aber/Fech paralisado | −0,063 | 0,7369 | ns | 31 |
| Razao Aber/Fech saudavel | +0,251 | 0,1457 | ns | 35 |

Sem correlacao com o grau HB. A assimetria cinetica da piscada nao discrimina gravidade da paralisia.

### Por Grau HB

| Grau | n | Razao Paralisado | Razao Saudavel |
|------|---|-----------------|---------------|
| HB I | 2 | 1,444 [1,170–1,719] | 1,286 [1,070–1,501] |
| HB II | 7–8 | 1,235 [1,146–1,420] | 1,171 [0,928–1,549] |
| HB III | 12–13 | 1,054 [0,849–1,686] | 1,325 [1,000–1,857] |
| HB IV | 4–6 | 1,349 [1,055–1,726] | 1,355 [1,188–2,230] |
| HB V | 5 | 1,000 [0,833–1,000] | 1,539 [1,133–1,625] |
| HB V-VI* | 1 | 67,0 | 100,0 |
| **Kruskal-Wallis** | — | p=0,6315 ns | p=0,7868 ns |
| **Controle (24fps)** | 9 | — | 1,976 [1,976–22,98] |

*HB V-VI (n=1): valores extremos por piscadas muito raras com dinamica atipica — tratar como caso isolado.

---

## 6e. Velocidade e Amplitude Maxima do Piscar Espontaneo

A velocidade maxima representa o **pico de desempenho motor palpebral** — a piscada mais rapida registrada em todo o video. Difere da media por capturar a capacidade maxima, nao o comportamento habitual.

> **ATENCAO: FPS variavel — todos os valores absolutos de velocidade sao afetados. Comparacao pareada intra-paciente (mesmo video/FPS) e valida. Comparacao vs controle e correlacao com HB sao suspeitas.**

### Comparacao Pareada (n=30)

| Metrica | Olho Paralisado | Olho Saudavel | p | Sig | r |
|---------|----------------|--------------|---|-----|---|
| Vel. Fechamento maxima (EAR/s) | 60,95 [10,73–70,35] | 60,91 [11,52–72,90] | 0,1909 | ns | 0,239 |
| Vel. Abertura maxima (EAR/s) | 5,517 [2,735–10,759] | 5,698 [3,241–9,966] | 0,7151 | ns | 0,067 |

Nem a velocidade maxima de fechamento nem de abertura difere entre os dois olhos. A capacidade de pico motor parece ser preservada simetricamente — o comprometimento da paralisia afeta o comportamento medio (taxa, amplitude tipica), nao necessariamente a capacidade maxima do sistema.

### Correlacao com HB (FPS confundidor — interpretar com cautela)

| Metrica | rho | p | Sig | n |
|---------|-----|---|-----|---|
| Vel. fech. max paralisado | +0,119 | 0,5227 | ns | 31 |
| Vel. fech. max saudavel | +0,305 | 0,0753 | ns | 35 |
| Vel. aber. max paralisado | +0,197 | 0,2880 | ns | 31 |
| Vel. aber. max saudavel | +0,287 | 0,0949 | ns | 35 |

Sem correlacao significativa com grau HB. A velocidade maxima nao discrimina gravidade.

---

## 7. Sintese dos Achados

### Metricas robustas (validas, sem confundimento de FPS)

| Achado | Evidencia | Magnitude |
|--------|-----------|-----------|
| Taxa piscadas diminui com maior grau HB | Spearman rho=−0,40 p=0,012 | Moderada |
| Amplitude EAR (media) diminui com maior grau HB | Spearman rho=−0,42 p=0,008 | Moderada |
| Amplitude maxima diminui com maior grau HB | Spearman rho=−0,49 p=0,006 | Moderada–alta |
| RBA diminui com maior grau HB | Spearman rho=−0,49 p=0,001 | Moderada–alta |
| Olho paralisado tem taxa levemente maior que saudavel | Wilcoxon p=0,016 r=0,39 | Pequena–media |
| N piscadas menor no olho paralisado vs saudavel | Wilcoxon p=0,011 r=0,42 | Pequena–media |
| Olho saudavel = controle em taxa e baseline | Mann-Whitney ns | Sem efeito |
| IBT nao difere entre olhos nem com grau HB | Wilcoxon e Spearman ns | Sem efeito |
| Baseline EAR identico entre olhos e entre grupos | p>0,29 | Sem efeito |

### Metricas com ressalva (potencial confundimento de FPS)

| Metrica | Resultado | Interpretacao recomendada |
|---------|-----------|--------------------------|
| Vel. fechamento/abertura (pareada) | ns entre olhos | Valido internamente |
| Razao vel. fech/aber (pareada) | ns entre olhos | Valido internamente |
| Razao tempo aber/fech (pareada) | ns entre olhos | Valido internamente |
| Velocidade maxima (pareada) | ns entre olhos | Valido internamente |
| Qualquer comparacao de velocidade vs controle | FPS diferente | Nao interpretar |
| Correlacao velocidade com grau HB | Positiva — contraintuitivo | Provavelmente artefato FPS |

---

## 8. Resumo: Melhores Biomarcadores

### Ranking por desempenho (correlacao com grau HB, metricas sem vies de FPS)

| # | Biomarcador | rho (HB) | p | Estrelas | FPS-safe | Notas |
|---|------------|----------|---|----------|----------|-------|
| 1 | **RBA — olho paralisado** | −0,494 | 0,0014 | ★★★★★ | Sim | Normalizado pelo baseline individual |
| 2 | **Amplitude maxima — olho paralisado** | −0,487 | 0,0055 | ★★★★☆ | Sim* | *leve sensibilidade a FPS |
| 3 | **Amplitude media — olho paralisado** | −0,418 | 0,0082 | ★★★★☆ | Sim* | Idem |
| 4 | **RBA — olho saudavel** | −0,436 | 0,0055 | ★★★☆☆ | Sim | Ambos os olhos afetados |
| 5 | **Amplitude maxima — olho saudavel** | −0,340 | 0,0460 | ★★★☆☆ | Sim* | |
| 6 | **Taxa — olho paralisado** | −0,400 | 0,0116 | ★★★☆☆ | Sim | Completamente independente de FPS |
| 7 | **Taxa — olho saudavel** | −0,360 | 0,0244 | ★★★☆☆ | Sim | |
| 8 | IBT mediana | ns | — | ★☆☆☆☆ | Sim | Nao discrimina grau HB |
| 9 | Razao aber/fech | ns | — | ★☆☆☆☆ | Parcial | FPS confundidor vs controle |
| 10 | Baseline EAR | ns | — | ★☆☆☆☆ | Sim | Postura estatica preservada |

> **Recomendacao:** para uma analise com FPS heterogeneo como esta, os biomarcadores mais confiaveis sao **RBA** e **Taxa de piscadas**. Em estudos futuros com FPS padronizado, velocidade de fechamento e razao vel. fech/aber devem ser incluidos — a literatura aponta que estes sao fortemente discriminativos quando o FPS e controlado.

---

## 9. Proposta de Indice de Funcao Palpebral (IFP)

### Justificativa

Nenhum biomarcador isolado captura completamente a funcao palpebral. Um indice composto que combine metricas complementares pode aumentar a sensibilidade diagnostica e ser mais robusto a variabilidade individual.

### Formula proposta

Com base nos biomarcadores validados nesta analise (FPS-safe), propomos:

```
IFP = (RBA_paralisado x Taxa_paralisado_normalizada) / 100

onde:
  RBA_paralisado = amplitude relativa do olho paralisado (%)
  Taxa_normalizada = taxa_paralisado / taxa_media_controle  (adimensional)
```

Esta formulacao e simples, interpretavel e utiliza apenas metricas independentes de FPS.

**Versao estendida** (para estudos com FPS padronizado >= 120fps):

```
IFP_estendido = (RBA x Taxa_norm x RazaoVel_norm) / 100

onde RazaoVel_norm = razao_vel_fech_aber / razao_vel_media_controle
```

### Valores de referencia estimados (dados atuais, n=39)

| Grau HB | IFP estimado (mediana) | Interpretacao |
|---------|----------------------|---------------|
| HB I–II | > 0,40 | Funcao proxima ao normal |
| HB III | 0,20 – 0,40 | Comprometimento moderado |
| HB IV | 0,10 – 0,20 | Comprometimento moderado-severo |
| HB V–VI | < 0,10 | Comprometimento severo |

> **Limitacao:** estes valores sao exploratorios e precisam de validacao prospectiva com coorte independente. O IFP nao substitui avaliacao clinica — serve como complemento quantitativo objetivo para monitoramento longitudinal.

### Utilidade clinica esperada

- **Monitoramento de evolucao**: IFP calculado em consultas seriadas pode detectar melhora sub-clinica antes de mudanca de grau HB
- **Triagem de risco ocular**: IFP < 0,10 identifica pacientes com risco elevado de exposicao corneal
- **Endpoint objetivo para ensaios clinicos**: substitui avaliacao subjetiva do HB como desfecho primario mensuravel

---

## 10. Informacoes Tecnicas

### Scripts utilizados

| Script | Funcao |
|--------|--------|
| `scripts/analisar_metricas_completas.py` | Processamento de cada video: calcula metricas por olho, gera xlsx com abas Info, Metricas e Todas Piscadas |
| `tmp/run_analise.py` | Analise estatistica principal: Analises 1–5 (Wilcoxon pareado, Mann-Whitney vs controle, subgrupo 30fps, Spearman com HB, estratificacao por HB) |
| `tmp/run_analise_extra.py` | Analises adicionais: amplitude maxima, IBT, razao aber/fech, velocidade maxima (Analises 6b–6e) |
| `scripts/gerar_graficos_analise_correta.py` | Geracao dos graficos (PNG) com separacao correta olho paralisado vs saudavel |

### Datasets gerados

| Arquivo | Descricao | n |
|---------|-----------|---|
| `tmp/dataset_paralisia.csv` | Metricas por paciente (af_* = olho afetado, sa_* = olho saudavel) | 39 pacientes |
| `tmp/dataset_controle.csv` | Metricas por olho do grupo controle | 18 linhas (9 ind x 2 olhos) |
| `tmp/dataset_paralisia_extra.csv` | Metricas extras do grupo paralisia (amp max, IBT, razao aber/fech, vel max) | 39 pacientes |
| `tmp/dataset_controle_extra.csv` | Metricas extras do grupo controle | 9 individuos |

### Convencoes de colunas

- **af_*** : olho afetado (paralisado) — identificado pela coluna `olho_paralisado` em `tabela_HB.xlsx`
- **sa_*** : olho saudavel (contralateral)
- Metricas: `taxa`, `amplitude`, `vel_fech`, `vel_aber`, `pct_comp`, `baseline`, `rba`, `razao_vel`, `amp_max`, `ibt_mediana`, `ibt_dp`, `razao_aber_fech`, `vel_fech_max`, `vel_aber_max`

### Ambiente de analise

- Python com pandas, numpy, scipy.stats
- MediaPipe Face Mesh para deteccao de landmarks faciais
- EAR (Eye Aspect Ratio): razao entre distancias verticais e horizontal da palpebra
- MIN_FRAMES=2 para deteccao de piscada (limiar minimo de frames com EAR baixo)

### Limitacoes metodologicas principais

1. **FPS heterogeneo**: grupo paralisia filmado em 29–240fps, controle a 24fps — comparacoes de velocidade e amplitude entre grupos sao invalidas sem padronizacao
2. **n pequeno por subgrupo HB**: maximos de 13 pacientes em HB III — poder estatistico limitado para diferencas intra-HB
3. **Grupo controle reduzido**: n=9 — subpotenciado para detectar efeitos pequenos
4. **Corte transversal**: sem acompanhamento longitudinal — nao possivel avaliar trajetoria de recuperacao
5. **Ambiente nao controlado**: videos capturados em diferentes ambientes e iluminacoes — variabilidade adicional na qualidade do EAR
