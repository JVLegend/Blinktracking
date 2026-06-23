# Status do Projeto

## Últimas Atualizações
- **[21/06/2026]** Hardening técnico pós-revisão crítica, executado com subagents paralelos.
  - Frente API/segurança:
    - Removido CORS global aberto com credenciais em `next.config.js`.
    - Substituído `fetch(videoUrl)` direto por validação SSRF-safe em `lib/server/remote-video.ts`: exige HTTPS, hostname allowlisted, sem credenciais na URL, sem redirects, valida `content-type`, `content-length` e limite durante streaming.
    - Adicionada validação de parâmetros em `lib/server/api-validation.ts`: allowlist de métodos, sanitização de filename e validação de frame.
    - `/api/generate-video`, `/api/extract-points` e `/api/extract-frame` deixam de expor erros brutos do backend e passam a validar `videoUrl`, `videoFilename`, `method` e/ou `frame`.
    - `/api/process-video` deixou de chamar script inexistente (`process_video_dlib.py`) e agora retorna `501` explícito até haver implementação segura.
    - `/api/upload` deixou de retornar sucesso fake com `url: "#"`.
    - Upload local unificado em `lib/server/local-upload.ts`: grava incrementalmente, limita vídeo a 100 MB e CSV a 25 MB, usa UUID em vez do filename do usuário e lista arquivos reais via `/api/files`.
  - Frente build/frontend:
    - Removidos `ignoreDuringBuilds` e `ignoreBuildErrors`; build volta a falhar em erro real de lint/TypeScript.
    - Adicionado `eslint-config-next`.
    - Corrigidos erros TypeScript em `app/alinhamento/page.tsx`, `app/components/main-nav.tsx`, `app/components/plotly/PlotlyComponent.tsx`, `app/analise/coordenadas/page-redesign.tsx`, `app/analise/estabilidade/page.tsx` e tipos locais de Plotly.
    - Corrigidos bloqueios de lint em `app/documentacao/paper/page.tsx` e `app/visao-projeto/page.tsx`.
  - Frente Python/core:
    - `Config.from_yaml/from_json` agora hidrata dataclasses aninhadas corretamente.
    - `BlinkTracker` não divide por zero quando OpenCV retorna `total_frames=0`.
    - `BatchProcessor` usa checkpoint com lock e escrita atômica, e evita colisão de saída por `stem` em processamento recursivo.
    - `RotationNormalizer` agora faz alinhamento 2D por escala/rotação/translação, com fallback por carúncula.
    - `scripts/gerar_tudo.py` removeu `shell=True`.
    - Adicionados testes focados para os novos comportamentos.
  - Validação executada:
    - `npm run lint`: passou, com avisos não bloqueantes já conhecidos.
    - `npx tsc --noEmit --pretty false`: passou.
    - `npm run build`: passou com lint/typecheck ativos.
    - `pytest -q tests/test_core_modules.py tests/test_blinktracking.py`: 23 passed, 1 skipped; ainda há warnings antigos de testes que retornam `True`.
  - Pendências deliberadas:
    - Autenticação real ainda não está implementada: login/Google/registro continuam sem provedor/sessão. Antes de expor dados de pacientes, definir provedor e proteger upload/listagem/processamento por sessão ou token.
    - Armazenamento local em `public/uploads` foi endurecido, mas a decisão correta para produção é migrar para Blob/object storage privado com URLs assinadas.
    - `npm audit --omit=dev` ainda deve ser tratado em rodada própria, especialmente `next`, `xlsx`, `@vercel/blob/undici`.
    - Faltam testes de API para auth negativa, CORS, SSRF, upload inválido, limite de tamanho e parsing de arquivos.
- **[18/06/2026]** Calibração clínica com anotação manual em vídeos reais do Drive.
  - Corrigida a métrica `combined`: piscadas bilaterais sincronizadas contam como **um evento clínico**, mantendo `raw_eye_blinks` para auditoria.
  - Adicionada classificação de lateralidade para eventos bilaterais: `bilateral_symmetric`, `left_dominant`, `right_dominant`.
  - Passada relaxada de recuperação dos vídeos zerados agora registra candidatos dominantes à esquerda/direita, sempre como **candidatos para revisão manual**, não como desfecho primário.
  - Paciente 7 / `IMG_3616`: 3 eventos detectados; revisão manual indica fechamento dominante do olho esquerdo.
  - Paciente 16 / `IMG_4220`: detector principal zerou, mas a passada relaxada encontrou 2 candidatos; revisão manual indica olho direito completo e esquerdo parcial.
  - Relatório consolidado do Drive atualizado: 71 vídeos, 1.273 piscadas clínicas, 2.397 eventos crus por olho, 1.124 bilaterais sincronizadas.
  - Lateralidade dos eventos confirmados após margem de 2,0%: 829 bilaterais simétricos, 259 dominantes à esquerda e 36 dominantes à direita.
  - Recuperação dos 20 vídeos com 0 piscadas: 375 candidatos relaxados em 18 vídeos, incluindo 123 candidatos dominantes à esquerda e 148 à direita.
  - Próximos vídeos separados para anotação manual: Paciente 30 / `IMG_6086` (10,65 s, baixo não-zero) e Paciente 15 / `IMG_3976` (7,09 s, zero com candidatos).
