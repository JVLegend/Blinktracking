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
import { Clock, Eye, Download, BarChart3, Activity, CheckCircle, AlertCircle } from "lucide-react"
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
    percentageComplete: 0
  })

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
        // If user wants consistent FPS they can use the script. Here we default to 30 or guess.
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
        // MediaPipe 468/478 Landmarks for EAR (Soukupova et al.)
        // Right: [33, 160, 158, 133, 153, 144] (P1..P6)
        // Left:  [362, 385, 387, 263, 373, 380]
        indices.right = [33, 160, 158, 133, 153, 144];
        indices.left = [362, 385, 387, 263, 373, 380];
      } else {
        // Eyes Only (Legacy format mapping)
        // Need to map our P1..P6 logic to the column names
        // P1-P4 (Width), P2-P6 (Vertical1), P3-P5 (Vertical2)
        // Based on previous script logic mapping
        colNames.right = ['right_lower_1', 'right_upper_3', 'right_upper_5', 'right_lower_9', 'right_lower_6', 'right_lower_4'];
        colNames.left = ['left_lower_1', 'left_upper_3', 'left_upper_5', 'left_lower_9', 'left_lower_6', 'left_lower_4'];
      }

      const earValues: number[] = [];
      const validEars: number[] = [];

      dataRows.forEach(row => {
        const cols = row.split(delimiter);

        // Extract Eye Points
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

        // Calculate EAR
        // EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
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
      // 90th percentile as "open eye" baseline
      validEars.sort((a, b) => a - b);
      const baselineEAR = validEars[Math.floor(validEars.length * 0.9)] || 0.3;

      // Thresholds
      const THRESHOLD_CLOSE = baselineEAR * 0.75; // Starts closing
      const THRESHOLD_COMPLETE = baselineEAR * 0.50; // Fully closed
      const MIN_FRAMES = 2; // Noise filter

      console.log(`Baseline: ${baselineEAR.toFixed(3)}, Close: ${THRESHOLD_CLOSE.toFixed(3)}, Complete: ${THRESHOLD_COMPLETE.toFixed(3)}`);

      // --- Event Detection ---
      const blinks: any[] = [];
      let inBlink = false;
      let startFrameIdx = 0;
      let minEARInBlink = 1.0;

      earValues.forEach((ear, idx) => {
        // Basic Smoothing (Moving Average) could be added here if needed
        const currentEAR = ear || 1.0;

        if (!inBlink) {
          if (currentEAR < THRESHOLD_CLOSE) {
            inBlink = true;
            startFrameIdx = idx;
            minEARInBlink = currentEAR;
          }
        } else {
          // Update minimum EAR detected during this blink
          if (currentEAR < minEARInBlink) minEARInBlink = currentEAR;

          // Recovery (End of blink)
          if (currentEAR >= THRESHOLD_CLOSE) {
            const endFrameIdx = idx;
            const durationFrames = endFrameIdx - startFrameIdx;

            if (durationFrames >= MIN_FRAMES) {
              const type = minEARInBlink <= THRESHOLD_COMPLETE ? 'Completa' : 'Incompleta';
              const startTime = startFrameIdx / fps;
              const duration = durationFrames / fps;

              blinks.push({
                id: blinks.length + 1,
                minute: Math.floor(startTime / 60) + 1,
                startTime: startTime.toFixed(3),
                duration: duration.toFixed(3),
                earMin: minEARInBlink.toFixed(3),
                type: type,
                frameStart: startFrameIdx,
                frameEnd: endFrameIdx
              });
            }
            inBlink = false;
            minEARInBlink = 1.0;
          }
        }
      });

      // --- Aggregation ---
      setAnalysisData(blinks);

      // Group by Minute
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

      const videoDurationMin = (dataRows.length / fps) / 60;
      const rate = videoDurationMin > 0 ? total / videoDurationMin : 0;

      setStatistics({
        totalBlinks: total,
        completeBlinks: complete,
        incompleteBlinks: incomplete,
        averageDuration: total > 0 ? parseFloat((totalDuration / total).toFixed(3)) : 0,
        blinkRate: parseFloat(rate.toFixed(1)),
        blinkRateIncomplete: 0, // Not calculated yet
        percentageComplete: total > 0 ? parseFloat(((complete / total) * 100).toFixed(1)) : 0
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
    // Create CSV for download
    let csv = "ID,Minuto,Inicio(s),Duracao(s),EAR_Min,Tipo\n";
    analysisData.forEach(b => {
      csv += `${b.id},${b.minute},${b.startTime},${b.duration},${b.earMin},${b.type}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_piscadas.csv`;
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
            Detecção baseada no algoritmo EAR (Eye Aspect Ratio) com classificação automática.
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

            {/* KPI CARDS */}
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

              {/* DETAILED LIST (Preview) */}
              <Card className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Últimas 10 Piscadas Detectadas</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-2" /> Exportar CSV
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tempo (s)</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>EAR Min</TableHead>
                        <TableHead>Classificação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisData.slice(-10).reverse().map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>{b.startTime}</TableCell>
                          <TableCell>{b.duration}s</TableCell>
                          <TableCell>{b.earMin}</TableCell>
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