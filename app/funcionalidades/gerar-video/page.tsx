"use client"

import { useState, useRef } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { FileVideo, Upload, Info, Download, Film, SkipForward } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function GerarVideoPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [selectedFrames, setSelectedFrames] = useState<number[]>([])

  const handleProcess = async (method: 'dlib' | 'mediapipe') => {
    try {
      if (!videoFile) {
        toast.error("Por favor, faça upload de um vídeo primeiro");
        return;
      }

      setIsProcessing(true);
      setProgress(0);
      setLogs([]);
      setDownloadUrl(null);
      setLogs(prev => [...prev, "Iniciando processamento..."]);
      
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('method', method);

      setLogs(prev => [...prev, "Enviando vídeo..."]);
      
      const response = await fetch("/api/generate-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Não foi possível iniciar o processamento");
      }

      let lastProgressUpdate = 0;
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Mantém a última linha incompleta no buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            // Verificar se é uma linha data: com JSON
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);

              // Tratar progresso
              if (data.progress !== undefined) {
                const currentProgress = Math.floor(data.progress);
                if (currentProgress - lastProgressUpdate >= 2) {
                  setProgress(currentProgress);
                  setLogs(prev => [...prev, `Progresso: ${currentProgress}%`]);
                  lastProgressUpdate = currentProgress;
                }
              }

              // Tratar vídeo completo
              if (data.status === 'complete' && data.videoData) {
                setProgress(100);
                setLogs(prev => [...prev, "Processamento concluído! Gerando vídeo..."]);

                // Converter base64 para blob
                const videoBlob = new Blob(
                  [Uint8Array.from(atob(data.videoData), c => c.charCodeAt(0))],
                  { type: 'video/mp4' }
                );

                // Criar URL e fazer download
                const url = URL.createObjectURL(videoBlob);
                setDownloadUrl(url);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `processed_${videoFile.name}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                setLogs(prev => [...prev, "Vídeo gerado com sucesso!"]);
                toast.success("Vídeo processado com sucesso!");
                setIsProcessing(false);
                return;
              }

              // Tratar mensagens de erro
              if (data.error) {
                throw new Error(data.error);
              }
            }

            // Verificar se é uma linha com o arquivo de saída
            if (line.includes('"outputFile"')) {
              try {
                const data = JSON.parse(line);
                if (data.success && data.outputFile) {
                  setProgress(100);
                  setLogs(prev => [...prev, "Processamento concluído! Baixando vídeo..."]);
                  
                  const videoUrl = `/tmp/${data.outputFile}`;
                  setDownloadUrl(videoUrl);
                  
                  const a = document.createElement('a');
                  a.href = videoUrl;
                  a.download = data.outputFile;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  
                  toast.success("Vídeo processado com sucesso!");
                  setIsProcessing(false);
                  return;
                }
              } catch (e) {
                console.debug("Erro ao processar outputFile:", e);
              }
            }
          } catch (e) {
            console.debug("Erro ao processar linha:", e);
          }
        }
      }

    } catch (error) {
      console.error("Erro:", error);
      setLogs(prev => [...prev, `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`]);
      toast.error(error instanceof Error ? error.message : "Erro ao processar o vídeo");
    } finally {
      setIsProcessing(false);
    }
  };

  const InfoDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="absolute top-8 right-8">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Geração de Vídeo com Pontos</DialogTitle>
          <DialogDescription>
            Como funciona o processo de geração de vídeo
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <h3 className="font-semibold mb-2">Métodos de Geração</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold">Geração com dlib</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Usa os pontos extraídos pelo dlib</li>
                  <li>Pontos 37, 38, 40 e 41</li>
                  <li>Ideal para análise de piscadas simples</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold">Geração com MediaPipe</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Usa os pontos extraídos pelo MediaPipe</li>
                  <li>Pontos das pálpebras superior e inferior</li>
                  <li>Melhor para análise detalhada do movimento</li>
                </ul>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">O Processo</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              <li>Upload do vídeo original e CSV com pontos</li>
              <li>Processamento frame a frame</li>
              <li>Desenho dos pontos sobre o vídeo</li>
              <li>Download do vídeo processado</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <SidebarInset>
      <div className="flex-1 space-y-6 p-8 relative">
        <InfoDialog />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerar Vídeo</h1>
            <p className="text-muted-foreground mt-2">
              Gere um vídeo com os pontos faciais sobrepostos
            </p>
          </div>
          <Film className="h-10 w-10 text-primary" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload do Vídeo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="video">Vídeo Original</Label>
                <input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setVideoFile(file)
                  }}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90
                    cursor-pointer"
                />
              </div>
              {videoFile && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold">Video Selecionado:</p>
                  <p className="text-sm text-muted-foreground">{videoFile.name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5" />
                Processar Vídeo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleProcess('dlib')}
                  disabled={isProcessing || !videoFile}
                  variant="default"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin mr-2">⭮</div>
                      Processando com Dlib...
                    </>
                  ) : (
                    <>
                      <Film className="h-4 w-4 mr-2" />
                      Processar com Dlib
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleProcess('mediapipe')}
                  disabled={isProcessing || !videoFile}
                  variant="secondary"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin mr-2">⭮</div>
                      Processando com MediaPipe...
                    </>
                  ) : (
                    <>
                      <Film className="h-4 w-4 mr-2" />
                      Processar com MediaPipe
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {isProcessing && (
          <Card>
            <CardHeader>
              <CardTitle>Status do Processamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
              <div className="mt-4 h-32 overflow-auto rounded border p-2 text-sm font-mono">
                {logs.map((log, index) => (
                  <div key={index} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarInset>
  )
}
