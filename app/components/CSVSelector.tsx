import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, RefreshCw, Calendar, Play } from "lucide-react";
import { useStoredFiles } from "../hooks/useStoredFiles";

interface CSVSelectorProps {
  selectedCSV: string | null;
  onCSVSelect: (csvUrl: string, filename: string) => void;
}

export function CSVSelector({ selectedCSV, onCSVSelect }: CSVSelectorProps) {
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              <CardTitle>Selecionar Planilha</CardTitle>
            </div>
            <Button variant="outline" size="sm" disabled>
              <RefreshCw className="w-4 h-4 animate-spin" />
            </Button>
          </div>
          <CardDescription>Buscando planilhas disponíveis...</CardDescription>
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
              <FileSpreadsheet className="w-5 h-5" />
              <CardTitle>Selecionar Planilha</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!files || files.csvs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              <CardTitle>Selecionar Planilha</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            Nenhuma planilha (.CSV) encontrada. Faça upload de planilhas na página inicial primeiro.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            <CardTitle>Selecionar Planilha</CardTitle>
            <Badge variant="secondary">{files.csvs.length} planilha{files.csvs.length !== 1 ? 's' : ''}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <CardDescription>
          Selecione uma planilha já enviada para análise
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {files.csvs.map((csv, index) => (
          <div 
            key={index} 
            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedCSV === csv.url 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'hover:bg-muted'
            }`}
            onClick={() => onCSVSelect(csv.url, csv.filename)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium truncate">{csv.filename}</p>
                {selectedCSV === csv.url && (
                  <Badge variant="default" className="text-xs">
                    Selecionado
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{formatFileSize(csv.size)}</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(csv.uploadedAt)}</span>
                </div>
              </div>
            </div>
            <Button 
              size="sm" 
              variant={selectedCSV === csv.url ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                onCSVSelect(csv.url, csv.filename);
              }}
            >
              <Play className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
} 