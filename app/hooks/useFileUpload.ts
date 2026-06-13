import { useEffect, useRef, useState } from 'react';

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
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupXhrRef = useRef<(() => void) | null>(null);
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
      xhrRef.current = xhr;

      return new Promise((resolve, reject) => {
        const handleProgress = (event: ProgressEvent) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            console.log('Progress:', progress);
            setState(prev => ({ ...prev, progress }));
          }
        };

        const cleanupCurrentXhr = () => {
          xhr.upload.removeEventListener('progress', handleProgress);
          xhr.removeEventListener('load', handleLoad);
          xhr.removeEventListener('error', handleError);
          xhr.removeEventListener('abort', handleAbort);
          if (xhrRef.current === xhr) {
            xhrRef.current = null;
            cleanupXhrRef.current = null;
          }
        };

        const handleLoad = () => {
          cleanupCurrentXhr();
          console.log('XHR Load - Status:', xhr.status);
          console.log('XHR Response:', xhr.responseText);
          
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Parsed response:', response);
              
              if (response.success) {
                console.log('Upload bem-sucedido, atualizando estado...');
                // Forçar atualização com pequeno delay
                timeoutRef.current = setTimeout(() => {
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
        };

        const handleError = () => {
          cleanupCurrentXhr();
          setState(prev => ({
            ...prev,
            isUploading: false,
            error: 'Erro na conexão com o servidor',
          }));
          reject(new Error('Erro na conexão'));
        };

        const handleAbort = () => {
          cleanupCurrentXhr();
          reject(new Error('Upload cancelado'));
        };

        xhr.upload.addEventListener('progress', handleProgress);
        xhr.addEventListener('load', handleLoad);
        xhr.addEventListener('error', handleError);
        xhr.addEventListener('abort', handleAbort);
        cleanupXhrRef.current = cleanupCurrentXhr;

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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (xhrRef.current && xhrRef.current.readyState !== XMLHttpRequest.DONE) {
        xhrRef.current.abort();
      }
      cleanupXhrRef.current?.();
      xhrRef.current = null;
    };
  }, []);

  return {
    ...state,
    uploadFile,
    reset,
  };
}
