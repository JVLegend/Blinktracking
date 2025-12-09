"use client";

import React, { useState, useMemo, useEffect, useRef } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Eye, FileSpreadsheet, Play, Pause, SkipBack, SkipForward, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { CSVSelector } from "../../components/CSVSelector"

interface MediaPipePoint {
  x: number;
  y: number;
  label: string;
  group: 'right_upper' | 'right_lower' | 'left_upper' | 'left_lower';
}

interface FrameData {
  frame: number;
  method: string;
  [key: string]: any;
}

export default function CoordenadasPage() {
  const [data, setData] = useState<FrameData[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedCSVUrl, setSelectedCSVUrl] = useState<string | null>(null);
  const [selectedCSVFilename, setSelectedCSVFilename] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(30); // FPS
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuração dos pontos do MediaPipe
  const pointsConfig = {
    right_upper: { count: 7, color: '#0000FF', label: 'RU' },
    right_lower: { count: 9, color: '#FF0000', label: 'RL' },
    left_upper: { count: 7, color: '#FF8000', label: 'LU' },
    left_lower: { count: 9, color: '#8000FF', label: 'LL' }
  };

  const processCSVText = (text: string) => {
    const rows = text.split("\n").filter(row => row.trim());
    const headers = rows[0].split(",");

    const parsedData: FrameData[] = rows.slice(1).map((row, idx) => {
      const values = row.split(",");
      const obj: any = { frame: idx };
      headers.forEach((header, i) => {
        const value = values[i];
        obj[header] = isNaN(Number(value)) ? value : Number(value);
      });
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

    // Processar cada grupo de pontos
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

    return points;
  }, [data, currentFrame]);

  // Função para extrair o número do label (ex: "RU1" -> 1)
  const getLabelNumber = (label: string): number => {
    const match = label.match(/\d+$/);
    return match ? parseInt(match[0]) : 0;
  };

  // Normalizar pontos para visualização usando coordenadas reais do vídeo
  const { normalizedPoints, eyeContours } = useMemo(() => {
    if (!currentFramePoints.length) return { normalizedPoints: [], eyeContours: { right: [], left: [] } };

    // Separar pontos por olho e tipo (upper/lower) e ordenar pela ordem natural (1,2,3...)
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

    const allPoints = [...rightUpper, ...rightLower, ...leftUpper, ...leftLower];

    if (!allPoints.length) return { normalizedPoints: [], eyeContours: { right: [], left: [] } };

    // Calcular bounds globais de TODOS os pontos para escalar proporcionalmente
    const allX = allPoints.map(p => p.x);
    const allY = allPoints.map(p => p.y);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);

    // Dimensões do frame original
    const frameWidth = maxX - minX || 1;
    const frameHeight = maxY - minY || 1;

    // Dimensões do canvas de visualização
    const canvasWidth = 600;
    const canvasHeight = 400;

    // Calcular escala para caber no canvas mantendo proporção
    const scaleX = canvasWidth / frameWidth;
    const scaleY = canvasHeight / frameHeight;
    const scale = Math.min(scaleX, scaleY) * 0.8; // 0.8 para margem

    // Calcular offset para centralizar
    const offsetX = (canvasWidth - frameWidth * scale) / 2;
    const offsetY = (canvasHeight - frameHeight * scale) / 2;

    // Função para normalizar um ponto mantendo coordenadas absolutas
    const normalize = (p: MediaPipePoint) => ({
      ...p,
      x: (p.x - minX) * scale + offsetX,
      y: (p.y - minY) * scale + offsetY
    });

    // Normalizar todos os pontos
    const normalizedRightUpper = rightUpper.map(normalize);
    const normalizedRightLower = rightLower.map(normalize);
    const normalizedLeftUpper = leftUpper.map(normalize);
    const normalizedLeftLower = leftLower.map(normalize);

    // Criar contornos dos olhos
    const rightContour = [
      ...normalizedRightUpper,
      ...[...normalizedRightLower].reverse()
    ];

    const leftContour = [
      ...normalizedLeftUpper,
      ...[...normalizedLeftLower].reverse()
    ];

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
  }, [currentFramePoints]);

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
                    <div>
                      <p className="text-sm font-semibold">Arquivo Carregado:</p>
                      <p className="text-lg">
                        {uploadedFile?.name || selectedCSVFilename || 'CSV carregado'}
                      </p>
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
                      <Label className="text-sm whitespace-nowrap">Frame: {currentFrame + 1} / {data.length}</Label>
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
                  <div className="flex items-center gap-2">
                    <Eye className="h-6 w-6 text-primary" />
                    <CardTitle>Pontos Faciais - Frame {currentFrame + 1}</CardTitle>
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
                        const config = pointsConfig[point.group];

                        return (
                          <g key={idx}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="8"
                              fill={config.color}
                              stroke="white"
                              strokeWidth="2"
                            />
                            <text
                              x={point.x}
                              y={point.y - 14}
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
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Legenda */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(pointsConfig).map(([group, config]) => (
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
                  </div>
                </CardContent>
              </Card>

              {/* Tabela de Coordenadas */}
              <Card>
                <CardHeader>
                  <CardTitle>Coordenadas do Frame Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                    {currentFramePoints.map((point, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg">
                        <div className="font-semibold text-sm" style={{ color: pointsConfig[point.group].color }}>
                          {point.label}
                        </div>
                        <div className="text-xs mt-1">
                          <div>X: {point.x.toFixed(2)}</div>
                          <div>Y: {point.y.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
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