- **[19/06/2026]** Nova rodada de calibração manual com Paciente 30 e Paciente 15.
  - Paciente 30 / `IMG_6086`: revisão manual marcou eventos em 00:01, 00:04 e 00:06, todos com dominância clínica do olho direito. O detector principal captou 00:01 e 00:06, mas perdeu o vale técnico de 00:04.
  - Paciente 15 / `IMG_3976`: revisão manual marcou evento em 00:07 com olho direito predominante; a passada relaxada já havia encontrado candidato direito em 6,614-6,693 s.
  - Mantido o desfecho principal conservador; criada uma camada separada de candidatos clínicos para revisão em todos os vídeos.
  - Margem de dominância lateral dos eventos confirmados ajustada de 3,0% para 2,0%.
- **[19/06/2026]** Calibração do Paciente 3 / `IMG_2680`.
  - Revisão manual: olho direito fechado durante o vídeo, com piscadas incompletas bilaterais em 00:04 e 00:09.
  - A passada relaxada já captava 00:04 em 4,401-4,568 s; 00:09 exigia fallback mais sensível.
  - O fallback relaxado dos vídeos zerados foi ajustado para ser aditivo e usar `0.88`, preservando piscadas incompletas sutis como candidatos de revisão.
  - Após o ajuste, o Paciente 3 apresenta candidatos em 4,401 s e 8,765 s, alinhados aos tempos manuais.
- **[19/06/2026]** Validação do Paciente 10 / `IMG_3745`.
  - Revisão manual: piscadas bilaterais em 00:03, 00:11 e 00:13; após 00:17 a câmera sacode e sai do lugar.
  - Camada sensível: candidatos em 2,704 s, 11,183 s e 13,261 s; o detector principal confirmou apenas o evento de 00:11.
  - O limiar atual para vídeos não-zero (`0.78`) preserva os três tempos manuais sem criar candidato no trecho instável após 00:17.
- **[04/05/2026]** OTIMIZAÇÃO MAJOR: Scripts Python otimizados com ganhos de 10-50x performance
  - Vetorização completa do cálculo de EAR (numpy arrays 2D)
  - Detecção de piscadas com operações vetorizadas (np.diff)
  - Sincronização binocular O(n log n) com busca binária
  - Processamento em lote paralelo com ProcessPoolExecutor
  - 11 novas métricas clínicas avançadas
  - Documentação completa em `docs/OTIMIZACOES_PERFORMANCE.md` e `docs/NOVAS_METRICAS.md`
