# BlinkTracking - Sistema de Análise de Piscadas

Sistema web avançado para análise e visualização de dados de piscadas oculares detectadas através de vídeos, desenvolvido para pesquisa oftalmológica.

## 📚 Documentação

- [📋 Lista de Tarefas (TODO)](docs/TODO.md)
- [📊 Status do Projeto](docs/status.md)
- [🔧 Documentação Técnica](.claude.md)
- [🗺️ Mapeamento de Pontos MediaPipe](public/docs/MEDIAPIPE_POINTS_MAPPING.md)

## 📁 Estrutura do Projeto

```
Blinktracking/
├── app/                          # Aplicação Next.js (App Router)
│   ├── analise/                 # Páginas de análise
│   │   ├── coordenadas/         # Visualização frame-by-frame
│   │   └── estatisticas/        # Estatísticas e métricas
│   ├── components/              # Componentes React compartilhados
│   └── api/                     # Rotas de API
├── scripts/                      # Scripts Python para processamento
│   ├── process_video_mediapipe.py
│   ├── extract_points_to_csv.py
│   └── generate_diagram_pil.py
├── public/                       # Arquivos estáticos
│   └── docs/                    # Documentação pública
├── docs/                        # Documentação do projeto
│   ├── status.md
│   └── TODO.md
└── requirements.txt             # Requisitos Python
```

## Requisitos

### Frontend (Next.js)
- Node.js 18+
- npm ou yarn
- Bibliotecas principais:
  - Next.js 14
  - React 18
  - Plotly.js
  - Tailwind CSS

### Backend (Python)
Para o processamento de vídeos e extração de dados, as seguintes bibliotecas Python são necessárias:

[Ver lista completa de requisitos Python](requirements.txt)

Principais bibliotecas:
- OpenCV
- MediaPipe
- NumPy
- Pandas
- Matplotlib

## Instalação

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/doutorado_blink.git
cd doutorado_blink
```

2. Instale as dependências do frontend
```bash
npm install
# ou
yarn install
```

3. Instale as dependências Python
```bash
pip install -r requirements.txt
```

## Uso

1. Inicie o servidor de desenvolvimento
```bash
npm run dev
# ou
yarn dev
```

2. Acesse `http://localhost:3000` no navegador

## ✨ Funcionalidades Principais

### 🎯 Análise de Coordenadas
- Upload de arquivos CSV com dados de coordenadas faciais
- Visualização frame-by-frame com player interativo
- Modo "Global" vs "Focado" (zoom com amplificação de fechamento 4.0x)
- Contornos dos olhos desenhados em tempo real
- Métricas de abertura dos olhos em pixels
- Tabela de coordenadas do frame atual

### 📊 Análise Estatística de Piscadas
- **Detecção Automática de FPS** (24, 30, 60, 120 FPS)
- Cálculos adaptativos baseados em FPS detectado
- 5 Abas de análise:
  1. **Métricas Gerais**: Contagem, distribuição, velocidade
  2. **Análise Temporal**: Intervalos e taxa por minuto
  3. **Fenda**: Medidas verticais/horizontais e amplitudes
  4. **Primeiras Piscadas**: ECP, CDP, EOP, IBL
  5. **Detalhes**: Tabela completa com export CSV

### 🆕 Novas Métricas (09/12/2025)
- **Velocidade Média de Piscadas Incompletas**
- **Média das Amplitudes Máximas**
- **RBA com descrição**: "% de fechamento"
- Cálculos dinâmicos por FPS

## Documentação de Pontos Faciais

O projeto utiliza dois métodos de extração de pontos faciais:

### MediaPipe Face Mesh
- **Pontos de Extração (CSV):** Pontos específicos das pálpebras superior e inferior de ambos os olhos
  - Olho Direito: 7 pontos superiores + 9 pontos inferiores
  - Olho Esquerdo: 7 pontos superiores + 9 pontos inferiores
  - [Ver mapeamento completo](public/docs/MEDIAPIPE_POINTS_MAPPING.md)

- **Pontos de Visualização (Vídeo):** Pontos adicionais incluindo íris e contorno completo
  - Usados apenas para renderização do vídeo processado

