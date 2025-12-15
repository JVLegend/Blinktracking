"use client"

import { useState } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Clock, Eye, Download, BarChart3, Activity, CheckCircle, AlertCircle, Zap, Ruler } from "lucide-react"
import { toast } from "sonner"
import { FileUploadCard } from "../../components/FileUploadCard"

// Helper: Euclidean Distance
const dist = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

export default function AnalysePiscadasPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [analysisData, setAnalysisData] = useState<any[]>([]) // Detailed blinks
  const [minuteStats, setMinuteStats] = useState<any[]>([]) // Aggregated per minute
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [detectedFPS, setDetectedFPS] = useState<number>(30)

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
    avgMcc: 0 // Mean Cycle Control (placeholder se necessário)
  })

  // State para tabulação ou filtro se necessário no futuro
  // ...

  const processCSVData = (csvText: string) => {
    try {
      const lines = csvText.trim().split('\n').filter(line => line.trim().length > 0)
      if (lines.length < 2) throw new Error("Arquivo vazio ou inválido");

      const headerLine = lines[0].replace(/^\uFEFF/, '')
      const delimiter = headerLine.includes(';') ? ';' : ','
      const headers = headerLine.split(delimiter).map(h => h.trim())

      // Detect CSV Type
      let csvType = 'unknown';
      if (headers.includes('point_0_x')) csvType = 'all_points';
      else if (headers.some(h => h.includes('right_upper'))) csvType = 'eyes_only';

      if (csvType === 'unknown') throw new Error("Formato de colunas desconhecido.");

      // Detect FPS
      const dataRows = lines.slice(1);
      const idx_frame = headers.indexOf('frame');
      let fps = 30;

      if (dataRows.length > 1 && idx_frame !== -1) {
        const firstFrame = parseInt(dataRows[0].split(delimiter)[idx_frame]);
        const lastFrame = parseInt(dataRows[dataRows.length - 1].split(delimiter)[idx_frame]);
        const totalFrames = lastFrame - firstFrame + 1;
        // Simple heuristic based on amount of data rows (assuming ~1 min video usually)
        if (dataRows.length > 3000) fps = 60; // Just a guess if metadata missing
      }
      setDetectedFPS(fps);

      // --- CORE: EAR Calculation ---
      // Helper to extract point from row array
      const getPoint = (rowCols: string[], idxX: number, idxY: number) => {
        if (idxX === -1 || idxY === -1) return null;
        return {
          x: parseFloat(rowCols[idxX]),
          y: parseFloat(rowCols[idxY])
        };
      }

      // Cache indices
      const getIdx = (name: string) => headers.indexOf(name);

      let indices = { right: [] as number[], left: [] as number[] };
      let colNames = { right: [] as string[], left: [] as string[] }; // For eyes_only

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
          const vert1 = dist(p[1], p[5]); // P2-P6
          const vert2 = dist(p[2], p[4]); // P3-P5
          const horiz = dist(p[0], p[3]); // P1-P4
          return horiz === 0 ? 0 : (vert1 + vert2) / (2 * horiz);
        }

        const rightEAR = calcEAR(rPts);
        const leftEAR = calcEAR(lPts);
        const avgEAR = (rightEAR + leftEAR) / 2;

        earValues.push(avgEAR);
        if (!isNaN(avgEAR)) validEars.push(avgEAR);
      });

      // --- Logic: Dynamic Baseline ---
      validEars.sort((a, b) => a - b);
      const baselineEAR = validEars[Math.floor(validEars.length * 0.9)] || 0.3;

      const THRESHOLD_CLOSE = baselineEAR * 0.75;
      const THRESHOLD_COMPLETE = baselineEAR * 0.50;
      const MIN_FRAMES = 2;

      console.log(`Baseline: ${baselineEAR.toFixed(3)}, Close: ${THRESHOLD_CLOSE.toFixed(3)}, Complete: ${THRESHOLD_COMPLETE.toFixed(3)}`);

      // --- Event Detection ---
      const blinks: any[] = [];
      let inBlink = false;
      let startFrameIdx = 0;
      let minEARInBlink = 1.0;
      let minEARFrameIdx = 0; // Track frame of max closure

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

            if (durationFrames >= MIN_FRAMES) {
              const type = minEARInBlink <= THRESHOLD_COMPLETE ? 'Completa' : 'Incompleta';
              const startTime = startFrameIdx / fps;
              const duration = durationFrames / fps;

              // Advanced Metrics
              const closingDuration = (minEARFrameIdx - startFrameIdx) / fps;
              const openingDuration = (endFrameIdx - minEARFrameIdx) / fps;
              const amplitude = baselineEAR - minEARInBlink; // How much it closed

              const closingSpeed = closingDuration > 0.001 ? (amplitude / closingDuration) : 0;
              const openingSpeed = openingDuration > 0.001 ? (amplitude / openingDuration) : 0; // EAR/sec

              // RBA: Relative Blink Amplitude (100% = full efficient closure relative to baseline)
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
            }
            inBlink = false;
            minEARInBlink = 1.0;
          }
        }
      });

      // --- Aggregation ---
      setAnalysisData(blinks);

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

      // Global Stats
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

      toast.success(`Análise concluída: ${total} piscadas detectadas!`);

    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao processar: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const handleProcessUploadedFile = async () => {
    if (!uploadedFile) return;
    setIsAnalyzing(true);
    try {
      const text = await uploadedFile.text();
      processCSVData(text);
    } catch (e) {
      toast.error("Erro desconhecido ao ler arquivo.");
      setIsAnalyzing(false);
    }
  }

  const exportCSV = () => {
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
      <div className="flex-1 space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            Análise Avançada de Piscadas
          </h1>
          <p className="text-muted-foreground">
            Detecção baseada no algoritmo EAR com métricas de velocidade e amplitude.
          </p>
        </div>

        <FileUploadCard
          uploadedFile={uploadedFile}
          onFileSelect={setUploadedFile}
          onProcessFile={handleProcessUploadedFile}
          isLoading={isAnalyzing}
        />

        {analysisData.length > 0 && (
          <div className="space-y-6 animate-in fade-in duration-500">

            {/* MAIN KPI CARDS */}
            <h2 className="text-lg font-semibold text-muted-foreground">Visão Geral</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-primary font-medium mb-2">
                    <Activity className="h-4 w-4" /> Total de Piscadas
                  </div>
                  <div className="text-3xl font-bold">{statistics.totalBlinks}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {statistics.blinkRate} piscadas/min
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                    <CheckCircle className="h-4 w-4" /> Completas
                  </div>
                  <div className="text-3xl font-bold text-green-800">{statistics.completeBlinks}</div>
                  <div className="text-xs text-green-600 mt-1">
                    {statistics.percentageComplete}% do total
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
                    <AlertCircle className="h-4 w-4" /> Incompletas
                  </div>
                  <div className="text-3xl font-bold text-yellow-800">{statistics.incompleteBlinks}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-slate-600 font-medium mb-2">
                    <Clock className="h-4 w-4" /> Duração Média
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{statistics.averageDuration}s</div>
                </CardContent>
              </Card>
            </div>

            {/* NEW METRICS CARDS */}
            <h2 className="text-lg font-semibold text-muted-foreground">Cinemática da Pálpebra</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-slate-600 font-medium mb-2">
                    <Zap className="h-4 w-4 text-orange-500" /> Vel. Fechamento
                  </div>
                  <div className="text-2xl font-bold">{statistics.avgClosingSpeed} <span className="text-sm font-normal text-muted-foreground">EAR/s</span></div>
                  <p className="text-xs text-muted-foreground mt-1">Média de todas as piscadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-slate-600 font-medium mb-2">
                    <Zap className="h-4 w-4 text-blue-500" /> Vel. Abertura
                  </div>
                  <div className="text-2xl font-bold">{statistics.avgOpeningSpeed} <span className="text-sm font-normal text-muted-foreground">EAR/s</span></div>
                  <p className="text-xs text-muted-foreground mt-1">Fase de recuperação</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-slate-600 font-medium mb-2">
                    <Ruler className="h-4 w-4 text-purple-500" /> Amplitude Média
                  </div>
                  <div className="text-2xl font-bold">{statistics.avgAmplitude} <span className="text-sm font-normal text-muted-foreground">EAR</span></div>
                  <p className="text-xs text-muted-foreground mt-1">Delta do Baseline</p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TABLE PER MINUTE */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Análise por Minuto</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Minuto</TableHead>
                        <TableHead className="text-green-600">Completas</TableHead>
                        <TableHead className="text-yellow-600">Incompletas</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {minuteStats.map((row) => (
                        <TableRow key={row.minute}>
                          <TableCell className="font-medium">{row.minute}</TableCell>
                          <TableCell>{row.complete}</TableCell>
                          <TableCell>{row.incomplete}</TableCell>
                          <TableCell className="text-right font-bold">{row.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* DETAILED LIST */}
              <Card className="flex flex-col h-[500px]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Detalhamento Individual</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-2" /> Exportar CSV
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tempo(s)</TableHead>
                        <TableHead>Vel. Fech.</TableHead>
                        <TableHead>Amplitude</TableHead>
                        <TableHead>RBA %</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisData.slice().reverse().map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>{b.startTime}</TableCell>
                          <TableCell>{b.closingSpeed}</TableCell>
                          <TableCell>{b.amplitude}</TableCell>
                          <TableCell>{b.rba}%</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${b.type === 'Completa'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {b.type}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </div>
    </SidebarInset>
  )
}