"use client";

import React, { useState, useMemo, useEffect, useRef } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Eye, Play, Pause, SkipBack, SkipForward, Upload, Video, Scan, Activity, Maximize2, Minimize2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

interface MediaPipePoint {
  x: number;
  y: number;
  z?: number;
  label: string;
  group: 'right_upper' | 'right_lower' | 'left_upper' | 'left_lower' | 'all_points';
}

interface FrameData {
  frame: number;
  method: string;
  [key: string]: any;
}

type CSVType = 'eyes_only' | 'all_points' | 'unknown';

export default function CoordenadasPageRedesign() {
  const [data, setData] = useState<FrameData[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(30);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvType, setCSVType] = useState<CSVType>('unknown');
  const [isStabilized, setIsStabilized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pointsConfig = {
    right_upper: { count: 7, color: '#00F0FF', label: 'RU' },
    right_lower: { count: 9, color: '#FF006E', label: 'RL' },
    left_upper: { count: 7, color: '#FFB800', label: 'LU' },
    left_lower: { count: 9, color: '#8B5CF6', label: 'LL' }
  };

  const detectCSVType = (headers: string[]): CSVType => {
    const hasEyePoints = headers.some(h =>
      h.includes('right_upper_') || h.includes('right_lower_') ||
      h.includes('left_upper_') || h.includes('left_lower_')
    );
    const hasAllPoints = headers.some(h => h.match(/^point_\d+_[xyz]$/));
    if (hasAllPoints) return 'all_points';
    if (hasEyePoints) return 'eyes_only';
    return 'unknown';
  };

  const processCSVText = (text: string) => {
    const rows = text.split("\n").filter(row => row.trim());
    const headers = rows[0].split(",");
    const detectedType = detectCSVType(headers);
    setCSVType(detectedType);

    const parsedData: FrameData[] = rows.slice(1).map((row, idx) => {
      const values = row.split(",");
      const obj: any = {};
      headers.forEach((header, i) => {
        const value = values[i];
        obj[header] = isNaN(Number(value)) ? value : Number(value);
      });
      if (obj.frame === undefined) {
        obj.frame = idx;
      }
      return obj;
    });

    return parsedData;
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
    if (!uploadedFile) return;

    setLoading(true);
    try {
      const text = await uploadedFile.text();
      const parsed = processCSVText(text);
      setData(parsed);
      setCurrentFrame(0);
      toast.success(`${parsed.length} frames carregados`);
    } catch (error) {
      toast.error("Erro ao processar arquivo");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const currentFramePoints = useMemo(() => {
    if (!data.length) return [];
    const frame = data[currentFrame];
    const points: MediaPipePoint[] = [];

    if (csvType === 'eyes_only') {
      Object.entries(pointsConfig).forEach(([group, config]) => {
        for (let i = 1; i <= config.count; i++) {
          const xKey = `${group}_${i}_x`;
          const yKey = `${group}_${i}_y`;
          if (frame[xKey] !== undefined && frame[yKey] !== undefined) {
            points.push({
              x: frame[xKey],
              y: frame[yKey],
              label: `${config.label}${i}`,
              group: group as any
            });
          }
        }
      });
    }

    return points;
  }, [data, currentFrame, csvType]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handlePrevFrame = () => setCurrentFrame(prev => Math.max(0, prev - 1));
  const handleNextFrame = () => setCurrentFrame(prev => Math.min(data.length - 1, prev + 1));

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

  // Cálculo dos bounds globais e normalização (simplificado para o exemplo)
  const globalBounds = useMemo(() => {
    if (!data.length || csvType !== 'eyes_only') return { minX: 0, maxX: 1920, minY: 0, maxY: 1080 };

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    data.forEach(frame => {
      Object.entries(pointsConfig).forEach(([group, config]) => {
        for (let i = 1; i <= config.count; i++) {
          const x = frame[`${group}_${i}_x`];
          const y = frame[`${group}_${i}_y`];
          if (x !== undefined && y !== undefined) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      });
    });

    return { minX, maxX, minY, maxY };
  }, [data, csvType]);

  const visualizationData = useMemo(() => {
    if (!currentFramePoints.length) return { normalizedPoints: [], eyeContours: { right: [], left: [] }, rightOpening: 0, leftOpening: 0 };

    const canvasWidth = 800;
    const canvasHeight = 600;
    const { minX, maxX, minY, maxY } = globalBounds;

    const normalize = (p: MediaPipePoint) => {
      const scale = isStabilized ? 2.5 : 1;
      const width = maxX - minX || 1;
      const height = maxY - minY || 1;

      let x = ((p.x - minX) / width) * canvasWidth * 0.9 + canvasWidth * 0.05;
      let y = ((p.y - minY) / height) * canvasHeight * 0.9 + canvasHeight * 0.05;

      if (isStabilized) {
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        x = centerX + (x - centerX) * scale;
        y = centerY + (y - centerY) * scale;
      }

      return { ...p, x, y };
    };

    const normalizedPoints = currentFramePoints.map(normalize);

    const rightUpper = normalizedPoints.filter(p => p.group === 'right_upper').sort((a, b) => a.x - b.x);
    const rightLower = normalizedPoints.filter(p => p.group === 'right_lower').sort((a, b) => b.x - a.x);
    const leftUpper = normalizedPoints.filter(p => p.group === 'left_upper').sort((a, b) => a.x - b.x);
    const leftLower = normalizedPoints.filter(p => p.group === 'left_lower').sort((a, b) => b.x - a.x);

    const rightContour = [...rightUpper, ...rightLower];
    const leftContour = [...leftUpper, ...leftLower];

    const calcOpening = (upper: typeof rightUpper, lower: typeof rightLower) => {
      if (!upper.length || !lower.length) return 0;
      const upperY = upper.reduce((sum, p) => sum + p.y, 0) / upper.length;
      const lowerY = lower.reduce((sum, p) => sum + p.y, 0) / lower.length;
      return Math.abs(lowerY - upperY);
    };

    return {
      normalizedPoints,
      eyeContours: { right: rightContour, left: leftContour },
      rightOpening: calcOpening(rightUpper, rightLower),
      leftOpening: calcOpening(leftUpper, leftLower)
    };
  }, [currentFramePoints, globalBounds, isStabilized]);

  return (
    <SidebarInset>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700;800&display=swap');

        :root {
          --bg-primary: #0a0e1a;
          --bg-secondary: #111827;
          --bg-tertiary: #1a2332;
          --accent-cyan: #00f0ff;
          --accent-magenta: #ff006e;
          --accent-yellow: #ffb800;
          --accent-purple: #8b5cf6;
          --text-primary: #f8fafc;
          --text-secondary: #94a3b8;
          --text-muted: #475569;
          --border-color: #1e293b;
          --glow-cyan: rgba(0, 240, 255, 0.3);
          --glow-magenta: rgba(255, 0, 110, 0.3);
        }

        .lab-interface {
          font-family: 'Inter Tight', sans-serif;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
          color: var(--text-primary);
          min-height: 100vh;
        }

        .mono-text {
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: -0.02em;
        }

        .glass-card {
          background: rgba(17, 24, 39, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .glow-border-cyan {
          box-shadow: 0 0 20px var(--glow-cyan), inset 0 0 20px var(--glow-cyan);
        }

        .data-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        .point-marker {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .control-btn {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Inter Tight', sans-serif;
          font-weight: 600;
        }

        .control-btn:hover {
          background: var(--accent-cyan);
          color: var(--bg-primary);
          box-shadow: 0 0 20px var(--glow-cyan);
          transform: translateY(-2px);
        }

        .control-btn:active {
          transform: translateY(0);
        }

        .metric-card {
          background: linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
          border: 1px solid var(--accent-cyan);
          border-radius: 12px;
          padding: 1rem;
          transition: all 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px var(--glow-cyan);
        }

        .metric-value {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-purple) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .section-title {
          font-family: 'Inter Tight', sans-serif;
          font-weight: 800;
          font-size: 1.875rem;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .canvas-container {
          position: relative;
          background: radial-gradient(circle at 50% 50%, rgba(0, 240, 255, 0.05) 0%, transparent 70%);
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid var(--border-color);
        }

        .canvas-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 240, 255, 0.03) 2px,
            rgba(0, 240, 255, 0.03) 4px
          );
          pointer-events: none;
        }

        .upload-zone {
          border: 2px dashed var(--border-color);
          border-radius: 12px;
          background: rgba(17, 24, 39, 0.4);
          transition: all 0.3s ease;
        }

        .upload-zone:hover {
          border-color: var(--accent-cyan);
          background: rgba(0, 240, 255, 0.05);
        }

        .progress-bar {
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-purple) 100%);
          transition: width 0.1s linear;
          box-shadow: 0 0 10px var(--glow-cyan);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
          font-family: 'Inter Tight', sans-serif;
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid var(--accent-cyan);
          color: var(--accent-cyan);
        }

        .coordinates-table {
          max-height: 400px;
          overflow-y: auto;
        }

        .coordinates-table::-webkit-scrollbar {
          width: 8px;
        }

        .coordinates-table::-webkit-scrollbar-track {
          background: var(--bg-tertiary);
          border-radius: 4px;
        }

        .coordinates-table::-webkit-scrollbar-thumb {
          background: var(--accent-cyan);
          border-radius: 4px;
        }

        .table-row {
          transition: background 0.2s ease;
        }

        .table-row:hover {
          background: rgba(0, 240, 255, 0.05);
        }
      `}</style>

      <div className="lab-interface flex-1 p-8 space-y-6">
        {/* Header */}
        <div className="space-y-2 animate-[fadeInUp_0.5s_ease-out]">
          <div className="flex items-center gap-3">
            <Activity className="h-10 w-10 text-cyan-400" />
            <h1 className="section-title">LABORATÓRIO DE ANÁLISE OCULAR</h1>
          </div>
          <p className="text-secondary mono-text text-sm">
            Sistema de visualização frame-by-frame • MediaPipe Face Mesh Detection
          </p>
        </div>

        {/* Upload Section */}
        {!data.length && (
          <div className="glass-card p-8 animate-[fadeInUp_0.6s_ease-out_0.1s_both]">
            <div className="upload-zone p-12 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-16 w-16 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-xl font-bold mb-2">Carregar Dados CSV</h3>
                <p className="text-secondary text-sm mono-text">
                  Arraste e solte ou clique para selecionar
                </p>
                {uploadedFile && (
                  <div className="mt-4 space-y-2">
                    <div className="status-badge mx-auto">
                      <Scan className="h-4 w-4" />
                      {uploadedFile.name}
                    </div>
                    <Button
                      onClick={handleProcessUploadedFile}
                      disabled={loading}
                      className="control-btn mt-4"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>Iniciar Análise</>
                      )}
                    </Button>
                  </div>
                )}
              </label>
            </div>
          </div>
        )}

        {/* Main Interface */}
        {data.length > 0 && (
          <div className="space-y-6">
            {/* Status Bar */}
            <div className="glass-card p-4 animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="status-badge">
                    <Activity className="h-4 w-4" />
                    {data.length} frames carregados
                  </span>
                  {csvType === 'eyes_only' && (
                    <span className="status-badge" style={{ borderColor: 'var(--accent-magenta)', background: 'rgba(255, 0, 110, 0.1)', color: 'var(--accent-magenta)' }}>
                      <Eye className="h-4 w-4" />
                      32 pontos oculares
                    </span>
                  )}
                  <span className="mono-text text-sm text-secondary">
                    {uploadedFile?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono-text text-sm text-secondary">FPS:</span>
                  <span className="metric-value" style={{ fontSize: '1.5rem' }}>{playbackSpeed}</span>
                </div>
              </div>
            </div>

            {/* Main Grid */}
            <div className="data-grid">
              {/* Visualization Canvas */}
              <div className="space-y-4">
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Visualização de Pontos</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsStabilized(!isStabilized)}
                        className="control-btn px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                      >
                        {isStabilized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        {isStabilized ? 'Focado' : 'Global'}
                      </button>
                    </div>
                  </div>

                  {/* Canvas */}
                  <div className="canvas-container">
                    <svg width="800" height="600" className="w-full h-auto">
                      {/* Eye Contours */}
                      {visualizationData.eyeContours.right.length > 0 && (
                        <polygon
                          points={visualizationData.eyeContours.right.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke="var(--accent-cyan)"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          opacity="0.6"
                        />
                      )}
                      {visualizationData.eyeContours.left.length > 0 && (
                        <polygon
                          points={visualizationData.eyeContours.left.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke="var(--accent-purple)"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          opacity="0.6"
                        />
                      )}

                      {/* Points */}
                      {visualizationData.normalizedPoints.map((point, idx) => {
                        const config = pointsConfig[point.group];
                        return (
                          <g key={idx}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="6"
                              fill={config.color}
                              className="point-marker"
                              style={{ animationDelay: `${idx * 0.02}s` }}
                            />
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="12"
                              fill={config.color}
                              opacity="0.2"
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Controls */}
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <button onClick={handlePrevFrame} className="control-btn p-3 rounded-lg">
                        <SkipBack className="h-5 w-5" />
                      </button>
                      <button onClick={handlePlayPause} className="control-btn p-3 rounded-lg">
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </button>
                      <button onClick={handleNextFrame} className="control-btn p-3 rounded-lg">
                        <SkipForward className="h-5 w-5" />
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="mono-text text-sm text-secondary">Frame {data[currentFrame]?.frame ?? currentFrame}</span>
                          <span className="mono-text text-sm text-secondary">{currentFrame + 1} / {data.length}</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${((currentFrame + 1) / data.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="mono-text text-sm text-secondary min-w-[80px]">Velocidade:</span>
                      <Slider
                        value={[playbackSpeed]}
                        onValueChange={([value]) => setPlaybackSpeed(value)}
                        min={1}
                        max={120}
                        step={1}
                        className="flex-1"
                      />
                      <span className="mono-text text-sm font-bold min-w-[60px] text-right">{playbackSpeed} FPS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Sidebar */}
              <div className="space-y-4">
                {/* Eye Opening Metrics */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-cyan-400" />
                    Abertura dos Olhos
                  </h3>
                  <div className="space-y-3">
                    <div className="metric-card">
                      <div className="text-xs text-secondary mono-text mb-1">OLHO DIREITO</div>
                      <div className="metric-value">{visualizationData.rightOpening.toFixed(1)}</div>
                      <div className="text-xs text-secondary mono-text">pixels</div>
                    </div>
                    <div className="metric-card">
                      <div className="text-xs text-secondary mono-text mb-1">OLHO ESQUERDO</div>
                      <div className="metric-value">{visualizationData.leftOpening.toFixed(1)}</div>
                      <div className="text-xs text-secondary mono-text">pixels</div>
                    </div>
                  </div>
                </div>

                {/* Point Legend */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold mb-4">Legenda de Pontos</h3>
                  <div className="space-y-2">
                    {Object.entries(pointsConfig).map(([group, config]) => (
                      <div key={group} className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ background: config.color, boxShadow: `0 0 10px ${config.color}` }}
                        />
                        <span className="text-sm mono-text">
                          {config.label} - {group.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="ml-auto text-xs text-secondary mono-text">{config.count}pts</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coordinates Table */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold mb-4">Coordenadas</h3>
                  <div className="coordinates-table">
                    <div className="space-y-1">
                      {currentFramePoints.slice(0, 8).map((point, idx) => (
                        <div key={idx} className="table-row p-2 rounded flex items-center justify-between">
                          <span className="mono-text text-sm font-bold">{point.label}</span>
                          <div className="flex gap-4 mono-text text-xs text-secondary">
                            <span>X: {point.x.toFixed(1)}</span>
                            <span>Y: {point.y.toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                      {currentFramePoints.length > 8 && (
                        <div className="text-center text-xs text-secondary mono-text py-2">
                          +{currentFramePoints.length - 8} pontos adicionais
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarInset>
  );
}
