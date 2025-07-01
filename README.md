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
- Seleção de pontos específicos (37, 38, 40, 41)
- Gráficos interativos com zoom e exportação

## Contribuição

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request
