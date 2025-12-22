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
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [detectedFPS, setDetectedFPS] = useState<number>(30)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const initialStats = {
    totalBlinks: 0,
    completeBlinks: 0,
    incompleteBlinks: 0,
    averageDuration: 0,
    blinkRate: 0,
    percentageComplete: 0,
    avgAmplitude: 0,
    avgClosingSpeed: 0,
    avgOpeningSpeed: 0,
  };

  const [statsRight, setStatsRight] = useState(initialStats);
  const [statsLeft, setStatsLeft] = useState(initialStats);
  const [analysisDataRight, setAnalysisDataRight] = useState<any[]>([]);
  const [analysisDataLeft, setAnalysisDataLeft] = useState<any[]>([]);
  const [minuteStatsRight, setMinuteStatsRight] = useState<any[]>([]);
  const [minuteStatsLeft, setMinuteStatsLeft] = useState<any[]>([]);

  // --- LOGIC ---
  const processCSVData = (csvText: string, fpsToUse: number) => {
    try {
      const lines = csvText.trim().split('\n').filter(line => line.trim().length > 0 && !line.startsWith('#'))
      if (lines.length < 2) throw new Error("Arquivo vazio ou inválido");

      const headerLine = lines[0].replace(/^\uFEFF/, '')
      const delimiter = headerLine.includes(';') ? ';' : ','
      const headers = headerLine.split(delimiter).map(h => h.trim())

      let csvType = 'unknown';
      if (headers.includes('point_0_x')) csvType = 'all_points';
      else if (headers.some(h => h.includes('right_upper'))) csvType = 'eyes_only';

      if (csvType === 'unknown') throw new Error("Formato de colunas desconhecido.");

      const dataRows = lines.slice(1);
      const fps = fpsToUse;

      const getPoint = (rowCols: string[], idxX: number, idxY: number) => {
        if (idxX === -1 || idxY === -1) return null;
        const x = parseFloat(rowCols[idxX]);
        const y = parseFloat(rowCols[idxY]);
        return isNaN(x) || isNaN(y) ? null : { x, y };
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

      const rightEARs: number[] = [];
      const leftEARs: number[] = [];

      dataRows.forEach(row => {
        const cols = row.split(delimiter);
        let rPts: ({ x: number, y: number } | null)[] = [];
        let lPts: ({ x: number, y: number } | null)[] = [];

        if (csvType === 'all_points') {
          rPts = indices.right.map(idx => getPoint(cols, getIdx(`point_${idx}_x`), getIdx(`point_${idx}_y`)));
          lPts = indices.left.map(idx => getPoint(cols, getIdx(`point_${idx}_x`), getIdx(`point_${idx}_y`)));
        } else {
          rPts = colNames.right.map(name => getPoint(cols, getIdx(`${name}_x`), getIdx(`${name}_y`)));
          lPts = colNames.left.map(name => getPoint(cols, getIdx(`${name}_x`), getIdx(`${name}_y`)));
        }

        const calcEAR = (p: ({ x: number, y: number } | null)[]) => {
          if (p.some(pt => pt === null)) return NaN;
          const pts = p as { x: number, y: number }[];
          const vert1 = dist(pts[1], pts[5]);
          const vert2 = dist(pts[2], pts[4]);
          const horiz = dist(pts[0], pts[3]);
          return horiz === 0 ? 0 : (vert1 + vert2) / (2 * horiz);
        }

        rightEARs.push(calcEAR(rPts));
        leftEARs.push(calcEAR(lPts));
      });

      const detectBlinksForEye = (earValues: number[]) => {
        const validEars = earValues.filter(v => !isNaN(v)).sort((a, b) => a - b);
        const baselineEAR = validEars[Math.floor(validEars.length * 0.9)] || 0.3;
        const THRESHOLD_CLOSE = baselineEAR * 0.75;
        const THRESHOLD_COMPLETE = baselineEAR * 0.50;
        const MIN_FRAMES = 2;
        const MIN_INTER_BLINK_TIME = 0.5;

        const filteredBlinks: any[] = [];
        let inBlink = false;
        let startFrameIdx = 0;
        let minEARInBlink = 1.0;
        let minEARFrameIdx = 0;
        let lastBlinkEndFrame = -9999;

        earValues.forEach((ear, idx) => {
          const currentEAR = isNaN(ear) ? 1.0 : ear;

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

              if (durationFrames >= MIN_FRAMES) {
                const timeSinceLastBlink = (startFrameIdx - lastBlinkEndFrame) / fps;
                if (timeSinceLastBlink >= MIN_INTER_BLINK_TIME) {
                  const type = minEARInBlink <= THRESHOLD_COMPLETE ? 'Completa' : 'Incompleta';
                  const startTime = startFrameIdx / fps;
                  const duration = durationFrames / fps;
                  const closingDuration = (minEARFrameIdx - startFrameIdx) / fps;
                  const openingDuration = (endFrameIdx - minEARFrameIdx) / fps;
                  const amplitude = baselineEAR - minEARInBlink;
                  const closingSpeed = closingDuration > 0.001 ? (amplitude / closingDuration) : 0;
                  const openingSpeed = openingDuration > 0.001 ? (amplitude / openingDuration) : 0;
                  const rba = ((baselineEAR - minEARInBlink) / baselineEAR) * 100;

                  filteredBlinks.push({
                    id: filteredBlinks.length + 1,
                    minute: Math.floor(startTime / 60) + 1,
                    startTime: startTime.toFixed(3),
                    duration: duration.toFixed(3),
                    earMin: minEARInBlink.toFixed(3),
                    type,
                    frameStart: startFrameIdx,
                    frameEnd: endFrameIdx,
                    amplitude: amplitude.toFixed(3),
                    closingSpeed: closingSpeed.toFixed(2),
                    openingSpeed: openingSpeed.toFixed(2),
                    rba: rba.toFixed(1)
                  });
                  lastBlinkEndFrame = endFrameIdx;
                }
              }
              inBlink = false;
              minEARInBlink = 1.0;
            }
          }
        });
        return { blinks: filteredBlinks, baseline: baselineEAR };
      };

      const resultRight = detectBlinksForEye(rightEARs);
      const resultLeft = detectBlinksForEye(leftEARs);

      setAnalysisDataRight(resultRight.blinks);
      setAnalysisDataLeft(resultLeft.blinks);

      const calculateStats = (blinks: any[], numRows: number) => {
        const total = blinks.length;
        const complete = blinks.filter(b => b.type === 'Completa').length;
        const incomplete = total - complete;
        const totalDuration = blinks.reduce((sum, b) => sum + parseFloat(b.duration), 0);
        const totalAmplitude = blinks.reduce((sum, b) => sum + parseFloat(b.amplitude), 0);
        const totalClosingSpeed = blinks.reduce((sum, b) => sum + parseFloat(b.closingSpeed), 0);
        const totalOpeningSpeed = blinks.reduce((sum, b) => sum + parseFloat(b.openingSpeed), 0);
        const videoDurationMin = (numRows / fps) / 60;
        const rate = videoDurationMin > 0 ? total / videoDurationMin : 0;

        return {
          totalBlinks: total,
          completeBlinks: complete,
          incompleteBlinks: incomplete,
          averageDuration: total > 0 ? parseFloat((totalDuration / total).toFixed(3)) : 0,
          blinkRate: parseFloat(rate.toFixed(1)),
          percentageComplete: total > 0 ? parseFloat(((complete / total) * 100).toFixed(1)) : 0,
          avgAmplitude: total > 0 ? parseFloat((totalAmplitude / total).toFixed(3)) : 0,
          avgClosingSpeed: total > 0 ? parseFloat((totalClosingSpeed / total).toFixed(2)) : 0,
          avgOpeningSpeed: total > 0 ? parseFloat((totalOpeningSpeed / total).toFixed(2)) : 0,
        };
      };

      setStatsRight(calculateStats(resultRight.blinks, dataRows.length));
      setStatsLeft(calculateStats(resultLeft.blinks, dataRows.length));

      const getMinuteStats = (blinks: any[]) => {
        const minuteGroups: Record<number, { complete: number, incomplete: number }> = {};
        blinks.forEach(b => {
          if (!minuteGroups[b.minute]) minuteGroups[b.minute] = { complete: 0, incomplete: 0 };
          if (b.type === 'Completa') minuteGroups[b.minute].complete++;
          else minuteGroups[b.minute].incomplete++;
        });
        return Object.entries(minuteGroups).map(([min, counts]) => ({
          minute: parseInt(min),
          complete: counts.complete,
          incomplete: counts.incomplete,
          total: counts.complete + counts.incomplete
        })).sort((a, b) => a.minute - b.minute);
      };

      setMinuteStatsRight(getMinuteStats(resultRight.blinks));
      setMinuteStatsLeft(getMinuteStats(resultLeft.blinks));

      toast.success(`Análise concluída! D: ${resultRight.blinks.length} | E: ${resultLeft.blinks.length} piscadas.`);
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
    if (!analysisDataRight.length && !analysisDataLeft.length) return;
    let csv = "Olho,ID,Minuto,Inicio(s),Duracao(s),EAR_Min,Amplitude,Vel_Fechamento,Vel_Abertura,RBA(%),Tipo\n";
    analysisDataRight.forEach(b => {
      csv += `Direito,${b.id},${b.minute},${b.startTime},${b.duration},${b.earMin},${b.amplitude},${b.closingSpeed},${b.openingSpeed},${b.rba},${b.type}\n`;
    });
    analysisDataLeft.forEach(b => {
      csv += `Esquerdo,${b.id},${b.minute},${b.startTime},${b.duration},${b.earMin},${b.amplitude},${b.closingSpeed},${b.openingSpeed},${b.rba},${b.type}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_piscadas_detalhado_binocular.csv`;
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
                disabled={!analysisDataRight.length && !analysisDataLeft.length}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white border border-transparent rounded-lg font-medium text-sm hover:bg-slate-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                Exportar Relatório Binocular
              </button>
            </div>
          </header>

          {/* EMPTY STATE */}
          {!analysisDataRight.length && !analysisDataLeft.length && !isAnalyzing && (
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
              <p className="font-medium">Processando algoritmo EAR nos dois canais...</p>
            </div>
          )}

          {/* CONTENT */}
          {(analysisDataRight.length > 0 || analysisDataLeft.length > 0) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">

              {/* COLUNA OLHO DIREITO */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-tighter">Direito</div>
                  <h2 className="text-xl font-bold text-slate-800">Olho Direito</h2>
                </div>

                {/* OVERVIEW CARDS RIGHT */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-2 gap-4">
                  <div className="bg-white/80 backdrop-blur rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Piscadas</div>
                    <div className="text-2xl font-bold text-slate-900">{statsRight.totalBlinks}</div>
                    <div className="text-[10px] text-purple-600 font-medium">{statsRight.blinkRate} /min</div>
                  </div>
                  <div className="bg-green-50/50 rounded-xl border border-green-100 p-4 shadow-sm">
                    <div className="text-[10px] text-green-700 font-bold uppercase tracking-wider mb-1">Completas</div>
                    <div className="text-2xl font-bold text-green-900">{statsRight.completeBlinks}</div>
                    <div className="text-[10px] text-green-600 font-medium">{statsRight.percentageComplete}%</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Duração Média</div>
                    <div className="text-xl font-bold text-slate-900">{statsRight.averageDuration}s</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Amplitude Média</div>
                    <div className="text-xl font-bold text-slate-900">{statsRight.avgAmplitude} <span className="text-xs font-normal opacity-50">EAR</span></div>
                  </div>
                </motion.div>

                {/* KINEMATICS RIGHT */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} /> Cinemática (D)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">V. Fechamento</div>
                      <div className="text-lg font-bold text-orange-600">{statsRight.avgClosingSpeed} <span className="text-[10px] font-normal text-slate-400">EAR/s</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">V. Abertura</div>
                      <div className="text-lg font-bold text-blue-600">{statsRight.avgOpeningSpeed} <span className="text-[10px] font-normal text-slate-400">EAR/s</span></div>
                    </div>
                  </div>
                </div>

                {/* TABLE RIGHT */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[400px] flex flex-col">
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Detalhamento Direito</span>
                    <span className="text-[9px] font-mono text-slate-400">{analysisDataRight.length} eventos</span>
                  </div>
                  <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-slate-400">Tempo</th>
                          <th className="px-3 py-2 text-slate-400">Ampl.</th>
                          <th className="px-3 py-2 text-slate-400">V.Fech</th>
                          <th className="px-3 py-2 text-right text-slate-400">Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-mono">
                        {analysisDataRight.map(b => (
                          <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-1.5">{b.startTime}s</td>
                            <td className="px-3 py-1.5">{b.amplitude}</td>
                            <td className="px-3 py-1.5">{b.closingSpeed}</td>
                            <td className="px-3 py-1.5 text-right">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${b.type === 'Completa' ? 'text-green-600' : 'text-amber-600'}`}>
                                {b.type[0]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* COLUNA OLHO ESQUERDO */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-tighter">Esquerdo</div>
                  <h2 className="text-xl font-bold text-slate-800">Olho Esquerdo</h2>
                </div>

                {/* OVERVIEW CARDS LEFT */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-2 gap-4">
                  <div className="bg-white/80 backdrop-blur rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Piscadas</div>
                    <div className="text-2xl font-bold text-slate-900">{statsLeft.totalBlinks}</div>
                    <div className="text-[10px] text-purple-600 font-medium">{statsLeft.blinkRate} /min</div>
                  </div>
                  <div className="bg-green-50/50 rounded-xl border border-green-100 p-4 shadow-sm">
                    <div className="text-[10px] text-green-700 font-bold uppercase tracking-wider mb-1">Completas</div>
                    <div className="text-2xl font-bold text-green-900">{statsLeft.completeBlinks}</div>
                    <div className="text-[10px] text-green-600 font-medium">{statsLeft.percentageComplete}%</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Duração Média</div>
                    <div className="text-xl font-bold text-slate-900">{statsLeft.averageDuration}s</div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Amplitude Média</div>
                    <div className="text-xl font-bold text-slate-900">{statsLeft.avgAmplitude} <span className="text-xs font-normal opacity-50">EAR</span></div>
                  </div>
                </motion.div>

                {/* KINEMATICS LEFT */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} /> Cinemática (E)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">V. Fechamento</div>
                      <div className="text-lg font-bold text-orange-600">{statsLeft.avgClosingSpeed} <span className="text-[10px] font-normal text-slate-400">EAR/s</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">V. Abertura</div>
                      <div className="text-lg font-bold text-blue-600">{statsLeft.avgOpeningSpeed} <span className="text-[10px] font-normal text-slate-400">EAR/s</span></div>
                    </div>
                  </div>
                </div>

                {/* TABLE LEFT */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[400px] flex flex-col">
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Detalhamento Esquerdo</span>
                    <span className="text-[9px] font-mono text-slate-400">{analysisDataLeft.length} eventos</span>
                  </div>
                  <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-slate-400">Tempo</th>
                          <th className="px-3 py-2 text-slate-400">Ampl.</th>
                          <th className="px-3 py-2 text-slate-400">V.Fech</th>
                          <th className="px-3 py-2 text-right text-slate-400">Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-mono">
                        {analysisDataLeft.map(b => (
                          <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-1.5">{b.startTime}s</td>
                            <td className="px-3 py-1.5">{b.amplitude}</td>
                            <td className="px-3 py-1.5">{b.closingSpeed}</td>
                            <td className="px-3 py-1.5 text-right">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${b.type === 'Completa' ? 'text-green-600' : 'text-amber-600'}`}>
                                {b.type[0]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
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