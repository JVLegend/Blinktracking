import { useState, useEffect } from 'react';

interface StoredFile {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

interface StoredFilesData {
  videos: StoredFile[];
  csvs: StoredFile[];
  total: number;
}

interface StoredFilesState {
  files: StoredFilesData | null;
  isLoading: boolean;
  error: string | null;
}

export function useStoredFiles() {
  const [state, setState] = useState<StoredFilesState>({
    files: null,
    isLoading: true,
    error: null,
  });

  const fetchFiles = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      
      if (data.success) {
        setState({
          files: data.files,
          isLoading: false,
          error: null,
        });
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Erro ao buscar arquivos',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erro na conexão com o servidor',
      }));
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const refresh = () => {
    fetchFiles();
  };

  return {
    ...state,
    refresh,
  };
} 