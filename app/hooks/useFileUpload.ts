import { useState } from 'react';

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  uploadedFile: {
    url: string;
    filename: string;
    size: number;
    type: string;
  } | null;
}

export function useFileUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedFile: null,
  });

  const uploadFile = async (file: File) => {
    setState({
      isUploading: true,
      progress: 0,
      error: null,
      uploadedFile: null,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Criar XMLHttpRequest para ter controle do progresso
      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            console.log('Progress:', progress);
            setState(prev => ({ ...prev, progress }));
          }
        });

        xhr.addEventListener('load', () => {
          console.log('XHR Load - Status:', xhr.status);
          console.log('XHR Response:', xhr.responseText);
          
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Parsed response:', response);
              
              if (response.success) {
                console.log('Upload bem-sucedido, atualizando estado...');
                // Forçar atualização com pequeno delay
                setTimeout(() => {
                  setState({
                    isUploading: false,
                    progress: 100,
                    error: null,
                    uploadedFile: {
                      url: response.url,
                      filename: response.filename,
                      size: response.size,
                      type: response.type,
                    },
                  });
                }, 100);
                resolve(response);
              } else {
                setState(prev => ({
                  ...prev,
                  isUploading: false,
                  error: response.error || 'Erro no upload',
                }));
                reject(new Error(response.error));
              }
            } catch (parseError) {
              console.error('Erro ao fazer parse da resposta:', parseError);
              setState(prev => ({
                ...prev,
                isUploading: false,
                error: 'Erro ao processar resposta do servidor',
              }));
              reject(new Error('Erro ao processar resposta'));
            }
          } else {
            console.error('Status não é 200:', xhr.status);
            setState(prev => ({
              ...prev,
              isUploading: false,
              error: `Erro na conexão com o servidor (${xhr.status})`,
            }));
            reject(new Error('Erro na conexão'));
          }
        });

        xhr.addEventListener('error', () => {
          setState(prev => ({
            ...prev,
            isUploading: false,
            error: 'Erro na conexão com o servidor',
          }));
          reject(new Error('Erro na conexão'));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: 'Erro interno no upload',
      }));
      throw error;
    }
  };

  const reset = () => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      uploadedFile: null,
    });
  };

  return {
    ...state,
    uploadFile,
    reset,
  };
} 