"use client";

import React, { useState, useMemo, useEffect, useRef } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Eye, FileSpreadsheet, Play, Pause, SkipBack, SkipForward, Upload, Video, Scan } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { CSVSelector } from "../../components/CSVSelector"

interface MediaPipePoint {
  x: number;
  y: number;
  z?: number; // Opcional para CSV de todos os pontos
  label: string;
  group: 'right_upper' | 'right_lower' | 'left_upper' | 'left_lower' | 'all_points';
}

interface FrameData {
  frame: number;
  method: string;
  [key: string]: any;
}

type CSVType = 'eyes_only' | 'all_points' | 'unknown';

export default function CoordenadasPage() {
  const [data, setData] = useState<FrameData[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedCSVUrl, setSelectedCSVUrl] = useState<string | null>(null);
  const [selectedCSVFilename, setSelectedCSVFilename] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(30); // FPS
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvType, setCSVType] = useState<CSVType>('unknown');
  const [isStabilized, setIsStabilized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuração dos pontos do MediaPipe (apenas olhos)
  const pointsConfig = {
    right_upper: { count: 7, color: '#0000FF', label: 'RU' },
    right_lower: { count: 9, color: '#FF0000', label: 'RL' },
    left_upper: { count: 7, color: '#FF8000', label: 'LU' },
    left_lower: { count: 9, color: '#8000FF', label: 'LL' }
  };

  // Detectar tipo de CSV baseado nos headers
  const detectCSVType = (headers: string[]): CSVType => {
    // Verificar se tem colunas de pontos dos olhos
    const hasEyePoints = headers.some(h =>
      h.includes('right_upper_') || h.includes('right_lower_') ||
      h.includes('left_upper_') || h.includes('left_lower_')
    );

    // Verificar se tem colunas de todos os pontos
    const hasAllPoints = headers.some(h => h.match(/^point_\d+_[xyz]$/));

    if (hasAllPoints) return 'all_points';
    if (hasEyePoints) return 'eyes_only';
    return 'unknown';
  };

  const processCSVText = (text: string) => {
    const rows = text.split("\n").filter(row => row.trim());
    const headers = rows[0].split(",");

    // Detectar tipo de CSV
    const detectedType = detectCSVType(headers);
    setCSVType(detectedType);

    const parsedData: FrameData[] = rows.slice(1).map((row, idx) => {
      const values = row.split(",");
      const obj: any = {};
      headers.forEach((header, i) => {
        const value = values[i];
        obj[header] = isNaN(Number(value)) ? value : Number(value);
      });
      // Usar o valor real da coluna 'frame' do CSV, ou o índice como fallback
      if (obj.frame === undefined) {
        obj.frame = idx;
      }
      return obj;
    });

    return parsedData;
  };

  const handleCSVLoad = async () => {
    if (!selectedCSVUrl) {
      toast.error("Por favor, selecione uma planilha primeiro");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(selectedCSVUrl);
      if (!response.ok) {
        throw new Error('Erro ao carregar arquivo');
      }

      const text = await response.text();
      const parsedData = processCSVText(text);

      setData(parsedData);
      setCurrentFrame(0);
      toast.success(`${parsedData.length} frames carregados com sucesso!`);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar o arquivo");
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error("Por favor, selecione um arquivo CSV");
      return;
    }

    setUploadedFile(file);
    toast.success(`Arquivo ${file.name} selecionado`);
  };

  const handleProcessUploadedFile = async () => {
    if (!uploadedFile) {
      toast.error("Nenhum arquivo selecionado");
      return;
    }

    try {
      setLoading(true);

      const text = await uploadedFile.text();
      const parsedData = processCSVText(text);

      setData(parsedData);
      setCurrentFrame(0);
      setSelectedCSVUrl(null); // Limpar seleção do blob storage
      setSelectedCSVFilename(null);
      toast.success(`${parsedData.length} frames carregados de ${uploadedFile.name}!`);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.error("Erro ao processar o arquivo");
      setLoading(false);
    }
  };

  // Extrair pontos do frame atual
  const currentFramePoints = useMemo(() => {
    if (!data.length || currentFrame >= data.length) return [];

    const frameData = data[currentFrame];
    const points: MediaPipePoint[] = [];

    if (csvType === 'eyes_only') {
      // Processar CSV de pontos dos olhos
      Object.entries(pointsConfig).forEach(([group, config]) => {
        for (let i = 1; i <= config.count; i++) {
          const x = frameData[`${group}_${i}_x`];
          const y = frameData[`${group}_${i}_y`];

          if (x !== undefined && y !== undefined) {
            points.push({
              x,
              y,
              label: `${config.label}${i}`,
              group: group as any
            });
          }
        }
      });
    } else if (csvType === 'all_points') {
      // Processar CSV de todos os pontos (478 pontos)
      for (let i = 0; i < 478; i++) {
        const x = frameData[`point_${i}_x`];
        const y = frameData[`point_${i}_y`];
        const z = frameData[`point_${i}_z`];

        if (x !== undefined && y !== undefined) {
          points.push({
            x,
            y,
            z,
            label: `P${i}`,
            group: 'all_points'
          });
        }
      }
    }

    return points;
  }, [data, currentFrame, csvType]);

  // Função para extrair o número do label (ex: "RU1" -> 1)
  const getLabelNumber = (label: string): number => {
    const match = label.match(/\d+$/);
    return match ? parseInt(match[0]) : 0;
  };

  // Calcular bounds globais de TODOS os frames (uma única vez)
  const globalBounds = useMemo(() => {
    if (!data.length) return null;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    // Iterar por todos os frames para encontrar os limites globais
    data.forEach(frameData => {
      if (csvType === 'eyes_only') {
        // Para CSV de olhos, processar apenas pontos dos olhos
        Object.entries(pointsConfig).forEach(([group, config]) => {
          for (let i = 1; i <= config.count; i++) {
            const x = frameData[`${group}_${i}_x`];
            const y = frameData[`${group}_${i}_y`];
            if (x !== undefined && y !== undefined) {
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          }
        });
      } else if (csvType === 'all_points') {
        // Para CSV de todos os pontos
        for (let i = 0; i < 478; i++) {
          const x = frameData[`point_${i}_x`];
          const y = frameData[`point_${i}_y`];
          if (x !== undefined && y !== undefined) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }
    });

    if (minX === Infinity) return null;

    return { minX, maxX, minY, maxY };
  }, [data, csvType]);

  // Normalizar pontos para visualização
  const { normalizedPoints, eyeContours } = useMemo(() => {
    if (!currentFramePoints.length || !globalBounds) return { normalizedPoints: [], eyeContours: { right: [], left: [] } };

    const canvasWidth = 600;
    const canvasHeight = 400;

    let finalScale = 1;
    let finalOffsetX = 0;
    let finalOffsetY = 0;
    let refMinX = 0;
    let refMinY = 0;

    if (isStabilized) {
      // Modo Estabilizado/Focado: Usa escala baseada APENAS na LARGURA do frame atual
      // Isso faz com que a ALTURA (abertura do olho) varie proporcionalmente
      // Quando o olho fecha, a altura diminui visualmente
      const allX = currentFramePoints.map(p => p.x);
      const allY = currentFramePoints.map(p => p.y);
      const curMinX = Math.min(...allX);
      const curMaxX = Math.max(...allX);
      const curMinY = Math.min(...allY);
      const curMaxY = Math.max(...allY);

      const curWidth = curMaxX - curMinX || 1;

      // Escala baseada SOMENTE na largura - a altura vai variar naturalmente
      // Isso preserva a proporção real e mostra a piscada
      finalScale = (canvasWidth * 0.7) / curWidth;

      // Centralizar horizontalmente
      const centerX = (curMinX + curMaxX) / 2;
      const centerY = (curMinY + curMaxY) / 2;

      finalOffsetX = (canvasWidth / 2) - (centerX * finalScale);
      finalOffsetY = (canvasHeight / 2) - (centerY * finalScale);
      refMinX = 0;
      refMinY = 0;

    } else {
      // Modo Global: Usa bounds globais (Tracking)
      const { minX, maxX, minY, maxY } = globalBounds;
      const frameWidth = maxX - minX || 1;
      const frameHeight = maxY - minY || 1;

      const scaleX = canvasWidth / frameWidth;
      const scaleY = canvasHeight / frameHeight;
      finalScale = Math.min(scaleX, scaleY) * 0.8;

      finalOffsetX = (canvasWidth - frameWidth * finalScale) / 2;
      finalOffsetY = (canvasHeight - frameHeight * finalScale) / 2;

      refMinX = minX;
      refMinY = minY;
    }

    // Função para normalizar
    const normalize = (p: MediaPipePoint) => ({
      ...p,
      x: (p.x - refMinX) * finalScale + finalOffsetX,
      y: (p.y - refMinY) * finalScale + finalOffsetY
    });

    // Se for CSV de todos os pontos, normalizar diretamente
    if (csvType === 'all_points') {
      const normalized = currentFramePoints.map(normalize);
      return {
        normalizedPoints: normalized,
        eyeContours: { right: [], left: [] }
      };
    }

    // Lógica para CSV de pontos dos olhos
    const rightUpper = currentFramePoints
      .filter(p => p.group === 'right_upper')
      .sort((a, b) => getLabelNumber(a.label) - getLabelNumber(b.label));
    const rightLower = currentFramePoints
      .filter(p => p.group === 'right_lower')
      .sort((a, b) => getLabelNumber(a.label) - getLabelNumber(b.label));
    const leftUpper = currentFramePoints
      .filter(p => p.group === 'left_upper')
      .sort((a, b) => getLabelNumber(a.label) - getLabelNumber(b.label));
    const leftLower = currentFramePoints
      .filter(p => p.group === 'left_lower')
      .sort((a, b) => getLabelNumber(a.label) - getLabelNumber(b.label));

    // Calcular abertura atual do olho (distância vertical entre upper e lower)
    const calcEyeOpening = (upper: typeof rightUpper, lower: typeof rightLower) => {
      const upperAvgY = upper.reduce((sum, p) => sum + p.y, 0) / upper.length;
      const lowerAvgY = lower.reduce((sum, p) => sum + p.y, 0) / lower.length;
      return Math.abs(lowerAvgY - upperAvgY);
    };

    const calcEyeCenter = (upper: typeof rightUpper, lower: typeof rightLower) => {
      const allPoints = [...upper, ...lower];
      return {
        x: allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length,
        y: allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length
      };
    };

    const rightOpening = calcEyeOpening(rightUpper, rightLower);
    const leftOpening = calcEyeOpening(leftUpper, leftLower);
    const rightCenter = calcEyeCenter(rightUpper, rightLower);
    const leftCenter = calcEyeCenter(leftUpper, leftLower);

    // Abertura de referência (olho totalmente aberto) - ~40px baseado nos dados
    const referenceOpening = 40;

    // Fator de amplificação do FECHAMENTO (quanto menor a abertura, mais exagera)
    const closingAmplification = 4.0;

    // Função para normalizar COM amplificação do fechamento
    // Quando abertura = referência (aberto), não amplifica
    // Quando abertura < referência (fechando), aproxima os pontos do centro
    const normalizeWithClosingAmplification = (
      p: MediaPipePoint,
      eyeCenterY: number,
      currentOpening: number,
      isUpper: boolean
    ) => {
      const base = normalize(p);
      const normalizedCenterY = (eyeCenterY - refMinY) * finalScale + finalOffsetY;

      // Calcular quanto o olho está fechado (0 = aberto, 1 = fechado)
      const closingRatio = Math.max(0, 1 - (currentOpening / referenceOpening));

      // Distância do centro
      const distFromCenter = base.y - normalizedCenterY;

      // Quanto mais fechado, mais aproxima do centro (reduz a distância)
      const amplifiedDist = distFromCenter * (1 - closingRatio * (1 - 1/closingAmplification));

      return { ...base, y: normalizedCenterY + amplifiedDist };
    };

    // Normalizar com amplificação do fechamento
    const normalizedRightUpper = rightUpper.map(p =>
      normalizeWithClosingAmplification(p, rightCenter.y, rightOpening, true));
    const normalizedRightLower = rightLower.map(p =>
      normalizeWithClosingAmplification(p, rightCenter.y, rightOpening, false));
    const normalizedLeftUpper = leftUpper.map(p =>
      normalizeWithClosingAmplification(p, leftCenter.y, leftOpening, true));
    const normalizedLeftLower = leftLower.map(p =>
      normalizeWithClosingAmplification(p, leftCenter.y, leftOpening, false));

    // Criar contornos dos olhos ordenados por coordenada Y (upper vs lower)
    const createEyeContour = (upper: typeof normalizedRightUpper, lower: typeof normalizedRightLower) => {
      const allPoints = [...upper, ...lower];
      const avgY = allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length;

      // Upper = pontos acima da média (menor Y), Lower = pontos abaixo (maior Y)
      const upperPoints = allPoints.filter(p => p.y <= avgY).sort((a, b) => a.x - b.x);
      const lowerPoints = allPoints.filter(p => p.y > avgY).sort((a, b) => b.x - a.x);

      return [...upperPoints, ...lowerPoints];
    };

    const rightContour = createEyeContour(normalizedRightUpper, normalizedRightLower);
    const leftContour = createEyeContour(normalizedLeftUpper, normalizedLeftLower);

    return {
      normalizedPoints: [
        ...normalizedRightUpper,
        ...normalizedRightLower,
        ...normalizedLeftUpper,
        ...normalizedLeftLower
      ],
      eyeContours: {
        right: rightContour,
        left: leftContour
      }
    };
  }, [currentFramePoints, csvType, globalBounds, isStabilized]);

  // Calcular dimensões do canvas
  const canvasDimensions = useMemo(() => {
    return {
      width: 600,
      height: 400
    };
  }, []);

  // Controles de playback
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextFrame = () => {
    if (currentFrame < data.length - 1) {
      setCurrentFrame(currentFrame + 1);
    }
  };

  const handlePrevFrame = () => {
    if (currentFrame > 0) {
      setCurrentFrame(currentFrame - 1);
    }
  };

  const handleRestart = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  // Auto-play
  useEffect(() => {
    if (!isPlaying || !data.length) return;

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev >= data.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, data.length, playbackSpeed]);

  return (
    <SidebarInset>
      <div className="flex-1 space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Visualização Interativa de Pontos Faciais</h1>
          <p className="text-muted-foreground">
            Visualize os pontos do MediaPipe frame por frame
          </p>
        </div>

        <div className="grid gap-6">
          {/* Upload de Arquivo Local */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-6 w-6 text-primary" />
                <CardTitle>Upload de Planilha CSV</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
                {uploadedFile && (
                  <Button
                    onClick={handleProcessUploadedFile}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Carregar Arquivo"
                    )}
                  </Button>
                )}
              </div>
              {uploadedFile && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <span className="font-semibold">Arquivo selecionado:</span> {uploadedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tamanho: {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou selecione do armazenamento
              </span>
            </div>
          </div>

          <CSVSelector
            selectedCSV={selectedCSVUrl}
            onCSVSelect={(url, filename) => {
              setSelectedCSVUrl(url)
              setSelectedCSVFilename(filename)
              setUploadedFile(null) // Limpar arquivo local selecionado
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }}
          />

          {selectedCSVUrl && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-6 w-6 text-primary" />
                  <CardTitle>Processar Planilha Selecionada</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold">Planilha Selecionada:</p>
                  <p className="text-sm text-muted-foreground">{selectedCSVFilename}</p>
                </div>

                <Button
                  onClick={handleCSVLoad}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    "Carregar Planilha"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {data.length > 0 && (
            <>
              {/* Informações do Arquivo Carregado */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Arquivo Carregado:</p>
                      <p className="text-lg">
                        {uploadedFile?.name || selectedCSVFilename || 'CSV carregado'}
                      </p>
                      <div className="mt-2">
                        {csvType === 'eyes_only' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            👁️ Pontos dos Olhos (32 pontos)
                          </span>
                        )}
                        {csvType === 'all_points' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            🎯 Todos os Pontos Faciais (478 pontos)
                          </span>
                        )}
                        {csvType === 'unknown' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            ❓ Formato Desconhecido
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total de Frames</p>
                      <p className="text-2xl font-bold text-primary">{data.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Controles de Playback */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Play className="h-6 w-6 text-primary" />
                    <CardTitle>Controles de Reprodução</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button onClick={handleRestart} variant="outline" size="icon">
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button onClick={handlePrevFrame} variant="outline" size="icon">
                      <SkipForward className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button onClick={handlePlayPause} size="icon">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button onClick={handleNextFrame} variant="outline" size="icon">
                      <SkipForward className="h-4 w-4" />
                    </Button>

                    <div className="flex-1 flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">Frame: {data[currentFrame]?.frame ?? currentFrame} (índice {currentFrame + 1} / {data.length})</Label>
                      <Slider
                        value={[currentFrame]}
                        onValueChange={([value]) => setCurrentFrame(value)}
                        max={data.length - 1}
                        step={1}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Label className="text-sm">Velocidade:</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={playbackSpeed === 10 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPlaybackSpeed(10)}
                      >
                        0.5x
                      </Button>
                      <Button
                        variant={playbackSpeed === 30 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPlaybackSpeed(30)}
                      >
                        1x
                      </Button>
                      <Button
                        variant={playbackSpeed === 60 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPlaybackSpeed(60)}
                      >
                        2x
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visualização dos Pontos */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-6 w-6 text-primary" />
                      <CardTitle>Pontos Faciais - Frame {data[currentFrame]?.frame ?? currentFrame}</CardTitle>
                    </div>
                    <Button
                      variant={isStabilized ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsStabilized(!isStabilized)}
                      className="h-8 gap-2"
                    >
                      {isStabilized ? (
                        <>
                          <Scan className="h-4 w-4" />
                          Focado
                        </>
                      ) : (
                        <>
                          <Video className="h-4 w-4" />
                          Global
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative bg-gray-100 rounded-lg p-4">
                    <svg
                      width="100%"
                      height="600"
                      viewBox={`0 0 ${canvasDimensions.width} ${canvasDimensions.height}`}
                      className="border border-gray-300 bg-white rounded"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {/* Desenhar contornos fechados dos olhos */}
                      {eyeContours.right.length > 2 && (
                        <path
                          d={`${eyeContours.right.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} Z`}
                          stroke="#4A90D9"
                          strokeWidth="2"
                          fill="#4A90D9"
                          fillOpacity="0.15"
                        />
                      )}
                      {eyeContours.left.length > 2 && (
                        <path
                          d={`${eyeContours.left.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} Z`}
                          stroke="#D94A90"
                          strokeWidth="2"
                          fill="#D94A90"
                          fillOpacity="0.15"
                        />
                      )}

                      {/* Labels dos olhos */}
                      <text x="150" y="320" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#4A90D9">
                        Olho Direito
                      </text>
                      <text x="450" y="320" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#D94A90">
                        Olho Esquerdo
                      </text>

                      {/* Desenhar pontos */}
                      {normalizedPoints.map((point, idx) => {
                        // Função para verificar se o ponto é do olho
                        const isEyePoint = (pointIndex: number): boolean => {
                          // Índices dos olhos do MediaPipe (rightEyeUpper0/Lower0 e leftEyeUpper0/Lower0)
                          const eyeIndices = [
                            // Right eye
                            246, 161, 160, 159, 158, 157, 173, // upper
                            33, 7, 163, 144, 145, 153, 154, 155, 133, // lower
                            // Left eye
                            466, 388, 387, 386, 385, 384, 398, // upper
                            263, 249, 390, 373, 374, 380, 381, 382, 362 // lower
                          ];
                          return eyeIndices.includes(pointIndex);
                        };

                        // Determinar cor do ponto
                        let config;
                        if (point.group === 'all_points') {
                          // Extrair índice do label (ex: "P123" -> 123)
                          const pointIndex = parseInt(point.label.substring(1));
                          const isEye = isEyePoint(pointIndex);
                          config = {
                            color: isEye ? '#FF0000' : '#00FF00', // Vermelho para olhos, verde para resto
                            label: 'P'
                          };
                        } else {
                          config = pointsConfig[point.group as keyof typeof pointsConfig];
                        }

                        return (
                          <g key={idx}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r={csvType === 'all_points' ? "3" : "8"}
                              fill={config.color}
                              stroke="white"
                              strokeWidth="2"
                            />
                            {csvType === 'eyes_only' && (
                              <text
                                x={point.x}
                                y={point.group === 'right_lower' || point.group === 'left_lower'
                                  ? point.y + 20  // Labels abaixo para pontos lower
                                  : point.y - 14  // Labels acima para pontos upper
                                }
                                fontSize="12"
                                fontWeight="bold"
                                textAnchor="middle"
                                fill={config.color}
                                stroke="white"
                                strokeWidth="0.5"
                                paintOrder="stroke"
                              >
                                {point.label}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Legenda */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {csvType === 'eyes_only' && Object.entries(pointsConfig).map(([group, config]) => (
                      <div key={group} className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className="text-sm">
                          {group.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ({config.label})
                        </span>
                      </div>
                    ))}
                    {csvType === 'all_points' && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border-2 border-white bg-red-500" />
                          <span className="text-sm">Pontos dos Olhos (32 pontos)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border-2 border-white bg-green-500" />
                          <span className="text-sm">Outros Pontos (446 pontos)</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Métricas de Abertura dos Olhos */}
              {csvType === 'eyes_only' && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardHeader>
                    <CardTitle>Abertura dos Olhos (Debug)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Calcular abertura vertical dos olhos usando pontos centrais
                      const rightUpper = currentFramePoints.filter(p => p.group === 'right_upper');
                      const rightLower = currentFramePoints.filter(p => p.group === 'right_lower');
                      const leftUpper = currentFramePoints.filter(p => p.group === 'left_upper');
                      const leftLower = currentFramePoints.filter(p => p.group === 'left_lower');

                      // Ponto central superior (RU4) e inferior (RL5) para olho direito
                      const ru4 = rightUpper.find(p => p.label === 'RU4');
                      const rl5 = rightLower.find(p => p.label === 'RL5');
                      const rightOpening = ru4 && rl5 ? Math.abs(rl5.y - ru4.y) : 0;

                      // Ponto central superior (LU4) e inferior (LL5) para olho esquerdo
                      const lu4 = leftUpper.find(p => p.label === 'LU4');
                      const ll5 = leftLower.find(p => p.label === 'LL5');
                      const leftOpening = lu4 && ll5 ? Math.abs(ll5.y - lu4.y) : 0;

                      return (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white rounded-lg border">
                            <div className="text-sm font-semibold text-blue-600">Olho Direito</div>
                            <div className="text-2xl font-bold">{rightOpening.toFixed(1)} px</div>
                            <div className="text-xs text-muted-foreground">
                              RU4.y: {ru4?.y.toFixed(0)} → RL5.y: {rl5?.y.toFixed(0)}
                            </div>
                          </div>
                          <div className="p-4 bg-white rounded-lg border">
                            <div className="text-sm font-semibold text-pink-600">Olho Esquerdo</div>
                            <div className="text-2xl font-bold">{leftOpening.toFixed(1)} px</div>
                            <div className="text-xs text-muted-foreground">
                              LU4.y: {lu4?.y.toFixed(0)} → LL5.y: {ll5?.y.toFixed(0)}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Tabela de Coordenadas */}
              <Card>
                <CardHeader>
                  <CardTitle>Coordenadas do Frame Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                    {currentFramePoints.map((point, idx) => {
                      // Determinar cor (mesma lógica da visualização)
                      let config;
                      if (point.group === 'all_points') {
                        const eyeIndices = [
                          246, 161, 160, 159, 158, 157, 173,
                          33, 7, 163, 144, 145, 153, 154, 155, 133,
                          466, 388, 387, 386, 385, 384, 398,
                          263, 249, 390, 373, 374, 380, 381, 382, 362
                        ];
                        const pointIndex = parseInt(point.label.substring(1));
                        const isEye = eyeIndices.includes(pointIndex);
                        config = {
                          color: isEye ? '#FF0000' : '#00FF00',
                          label: 'P'
                        };
                      } else {
                        config = pointsConfig[point.group as keyof typeof pointsConfig];
                      }

                      return (
                        <div key={idx} className="p-3 bg-muted rounded-lg">
                          <div className="font-semibold text-sm" style={{ color: config.color }}>
                            {point.label}
                          </div>
                          <div className="text-xs mt-1">
                            <div>X: {point.x.toFixed(2)}</div>
                            <div>Y: {point.y.toFixed(2)}</div>
                            {point.z !== undefined && <div>Z: {point.z.toFixed(2)}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </SidebarInset>
  );
}