- **[15/12/2025]** Criada nova página de "Análise Fina" (*Clinical Suite*) com design responsivo, tema médico (azul/teal) e visualização de alta performance.
- **[15/12/2025]** Implementado suporte total para CSVs *"Full Mesh"* (478 pontos) na visualização, com destaque colorimétrico (Íris Cyan, Contorno Vermelho).
- **[15/12/2025]** Criados scripts Python de automação em lote (`gerar_tudo.py`, `analisar_pasta_piscadas.py`) para processar pastas inteiras de vídeos.
- **[15/12/2025]** Adicionada documentação técnica detalhada sobre a fórmula EAR (`docs/EAR_Formula_Explained.md`).
- **[15/12/2025]** Implementado cálculo de métricas de abertura em tempo real e responsivo ao tipo de CSV carregado (Eyes Only vs Full Mesh).
- Corrigido o processamento de vídeos na página de extração de pontos
- Atualizado o script dlib para usar o modelo baixado corretamente
- Melhorado o script MediaPipe para processar vídeos em tempo real
- Corrigido o formato dos dados retornados pelos scripts Python
- Atualizada a API para lidar corretamente com upload de vídeos
- Adicionado tratamento de erros mais robusto no processamento de vídeos
- Adaptada a página de análise de coordenadas para suportar dados do MediaPipe
- Atualizada a página de geração de vídeo para incluir botões para dlib e MediaPipe
- Adicionado diálogo informativo na página de geração de vídeo
- Melhorada a visualização dos logs durante o processamento
- Modificado o formato do CSV do MediaPipe para ter colunas individuais para cada coordenada
- Atualizada a visualização da tabela para mostrar coordenadas em colunas separadas
- Melhorada a organização dos dados para facilitar análise posterior
- Corrigido o formato do CSV gerado pelo método dlib para usar a nomenclatura correta dos pontos
- Melhorada a lógica de geração de CSV para diferenciar corretamente entre dlib e MediaPipe
- Corrigido o botão de download do CSV após processamento com dlib
- Adicionadas mensagens de feedback para o download do CSV
- Melhorado o tratamento de erros durante a geração do CSV
- Restaurado o layout de dashboard na página inicial
- Adicionados cards informativos para todas as funcionalidades
- Corrigido erro de build na página de estatísticas (tipos do Plotly)
- Corrigidos erros de tipo nos gráficos da página de estatísticas
- Ajustado o layout dos gráficos para melhor responsividade
- Removida a regra de processamento de frames alternados para processar todos os frames
- Unificado o conteúdo da página de doutorado com a página de visão do projeto
- Adicionada página de análise estatística das piscadas
- Corrigido o download do CSV para incluir todos os pontos extraídos
- Ajustado o componente React para armazenar e exibir todos os pontos
- Atualizado o script Python para enviar dados completos
- Corrigido o processamento de vídeo para mostrar os pontos em tempo real
- Melhorado o feedback visual durante a extração de pontos
- Adicionada página de documentação do artigo "What is a blink?"
- Retorno à versão anterior do projeto (commit f6585c7)
- Branch main foi redefinida para esta versão
- Alterações mais recentes foram descartadas
- Repositório remoto atualizado para refletir estas mudanças
- Build do projeto concluído com sucesso
- Corrigidos erros de tipo no componente DataUpload
- Atualizado o layout da página inicial para usar Bento Grid com animações e melhor organização
- Adicionados cards interativos com descrições detalhadas das funcionalidades
- Adicionada opção para selecionar quais pontos exibir (dlib/MediaPipe) na página de visualização de frames
- Instalado componente Checkbox do Radix UI para melhor interatividade
- Corrigida a exibição dos checkboxes na página de visualização de frames
- Melhorada a organização dos controles de upload e seleção de pontos
- Corrigidos erros de tipo relacionados ao vídeo e referências
- Corrigida a exibição dos pontos do MediaPipe na página de análise de coordenadas
- Ajustada a detecção de piscadas para dados do MediaPipe na página de estatísticas
- Melhorado o cálculo de distância entre pontos para ambos os métodos (dlib e MediaPipe)
- Corrigidos erros de tipo em várias partes do código
- Removida a página de análise de piscadas para simplificar a interface
- Atualizada a documentação na página de estatísticas com fórmulas detalhadas das métricas
- Atualizada a página de documentação do artigo com todas as fórmulas e métricas relevantes
- Melhorada a organização e apresentação das fórmulas matemáticas
- Adicionadas novas métricas na página de estatísticas (intervalos entre piscadas, análise por período)
- Reorganizado o layout da página de estatísticas para melhor visualização
- Melhorada a documentação das métricas com novas fórmulas e explicações
- Adicionadas métricas de fissura (vertical, horizontal, DMR1, DMR2) na página de estatísticas
- Adicionadas medidas detalhadas do primeiro piscar completo e incompleto
- Melhorada a organização das métricas com novas seções e cards
- Reorganizado o layout da página de estatísticas usando um sistema de abas para melhor visualização
- Criadas abas separadas para Métricas Gerais, Análise Temporal, Medidas de Fissura e Primeiras Piscadas
- Melhorada a organização visual dos cards e gráficos em cada seção
- Atualizada a documentação da página de estatísticas com explicações detalhadas para cada seção
- Reorganizada a documentação para acompanhar a estrutura de abas (Métricas Gerais, Análise Temporal, etc.)
- Adicionadas explicações mais detalhadas sobre os métodos de detecção de piscadas
- Melhorada a apresentação visual da documentação com seções e subseções
- Adicionada nova aba "Detalhes das Piscadas" com tabela detalhada de cada piscada
- Implementada funcionalidade de exportação dos detalhes das piscadas em CSV
- Incluídas informações de frames, timestamps e intervalos entre piscadas
- Removidos os labels numéricos dos pontos faciais nos vídeos gerados, mantendo apenas os pontos
- **[09/12/2025]** Implementada detecção automática de FPS ao fazer upload de CSV (suporta 24, 30, 60, 120 FPS)
- **[09/12/2025]** Adaptados todos os cálculos estatísticos para usar FPS detectado dinamicamente
- **[09/12/2025]** Adicionada métrica de velocidade média de piscadas incompletas
- **[09/12/2025]** Adicionada descrição "% de fechamento" ao lado do indicador RBA
- **[09/12/2025]** Renomeado "Intervalo Médio" para "Intervalos entre Piscadas"
- **[09/12/2025]** Renomeada aba "Medidas de Fissura" para "Fenda"
- **[09/12/2025]** Adicionada métrica "Média das Amplitudes Máximas" na aba Fenda
- **[09/12/2025]** Removidos indicadores DMR1 e DMR2 da página de estatísticas
- **[09/12/2025]** Removido gráfico de velocidade ao longo do tempo da aba Análise Temporal
- **[09/12/2025]** CDP agora adapta automaticamente os segundos conforme FPS detectado

