# TODO List

## Atas de Reunião

### Ata da Reunião - 4 de agosto de 2025
**Local:** Biblioteca do IC

**Principais Discussões:**
- Foi analisada a instabilidade do gráfico XY gerado pelo movimento da cabeça.
- Proposta para reduzir a variabilidade: subtrair a variação da carúncula dentre todos os pontos.
- Identificou-se jitter/tremer no movimento do piscar; sugeriu-se pesquisar sobre EEG e como outras áreas lidaram com esse problema.
- Todos os vídeos da Dra. Maria Antonieta já foram processados e estão disponíveis no Google Drive.
- Os demais vídeos precisamos conferir com Dra Larissa para o upload nas pastas correspondentes.
- Necessidade de elencar artigos científicos para levantamento bibliográfico.
- Importância de realizar um double check no cálculo da distância entre os pontos considerando a variação da distância da câmera.

---

## Tarefas Definidas na Reunião (4/08/2025)

- [ ] Implementar opção na tela para o usuário escolher o percentual do limiar que define piscada completa e incompleta.
- [ ] Testar a subtração do delta da carúncula de cada ponto e apresentar os gráficos resultantes.
- [ ] Pesquisar, com auxílio do GPT, revisão bibliográfica sobre o tremor/jitter no piscar.
- [ ] Realizar double check sobre o impacto da distância da câmera nas medições.
- [x] Ao realizar upload, calcular a quantidade de frames e duração em segundos para identificar FPS (24, 30 ou mais). ✅ Implementado em 09/12/2025
- [x] Adaptar todos os cálculos estatísticos das piscadas conforme o FPS identificado. ✅ Implementado em 09/12/2025
- [x] Ajustar os cálculos para os padrões de FPS: 24, 30, 60 e 120. ✅ Implementado em 09/12/2025
- [x] Implementar cálculo da velocidade média das piscadas incompletas. ✅ Implementado em 09/12/2025
- [x] Na página de estatísticas, adicionar ao lado de RBA (média do percentual de fechamento). ✅ Implementado em 09/12/2025
- [ ] Ensinar à IA que, se o vídeo tiver mais de 2 minutos, considerar apenas os últimos 120 segundos; colocar essa regra na página de explicação. Reavaliar essa regra em conjunto posteriormente.
- [ ] Na aba "Análise Temporal" da página de estatísticas, ajustar a fórmula do intervalo de tempo considerando que os primeiros 60 segundos são cortados.
- [x] Alterar o texto "Intervalo Médio:" para "Intervalos entre piscadas". ✅ Implementado em 09/12/2025
- [x] Na aba de medidas de fissura, alterar o termo para "fenda". ✅ Implementado em 09/12/2025
- [x] Na aba "Fenda", calcular as médias das amplitudes máximas. ✅ Implementado em 09/12/2025
- [x] Remover os indicadores DMR1 e DMR2. ✅ Implementado em 09/12/2025
- [x] Adaptar o CDP para ajustar os segundos conforme a quantidade de frames. ✅ Implementado em 09/12/2025 (usa FPS detectado)

---

## Funcionalidades Gerais

Aqui estão as próximas funcionalidades, sugeridas pelo sonnet, a serem implementadas no aplicativo:

- [ ] Melhorar a interface de upload de dados
- [ ] Implementar autenticação de usuários
- [ ] Adicionar testes automatizados para componentes principais
- [ ] Otimizar o processamento de vídeos
- [ ] Permitir exportação de resultados em diferentes formatos
- [ ] Criar documentação detalhada para desenvolvedores
- [ ] Adicionar suporte multilíngue
- [ ] Melhorar feedback de erros para o usuário
- [ ] Refatorar código para melhor organização

---

## Itens Anteriormente Combinados (JV e Larissa)

- [x] Ao realizar um upload é preciso calcular a quantidade de frames e os segundos para contar se o vídeo é 24fps ou 30fps ou mais. ✅ Implementado em 09/12/2025
- [x] Todas as contas das estatísticas das piscadas precisam ser adaptadas para este valor encontrado acima. ✅ Implementado em 09/12/2025
- [x] Adaptar as contas para os padrões de FPS: 24, 30, 60, 120. ✅ Implementado em 09/12/2025
- [x] Implementar a velocidade média de piscadas incompletas. ✅ Implementado em 09/12/2025
- [x] Na página estatísticas, colocar ao lado de RBA (média de percentual de fechamento). ✅ Implementado em 09/12/2025
- [ ] Ensinar para a IA que se o vídeo possuir mais de 2 min considerar os 120s finais. E colocar isso na página de explicação
- [ ] Na página estatísticas, na aba análise temporal, no intervalo de tempo, dado que os 60 primeiros segundos são cortados, alterar a fórmula
- [x] Trocar "Intervalo Médio:" por "intervalos entre piscadas". ✅ Implementado em 09/12/2025
- [x] Remover o gráfico da velocidade. ✅ Implementado em 09/12/2025
- [x] Na aba medidas de fissura, trocar para "fenda". ✅ Implementado em 09/12/2025
- [x] Na aba da fenda, calcular as médias das amplitudes máximas. ✅ Implementado em 09/12/2025
- [x] Remover DMR1 e DMR2. ✅ Implementado em 09/12/2025
- [x] CDP tem que adaptar os segundos para a quantidade de frames. ✅ Implementado em 09/12/2025

---

## Resumo das Implementações - 09/12/2025

### Detecção Automática de FPS
- Sistema detecta automaticamente o FPS do vídeo ao fazer upload do CSV (24, 30, 60 ou 120 FPS)
- Heurística baseada em análise de frames consecutivos e densidade de frames por minuto
- Toast notification informa o FPS detectado ao usuário

### Adaptação de Cálculos Estatísticos
- Todas as conversões de frames para segundos agora usam o FPS detectado
- Funções `calculateMetrics`, `generateBlinkDetails` e `calculateVelocity` recebem FPS como parâmetro
- Cálculos de tempo (duração, intervalos, ECP, CDP, EOP, IBL) adaptados dinamicamente

### Novas Métricas
- **Velocidade Média de Piscadas Incompletas**: Calcula separadamente a velocidade média apenas das piscadas incompletas
- **Média das Amplitudes Máximas**: Nova métrica na aba Fenda que calcula a média de todas as amplitudes máximas detectadas

### Melhorias na Interface
- Card "Velocidade e Amplitude" expandido para 5 colunas (incluindo velocidade de incompletas)
- RBA agora mostra "% de fechamento" como descrição
- "Intervalo Médio" renomeado para "Intervalos entre Piscadas"
- Aba "Medidas de Fissura" renomeada para "Fenda"
- Removidos indicadores DMR1 e DMR2 (obsoletos)
- Removido gráfico de velocidade ao longo do tempo (simplificação)

### Arquivos Modificados
- `app/analise/estatisticas/page.tsx` - Principal arquivo modificado com todas as melhorias
- `TODO.md` - Atualizado com status das tarefas concluídas

Sinta-se livre para adicionar novas tarefas ou marcar as concluídas! 