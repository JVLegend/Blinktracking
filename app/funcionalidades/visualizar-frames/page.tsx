"use client";

import { useState, useRef, useEffect } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { 
  Upload, 
  Search, 
  Film, 
  SkipForward, 
  X, 
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Grid,
  Info,
  FileVideo
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { VideoSelector } from "../../components/VideoSelector";

interface ExtractedFrame {
  frameNumber: string;
  imageUrl: string;
}

interface DataPoint {
  frame: number;
  method: string;
  // Pontos do dlib
  "37_x"?: number;
  "37_y"?: number;
  "38_x"?: number;
  "38_y"?: number;
  "40_x"?: number;
  "40_y"?: number;
  "41_x"?: number;
  "41_y"?: number;
  // Pontos do MediaPipe - Olho direito superior
  "right_upper_1_x"?: number;
  "right_upper_1_y"?: number;
  "right_upper_2_x"?: number;
  "right_upper_2_y"?: number;
  "right_upper_3_x"?: number;
  "right_upper_3_y"?: number;
  "right_upper_4_x"?: number;
  "right_upper_4_y"?: number;
  "right_upper_5_x"?: number;
  "right_upper_5_y"?: number;
  "right_upper_6_x"?: number;
  "right_upper_6_y"?: number;
  "right_upper_7_x"?: number;
  "right_upper_7_y"?: number;
  // Pontos do MediaPipe - Olho direito inferior
  "right_lower_1_x"?: number;
  "right_lower_1_y"?: number;
  "right_lower_2_x"?: number;
  "right_lower_2_y"?: number;
  "right_lower_3_x"?: number;
  "right_lower_3_y"?: number;
  "right_lower_4_x"?: number;
  "right_lower_4_y"?: number;
  "right_lower_5_x"?: number;
  "right_lower_5_y"?: number;
  "right_lower_6_x"?: number;
  "right_lower_6_y"?: number;
  "right_lower_7_x"?: number;
  "right_lower_7_y"?: number;
  "right_lower_8_x"?: number;
  "right_lower_8_y"?: number;
  "right_lower_9_x"?: number;
  "right_lower_9_y"?: number;
  // Pontos do MediaPipe - Olho esquerdo superior
  "left_upper_1_x"?: number;
  "left_upper_1_y"?: number;
  "left_upper_2_x"?: number;
  "left_upper_2_y"?: number;
  "left_upper_3_x"?: number;
  "left_upper_3_y"?: number;
  "left_upper_4_x"?: number;
  "left_upper_4_y"?: number;
  "left_upper_5_x"?: number;
  "left_upper_5_y"?: number;
  "left_upper_6_x"?: number;
  "left_upper_6_y"?: number;
  "left_upper_7_x"?: number;
  "left_upper_7_y"?: number;
  // Pontos do MediaPipe - Olho esquerdo inferior
  "left_lower_1_x"?: number;
  "left_lower_1_y"?: number;
  "left_lower_2_x"?: number;
  "left_lower_2_y"?: number;
  "left_lower_3_x"?: number;
  "left_lower_3_y"?: number;
  "left_lower_4_x"?: number;
  "left_lower_4_y"?: number;
  "left_lower_5_x"?: number;
  "left_lower_5_y"?: number;
  "left_lower_6_x"?: number;
  "left_lower_6_y"?: number;
  "left_lower_7_x"?: number;
  "left_lower_7_y"?: number;
  "left_lower_8_x"?: number;
  "left_lower_8_y"?: number;
  "left_lower_9_x"?: number;
  "left_lower_9_y"?: number;
}

export default function VisualizarFramesPage() {
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoFilename, setSelectedVideoFilename] = useState<string | null>(null);
  const [currentFrameInput, setCurrentFrameInput] = useState<string>('');
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalFrames, setTotalFrames] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isGridView, setIsGridView] = useState(false);
  const [showDlib, setShowDlib] = useState(true);
  const [showMediaPipe, setShowMediaPipe] = useState(true);
  const [framePoints, setFramePoints] = useState<DataPoint[]>([]);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [frames, setFrames] = useState<string[]>([]);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);
  const [processedFrames, setProcessedFrames] = useState<any[]>([]);
  const [displayedPointsData, setDisplayedPointsData] = useState<any[]>([]);
  const canvasRefs = useRef<{[key: string]: HTMLCanvasElement}>({});
  const [facialPoints, setFacialPoints] = useState<any>(null);

  // Função removida - não é mais necessária com VideoSelector

  const handleExtractFrame = async () => {
    if (!selectedVideoUrl || !currentFrameInput) {
      toast.error("Por favor, selecione um vídeo e digite o número do frame.");
      return;
    }

    console.log("Extracting frame:", currentFrameInput);
    const frameNumber = parseInt(currentFrameInput);
    if (isNaN(frameNumber) || frameNumber < 0 || frameNumber > totalFrames) {
      toast.error(`Por favor, digite um número entre 0 e ${totalFrames}.`);
      return;
    }

    if (extractedFrames.length >= 4) {
      toast.error("Máximo de 4 frames permitidos. Remova algum para adicionar novo.");
      return;
    }

    setIsProcessingFrame(true);

    try {
      const formData = new FormData();
      formData.append("videoUrl", selectedVideoUrl);
      formData.append("videoFilename", selectedVideoFilename || "");
      formData.append("frame", currentFrameInput);

      const response = await fetch("/api/extract-frame", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao extrair frame");
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("image/jpeg")) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Resposta inválida do servidor");
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      setExtractedFrames(prev => [...prev, { frameNumber: currentFrameInput, imageUrl }]);
      setCurrentFrameInput('');
      console.log("Frame extracted successfully");
      toast.success("Frame extraído com sucesso!");
    } catch (error: any) {
      console.error("Erro ao extrair frame:", error);
      toast.error(error.message || "Erro ao extrair o frame. Tente novamente.");
    } finally {
      setIsProcessingFrame(false);
    }
  };

  const removeFrame = (frameNumber: string) => {
    console.log("Removing frame:", frameNumber);
    setExtractedFrames(prev => prev.filter(frame => frame.frameNumber !== frameNumber));
    if (selectedFrame === frameNumber) {
      setSelectedFrame(null);
    }
  };

  const handleFrameClick = (frameNumber: string) => {
    console.log("Frame clicked:", frameNumber);
    setSelectedFrame(frameNumber === selectedFrame ? null : frameNumber);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const downloadFrame = (frameNumber: string) => {
    console.log("Downloading frame:", frameNumber);
    const frame = extractedFrames.find(f => f.frameNumber === frameNumber);
    if (!frame) return;

    const link = document.createElement('a');
    link.href = frame.imageUrl;
    link.download = `frame_${frameNumber}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const extractSequentialFrames = async () => {
    if (!selectedVideoUrl || extractedFrames.length >= 4) return;
    
    const remainingSlots = 4 - extractedFrames.length;
    const interval = Math.floor(totalFrames / (remainingSlots + 1));
    
    for (let i = 1; i <= remainingSlots; i++) {
      const frameNumber = (interval * i).toString();
      const formData = new FormData();
      formData.append("videoUrl", selectedVideoUrl);
      formData.append("videoFilename", selectedVideoFilename || "");
      formData.append("frame", frameNumber);

      try {
        const response = await fetch("/api/extract-frame", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) continue;

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        
        setExtractedFrames(prev => [...prev, { frameNumber, imageUrl }]);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const processVideo = async (method: "dlib" | "mediapipe") => {
    console.log(`processVideo chamado com método: ${method}`);
    if (!selectedVideoUrl || extractedFrames.length === 0) {
        toast.error("Por favor, selecione um vídeo e extraia alguns frames primeiro");
        return;
    }

    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    setLogs(prev => [...prev, "Iniciando processamento..."]);

    const formData = new FormData();
    formData.append('videoUrl', selectedVideoUrl);
    formData.append('videoFilename', selectedVideoFilename || "");
    formData.append('method', method);

    setLogs(prev => [...prev, "Enviando vídeo..."]);

    try {
        const response = await fetch('/api/generate-video', {
            method: 'POST',
            body: formData,
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            throw new Error("Não foi possível iniciar o processamento");
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(5));
                        
                        if (data.error) {
                            throw new Error(data.error);
                        }

                        if (data.progress !== undefined) {
                            setProgress(data.progress);
                            setLogs(prev => [...prev, `Progresso: ${data.progress}%`]);
                        }

                        if (data.status === 'complete' && data.videoData) {
                            // Converter base64 para blob
                            const videoBlob = new Blob(
                                [Uint8Array.from(atob(data.videoData), c => c.charCodeAt(0))],
                                { type: 'video/mp4' }
                            );
                            
                            // Atualizar o player de vídeo
                            if (videoPlayerRef.current) {
                                const url = URL.createObjectURL(videoBlob);
                                videoPlayerRef.current.src = url;
                            }

                            setLogs(prev => [...prev, "Processamento concluído!"]);
                            toast.success("Vídeo processado com sucesso!");
                        }
                    } catch (e) {
                        console.error("Erro ao processar evento:", e);
                        if (e instanceof Error) {
                            setLogs(prev => [...prev, `Erro: ${e.message}`]);
                            toast.error(e.message);
                        }
                    }
                }
            }
        }

    } catch (error) {
        console.error('Erro:', error);
        toast.error(error instanceof Error ? error.message : "Erro ao processar vídeo");
        setLogs(prev => [...prev, `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`]);
    } finally {
        setIsProcessing(false);
    }
  };

  const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  const calculateVelocity = (data: DataPoint[]) => {
    const velocities: number[] = []
    const frames: number[] = []

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1]
      const curr = data[i]

      // Calcular velocidade média dos pontos dos olhos
      let rightEyeVel = 0
      let leftEyeVel = 0

      if (curr.method === "dlib") {
        rightEyeVel = calculateDistance(
          prev["37_x"]!, prev["37_y"]!,
          curr["37_x"]!, curr["37_y"]!
        )
        leftEyeVel = calculateDistance(
          prev["40_x"]!, prev["40_y"]!,
          curr["40_x"]!, curr["40_y"]!
        )
      } else {
        // MediaPipe - usando pontos centrais das pálpebras
        rightEyeVel = (
          calculateDistance(
            prev["right_upper_4_x"]!, prev["right_upper_4_y"]!,
            curr["right_upper_4_x"]!, curr["right_upper_4_y"]!
          ) +
          calculateDistance(
            prev["right_lower_5_x"]!, prev["right_lower_5_y"]!,
            curr["right_lower_5_x"]!, curr["right_lower_5_y"]!
          )
        ) / 2

        leftEyeVel = (
          calculateDistance(
            prev["left_upper_4_x"]!, prev["left_upper_4_y"]!,
            curr["left_upper_4_x"]!, curr["left_upper_4_y"]!
          ) +
          calculateDistance(
            prev["left_lower_5_x"]!, prev["left_lower_5_y"]!,
            curr["left_lower_5_x"]!, curr["left_lower_5_y"]!
          )
        ) / 2
      }

      velocities.push((rightEyeVel + leftEyeVel) / 2)
      frames.push(curr.frame)
    }

    return { x: frames, y: velocities }
  }

  const drawPoints = (frameNumber: string, imageUrl: string, points: DataPoint) => {
    console.log(`drawPoints chamado para frame ${frameNumber}`, points);

    const canvas = canvasRefs.current[frameNumber];
    if (!canvas) {
      console.log(`Canvas não encontrado para frame ${frameNumber}`);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log(`Contexto 2D não encontrado para frame ${frameNumber}`);
      return;
    }

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      console.log(`Canvas dimensions: width=${canvas.width}, height=${canvas.height}`);
      console.log(`Image dimensions: width=${img.width}, height=${img.height}`);

      // SIMPLIFIED DRAWING: DRAW A SINGLE RED DOT AT FIXED POSITION
      ctx.fillStyle = '#FF0000'; // RED for testing
      ctx.beginPath();
      ctx.arc(50, 50, 10, 0, 2 * Math.PI); // Draw at 50, 50 with radius 10
      ctx.fill();
      console.log(`Drew a red dot at 50, 50 on frame ${frameNumber}`);

    };
    img.onerror = () => {
      console.error(`Erro ao carregar imagem para frame ${frameNumber}: ${imageUrl}`);
    };
  };

  useEffect(() => {
    console.log("useEffect para processedFrames foi chamado", processedFrames);
    if (processedFrames.length > 0) {
      processedFrames.forEach(frameData => {
        const frame = extractedFrames.find(f => f.frameNumber === frameData.frame.toString());
        if (frame) {
          console.log(`Chamando drawPoints para frame ${frame.frameNumber} com dados:`, frameData);
          drawPoints(frame.frameNumber, frame.imageUrl, frameData);
        } else {
          console.log(`Frame ${frameData.frame} não encontrado em extractedFrames`);
        }
      });
    }
  }, [processedFrames]);

  const InfoDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="absolute top-8 right-8">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Visualização de Frames</DialogTitle>
          <DialogDescription>
            Como funciona a visualização de frames
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <h3 className="font-semibold mb-2">Métodos de Visualização</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold">Pontos do dlib</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Pontos 37, 38, 40 e 41</li>
                  <li>Ideal para análise de piscadas simples</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold">Pontos do MediaPipe</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
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
              <li>Extração dos frames do vídeo</li>
              <li>Sobreposição dos pontos selecionados</li>
              <li>Visualização frame a frame</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const handleProcessDlib = async () => {
    if (!selectedVideoUrl || extractedFrames.length === 0) {
        toast.error("Por favor, selecione um vídeo e extraia alguns frames primeiro");
        return;
    }

    setIsProcessing(true);
    try {
        const formData = new FormData();
        formData.append('videoUrl', selectedVideoUrl);
        formData.append('videoFilename', selectedVideoFilename || "");
        formData.append('method', 'dlib');

        console.log("Enviando vídeo para processamento...");
        const response = await fetch('/api/generate-video', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao processar vídeo');
        }

        // Processar resposta como vídeo
        const blob = await response.blob();
        const videoUrl = URL.createObjectURL(blob);
        
        // Atualizar o player de vídeo com o resultado processado
        if (videoPlayerRef.current) {
            videoPlayerRef.current.src = videoUrl;
        }

        toast.success("Vídeo processado com sucesso!");
    } catch (error) {
        console.error('Erro:', error);
        toast.error(error instanceof Error ? error.message : "Erro ao processar vídeo");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleProcessMediaPipe = async () => {
    if (!selectedVideoUrl || extractedFrames.length === 0) {
        toast.error("Por favor, selecione um vídeo e extraia alguns frames primeiro");
        return;
    }

    console.log("=== INICIANDO PROCESSAMENTO MEDIAPIPE ===");
    console.log("Video URL:", selectedVideoUrl);
    console.log("Video Filename:", selectedVideoFilename);
    console.log("Frames extraídos:", extractedFrames.length);

    setIsProcessing(true);
    setProgress(0);
    setLogs(["Iniciando processamento..."]);

    try {
        const formData = new FormData();
        formData.append('videoUrl', selectedVideoUrl);
        formData.append('videoFilename', selectedVideoFilename || "");
        formData.append('method', 'mediapipe');

        setLogs(prev => [...prev, "Enviando requisição para o servidor..."]);
        console.log("Enviando requisição para /api/generate-video...");
        
        const response = await fetch('/api/generate-video', {
            method: 'POST',
            body: formData,
        });

        console.log("Resposta recebida. Status:", response.status);
        setLogs(prev => [...prev, `Resposta recebida: ${response.status}`]);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erro na resposta:", errorData);
            setLogs(prev => [...prev, `Erro: ${errorData.error}`]);
            throw new Error(errorData.error || 'Erro ao processar vídeo');
        }

        setLogs(prev => [...prev, "Processando resposta..."]);
        console.log("Processando resposta JSON...");
        const result = await response.json();
        console.log("Resultado:", result);

        if (result.error) {
            setLogs(prev => [...prev, `Erro: ${result.error}`]);
            throw new Error(result.error);
        }

        if (result.status === 'complete' && result.videoData) {
            setLogs(prev => [...prev, "Vídeo processado com sucesso!"]);
            console.log("Vídeo processado com sucesso!");
            // Converter base64 para blob
            const videoBlob = new Blob(
                [Uint8Array.from(atob(result.videoData), c => c.charCodeAt(0))],
                { type: 'video/mp4' }
            );
            
            // Atualizar o player de vídeo
            if (videoPlayerRef.current) {
                const url = URL.createObjectURL(videoBlob);
                videoPlayerRef.current.src = url;
            }

            toast.success("Vídeo processado com sucesso!");
        } else {
            setLogs(prev => [...prev, result.message || "Processamento concluído"]);
            toast.success(result.message || "Processamento concluído");
        }

        setProgress(100);
        console.log("=== FIM DO PROCESSAMENTO MEDIAPIPE ===");
    } catch (error) {
        console.error('Erro:', error);
        setLogs(prev => [...prev, `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`]);
        toast.error(error instanceof Error ? error.message : "Erro ao processar vídeo");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <SidebarInset>
      <div className="flex-1 space-y-6 p-8 relative">
        <InfoDialog />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Visualizar Frames</h1>
            <p className="text-muted-foreground mt-2">
              Visualize os frames do vídeo com os pontos faciais sobrepostos
            </p>
          </div>
          <FileVideo className="h-10 w-10 text-primary" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <VideoSelector 
            selectedVideo={selectedVideoUrl}
            onVideoSelect={(url, filename) => {
              setSelectedVideoUrl(url)
              setSelectedVideoFilename(filename)
              // Simular carregamento de vídeo para calcular frames
              const fps = 30; // Assumindo 30 fps
              const duration = 60; // Assumindo 60 segundos como exemplo
              setTotalFrames(Math.floor(duration * fps));
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Buscar Frame
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="frame">Número do Frame</Label>
                  <div className="flex gap-2">
                    <Input
                      id="frame"
                      type="number"
                      min="1"
                      max={totalFrames || 1}
                      value={currentFrameInput}
                      onChange={(e) => setCurrentFrameInput(e.target.value)}
                      placeholder="Ex: 150"
                      className="w-full"
                    />
                    <Button
                      onClick={handleExtractFrame}
                      disabled={!selectedVideoUrl || !currentFrameInput || isProcessingFrame || extractedFrames.length >= 4}
                    >
                      {isProcessingFrame ? (
                        "Extraindo..."
                      ) : (
                        <>
                          <SkipForward className="h-4 w-4 mr-2" />
                          Extrair
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={extractSequentialFrames}
                  disabled={!selectedVideoUrl || extractedFrames.length >= 4}
                >
                  Extrair Frames Sequenciais
                </Button>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleProcessMediaPipe}
                    disabled={isProcessing || extractedFrames.length === 0}
                    variant="secondary"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin mr-2">⭮</div>
                        Processando...
                      </>
                    ) : (
                      <>
                        <Film className="h-4 w-4 mr-2" />
                        Processar
                      </>
                    )}
                  </Button>
                </div>
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

        {extractedFrames.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Frames Extraídos</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsGridView(!isGridView)}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                {selectedFrame && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleZoomIn}
                      disabled={zoom >= 200}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleZoomOut}
                      disabled={zoom <= 50}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRotate}
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className={`grid ${isGridView ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              {extractedFrames.map((frame) => (
                <Card 
                  key={frame.frameNumber}
                  className={`cursor-pointer transition-all ${
                    selectedFrame === frame.frameNumber ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleFrameClick(frame.frameNumber)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Frame {frame.frameNumber}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFrame(frame.frameNumber);
                          }}
                          className="h-8 w-8"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFrame(frame.frameNumber);
                          }}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                      <canvas
                        ref={el => {
                          canvasRefs.current[frame.frameNumber] = el!;
                          // Redesenhar os pontos quando o canvas for criado
                          const processedFrame = processedFrames.find(
                            f => f.frame.toString() === frame.frameNumber
                          );
                          if (processedFrame && el) {
                            drawPoints(frame.frameNumber, frame.imageUrl, processedFrame);
                          }
                        }}
                        className="absolute top-0 left-0 w-full h-full"
                      />
                      <img
                        src={frame.imageUrl}
                        alt={`Frame ${frame.frameNumber}`}
                        className="object-contain w-full h-full transition-all"
                        style={{
                          transform: selectedFrame === frame.frameNumber
                            ? `scale(${zoom/100}) rotate(${rotation}deg)`
                            : 'none'
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {frames.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {frames.map((frame, index) => (
              <div key={index} className="relative aspect-video">
                <img 
                  src={frame} 
                  alt={`Frame ${index}`}
                  className="object-cover rounded-lg"
                />
              </div>
            ))}
          </div>
        )}

        {/* Display raw points data */}
        {displayedPointsData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Raw Points Data</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <pre className="text-sm font-mono">
                {JSON.stringify(displayedPointsData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {facialPoints && facialPoints[currentFrameInput] && facialPoints[currentFrameInput].length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pontos Faciais Dlib (Frame {currentFrameInput}):</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <pre className="text-sm font-mono">
                {JSON.stringify(facialPoints[currentFrameInput], null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <video ref={videoPlayerRef} className="hidden" />
      </div>
    </SidebarInset>
  );
}