### Dlib (68 pontos faciais)
- Método tradicional com 68 pontos faciais
- Pontos 36-47: Olhos

### Gerar Diagrama dos Pontos

Para visualizar os pontos extraídos do MediaPipe:

```bash
python scripts/generate_diagram_pil.py
# ou
generate_diagram.bat
```

O diagrama será salvo em: `public/docs/mediapipe-csv-points-diagram.png`

## Contribuição

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Extração de Pontos Faciais

### Resumo dos Scripts Disponíveis

| Script | Saída | Pontos | Tamanho | Uso Recomendado |
|--------|-------|--------|---------|-----------------|
| `extract_points_to_csv.py` | 📊 **CSV** | 32 (olhos) | ~70 MB | ✅ Análise de piscadas |
| `extract_all_points_to_csv.py` | 📊 **CSV** | 478 (face completa) | ~1 GB | Análise facial completa |
| `process_video_mediapipe.py` | 🎥 **MP4** | Visualização | Igual ao original | Vídeo com pontos desenhados |

---

### 1. Pontos dos Olhos - CSV (Recomendado para Piscadas)

Extrai apenas os pontos do contorno dos olhos (32 pontos totais):
- Olho Direito: 7 pontos superiores + 9 pontos inferiores
- Olho Esquerdo: 7 pontos superiores + 9 pontos inferiores

```bash
# Uso básico (CSV salvo no mesmo diretório do vídeo)
python scripts/extract_points_to_csv.py caminho/video.mp4

# Especificar caminho do CSV de saída
python scripts/extract_points_to_csv.py caminho/video.mp4 saida/dados.csv
```

**Características:**
- ✅ Arquivo CSV compacto e rápido (~70 MB para vídeo de 3 min)
- ✅ Ideal para análise de piscadas
- ✅ Barra de progresso no terminal
- ✅ Estatísticas de detecção
- ✅ Usa índices oficiais do MediaPipe (rightEyeUpper0/Lower0)

**Exemplo de saída:**
```
📹 Vídeo: video.mp4
📊 Total de frames: 1500
⏱️  FPS: 30.00
💾 Salvando em: video.csv

🔍 Processando |████████████████████| 1500/1500 [00:45<00:00, 33.2frame/s]

✅ Processamento concluído!
📊 Frames processados: 1500
👤 Frames com face detectada: 1487 (99.1%)
💾 CSV salvo em: video.csv
```

---

### 2. Todos os Pontos Faciais - CSV (Análise Completa)

Extrai TODOS os 478 pontos do MediaPipe Face Mesh (incluindo íris):

```bash
# Uso básico
python scripts/extract_all_points_to_csv.py caminho/video.mp4

# Especificar caminho de saída
python scripts/extract_all_points_to_csv.py caminho/video.mp4 saida/completo.csv
```

**Características:**
- ✅ 478 pontos faciais completos (x, y, z)
- ✅ Inclui: olhos, íris, boca, nariz, contorno facial, sobrancelhas
- ✅ Coordenadas 3D (x, y, z)
- ✅ Útil para análise facial completa

**⚠️ Atenção:** Gera arquivos CSV grandes (~1 GB para vídeo de 3 min)

**Exemplo de saída:**
```
📹 Vídeo: video.mp4
📊 Resolução: 1920x1080
📊 Total de frames: 1500
⏱️  FPS: 30.00
💾 Salvando em: video_all_points.csv
🎯 Extraindo TODOS os 478 pontos do MediaPipe Face Mesh

🔍 Processando |████████████████████| 1500/1500 [01:20<00:00, 18.7frame/s]

✅ Processamento concluído!
📊 Frames processados: 1500
👤 Frames com face detectada: 1487 (99.1%)
💾 CSV salvo em: video_all_points.csv
📦 Tamanho do arquivo: 245.67 MB
🎯 Total de pontos por frame: 478 (x, y, z)
```

---

### 3. Vídeo com Pontos Desenhados - MP4

Gera um vídeo com os pontos faciais desenhados sobre o vídeo original:

```bash
python scripts/process_video_mediapipe.py caminho/video.mp4 pasta_saida/
```

**Características:**
- ✅ Vídeo MP4 com pontos desenhados
- ✅ Útil para visualização e validação
- ✅ Mostra todos os pontos do MediaPipe em tempo real
- ❌ **NÃO gera CSV** (apenas vídeo)

