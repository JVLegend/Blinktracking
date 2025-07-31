import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileVideo, FileSpreadsheet, Download, RefreshCw, Calendar, HardDrive } from "lucide-react";
import { useStoredFiles } from "../hooks/useStoredFiles";

interface StoredFilesProps {
  onRefresh?: () => void;
}

export function StoredFiles({ onRefresh }: StoredFilesProps) {
  const { files, isLoading, error, refresh } = useStoredFiles();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRefresh = () => {
    refresh();
    onRefresh?.();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              <CardTitle>Arquivos Armazenados</CardTitle>
            </div>
            <Button variant="outline" size="sm" disabled>
              <RefreshCw className="w-4 h-4 animate-spin" />
            </Button>
          </div>
          <CardDescription>Buscando arquivos...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              <CardTitle>Arquivos Armazenados</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!files || files.total === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              <CardTitle>Arquivos Armazenados</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>Nenhum arquivo encontrado. Faça upload de seus primeiros arquivos!</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            <CardTitle>Arquivos Armazenados</CardTitle>
            <Badge variant="secondary">{files.total} arquivo{files.total !== 1 ? 's' : ''}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <CardDescription>
          Gerencie seus arquivos enviados para análise
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vídeos */}
        {files.videos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-blue-600" />
              <h3 className="font-medium">Vídeos ({files.videos.length})</h3>
            </div>
            <div className="space-y-2">
              {files.videos.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/10">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.filename}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(file.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CSVs */}
        {files.csvs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <h3 className="font-medium">Planilhas CSV ({files.csvs.length})</h3>
            </div>
            <div className="space-y-2">
              {files.csvs.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-900/10">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.filename}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(file.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 