## Próximos Passos
- [ ] Otimizar extração de vídeo (`extract_points_to_csv.py`):
  - Processar frames em batch (não um por um)
  - Usar GPU (CUDA) se disponível
  - Reduzir resolução antes do MediaPipe
- [ ] Adicionar cache para evitar reprocessamento:
  - Hash do arquivo + parâmetros como chave
  - Verificar antes de processar
- [ ] Atualizar gráficos comparativos (`gerar_graficos_comparativos.py`):
  - Incluir novas métricas (IBI, bursts, fadiga, score saúde)
  - Novos gráficos: timeline de IBI, mapa de calor de bursts
- [ ] Testar com vídeos reais de pacientes
- [ ] Melhorar a visualização dos gráficos
- [ ] Implementar novas funcionalidades de análise
- [ ] Adicionar mais opções de customização
- [ ] Ajustar os parâmetros de detecção de piscadas
- [ ] Adicionar exportação das métricas em formato CSV

## Dependências Instaladas
- Next.js 14.2.23
- React e React DOM 18.2.0
- Plotly.js e React-Plotly.js para visualizações
- Tailwind CSS para estilização
- shadcn/ui para componentes de interface

## Problemas Conhecidos
- Necessidade de ajustes na interface do usuário
- Possíveis melhorias na performance dos gráficos
- Parâmetros de detecção de piscadas precisam ser calibrados

## Funcionalidades Implementadas

### Otimizações de Performance (04/05/2026)
- [x] Cálculo de EAR vetorizado (numpy) - 50x mais rápido
- [x] Detecção de piscadas com np.diff - 13x mais rápido
- [x] Sincronização binocular O(n log n) - 25x mais rápido
- [x] Processamento em lote paralelo (multiprocessing)
- [x] Script de benchmark (`benchmark_landmark_models.py`)

### Novas Métricas Clínicas (04/05/2026)
- [x] Inter-Blink Interval (IBI) com estatísticas completas
- [x] Burst Detection (clusters de piscadas)
- [x] Assimetria Bilateral (amplitude, velocidade, duração)
- [x] Índice de Fadiga (0-100)
- [x] Percentis de Velocidade (P10, P50, P90)
- [x] Latência Pós-Piscada (ms)
- [x] Score de Saúde Ocular (0-100)

### Página de Alinhamento
- [x] Criação da página de alinhamento usando Next.js e TypeScript
- [x] Integração com MediaPipe Face Mesh
- [x] Detecção de piscadas para cada olho
- [x] Área de alinhamento central com feedback visual
- [x] Mensagens de orientação para ajuste da posição
- [x] Contadores de piscadas
- [x] Botão de retorno à página principal
- [x] Estilização com Tailwind CSS

### Melhorias Técnicas
- [x] Carregamento dinâmico dos scripts do MediaPipe
- [x] Gerenciamento de estado com React Hooks
- [x] Limpeza adequada dos recursos da webcam
- [x] Tipagem TypeScript para melhor segurança
- [x] Componentes React otimizados

### Próximos Passos
- [ ] Adicionar testes unitários
- [ ] Implementar persistência dos dados de alinhamento
- [ ] Melhorar feedback visual para diferentes distâncias
- [ ] Adicionar suporte a diferentes resoluções de tela
- [ ] Implementar sistema de calibração personalizado

## Notas de Desenvolvimento
- A página de alinhamento foi criada como uma ferramenta de calibração para melhorar a precisão do rastreamento ocular
- Utiliza as mesmas bibliotecas do MediaPipe para manter consistência
- Interface adaptada para o design system do projeto
- Implementação focada em usabilidade e feedback claro ao usuário

## Atualizações Recentes
- Adicionada página de alinhamento para calibração do usuário
- Implementado sistema de feedback visual para posicionamento
- Integrado com o sistema de navegação do Next.js
- Adicionado suporte a TypeScript para melhor manutenção
- [Em andamento] Otimização da página de análise de coordenadas: será implementado downsampling dos dados e seleção de pontos para o usuário para evitar travamentos e melhorar a performance dos gráficos. Troca de biblioteca gráfica será considerada se necessário.