---

### 4. Processamento em Lote

Para processar múltiplos vídeos de uma vez, use os scripts batch:

#### Extrair pontos dos olhos (lote)
```bash
.\extract_all_points.bat
```
- Processa todos os `.MOV` da pasta configurada
- Gera arquivos CSV com pontos dos olhos

#### Gerar vídeos com pontos desenhados (lote)
```bash
.\process_all_videos.bat
```
- Processa todos os `.MOV` da pasta configurada
- Gera vídeos MP4 com os pontos desenhados

### 5. Análise de Arquivos CSV em Lote

Para processar uma pasta contendo vários arquivos CSV (do tipo `eyes_only` ou `all_points`) e gerar um relatório consolidado de piscadas:

```bash
python .\scripts\analisar_pasta_piscadas.py .\tmp\graves\
```

- **Entrada**: Caminho da pasta contendo os arquivos `.csv`.
- **Processamento**: 
  - Auto-detecção de FPS via metadados (`# FPS: XX`).
  - Filtro de Período Refratário (0.5s) para eliminar duplicatas.
  - Calcula EAR, detecta piscadas completas/incompletas.
- **Saída**: Um arquivo Excel consolidado (`Resumo_Global_Piscadas.xlsx`) na mesma pasta.

---

## Estrutura dos Arquivos CSV

### CSV de Pontos dos Olhos (32 pontos)
```csv
frame,method,right_upper_1_x,right_upper_1_y,...,left_lower_9_x,left_lower_9_y
0,mediapipe,245.3,156.7,...,512.8,178.2
1,mediapipe,246.1,157.2,...,513.5,178.9
```

### CSV de Todos os Pontos (478 pontos)
```csv
frame,method,face_detected,point_0_x,point_0_y,point_0_z,...,point_477_x,point_477_y,point_477_z
0,mediapipe_full,1,320.5,240.3,12.5,...,450.2,380.7,8.3
1,mediapipe_full,1,321.2,241.1,12.8,...,451.0,381.2,8.5
```

---

## Teste manual do script Python (MediaPipe)

Para testar manualmente a geração de vídeo com MediaPipe, siga os passos abaixo:

### Processamento de um vídeo individual

1. Certifique-se de ter um vídeo de teste salvo na pasta `tmp/` (exemplo: `tmp/input_teste.mp4`).
2. Execute o seguinte comando no terminal, ajustando os caminhos conforme necessário:

```sh
python scripts/process_video_mediapipe.py tmp/input_teste.mp4 tmp/
```

- O script irá processar o vídeo e salvar o resultado na mesma pasta `tmp/`, com o nome `processed_input_teste.mp4`.
- Verifique no terminal as mensagens de log para confirmar se o arquivo foi criado com sucesso.

### Processamento em lote de múltiplos vídeos

Para processar todos os vídeos `.MOV` de uma pasta específica de uma vez:

1. Certifique-se de que os vídeos estão na pasta desejada (por padrão: `E:\trabalho\paralisia`)
2. Execute o script batch:

```sh
.\process_all_videos.bat
```

- O script irá processar automaticamente todos os arquivos `.MOV` da pasta configurada
- Cada vídeo processado será salvo na pasta `E:\trabalho\paralisia_video_com_pontos` com o prefixo `processed_`
- O progresso será exibido no terminal para cada vídeo

### Extração de pontos em lote

Para extrair pontos de todos os vídeos `.MOV` e gerar planilhas CSV:

1. Certifique-se de que os vídeos estão na pasta desejada (por padrão: `E:\trabalho\paralisia`)
2. Execute o script batch:

```sh
.\extract_all_points.bat
```

- O script irá extrair pontos de todos os arquivos `.MOV` da pasta configurada
- Cada vídeo terá seus pontos salvos em arquivos JSON e CSV na pasta `E:\trabalho\paralisia_video_com_pontos`
- Os arquivos serão nomeados como `points_[nome_do_video].json` e `points_[nome_do_video].csv`
- O progresso será exibido no terminal para cada vídeo

Se houver algum erro, copie a mensagem exibida no terminal para análise.
