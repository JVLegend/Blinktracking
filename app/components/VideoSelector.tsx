import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileVideo, RefreshCw, Calendar, Play } from "lucide-react";
import { useStoredFiles } from "../hooks/useStoredFiles";
import { useState } from "react";

interface VideoSelectorProps {
  selectedVideo: string | null;
  onVideoSelect: (videoUrl: string, filename: string) => void;
}

export function VideoSelector({ selectedVideo, onVideoSelect }: VideoSelectorProps) {
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
              <FileVideo className="w-5 h-5" />
              <CardTitle>Selecionar Vídeo</CardTitle>
            </div>
            <Button variant="outline" size="sm" disabled>
              <RefreshCw className="w-4 h-4 animate-spin" />
            </Button>
          </div>
          <CardDescription>Buscando vídeos disponíveis...</CardDescription>
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
              <FileVideo className="w-5 h-5" />
              <CardTitle>Selecionar Vídeo</CardTitle>
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

  if (!files || files.videos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileVideo className="w-5 h-5" />
              <CardTitle>Selecionar Vídeo</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            Nenhum vídeo (.MOV) encontrado. Faça upload de vídeos na página inicial primeiro.
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
            <FileVideo className="w-5 h-5" />
            <CardTitle>Selecionar Vídeo</CardTitle>
            <Badge variant="secondary">{files.videos.length} vídeo{files.videos.length !== 1 ? 's' : ''}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <CardDescription>
          Selecione um vídeo já enviado para processamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {files.videos.map((video, index) => (
          <div 
            key={index} 
            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedVideo === video.url 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                : 'hover:bg-muted'
            }`}
            onClick={() => onVideoSelect(video.url, video.filename)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium truncate">{video.filename}</p>
                {selectedVideo === video.url && (
                  <Badge variant="default" className="text-xs">
                    Selecionado
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{formatFileSize(video.size)}</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(video.uploadedAt)}</span>
                </div>
              </div>
            </div>
            <Button 
              size="sm" 
              variant={selectedVideo === video.url ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                onVideoSelect(video.url, video.filename);
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