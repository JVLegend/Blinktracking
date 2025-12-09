# Doutorado Blink - Sistema de Análise de Piscadas

Sistema web para análise e visualização de dados de piscadas detectadas através de vídeos.

[➡️ Veja a lista de tarefas (TODO List)](TODO.md)

## Estrutura do Projeto

- `app/`: Contém o código fonte da aplicação web
  - `components/`: Componentes React reutilizáveis
  - `page.tsx`: Página principal da aplicação
- `types/`: Definições de tipos TypeScript
- `requirements.txt`: Requisitos Python para processamento de vídeos

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

## Funcionalidades

### Análise de Coordenadas
- Upload de arquivos CSV com dados de coordenadas
- Visualização interativa de gráficos X e Y
- Seleção de pontos específicos
- Gráficos interativos com zoom e exportação

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

O projeto oferece três métodos de extração de pontos do MediaPipe, todos gerando CSV diretamente:

### 1. Pontos dos Olhos (Recomendado para Análise de Piscadas)

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
- ✅ Arquivo CSV compacto e rápido
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

### 2. Todos os Pontos Faciais (Análise Completa)

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

**⚠️ Atenção:** Gera arquivos CSV grandes (pode chegar a centenas de MB dependendo do vídeo)

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

### 3. Processamento em Lote

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
