// Configuração da API do backend
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Headers padrão para as requisições
export const DEFAULT_HEADERS = {
  'Accept': 'application/json',
};

// Timeout padrão para requisições longas (processamento de vídeo)
export const REQUEST_TIMEOUT = 10 * 60 * 1000; // 10 minutos 