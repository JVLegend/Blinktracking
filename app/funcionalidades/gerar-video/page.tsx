"use client"

import { useState } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Inter, JetBrains_Mono } from "next/font/google"
import { VideoSelector } from "../../components/VideoSelector"
import { toast } from "sonner"
import {
  Film,
  Play,
  AlertTriangle,
  Terminal,
  Loader2,
  Video,
  CheckCircle2
} from "lucide-react"

// --- FONT CONFIG ---
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
})

export default function GerarVideoPage() {
  // --- STATE ---
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null)
  const [selectedVideoFilename, setSelectedVideoFilename] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  // --- LOGIC ---
  const handleProcess = async (method: 'dlib' | 'mediapipe') => {
    try {
      if (!selectedVideoUrl || !selectedVideoFilename) {
        toast.error("Por favor, selecione um vídeo dos arquivos armazenados");
        return;
      }

      setIsProcessing(true);
      setProgress(0);
      setLogs([]);
      setDownloadUrl(null);
      setLogs(prev => [...prev, "Iniciando processamento..."]);

      const formData = new FormData();
      formData.append('videoUrl', selectedVideoUrl);
      formData.append('videoFilename', selectedVideoFilename);
      formData.append('method', method);

      setLogs(prev => [...prev, "Enviando vídeo..."]);

      const response = await fetch("/api/generate-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Erro na requisição: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Não foi possível iniciar o processamento");

      let lastProgressUpdate = 0;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.progress !== undefined) {
                const current = Math.floor(data.progress);
                if (current - lastProgressUpdate >= 2) {
                  setProgress(current);
                  setLogs(prev => [...prev, `Progresso: ${current}%`]);
                  lastProgressUpdate = current;
                }
              }
              if (data.status === 'complete' && data.videoData) {
                setProgress(100);
                setLogs(prev => [...prev, "Gerando arquivo final..."]);
                const videoBlob = new Blob(
                  [Uint8Array.from(atob(data.videoData), c => c.charCodeAt(0))],
                  { type: 'video/mp4' }
                );
                const url = URL.createObjectURL(videoBlob);
                setDownloadUrl(url);

                const a = document.createElement('a');
                a.href = url;
                a.download = `processed_${selectedVideoFilename}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                setLogs(prev => [...prev, "Concluído com sucesso!"]);
                toast.success("Vídeo processado!");
                setIsProcessing(false);
                return;
              }
              if (data.error) throw new Error(data.error);
            }
          } catch (e) { console.debug("Log parse error", e); }
        }
      }
    } catch (error: any) {
      console.error("Erro:", error);
      setLogs(prev => [...prev, `Erro Fatal: ${error.message}`]);
      toast.error(error.message || "Erro desconhecido");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SidebarInset>
      <div className={`min-h-full bg-gradient-to-b from-[#f5f3ff] to-slate-50 text-slate-900 p-8 font-sans ${inter.variable} ${mono.variable}`}>
        <div className="max-w-[1200px] mx-auto space-y-8">

          {/* HEADER */}
          <header className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
              <Film size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-none">
                Gerar Vídeo
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Renderização de landmarks sobre video original
              </p>
            </div>
          </header>

          {/* ALERT */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-bold text-amber-900">Manutenção Programada</h3>
              <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                A pipeline de renderização de vídeo está desligada temporariamente para otimização de performance.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              <VideoSelector
                selectedVideo={selectedVideoUrl}
                onVideoSelect={(url, filename) => {
                  setSelectedVideoUrl(url)
                  setSelectedVideoFilename(filename)
                }}
              />

              {selectedVideoUrl && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Video size={14} /> Renderização
                  </h3>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-slate-500 block text-xs">Arquivo Selecionado</span>
                      <span className="font-mono font-medium text-slate-700 truncate max-w-[200px] block">
                        {selectedVideoFilename}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      disabled={true}
                      onClick={() => handleProcess('dlib')}
                      className="w-full px-4 py-3 bg-slate-100 text-slate-400 rounded-xl font-medium text-sm border border-slate-200 cursor-not-allowed flex items-center justify-between group transition-all"
                    >
                      <span className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-300">
                          <div className="font-bold text-xs">DL</div>
                        </div>
                        Processar com Dlib
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-200 px-2 py-1 rounded">Desativado</span>
                    </button>

                    <button
                      disabled={true}
                      onClick={() => handleProcess('mediapipe')}
                      className="w-full px-4 py-3 bg-slate-100 text-slate-400 rounded-xl font-medium text-sm border border-slate-200 cursor-not-allowed flex items-center justify-between group transition-all"
                    >
                      <span className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-300">
                          <div className="font-bold text-xs">MP</div>
                        </div>
                        Processar com MediaPipe
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-200 px-2 py-1 rounded">Desativado</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN - LIVE CONSOLE */}
            <div className="space-y-6">
              {(isProcessing || logs.length > 0) ? (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 flex flex-col h-full min-h-[400px]">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-slate-100">
                      <Terminal size={18} className="text-violet-400" />
                      <span className="font-mono text-sm font-bold">Process Output</span>
                    </div>
                    {isProcessing && <Loader2 size={16} className="text-violet-400 animate-spin" />}
                  </div>

                  <div className="flex-1 font-mono text-xs text-slate-400 space-y-1 overflow-auto custom-scrollbar-dark mb-4">
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-600 select-none">›</span>
                        <span className={log.includes("Erro") ? "text-red-400" : log.includes("Sucesso") ? "text-green-400" : ""}>
                          {log}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-2 font-mono">
                      <span>PROGRESSO</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-white/50">
                  <Play size={48} className="mb-4 opacity-20" />
                  <h3 className="text-sm font-medium text-slate-500">Aguardando início</h3>
                </div>
              )}
            </div>
          </div>

        </div>
        <style jsx global>{`
          .custom-scrollbar-dark::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar-dark::-webkit-scrollbar-track {
            background: #1e293b;
          }
          .custom-scrollbar-dark::-webkit-scrollbar-thumb {
            background: #475569; 
            border-radius: 2px;
          }
        `}</style>
      </div>
    </SidebarInset>
  )
}
