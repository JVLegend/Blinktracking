"use client"

import React, { useState, useRef } from "react"
import { Inter, JetBrains_Mono } from "next/font/google"
import { motion } from "framer-motion"
import { SidebarInset } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Activity,
  Clock,
  Download,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Zap,
  Ruler,
  Eye,
  Timer,
  Loader2
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

// Helper: Euclidean Distance
const dist = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

export default function AnalysePiscadasPage() {
  // --- STATE ---
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [rawCsvText, setRawCsvText] = useState<string>("")
  const [analysisData, setAnalysisData] = useState<any[]>([]) // Detailed blinks
  const [minuteStats, setMinuteStats] = useState<any[]>([]) // Aggregated per minute
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [detectedFPS, setDetectedFPS] = useState<number>(30)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [statistics, setStatistics] = useState({
    totalBlinks: 0,
    completeBlinks: 0,
    incompleteBlinks: 0,
    averageDuration: 0,
    blinkRate: 0,
    blinkRateIncomplete: 0,
    percentageComplete: 0,
    avgAmplitude: 0,
    avgClosingSpeed: 0,
    avgOpeningSpeed: 0,
    avgMcc: 0
  })

  // --- LOGIC ---
  const processCSVData = (csvText: string, fpsToUse: number) => {
    try {
      // Filtrar comentários (#) e linhas vazias
      const lines = csvText.trim().split('\n').filter(line => line.trim().length > 0 && !line.startsWith('#'))

      if (lines.length < 2) throw new Error("Arquivo vazio ou inválido");

      const headerLine = lines[0].replace(/^\uFEFF/, '')
      const delimiter = headerLine.includes(';') ? ';' : ','
      const headers = headerLine.split(delimiter).map(h => h.trim())

      // Detect CSV Type
      let csvType = 'unknown';
      if (headers.includes('point_0_x')) csvType = 'all_points';
      else if (headers.some(h => h.includes('right_upper'))) csvType = 'eyes_only';

      if (csvType === 'unknown') throw new Error("Formato de colunas desconhecido.");

      const dataRows = lines.slice(1);
      const fps = fpsToUse;

      // --- CORE: EAR Calculation ---
      const getPoint = (rowCols: string[], idxX: number, idxY: number) => {
        if (idxX === -1 || idxY === -1) return null;
        return {
          x: parseFloat(rowCols[idxX]),
          y: parseFloat(rowCols[idxY])
        };
      }

      const getIdx = (name: string) => headers.indexOf(name);

      let indices = { right: [] as number[], left: [] as number[] };
      let colNames = { right: [] as string[], left: [] as string[] };

      if (csvType === 'all_points') {
        indices.right = [33, 160, 158, 133, 153, 144];
        indices.left = [362, 385, 387, 263, 373, 380];
      } else {
        colNames.right = ['right_lower_1', 'right_upper_3', 'right_upper_5', 'right_lower_9', 'right_lower_6', 'right_lower_4'];
        colNames.left = ['left_lower_1', 'left_upper_3', 'left_upper_5', 'left_lower_9', 'left_lower_6', 'left_lower_4'];
      }

      const earValues: number[] = [];
      const validEars: number[] = [];

      dataRows.forEach(row => {
        const cols = row.split(delimiter);
        let rPts: { x: number, y: number }[] = [];
        let lPts: { x: number, y: number }[] = [];

        if (csvType === 'all_points') {
          rPts = indices.right.map(idx => getPoint(cols, getIdx(`point_${idx}_x`), getIdx(`point_${idx}_y`))).filter(Boolean) as any;
          lPts = indices.left.map(idx => getPoint(cols, getIdx(`point_${idx}_x`), getIdx(`point_${idx}_y`))).filter(Boolean) as any;
        } else {
          rPts = colNames.right.map(name => getPoint(cols, getIdx(`${name}_x`), getIdx(`${name}_y`))).filter(Boolean) as any;
          lPts = colNames.left.map(name => getPoint(cols, getIdx(`${name}_x`), getIdx(`${name}_y`))).filter(Boolean) as any;
        }

        if (rPts.length < 6 || lPts.length < 6) {
          earValues.push(NaN);
          return;
        }

        const calcEAR = (p: typeof rPts) => {
          const vert1 = dist(p[1], p[5]);
          const vert2 = dist(p[2], p[4]);
          const horiz = dist(p[0], p[3]);
          return horiz === 0 ? 0 : (vert1 + vert2) / (2 * horiz);
        }

        const rightEAR = calcEAR(rPts);
        const leftEAR = calcEAR(lPts);
        const avgEAR = (rightEAR + leftEAR) / 2;

        earValues.push(avgEAR);
        if (!isNaN(avgEAR)) validEars.push(avgEAR);
      });

      // Dynamic Baseline
      validEars.sort((a, b) => a - b);
      const baselineEAR = validEars[Math.floor(validEars.length * 0.9)] || 0.3;

      const THRESHOLD_CLOSE = baselineEAR * 0.75;
      const THRESHOLD_COMPLETE = baselineEAR * 0.50;
      const MIN_FRAMES = 2;

      // Event Detection
      const blinks: any[] = [];
      let inBlink = false;
      let startFrameIdx = 0;
      let minEARInBlink = 1.0;
      let minEARFrameIdx = 0;
      let lastBlinkEndFrame = -9999; // Track end of last valid blink
      const MIN_INTER_BLINK_TIME = 0.5; // 500ms refractory period

      earValues.forEach((ear, idx) => {
        const currentEAR = ear || 1.0;

        if (!inBlink) {
          if (currentEAR < THRESHOLD_CLOSE) {
            inBlink = true;
            startFrameIdx = idx;
            minEARInBlink = currentEAR;
            minEARFrameIdx = idx;
          }
        } else {
          if (currentEAR < minEARInBlink) {
            minEARInBlink = currentEAR;
            minEARFrameIdx = idx;
          }

          if (currentEAR >= THRESHOLD_CLOSE) {
            const endFrameIdx = idx;
            const durationFrames = endFrameIdx - startFrameIdx;

            // Check validity criteria
            if (durationFrames >= MIN_FRAMES) {

              // Validate Minimum Inter-Blink Interval (0.5s)
              const timeSinceLastBlink = (startFrameIdx - lastBlinkEndFrame) / fps;

              if (timeSinceLastBlink >= MIN_INTER_BLINK_TIME) {
                const type = minEARInBlink <= THRESHOLD_COMPLETE ? 'Completa' : 'Incompleta';
                const startTime = startFrameIdx / fps;
                const duration = durationFrames / fps;

                // Advanced Metrics
                const closingDuration = (minEARFrameIdx - startFrameIdx) / fps;
                const openingDuration = (endFrameIdx - minEARFrameIdx) / fps;
                const amplitude = baselineEAR - minEARInBlink;

                const closingSpeed = closingDuration > 0.001 ? (amplitude / closingDuration) : 0;
                const openingSpeed = openingDuration > 0.001 ? (amplitude / openingDuration) : 0;
                const rba = ((baselineEAR - minEARInBlink) / baselineEAR) * 100;

                blinks.push({
                  id: blinks.length + 1,
                  minute: Math.floor(startTime / 60) + 1,
                  startTime: startTime.toFixed(3),
                  duration: duration.toFixed(3),
                  earMin: minEARInBlink.toFixed(3),
                  type: type,
                  frameStart: startFrameIdx,
                  frameEnd: endFrameIdx,
                  amplitude: amplitude.toFixed(3),
                  closingSpeed: closingSpeed.toFixed(2),
                  openingSpeed: openingSpeed.toFixed(2),
                  rba: rba.toFixed(1)
                });

                lastBlinkEndFrame = endFrameIdx; // Update last valid blink end
              }
            }
            inBlink = false;
            minEARInBlink = 1.0;
          }
        }
      });

      setAnalysisData(blinks);

      // Stats
      const minuteGroups: Record<number, { complete: number, incomplete: number }> = {};
      blinks.forEach(b => {
        if (!minuteGroups[b.minute]) minuteGroups[b.minute] = { complete: 0, incomplete: 0 };
        if (b.type === 'Completa') minuteGroups[b.minute].complete++;
        else minuteGroups[b.minute].incomplete++;
      });

      const minuteStatsArr = Object.entries(minuteGroups).map(([min, counts]) => ({
        minute: parseInt(min),
        complete: counts.complete,
        incomplete: counts.incomplete,
        total: counts.complete + counts.incomplete
      })).sort((a, b) => a.minute - b.minute);

      setMinuteStats(minuteStatsArr);

      const total = blinks.length;
      const complete = blinks.filter(b => b.type === 'Completa').length;
      const incomplete = total - complete;
      const totalDuration = blinks.reduce((sum, b) => sum + parseFloat(b.duration), 0);
      const totalAmplitude = blinks.reduce((sum, b) => sum + parseFloat(b.amplitude), 0);
      const totalClosingSpeed = blinks.reduce((sum, b) => sum + parseFloat(b.closingSpeed), 0);
      const totalOpeningSpeed = blinks.reduce((sum, b) => sum + parseFloat(b.openingSpeed), 0);

      const videoDurationMin = (dataRows.length / fps) / 60;
      const rate = videoDurationMin > 0 ? total / videoDurationMin : 0;

      setStatistics({
        totalBlinks: total,
        completeBlinks: complete,
        incompleteBlinks: incomplete,
        averageDuration: total > 0 ? parseFloat((totalDuration / total).toFixed(3)) : 0,
        blinkRate: parseFloat(rate.toFixed(1)),
        blinkRateIncomplete: 0,
        percentageComplete: total > 0 ? parseFloat(((complete / total) * 100).toFixed(1)) : 0,
        avgAmplitude: total > 0 ? parseFloat((totalAmplitude / total).toFixed(3)) : 0,
        avgClosingSpeed: total > 0 ? parseFloat((totalClosingSpeed / total).toFixed(2)) : 0,
        avgOpeningSpeed: total > 0 ? parseFloat((totalOpeningSpeed / total).toFixed(2)) : 0,
        avgMcc: 0
      });

      toast.success(`Análise concluída: ${total} piscadas detectadas (FPS: ${fps})!`);

    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao processar: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }

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
    setIsAnalyzing(true);
    try {
      const text = await file.text();
      setRawCsvText(text);

      let fps = 30; // Default

      // Detect FPS from Metadata (# FPS: XX.XX)
      const firstLine = text.trim().split('\n')[0];
      if (firstLine.startsWith('# FPS:')) {
        const val = parseFloat(firstLine.split(':')[1].trim());
        if (!isNaN(val) && val > 0) {
          fps = val;
          toast.info(`FPS detectado pelos metadados: ${fps}`);
        }
      } else {
        // Fallback Heuristic
        const lines = text.trim().split('\n');
        if (lines.length > 3000) fps = 60;
      }

      setDetectedFPS(fps);
      processCSVData(text, fps);
    } catch (e) {
      toast.error("Erro desconhecido ao ler arquivo.");
      setIsAnalyzing(false);
    }
  }

  const exportCSV = () => {
    if (!analysisData.length) return;
    let csv = "ID,Minuto,Inicio(s),Duracao(s),EAR_Min,Amplitude,Vel_Fechamento,Vel_Abertura,RBA(%),Tipo\n";
    analysisData.forEach(b => {
      csv += `${b.id},${b.minute},${b.startTime},${b.duration},${b.earMin},${b.amplitude},${b.closingSpeed},${b.openingSpeed},${b.rba},${b.type}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_piscadas_detalhado.csv`;
    a.click();
  }

  return (
    <SidebarInset>
      <div className={`min-h-full bg-gradient-to-b from-[#f0f9ff] to-slate-50 text-slate-900 p-8 font-sans ${inter.variable} ${mono.variable}`}>
        <div className="max-w-[1600px] mx-auto space-y-6">

          {/* HEADER */}
          <header className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                  <Clock size={24} strokeWidth={2} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
                    Análise Avançada de Piscadas
                  </h1>
                  <span className="text-xs font-medium text-purple-600 uppercase tracking-wider">Clinical Suite</span>
                </div>
              </div>
              <p className="text-slate-500 text-sm ml-[3.25rem]">
                Métricas de cinemática e estabilidade ocular via algoritmo EAR
              </p>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 items-center">
              {/* FPS CONTROL */}
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm mr-2" title="Frames por Segundo do vídeo original">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">FPS Original:</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={detectedFPS}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setDetectedFPS(val);
                    if (rawCsvText && val > 0) processCSVData(rawCsvText, val);
                  }}
                  className="w-16 text-right text-sm font-mono font-bold text-purple-600 bg-transparent outline-none border-b border-transparent focus:border-purple-300 transition-colors"
                />
              </div>

              <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium text-sm hover:bg-slate-50 hover:text-purple-600 transition-colors shadow-sm cursor-pointer">
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
              <button
                onClick={exportCSV}
                disabled={!analysisData.length}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white border border-transparent rounded-lg font-medium text-sm hover:bg-slate-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                Exportar Relatório
              </button>
            </div>
          </header>

          {/* EMPTY STATE */}
          {!analysisData.length && !isAnalyzing && (
            <div className="h-[400px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-white/50">
              <Clock size={48} className="mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-slate-600">Nenhum dado analisado</h3>
              <p className="text-sm mb-6">Carregue um arquivo .csv para gerar estatísticas detalhadas</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                Selecionar Arquivo
              </Button>
            </div>
          )}

          {isAnalyzing && (
            <div className="h-[400px] flex flex-col items-center justify-center text-purple-600">
              <Loader2 size={48} className="animate-spin mb-4" />
              <p className="font-medium">Processando algoritmo EAR...</p>
            </div>
          )}

          {/* CONTENT */}
          {analysisData.length > 0 && (
            <>
              {/* OVERVIEW CARDS */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-4"
              >
                <div className="bg-white/80 backdrop-blur rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 font-medium text-xs uppercase tracking-wider mb-2">
                    <Activity size={14} /> Total de Piscadas
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{statistics.totalBlinks}</div>
                  <div className="text-xs text-purple-600 font-medium mt-1">
                    {statistics.blinkRate} por minuto
                  </div>
                </div>

                <div className="bg-green-50/50 backdrop-blur rounded-xl border border-green-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-green-700 font-medium text-xs uppercase tracking-wider mb-2">
                    <CheckCircle2 size={14} /> Completas
                  </div>
                  <div className="text-3xl font-bold text-green-900">{statistics.completeBlinks}</div>
                  <div className="text-xs text-green-700 font-medium mt-1">
                    {statistics.percentageComplete}% Confiabilidade
                  </div>
                </div>

                <div className="bg-amber-50/50 backdrop-blur rounded-xl border border-amber-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-700 font-medium text-xs uppercase tracking-wider mb-2">
                    <AlertCircle size={14} /> Incompletas
                  </div>
                  <div className="text-3xl font-bold text-amber-900">{statistics.incompleteBlinks}</div>
                  <div className="text-xs text-amber-700 font-medium mt-1">
                    Atenção clínica
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500 font-medium text-xs uppercase tracking-wider mb-2">
                    <Timer size={14} /> Duração Média
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{statistics.averageDuration}s</div>
                  <div className="text-xs text-slate-400 font-medium mt-1">
                    por evento
                  </div>
                </div>
              </motion.div>

              {/* KINEMATICS SECTION */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Activity size={16} /> Cinemática da Pálpebra
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 text-slate-600 font-medium mb-4">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                        <Zap size={18} />
                      </div>
                      Velocidade de Fechamento
                    </div>
                    <div className="mt-auto">
                      <span className="text-2xl font-bold text-slate-900">{statistics.avgClosingSpeed}</span>
                      <span className="text-sm text-slate-500 ml-1">EAR/s</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 text-slate-600 font-medium mb-4">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Zap size={18} />
                      </div>
                      Velocidade de Abertura
                    </div>
                    <div className="mt-auto">
                      <span className="text-2xl font-bold text-slate-900">{statistics.avgOpeningSpeed}</span>
                      <span className="text-sm text-slate-500 ml-1">EAR/s</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2 text-slate-600 font-medium mb-4">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <Ruler size={18} />
                      </div>
                      Amplitude Média
                    </div>
                    <div className="mt-auto">
                      <span className="text-2xl font-bold text-slate-900">{statistics.avgAmplitude}</span>
                      <span className="text-sm text-slate-500 ml-1">EAR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLES GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* MINUTE STATS TABLE */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Análise por Minuto</h3>
                  </div>
                  <div className="overflow-auto max-h-[400px]">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 font-medium">Min</th>
                          <th className="px-6 py-3 font-medium text-green-600">Completas</th>
                          <th className="px-6 py-3 font-medium text-amber-600">Incompletas</th>
                          <th className="px-6 py-3 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {minuteStats.map((row) => (
                          <tr key={row.minute} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-3 font-medium text-slate-700">{row.minute}</td>
                            <td className="px-6 py-3 text-green-700 bg-green-50/30">{row.complete}</td>
                            <td className="px-6 py-3 text-amber-700 bg-amber-50/30">{row.incomplete}</td>
                            <td className="px-6 py-3 text-right font-bold text-slate-900">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* DETAILED TABLE */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Detalhamento Individual</h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {analysisData.length} EVENTOS
                    </span>
                  </div>
                  <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 font-medium">Tempo</th>
                          <th className="px-4 py-3 font-medium">V.Fech <span className="text-[9px] lowercase opacity-70">(ear/s)</span></th>
                          <th className="px-4 py-3 font-medium">Ampl. <span className="text-[9px] lowercase opacity-70">(ear)</span></th>
                          <th className="px-4 py-3 font-medium">RBA <span className="text-[9px] lowercase opacity-70">(%)</span></th>
                          <th className="px-4 py-3 font-medium text-right">Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-xs">
                        {analysisData.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-4 py-3 text-slate-600">{b.startTime}s</td>
                            <td className="px-4 py-3 text-slate-500">{b.closingSpeed}</td>
                            <td className="px-4 py-3 text-slate-500">{b.amplitude}</td>
                            <td className="px-4 py-3 text-slate-500">{b.rba}%</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${b.type === 'Completa'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                {b.type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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