"use client";

import { useState, useRef, useEffect } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { Inter, JetBrains_Mono } from "next/font/google";
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
  FileVideo,
  Image as ImageIcon,
  AlertTriangle,
  Layers,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { VideoSelector } from "../../components/VideoSelector";

// --- FONT CONFIG ---
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
})

// --- TYPES ---
interface ExtractedFrame {
  frameNumber: string;
  imageUrl: string;
}

interface DataPoint {
  frame: number;
  method: string;
  [key: string]: number | string | undefined;
}

export default function VisualizarFramesPage() {
  // --- STATE ---
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoFilename, setSelectedVideoFilename] = useState<string | null>(null);
  const [currentFrameInput, setCurrentFrameInput] = useState<string>('');
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([]);
  const [totalFrames, setTotalFrames] = useState(0);
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [isGridView, setIsGridView] = useState(false);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);
  const [processedFrames, setProcessedFrames] = useState<any[]>([]);
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement }>({});

  // --- LOGIC ---
  const handleExtractFrame = async () => {
    if (!selectedVideoUrl || !currentFrameInput) {
      toast.error("Por favor, selecione um vídeo e digite o número do frame.");
      return;
    }

    const frameNumber = parseInt(currentFrameInput);
    if (isNaN(frameNumber) || frameNumber < 0) {
      toast.error("Número de frame inválido");
      return;
    }

    if (extractedFrames.length >= 4) {
      toast.error("Máximo de 4 frames permitidos por vez.");
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

      if (!response.ok) throw new Error("Erro ao extrair frame");

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      setExtractedFrames(prev => [...prev, { frameNumber: currentFrameInput, imageUrl }]);
      setCurrentFrameInput('');
      toast.success("Frame extraído com sucesso!");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao extrair frame.");
    } finally {
      setIsProcessingFrame(false);
    }
  };

  const removeFrame = (frameNumber: string) => {
    setExtractedFrames(prev => prev.filter(frame => frame.frameNumber !== frameNumber));
    if (selectedFrame === frameNumber) setSelectedFrame(null);
  };

  const drawPoints = (frameNumber: string, imageUrl: string, points: any) => {
    const canvas = canvasRefs.current[frameNumber];
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Simple visualization for demo
      ctx.fillStyle = '#10b981'; // Emerald-500
      ctx.beginPath();
      ctx.arc(50, 50, 10, 0, 2 * Math.PI);
      ctx.fill();
    };
  };

  return (
    <SidebarInset>
      <div className={`min-h-full bg-gradient-to-b from-[#ecfdf5] to-slate-50 text-slate-900 p-8 font-sans ${inter.variable} ${mono.variable}`}>
        <div className="max-w-[1400px] mx-auto space-y-8">

          {/* HEADER */}
          <header className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <ImageIcon size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-none">
                Visualizar Frames
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Inspeção detalhada de frames individuais
              </p>
            </div>
          </header>

          {/* ALERT */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-bold text-amber-900">Módulo em Manutenção</h3>
              <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                A extração em tempo real de frames está pausada. Utilize a visualização do vídeo completo se possível.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* SETTINGS CARD */}
            <div className="space-y-6">
              <VideoSelector
                selectedVideo={selectedVideoUrl}
                onVideoSelect={(url, filename) => {
                  setSelectedVideoUrl(url)
                  setSelectedVideoFilename(filename)
                  setTotalFrames(1800) // Dummy for UI
                }}
              />

              {selectedVideoUrl && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Search size={14} /> Seleção de Frame
                  </h3>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={currentFrameInput}
                      onChange={(e) => setCurrentFrameInput(e.target.value)}
                      placeholder="Número do Frame (1-1800)"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={handleExtractFrame}
                      disabled={true} // Disabled
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <SkipForward size={16} /> Extrair
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">Total estimado: {totalFrames} frames</p>
                </div>
              )}
            </div>

            {/* DISPLAY AREA */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Layers size={14} /> Frames Carregados
                </h3>
                <button onClick={() => setIsGridView(!isGridView)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                  <Grid size={18} />
                </button>
              </div>

              {extractedFrames.length === 0 ? (
                <div className="h-[300px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-white/50">
                  <ImageIcon size={48} className="mb-4 opacity-20" />
                  <p className="text-sm">Nenhum frame extraído</p>
                </div>
              ) : (
                <div className={isGridView ? "grid grid-cols-2 gap-4" : "space-y-4"}>
                  {extractedFrames.map((frame, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group relative">
                      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button onClick={() => removeFrame(frame.frameNumber)} className="p-1 bg-white/90 rounded-full text-red-500 shadow-sm hover:bg-red-50">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-600">Frame {frame.frameNumber}</span>
                        <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-mono">JPG</span>
                      </div>
                      <div className="relative aspect-video bg-slate-100">
                        <img src={frame.imageUrl} alt={`Frame ${frame.frameNumber}`} className="w-full h-full object-contain" />
                        <canvas
                          ref={el => { if (el) canvasRefs.current[frame.frameNumber] = el }}
                          className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </SidebarInset>
  );
}