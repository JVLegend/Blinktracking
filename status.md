# Status do Projeto

## Últimas Atualizações
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

## Próximos Passos
- Melhorar a visualização dos gráficos
- Implementar novas funcionalidades de análise
- Adicionar mais opções de customização
- Ajustar os parâmetros de detecção de piscadas
- Adicionar exportação das métricas em formato CSV

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