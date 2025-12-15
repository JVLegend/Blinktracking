"use client"

import { useState, useRef } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Inter, JetBrains_Mono } from "next/font/google"
import { VideoSelector } from "../../components/VideoSelector"
import { toast } from "sonner"
import {
  ScanEye,
  Eye,
  Download,
  Info,
  Loader2,
  AlertTriangle,
  FileSpreadsheet,
  ListVideo
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

export default function ExtrairPontosPage() {
  // --- STATE ---
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedData, setProcessedData] = useState<any[]>([])
  const [allPoints, setAllPoints] = useState<any[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [isDownloadingModel, setIsDownloadingModel] = useState(false)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null)
  const [selectedVideoFilename, setSelectedVideoFilename] = useState<string | null>(null)

  // --- LOGIC ---
  const processVideo = async (method: "normal" | "potente") => {
    if (!selectedVideoUrl || !selectedVideoFilename) {
      toast.error("Por favor, selecione um vídeo dos arquivos armazenados")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setProcessedData([])
    setTotalPoints(0)
    setAllPoints([])
    setIsDownloadingModel(false)

    const formData = new FormData()
    formData.append("videoUrl", selectedVideoUrl)
    formData.append("videoFilename", selectedVideoFilename)
    formData.append("method", method)

    try {
      const response = await fetch("/api/extract-points", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }

      const data = await response.json()

      if (data.status === 'downloading_model') {
        setIsDownloadingModel(true)
        toast.loading("Baixando modelo do dlib... Isso pode levar alguns minutos.", { duration: 5000 })
        setTimeout(() => processVideo(method), 5000)
        return
      }

      if (data.progress !== undefined) setProgress(data.progress)
      if (data.points) {
        setProcessedData(data.points.slice(0, 20))
        setAllPoints(data.points)
      }
      if (data.totalPoints) setTotalPoints(data.totalPoints)

      if (data.success && data.points?.length > 0) {
        toast.success(`Extração concluída! ${data.points.length} frames processados`)
      } else if (data.success) {
        toast.warning("Processamento concluído, mas nenhum ponto extraído")
      } else {
        toast.error(data.error || "Erro desconhecido")
      }
    } catch (error: any) {
      console.error(error)
      toast.error(`Erro ao processar: ${error.message}`)
    } finally {
      if (!isDownloadingModel) setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!allPoints.length) return toast.error("Nenhum dado para baixar")

    const csvContent = generateCSV(allPoints)
    const methodType = allPoints[0].method === 'dlib' ? 'dlib' : 'mediapipe'
    const link = document.createElement("a")
    link.href = csvContent
    link.download = `pontos_${methodType}_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Download iniciado!")
  }

  const generateCSV = (points: any[]) => {
    if (!points.length) return '';
    const isMediaPipe = points[0].method === "mediapipe";
    const csvContent = "data:text/csv;charset=utf-8,";

    if (isMediaPipe) {
      const headers = [
        "frame", "method",
        ...Array.from({ length: 7 }, (_, i) => `right_upper_${i + 1}_x`),
        ...Array.from({ length: 7 }, (_, i) => `right_upper_${i + 1}_y`),
        ...Array.from({ length: 9 }, (_, i) => `right_lower_${i + 1}_x`),
        ...Array.from({ length: 9 }, (_, i) => `right_lower_${i + 1}_y`),
        ...Array.from({ length: 7 }, (_, i) => `left_upper_${i + 1}_x`),
        ...Array.from({ length: 7 }, (_, i) => `left_upper_${i + 1}_y`),
        ...Array.from({ length: 9 }, (_, i) => `left_lower_${i + 1}_x`),
        ...Array.from({ length: 9 }, (_, i) => `left_lower_${i + 1}_y`),
      ];
      return csvContent + headers.join(',') + '\n' + points.map(p => {
        const values = [p.frame, p.method];
        for (let i = 1; i <= 7; i++) { values.push(p[`right_upper_${i}_x`] || 0, p[`right_upper_${i}_y`] || 0); }
        for (let i = 1; i <= 9; i++) { values.push(p[`right_lower_${i}_x`] || 0, p[`right_lower_${i}_y`] || 0); }
        for (let i = 1; i <= 7; i++) { values.push(p[`left_upper_${i}_x`] || 0, p[`left_upper_${i}_y`] || 0); }
        for (let i = 1; i <= 9; i++) { values.push(p[`left_lower_${i}_x`] || 0, p[`left_lower_${i}_y`] || 0); }
        return values.join(',');
      }).join('\n');
    } else {
      const headers = ["frame", "method", "37_x", "37_y", "38_x", "38_y", "40_x", "40_y", "41_x", "41_y"];
      return csvContent + headers.join(',') + '\n' + points.map(p => [
        p.frame, p.method,
        p["37_x"] || 0, p["37_y"] || 0,
        p["38_x"] || 0, p["38_y"] || 0,
        p["40_x"] || 0, p["40_y"] || 0,
        p["41_x"] || 0, p["41_y"] || 0
      ].join(',')).join('\n');
    }
  };

  return (
    <SidebarInset>
      <div className={`min-h-full bg-gradient-to-b from-[#f0f9ff] to-slate-50 text-slate-900 p-8 font-sans ${inter.variable} ${mono.variable}`}>
        <div className="max-w-[1200px] mx-auto space-y-8">

          {/* HEADER */}
          <header className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <ScanEye size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-none">
                Extração de Pontos
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Análise de landmarks faciais frame-a-frame
              </p>
            </div>
          </header>

          {/* ALERT */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-bold text-amber-900">Funcionalidade em Manutenção</h3>
              <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                Os servidores de processamento estão passando por atualizações.
                A extração de pontos está temporariamente desativada para garantir a integridade dos dados.
              </p>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Selector Section */}
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
                    <ListVideo size={14} /> Processamento
                  </h3>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-slate-500 block text-xs">Arquivo Selecionado</span>
                      <span className="font-mono font-medium text-slate-700 truncate max-w-[200px] block">
                        {selectedVideoFilename}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      disabled={true}
                      className="px-4 py-3 bg-slate-100 text-slate-400 rounded-xl font-medium text-sm border border-slate-200 cursor-not-allowed flex flex-col items-center justify-center gap-2"
                    >
                      <Eye size={20} />
                      Extração Normal
                      <span className="text-[10px] uppercase tracking-wider opacity-70">Desativado</span>
                    </button>
                    <button
                      disabled={true}
                      className="px-4 py-3 bg-slate-100 text-slate-400 rounded-xl font-medium text-sm border border-slate-200 cursor-not-allowed flex flex-col items-center justify-center gap-2"
                    >
                      <ScanEye size={20} />
                      Extração Potente
                      <span className="text-[10px] uppercase tracking-wider opacity-70">Desativado</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Results Section */}
            {processedData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col h-[600px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileSpreadsheet size={14} /> Dados Processados
                  </h3>
                  <button
                    onClick={handleDownload}
                    className="text-xs flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Download size={14} /> Baixar CSV
                  </button>
                </div>

                <div className="flex-1 overflow-auto border border-slate-100 rounded-xl custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 font-medium text-slate-500 sticky top-0 z-10">
                      <tr>
                        <th className="p-3">Frame</th>
                        <th className="p-3">Método</th>
                        {Object.keys(processedData[0])
                          .filter(key => key !== 'frame' && key !== 'method')
                          .slice(0, 5) // limitar colunas visualmente
                          .map(key => (
                            <th key={key} className="p-3 whitespace-nowrap">{key}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {processedData.map((row, i) => (
                        <tr key={i} className="text-slate-600 font-mono hover:bg-slate-50/50">
                          <td className="p-3 font-bold">{row.frame}</td>
                          <td className="p-3">{row.method}</td>
                          {Object.entries(row)
                            .filter(([k]) => k !== 'frame' && k !== 'method')
                            .slice(0, 5)
                            .map(([k, v], j) => (
                              <td key={j} className="p-3">{String(v).substring(0, 6)}</td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-center text-xs text-slate-400 mt-4">
                  Mostrando prévia dos primeiros 20 frames. Baixe o CSV para dados completos.
                </p>
              </div>
            )}
          </div>
        </div>
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
            height: 4px;
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
