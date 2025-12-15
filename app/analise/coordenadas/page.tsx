"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { Inter, JetBrains_Mono } from "next/font/google"
import { motion } from "framer-motion"
import {
  Activity,
  Eye,
  Settings,
  FileText,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Upload,
  Scan,
  Maximize2,
  Minimize2,
  Loader2
} from "lucide-react"
import { SidebarInset } from "@/components/ui/sidebar"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"

// --- TYPES ---
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

// --- FONT CONFIG ---
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
})

export default function ClinicalPreviewPage() {
  // --- STATE ---
  const [data, setData] = useState<FrameData[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(30)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [csvType, setCSVType] = useState<CSVType>('unknown')
  const [isStabilized, setIsStabilized] = useState(true) // Default to Focused view

  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- LOGIC: CSV PROCESSING ---
  const pointsConfig = {
    right_upper: { count: 7, color: '#0284c7', label: 'RU' }, // Sky 600
    right_lower: { count: 9, color: '#0284c7', label: 'RL' },
    left_upper: { count: 7, color: '#0d9488', label: 'LU' },  // Teal 600
    left_lower: { count: 9, color: '#0d9488', label: 'LL' }
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
      if (obj.frame === undefined) obj.frame = idx;
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
    handleProcessFile(file);
  };

  const handleProcessFile = async (file: File) => {
    try {
      setLoading(true);
      const text = await file.text();
      const parsedData = processCSVText(text);
      setData(parsedData);
      setCurrentFrame(0);
      setIsPlaying(false);
      toast.success(`${parsedData.length} frames carregados com sucesso!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: DATA EXTRACTION ---

  // Extract points for current frame
  const currentFramePoints = useMemo(() => {
    if (!data.length || currentFrame >= data.length) return [];

    const frameData = data[currentFrame];
    const points: MediaPipePoint[] = [];

    if (csvType === 'eyes_only') {
      Object.entries(pointsConfig).forEach(([group, config]) => {
        for (let i = 1; i <= config.count; i++) {
          const x = frameData[`${group}_${i}_x`];
          const y = frameData[`${group}_${i}_y`];
          if (x !== undefined && y !== undefined) {
            points.push({ x, y, label: `${config.label}${i}`, group: group as any });
          }
        }
      });
    } else if (csvType === 'all_points') {
      for (let i = 0; i < 478; i++) {
        const x = frameData[`point_${i}_x`];
        const y = frameData[`point_${i}_y`];
        const z = frameData[`point_${i}_z`];
        if (x !== undefined && y !== undefined) {
          points.push({ x, y, z, label: `P${i}`, group: 'all_points' });
        }
      }
    }
    return points;
  }, [data, currentFrame, csvType]);

  // Calculate Global Bounds (for stable visualization)
  const globalBounds = useMemo(() => {
    if (!data.length) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    // Sample usage for performance optimization: check every 10th frame
    const sampleRate = Math.max(1, Math.floor(data.length / 100)); // Limit to ~100 checks

    for (let i = 0; i < data.length; i += sampleRate) {
      const frameData = data[i];
      if (csvType === 'eyes_only') {
        Object.keys(pointsConfig).forEach(group => {
          for (let j = 1; j <= 3; j++) {
            const x = frameData[`${group}_${j}_x`];
            const y = frameData[`${group}_${j}_y`];
            if (x) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
            if (y) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
          }
        });
      } else if (csvType === 'all_points') {
        const keyPoints = [33, 133, 362, 263, 1, 152]; // Eye corners, nose, chin
        keyPoints.forEach(idx => {
          const x = frameData[`point_${idx}_x`];
          const y = frameData[`point_${idx}_y`];
          if (x) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
          if (y) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
        });
      }
    }

    // Safety fallback
    if (minX === Infinity) return { minX: 0, maxX: 1920, minY: 0, maxY: 1080 };
    return { minX, maxX, minY, maxY };
  }, [data, csvType]);

  // Normalize Points for Render
  const { normalizedPoints, metrics } = useMemo(() => {
    if (!currentFramePoints.length || !globalBounds)
      return {
        normalizedPoints: [],
        metrics: { ru: 0, rl: 0, lu: 0, ll: 0, rightOpening: 0, leftOpening: 0 }
      };

    const canvasWidth = 800;
    const canvasHeight = 600;

    let scale = 1, offsetX = 0, offsetY = 0;

    if (isStabilized) {
      // Find center of current points
      const xs = currentFramePoints.map(p => p.x);
      const ys = currentFramePoints.map(p => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);

      const contentWidth = maxX - minX || 1;
      const contentHeight = maxY - minY || 1;

      // Fit content with padding
      const scaleX = (canvasWidth * 0.6) / contentWidth;
      const scaleY = (canvasHeight * 0.6) / contentHeight;
      scale = Math.min(scaleX, scaleY); // Keep aspect ratio

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      offsetX = (canvasWidth / 2) - (centerX * scale);
      offsetY = (canvasHeight / 2) - (centerY * scale);

    } else {
      // Global view
      const { minX, maxX, minY, maxY } = globalBounds;
      const globalW = maxX - minX || 1920;
      const globalH = maxY - minY || 1080;

      scale = Math.min(canvasWidth / globalW, canvasHeight / globalH) * 0.8;
      offsetX = (canvasWidth - (globalW * scale)) / 2 - (minX * scale);
      offsetY = (canvasHeight - (globalH * scale)) / 2 - (minY * scale);
    }

    const normalized = currentFramePoints.map(p => ({
      ...p,
      x: p.x * scale + offsetX,
      y: p.y * scale + offsetY
    }));

    // --- Metrics Calculation ---

    // Helper to get Y coordinate for a specific landmark index from RAW points (not normalized)
    const getPointY = (idx: number) => {
      // For all_points, label is like "P159"
      const pt = currentFramePoints.find(p => p.label === `P${idx}`);
      return pt ? pt.y : 0;
    };

    let rawRightOpening = 0;
    let rawLeftOpening = 0;

    if (csvType === 'eyes_only') {
      const getGroupAvgY = (group: string) => {
        const pts = currentFramePoints.filter(p => p.group === group);
        if (!pts.length) return 0;
        return pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
      };
      const rawRightUpperY = getGroupAvgY('right_upper');
      const rawRightLowerY = getGroupAvgY('right_lower');
      const rawLeftUpperY = getGroupAvgY('left_upper');
      const rawLeftLowerY = getGroupAvgY('left_lower');

      rawRightOpening = Math.abs(rawRightLowerY - rawRightUpperY);
      rawLeftOpening = Math.abs(rawLeftLowerY - rawLeftUpperY);
    } else {
      // Full Mesh Mode - Use specific landmarks
      // Right Eye: Upper (159) - Lower (145)
      const rUpper = getPointY(159);
      const rLower = getPointY(145);
      if (rUpper && rLower) rawRightOpening = Math.abs(rLower - rUpper);

      // Left Eye: Upper (386) - Lower (374)
      const lUpper = getPointY(386);
      const lLower = getPointY(374);
      if (lUpper && lLower) rawLeftOpening = Math.abs(lLower - lUpper);
    }

    return {
      normalizedPoints: normalized,
      metrics: {
        rightOpening: rawRightOpening,
        leftOpening: rawLeftOpening
      }
    };

  }, [currentFramePoints, globalBounds, isStabilized, csvType]);


  // --- LOGIC: PLAYBACK ---
  useEffect(() => {
    if (isPlaying && data.length) {
      const interval = setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= data.length - 1) { setIsPlaying(false); return prev; }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
      return () => clearInterval(interval);
    }
  }, [isPlaying, data.length, playbackSpeed]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  // --- RENDER ---
  return (
    <SidebarInset>
      <div className={`min-h-full bg-gradient-to-b from-[#f0f9ff] to-slate-50 text-slate-900 p-8 font-sans ${inter.variable} ${mono.variable}`}>

        <div className="max-w-[1600px] mx-auto space-y-6">

          {/* HEADER */}
          <header className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-600 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
                  <Eye size={24} strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
                    Análise Fina de Coordenadas
                  </h1>
                  <span className="text-xs font-medium text-sky-600 uppercase tracking-wider">Clinical Suite</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm ml-[3.25rem]">
                Visualização detalhada frame-by-frame dos landmarks faciais
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium text-sm hover:bg-slate-50 hover:text-sky-600 transition-colors shadow-sm cursor-pointer">
                <Upload size={18} />
                Carregar CSV
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

            </div>
          </header>

          {/* EMPTY STATE */}
          {!data.length && !loading && (
            <div className="h-[400px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-white/50">
              <Upload size={48} className="mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-slate-600">Nenhum dado carregado</h3>
              <p className="text-sm mb-6">Carregue um arquivo .csv gerado pelos scripts de análise</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                Selecionar Arquivo
              </Button>
            </div>
          )}

          {loading && (
            <div className="h-[400px] flex flex-col items-center justify-center text-sky-600">
              <Loader2 size={48} className="animate-spin mb-4" />
              <p className="font-medium">Processando dados...</p>
            </div>
          )}

          {/* MAIN CONTENT */}
          {data.length > 0 && (
            <>
              {/* STATUS BAR */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 flex items-center gap-6 shadow-sm"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50/50 text-sky-700 rounded-full text-xs font-semibold border border-sky-100">
                  <Activity size={14} />
                  Frames: {data.length}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50/50 text-teal-700 rounded-full text-xs font-semibold border border-teal-100">
                  <Scan size={14} />
                  Modo: {csvType === 'all_points' ? 'Full Mesh (478 pts)' : 'Eyes Only (32 pts)'}
                </div>

                <div className="ml-auto font-mono text-xs text-slate-400 flex items-center gap-4">
                  <span>FPS:
                    <select
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      className="bg-transparent font-bold text-slate-600 ml-1 cursor-pointer focus:outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={30}>30</option>
                      <option value={60}>60</option>
                      <option value={120}>120</option>
                    </select>
                  </span>
                  {uploadedFile && <span>{uploadedFile.name}</span>}
                </div>
              </motion.div>

              {/* DASHBOARD GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] gap-6">

                {/* COL 1: VISUALIZATION */}
                <div className="space-y-4">
                  {/* CANVAS WRAPPER */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative h-[600px] group">

                    {/* Grid Tool Layer */}
                    <div className="absolute inset-0 pointer-events-none opacity-50"
                      style={{
                        backgroundImage: `linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                      }}
                    />

                    {/* View Controls */}
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                      <button
                        onClick={() => setIsStabilized(!isStabilized)}
                        className="bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg text-slate-600 hover:text-sky-600 hover:border-sky-200 transition-all shadow-sm"
                        title={isStabilized ? "Modo Estabilizado (Focado)" : "Modo Global (Original)"}
                      >
                        {isStabilized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                      </button>
                    </div>

                    {/* Legend */}
                    <div className="absolute top-4 left-4 flex gap-3 pointer-events-none">
                      {csvType === 'eyes_only' && (
                        <>
                          <div className="flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur rounded-full border border-green-100 text-xs font-medium text-green-700 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            EAR (Verde)
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur rounded-full border border-sky-100 text-xs font-medium text-sky-700 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div>
                            Contorno (Azul)
                          </div>
                        </>
                      )}
                      {csvType === 'all_points' && (
                        <>
                          <div className="flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur rounded-full border border-green-100 text-xs font-medium text-green-700 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            Ponto EAR
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur rounded-full border border-red-100 text-xs font-medium text-red-700 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            Contorno Olhos
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur rounded-full border border-cyan-100 text-xs font-medium text-cyan-600 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                            Íris
                          </div>
                        </>
                      )}
                    </div>

                    {/* SVG RENDERER */}
                    <svg className="w-full h-full" viewBox="0 0 800 600">
                      {normalizedPoints.map((p, i) => {
                        let fill = '#94a3b8'; // default slate-400
                        let r = 2;
                        let isEAR = false;

                        // EAR DETECTION LOGIC
                        if (csvType === 'all_points') {
                          const idx = parseInt(p.label.substring(1));
                          const earIndices = [33, 160, 158, 133, 153, 144, 362, 385, 387, 263, 373, 380];
                          isEAR = earIndices.includes(idx);
                        } else {
                          const earLabels = ['RL1', 'RU3', 'RU5', 'RL9', 'RL6', 'RL4', 'LL1', 'LU3', 'LU5', 'LL9', 'LL6', 'LL4'];
                          isEAR = earLabels.includes(p.label);
                        }

                        if (isEAR) {
                          fill = '#22c55e'; // GREEN-500 (VIBRANT)
                          r = 4.5;
                        } else if (csvType === 'eyes_only') {
                          if (p.group.includes('right')) fill = '#0ea5e9'; // sky-500
                          if (p.group.includes('left')) fill = '#14b8a6';  // teal-500
                        }
                        else if (csvType === 'all_points') {
                          const idx = parseInt(p.label.substring(1));
                          // Iris Indices (Left and Right)
                          const rightIris = [469, 470, 471, 472];
                          const leftIris = [474, 475, 476, 477];
                          // Eye Contour Indices (Upper/Lower for both eyes)
                          const rightEyeContour = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
                          const leftEyeContour = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

                          if (rightIris.includes(idx) || leftIris.includes(idx)) {
                            fill = '#06b6d4'; // cyan-500
                            r = 3;
                          } else if (rightEyeContour.includes(idx) || leftEyeContour.includes(idx)) {
                            fill = '#ef4444'; // red-500
                            r = 2.5;
                          } else {
                            fill = '#cbd5e1'; // slate-300
                            r = 1.5;
                          }
                        }

                        return (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={r}
                            fill={fill}
                            className="transition-all duration-75 ease-linear"
                          />
                        )
                      })}
                    </svg>

                  </div>

                  {/* PLAYER CONTROLS */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 active:scale-95"
                    >
                      {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <div className="flex gap-1">
                      <button onClick={() => setCurrentFrame(prev => Math.max(0, prev - 1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <SkipBack size={18} />
                      </button>
                      <button onClick={() => setCurrentFrame(prev => Math.min(data.length - 1, prev + 1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <SkipForward size={18} />
                      </button>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 flex flex-col gap-1">
                      <Slider
                        value={[currentFrame]}
                        min={0}
                        max={data.length - 1}
                        step={1}
                        onValueChange={(val) => setCurrentFrame(val[0])}
                        className="py-2 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        <span>Start</span>
                        <span>End</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end min-w-[100px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frame</span>
                      <div className="font-mono text-sm font-medium text-slate-700">
                        <span className="text-sky-600 font-bold">{data[currentFrame]?.frame ?? currentFrame}</span> / {data.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* COL 2: METRICS */}
                <div className="flex flex-col gap-6">

                  {/* OPENING METRICS CARD */}
                  <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Eye size={14} />
                      Abertura (Pixels)
                    </h3>

                    <div className="space-y-6">
                      {/* Right Eye */}
                      <div className="pl-4 border-l-4 border-sky-500">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Olho Direito</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-light text-slate-900 tracking-tight font-mono">
                            {metrics.rightOpening.toFixed(1)}
                          </span>
                          <span className="text-sm font-medium text-slate-500">px</span>
                        </div>
                      </div>

                      {/* Left Eye */}
                      <div className="pl-4 border-l-4 border-teal-500">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Olho Esquerdo</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-light text-slate-900 tracking-tight font-mono">
                            {metrics.leftOpening.toFixed(1)}
                          </span>
                          <span className="text-sm font-medium text-slate-500">px</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RAW COORDINATES LIST */}
                  <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 flex-1 min-h-[300px] flex flex-col shadow-sm max-h-[500px]">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Coordenadas Raw</h3>
                    </div>

                    <div className="overflow-y-auto flex-1 p-0 font-mono text-xs custom-scrollbar">
                      {currentFramePoints.length > 0 ? (
                        currentFramePoints.slice(0, 100).map((p, i) => (
                          <div key={i} className="flex justify-between items-center px-4 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors">
                            <span className={`font-bold w-12 flex items-center gap-2 ${p.group.includes('left') ? 'text-teal-600' : 'text-sky-600'}`}>
                              {p.label}
                            </span>
                            <div className="flex gap-4 text-slate-500">
                              <span className="w-20">X: <span className="text-slate-900">{p.x.toFixed(1)}</span></span>
                              <span className="w-20">Y: <span className="text-slate-900">{p.y.toFixed(1)}</span></span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-slate-400 italic">Sem pontos</div>
                      )}
                      {currentFramePoints.length > 100 && (
                        <div className="p-2 text-center text-slate-400 italic text-[10px]">
                          + {currentFramePoints.length - 100} pontos ocultos
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}

        </div>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
      </div>
    </SidebarInset>
  )
}
