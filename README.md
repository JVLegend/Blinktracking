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
