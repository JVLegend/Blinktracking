"use client"

import { useState } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Activity, FileSpreadsheet, Eye, LineChart, Upload, Info, Ruler, Timer, FileDown } from "lucide-react"
import { toast } from "sonner"
import dynamic from "next/dynamic"
import { PlotParams } from "react-plotly.js"
import { Config, Data, Layout } from "plotly.js"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import PlotlyComponent from "@/components/plotly/PlotlyComponent"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CSVSelector } from "../../components/CSVSelector"

// Atualizar a importação do Plot
const Plot = dynamic(() => import("react-plotly.js").then((mod) => mod.default), {
  ssr: false,
  loading: () => <p>Carregando gráfico...</p>
}) as React.ComponentType<PlotParams>;

interface DataPoint {
  frame: number;
  method: string;
  // Pontos do dlib
  "37_x"?: number;
  "37_y"?: number;
  "38_x"?: number;
  "38_y"?: number;
  "40_x"?: number;
  "40_y"?: number;
  "41_x"?: number;
  "41_y"?: number;
  // Pontos do MediaPipe
  "right_upper_2_x"?: number;
  "right_upper_2_y"?: number;
  "right_upper_4_x"?: number;
  "right_upper_4_y"?: number;
  "right_lower_3_x"?: number;
  "right_lower_3_y"?: number;
  "right_lower_5_x"?: number;
  "right_lower_5_y"?: number;
  "left_upper_2_x"?: number;
  "left_upper_2_y"?: number;
  "left_upper_4_x"?: number;
  "left_upper_4_y"?: number;
  "left_lower_3_x"?: number;
  "left_lower_3_y"?: number;
  "left_lower_5_x"?: number;
  "left_lower_5_y"?: number;
  velocity?: number;
}

interface BlinkMetrics {
  totalBlinks: number
  completeBlinks: number
  incompleteBlinks: number
  avgDuration: number
  avgClosingTime: number
  avgOpeningTime: number
  avgVelocity: number
  blinkRate: number
  rba: number
  velocityBasedBlinks: number
  blinks60to120: number
  blinks120to180: number
  avgBlinkInterval: number
  // Novas métricas de fissura
  verticalFissure: number
  dmr1: number
  dmr2: number
  horizontalFissure: number
  // Medidas do primeiro piscar completo
  firstCompleteBlink: {
    ecp: number // Eye Closing Phase
    cdp: number // Complete Closure Duration Phase
    eop: number // Eye Opening Phase
    ibl: number // Inter Blink Latency
  }
  // Medidas do primeiro piscar incompleto
  firstIncompleteBlink: {
    ecp: number
    cdp: number
    eop: number
    ibl: number
  }
  distribution: {
    complete: number
    incomplete: number
    other: number
  }
}

interface BlinkDetail {
  eye: string
  blinkNumber: number
  startFrame: number
  endFrame: number
  startTime: number
  endTime: number
  duration: number
  timeSinceLastBlink: number
  isComplete: boolean
}

// Definir tipos para os dados do Plotly
type ScatterData = {
  x: number[]
  y: number[]
  type: "scatter"
  mode: string
  name: string
  line?: { shape: string }
  marker?: { size: number }
}

type PieData = {
  type: "pie"
  labels: string[]
  values: number[]
  hole: number
}

const InfoButton = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline" size="icon" className="absolute top-8 right-8">
        <Info className="h-4 w-4" />
      </Button>
    </DialogTrigger>
    <DialogContent className="max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Métricas de Análise</DialogTitle>
        <DialogDescription>
          Documentação detalhada das métricas e fórmulas utilizadas
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-6 pt-4">
        {/* Métricas Gerais */}
        <div>
          <h3 className="font-semibold mb-3 text-lg">Métricas Gerais</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Contagem de Piscadas</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>Piscada Completa:</strong> Distância menor que 30% da distância máxima entre pálpebras</li>
                <li><strong>Piscada Incompleta:</strong> Distância entre 30% e 60% da distância máxima</li>
                <li><strong>Total de Piscadas:</strong> Soma de todas as piscadas detectadas</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Velocidade e Amplitude</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>Velocidade Média:</strong> Média das velocidades de todas as piscadas (pixels/s)</li>
                <li><strong>RBA (Amplitude Relativa):</strong> (Amplitude_da_Piscada/Distância_Reflexa_Marginal) x 100%</li>
                <li><strong>Piscadas por Velocidade:</strong> Detecção baseada no limiar de 3x MAD da velocidade</li>
                <li><strong>Duração Média:</strong> Tempo médio de duração das piscadas (s)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Análise Temporal */}
        <div>
          <h3 className="font-semibold mb-3 text-lg">Análise Temporal</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Intervalos de Tempo</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>Piscadas (60-120s):</strong> Número de piscadas no primeiro intervalo</li>
                <li><strong>Piscadas (120-180s):</strong> Número de piscadas no segundo intervalo</li>
                <li><strong>Taxa de Piscadas:</strong> total_piscadas/(tempo_total/60) (piscadas/min)</li>
                <li><strong>Intervalo Médio:</strong> Tempo médio entre piscadas consecutivas (s)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Velocidade ao Longo do Tempo</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>Cálculo da Velocidade:</strong> |Δ distância entre pálpebras / Δ tempo|</li>
                <li><strong>MAD (Desvio Absoluto Mediano):</strong> mediana(|x - mediana(x)|)</li>
                <li><strong>Threshold de Velocidade:</strong> 3 x MAD</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Medidas de Fissura */}
        <div>
          <h3 className="font-semibold mb-3 text-lg">Medidas de Fissura</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Fissuras</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>Fissura Vertical:</strong> Distância vertical entre as pálpebras superior e inferior</li>
                <li><strong>Fissura Horizontal:</strong> Distância horizontal entre os cantos medial e lateral</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Distâncias Marginais</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>DMR1:</strong> Distância da margem da pálpebra superior ao centro da pupila</li>
                <li><strong>DMR2:</strong> Distância da margem da pálpebra inferior ao centro da pupila</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Primeiras Piscadas */}
        <div>
          <h3 className="font-semibold mb-3 text-lg">Primeiras Piscadas</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Fases da Piscada</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>ECP (Eye Closing Phase):</strong> Fase de fechamento do olho</li>
                <li><strong>CDP (Complete Closure Duration Phase):</strong> Duração do fechamento completo</li>
                <li><strong>EOP (Eye Opening Phase):</strong> Fase de abertura do olho</li>
                <li><strong>IBL (Inter Blink Latency):</strong> Latência entre piscadas consecutivas</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Análise Detalhada</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Medidas são calculadas separadamente para a primeira piscada completa e incompleta</li>
                <li>Todas as durações são medidas em segundos</li>
                <li>Valores são calculados a partir do início da detecção</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Métodos de Detecção */}
        <div>
          <h3 className="font-semibold mb-3 text-lg">Métodos de Detecção</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Detecção por Distância</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Baseada na distância entre as pálpebras superior e inferior</li>
                <li>Thresholds adaptativos baseados no range de movimento</li>
                <li>Classificação por percentual da distância máxima</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Detecção por Velocidade</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Baseada na velocidade do movimento das pálpebras</li>
                <li>Utiliza MAD para determinar thresholds dinâmicos</li>
                <li>Mais robusta a variações individuais</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default function EstatisticasPage() {
  const [data, setData] = useState<DataPoint[]>([])
  const [metrics, setMetrics] = useState<BlinkMetrics | null>(null)
  const [velocityData, setVelocityData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blinkDetails, setBlinkDetails] = useState<BlinkDetail[]>([])
  const [selectedCSVUrl, setSelectedCSVUrl] = useState<string | null>(null)
  const [selectedCSVFilename, setSelectedCSVFilename] = useState<string | null>(null)

  const downloadBlinkDetails = () => {
    const headers = "Eye,Blink_Number,Start_Frame,End_Frame,Start_Time_Seconds,End_Time_Seconds,Duration_Seconds,Seconds_Since_Last_Blink,Is_Complete\n"
    const csvContent = blinkDetails.map(detail => 
      `${detail.eye},${detail.blinkNumber},${detail.startFrame},${detail.endFrame},${detail.startTime.toFixed(3)},${detail.endTime.toFixed(3)},${detail.duration.toFixed(3)},${detail.timeSinceLastBlink.toFixed(3)},${detail.isComplete ? "Completa" : "Incompleta"}`
    ).join("\n")
    
    const blob = new Blob([headers + csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "blink_details.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }

  const calculateVelocity = (data: DataPoint[]) => {
    const velocities: number[] = [];
    const frames: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      
      let velocity = 0;
      
      if (curr.method === 'dlib') {
        const dist37 = calculateDistance(
          prev["37_x"]!, prev["37_y"]!,
          curr["37_x"]!, curr["37_y"]!
        );
        const dist41 = calculateDistance(
          prev["41_x"]!, prev["41_y"]!,
          curr["41_x"]!, curr["41_y"]!
        );
        velocity = (dist37 + dist41) / 2;
      } else {
        // MediaPipe - usando pontos das pálpebras superiores e inferiores
        const rightUpperDist = calculateDistance(
          prev["right_upper_4_x"]!, prev["right_upper_4_y"]!,
          curr["right_upper_4_x"]!, curr["right_upper_4_y"]!
        );
        const rightLowerDist = calculateDistance(
          prev["right_lower_5_x"]!, prev["right_lower_5_y"]!,
          curr["right_lower_5_x"]!, curr["right_lower_5_y"]!
        );
        const leftUpperDist = calculateDistance(
          prev["left_upper_4_x"]!, prev["left_upper_4_y"]!,
          curr["left_upper_4_x"]!, curr["left_upper_4_y"]!
        );
        const leftLowerDist = calculateDistance(
          prev["left_lower_5_x"]!, prev["left_lower_5_y"]!,
          curr["left_lower_5_x"]!, curr["left_lower_5_y"]!
        );
        velocity = (rightUpperDist + rightLowerDist + leftUpperDist + leftLowerDist) / 4;
      }
      
      velocities.push(velocity * 30); // Multiplicar por FPS para ter velocidade em pixels/segundo
      frames.push(curr.frame);
    }

    return {
      x: frames,
      y: velocities,
      type: 'scatter',
      mode: 'lines',
      name: 'Velocidade',
      line: { color: '#2563eb' }
    };
  };

  const detectBlinks = (data: DataPoint[]) => {
    const blinks: { start: number, end: number, complete: boolean }[] = []
    
    // Calcular a média das distâncias para definir os thresholds
    const distances = data.map(point => {
      if (point.method === "dlib") {
        const rightEyeGap = calculateDistance(
          point["37_x"]!, point["37_y"]!,
          point["38_x"]!, point["38_y"]!
        )
        const leftEyeGap = calculateDistance(
          point["40_x"]!, point["40_y"]!,
          point["41_x"]!, point["41_y"]!
        )
        return (rightEyeGap + leftEyeGap) / 2
      } else {
        const rightEyeGap = calculateDistance(
          point["right_upper_4_x"]!, point["right_upper_4_y"]!,
          point["right_lower_5_x"]!, point["right_lower_5_y"]!
        )
        const leftEyeGap = calculateDistance(
          point["left_upper_4_x"]!, point["left_upper_4_y"]!,
          point["left_lower_5_x"]!, point["left_lower_5_y"]!
        )
        return (rightEyeGap + leftEyeGap) / 2
      }
    });

    const maxDistance = Math.max(...distances);
    const minDistance = Math.min(...distances);
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    
    // Definir thresholds baseados nas distâncias calculadas
    const blinkThreshold = minDistance + (maxDistance - minDistance) * 0.6; // 60% do range para detectar piscada
    const completeBlinkThreshold = minDistance + (maxDistance - minDistance) * 0.3; // 30% do range para piscada completa

    console.log("Distâncias por frame:", distances);
    console.log("Range de distâncias:", { maxDistance, minDistance, avgDistance });
    console.log("Thresholds calculados:", { blinkThreshold, completeBlinkThreshold });

    let inBlink = false;
    let blinkStart = 0;
    let minBlinkDistance = Infinity;

    for (let i = 0; i < data.length; i++) {
      const curr = data[i];
      let currentDistance = 0;

      if (curr.method === "dlib") {
        const rightEyeGap = calculateDistance(
          curr["37_x"]!, curr["37_y"]!,
          curr["38_x"]!, curr["38_y"]!
        )
        const leftEyeGap = calculateDistance(
          curr["40_x"]!, curr["40_y"]!,
          curr["41_x"]!, curr["41_y"]!
        )
        currentDistance = (rightEyeGap + leftEyeGap) / 2;
      } else {
        const rightEyeGap = calculateDistance(
          curr["right_upper_4_x"]!, curr["right_upper_4_y"]!,
          curr["right_lower_5_x"]!, curr["right_lower_5_y"]!
        )
        const leftEyeGap = calculateDistance(
          curr["left_upper_4_x"]!, curr["left_upper_4_y"]!,
          curr["left_lower_5_x"]!, curr["left_lower_5_y"]!
        )
        currentDistance = (rightEyeGap + leftEyeGap) / 2;
      }

      console.log(`Frame ${curr.frame}: distance = ${currentDistance}, threshold = ${blinkThreshold}, inBlink = ${inBlink}`);

      if (!inBlink && currentDistance < blinkThreshold) {
        // Início da piscada
        inBlink = true;
        blinkStart = curr.frame;
        minBlinkDistance = currentDistance;
        console.log(`Início de piscada detectado no frame ${curr.frame} com distância ${currentDistance}`);
      } else if (inBlink) {
        // Atualizar a menor distância durante a piscada
        if (currentDistance < minBlinkDistance) {
          minBlinkDistance = currentDistance;
        }
        
        if (currentDistance > blinkThreshold) {
          // Fim da piscada
          inBlink = false;
          const complete = minBlinkDistance < completeBlinkThreshold;
          blinks.push({
            start: blinkStart,
            end: curr.frame,
            complete
          });
          console.log(`Fim de piscada detectado no frame ${curr.frame}. Completa: ${complete}, Distância mínima: ${minBlinkDistance}`);
        }
      }
    }

    console.log("Blinks detectados:", blinks.length);
    console.log("Detalhes das piscadas:", blinks);

    return blinks;
  }

  const calculateMAD = (values: number[]): number => {
    // Calcular a mediana
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    
    // Calcular os desvios absolutos
    const deviations = values.map(v => Math.abs(v - median));
    
    // Calcular a mediana dos desvios
    const sortedDeviations = [...deviations].sort((a, b) => a - b);
    return sortedDeviations[Math.floor(sortedDeviations.length / 2)];
  };

  const calculateMetrics = (data: DataPoint[], blinks: { start: number, end: number, complete: boolean }[]) => {
    let totalBlinks = blinks.length
    let completeBlinks = blinks.filter(b => b.complete).length
    let incompleteBlinks = blinks.filter(b => !b.complete).length
    let totalDuration = 0
    let totalClosingTime = 0
    let totalOpeningTime = 0
    let totalVelocity = 0
    let maxAmplitude = 0
    let totalRBA = 0
    let velocityBasedBlinks = 0
    let blinks60to120 = 0
    let blinks120to180 = 0
    let totalBlinkInterval = 0
    let blinkIntervalCount = 0
    let firstCompleteBlink = {
      ecp: 0,
      cdp: 0,
      eop: 0,
      ibl: 0
    }
    let firstIncompleteBlink = {
      ecp: 0,
      cdp: 0,
      eop: 0,
      ibl: 0
    }
    let verticalFissure = 0
    let dmr1 = 0
    let dmr2 = 0
    let horizontalFissure = 0

    // Função auxiliar para calcular a distância entre os pontos dos olhos
    const getEyeDistance = (point: DataPoint): number => {
      if (point.method === "dlib") {
        const rightEyeGap = calculateDistance(
          point["37_x"]!, point["37_y"]!,
          point["41_x"]!, point["41_y"]!
        )
        const leftEyeGap = calculateDistance(
          point["38_x"]!, point["38_y"]!,
          point["40_x"]!, point["40_y"]!
        )
        return (rightEyeGap + leftEyeGap) / 2
      } else {
        const rightEyeGap = calculateDistance(
          point["right_upper_4_x"]!, point["right_upper_4_y"]!,
          point["right_lower_5_x"]!, point["right_lower_5_y"]!
        )
        const leftEyeGap = calculateDistance(
          point["left_upper_4_x"]!, point["left_upper_4_y"]!,
          point["left_lower_5_x"]!, point["left_lower_5_y"]!
        )
        return (rightEyeGap + leftEyeGap) / 2
      }
    }

    // Calcular a distância reflexa marginal (MRD) - distância máxima entre as pálpebras
    let mrd = 0
    const distances: number[] = []
    
    data.forEach(point => {
      const distance = getEyeDistance(point)
      distances.push(distance)
      if (distance > mrd) {
        mrd = distance
      }
    })

    const maxEyeDistance = Math.max(...distances)
    const minEyeDistance = Math.min(...distances)
    
    // Calcular métricas para cada piscada
    blinks.forEach((blink, index) => {
      const duration = (blink.end - blink.start) / 30 // Convertendo para segundos
      totalDuration += duration

      // Calcular amplitude
      const amplitude = maxEyeDistance - minEyeDistance
      const rba = (amplitude / maxEyeDistance) * 100
      totalRBA += rba

      // Calcular velocidade
      const velocity = amplitude / duration
      totalVelocity += velocity

      // Verificar intervalos de tempo
      const startTime = blink.start / 30
      if (startTime >= 60 && startTime < 120) {
        blinks60to120++
      } else if (startTime >= 120 && startTime < 180) {
        blinks120to180++
      }

      // Calcular intervalo entre piscadas
      if (index > 0) {
        const interval = (blink.start - blinks[index - 1].end) / 30
        totalBlinkInterval += interval
        blinkIntervalCount++
      }

      // Primeira piscada completa
      if (blink.complete && !firstCompleteBlink.ecp) {
        firstCompleteBlink = {
          ecp: (blink.end - blink.start) / 30,
          cdp: duration,
          eop: duration,
          ibl: index > 0 ? (blink.start - blinks[index - 1].end) / 30 : 0
        }
      }

      // Primeira piscada incompleta
      if (!blink.complete && !firstIncompleteBlink.ecp) {
        firstIncompleteBlink = {
          ecp: (blink.end - blink.start) / 30,
          cdp: duration,
          eop: duration,
          ibl: index > 0 ? (blink.start - blinks[index - 1].end) / 30 : 0
        }
      }
    })

    // Calcular medidas de fissura
    const calculateFissures = (point: DataPoint) => {
      if (point.method === "dlib") {
        verticalFissure = calculateDistance(
          point["37_x"]!, point["37_y"]!,
          point["41_x"]!, point["41_y"]!
        )
        dmr1 = calculateDistance(
          point["37_x"]!, point["37_y"]!,
          point["38_x"]!, point["38_y"]!
        )
        dmr2 = calculateDistance(
          point["40_x"]!, point["40_y"]!,
          point["41_x"]!, point["41_y"]!
        )
        horizontalFissure = calculateDistance(
          point["38_x"]!, point["38_y"]!,
          point["40_x"]!, point["40_y"]!
        )
      } else {
        verticalFissure = calculateDistance(
          point["right_upper_4_x"]!, point["right_upper_4_y"]!,
          point["right_lower_5_x"]!, point["right_lower_5_y"]!
        )
        dmr1 = calculateDistance(
          point["right_upper_2_x"]!, point["right_upper_2_y"]!,
          point["right_upper_4_x"]!, point["right_upper_4_y"]!
        )
        dmr2 = calculateDistance(
          point["right_lower_3_x"]!, point["right_lower_3_y"]!,
          point["right_lower_5_x"]!, point["right_lower_5_y"]!
        )
        horizontalFissure = calculateDistance(
          point["right_upper_2_x"]!, point["right_upper_2_y"]!,
          point["right_lower_3_x"]!, point["right_lower_3_y"]!
        )
      }
    }

    // Calcular fissuras iniciais
    calculateFissures(data[0])

    // Calcular piscadas baseadas em velocidade usando MAD
    const velocities: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const curr = data[i];
      const prev = data[i - 1];
      const currDist = getEyeDistance(curr);
      const prevDist = getEyeDistance(prev);
      const velocity = Math.abs(currDist - prevDist);
      velocities.push(velocity);
    }

    const mad = calculateMAD(velocities);
    const velocityThreshold = 3 * mad;
    let inVelocityBlink = false;

    for (let i = 0; i < velocities.length; i++) {
      if (!inVelocityBlink && velocities[i] > velocityThreshold) {
        inVelocityBlink = true;
        velocityBasedBlinks++;
      } else if (inVelocityBlink && velocities[i] <= velocityThreshold) {
        inVelocityBlink = false;
      }
    }

    const recordingTime = (data[data.length - 1].frame - data[0].frame) / 30

    return {
      totalBlinks,
      completeBlinks,
      incompleteBlinks,
      avgDuration: totalBlinks > 0 ? totalDuration / totalBlinks : 0,
      avgClosingTime: totalBlinks > 0 ? totalClosingTime / totalBlinks : 0,
      avgOpeningTime: totalBlinks > 0 ? totalOpeningTime / totalBlinks : 0,
      avgVelocity: totalBlinks > 0 ? totalVelocity / totalBlinks : 0,
      blinkRate: (totalBlinks / recordingTime) * 60,
      rba: totalBlinks > 0 ? totalRBA / totalBlinks : 0,
      velocityBasedBlinks,
      blinks60to120,
      blinks120to180,
      avgBlinkInterval: blinkIntervalCount > 0 ? totalBlinkInterval / blinkIntervalCount : 0,
      verticalFissure,
      dmr1,
      dmr2,
      horizontalFissure,
      firstCompleteBlink,
      firstIncompleteBlink,
      distribution: {
        complete: completeBlinks,
        incomplete: incompleteBlinks,
        other: 0
      }
    }
  }

  const handleCSVLoad = async () => {
    if (!selectedCSVUrl) {
      toast.error("Por favor, selecione uma planilha primeiro");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
        // Buscar o arquivo do blob storage
        const response = await fetch(selectedCSVUrl);
        if (!response.ok) {
          throw new Error('Erro ao carregar arquivo');
    }

        const text = await response.text();
        // Ajuste para lidar com diferentes separadores
        const rows = text.split("\n").filter(row => row.trim()).map(row => {
            // Verifica se a linha usa | como separador
            if (row.includes("|")) {
                return row.split("|")[1]; // Pega a parte após o primeiro |
            }
            return row;
        });
        
        if (rows.length < 2) {
            toast.error("Arquivo CSV vazio ou inválido");
            setIsLoading(false);
            return;
        }

        console.log("Headers:", rows[0]); // Debug
        const headers = rows[0].split(",").map(h => h.trim());
        
        const parsedData: DataPoint[] = rows.slice(1).map((row, index) => {
            const values = row.split(",").map(v => v.trim());
            const point: any = {};
            
            try {
                point.frame = parseInt(values[0]);
                point.method = values[1]?.toLowerCase() || 'dlib';

                // Processar pontos com base no método
                if (point.method === 'dlib') {
                    // Formato: frame,method,37_x,37_y,38_x,38_y,40_x,40_y,41_x,41_y
                    const coordinates = ['37', '38', '40', '41'];
                    coordinates.forEach((coord, i) => {
                        const baseIndex = 2 + (i * 2);
                        point[`${coord}_x`] = parseFloat(values[baseIndex]);
                        point[`${coord}_y`] = parseFloat(values[baseIndex + 1]);
                    });
                } else if (point.method === 'mediapipe') {
                    // Mapear todos os pontos do MediaPipe
                    headers.slice(2).forEach((header, i) => {
                        const value = parseFloat(values[i + 2]);
                        if (!isNaN(value)) {
                            point[header] = value;
                        }
                    });
                }

                return point as DataPoint;
            } catch (e) {
                console.error(`Erro ao processar linha ${index + 2}:`, e);
                return null;
            }
        }).filter((point): point is DataPoint => point !== null);

        if (parsedData.length === 0) {
            toast.error("Nenhum dado válido encontrado no arquivo");
            setIsLoading(false);
            return;
        }

        setData(parsedData);

        // Calcular velocidades
        const newVelocityData = [calculateVelocity(parsedData)];
        setVelocityData(newVelocityData);

        // Detectar piscadas primeiro
        const blinks = detectBlinks(parsedData);
        console.log("Blinks detectados:", blinks);

        // Gerar detalhes das piscadas
        const details = generateBlinkDetails(blinks);
        setBlinkDetails(details);

        // Calcular métricas usando os mesmos blinks detectados
        const newMetrics = calculateMetrics(parsedData, blinks);
        console.log("Métricas calculadas:", newMetrics);
        if (newMetrics) {
            setMetrics(newMetrics);
            toast.success("Dados processados com sucesso!");
        } else {
            toast.error("Erro ao calcular métricas");
        }

    } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        setError((error as Error).message);
        toast.error("Erro ao processar o arquivo: " + (error as Error).message);
    } finally {
        setIsLoading(false);
    }
  };

  const getPlotData = () => {
    if (data.length > 0 && metrics) {
      return [
        {
          type: "pie",
          values: [
            metrics.distribution.complete,
            metrics.distribution.incomplete,
            metrics.distribution.other
          ],
          labels: ["Completas", "Incompletas", "Outras"],
          hole: 0.4,
          marker: {
            colors: ['#22c55e', '#f59e0b', '#ef4444']
          },
          textinfo: "label+percent",
          textposition: "outside",
          automargin: true
        } as any
      ];
    }
    return [];
  };

  // Função auxiliar para encontrar o fim da piscada
  function findBlinkEnd(startIndex: number, data: DataPoint[], threshold: number): number {
    const getEyeDistance = (point: DataPoint): number => {
      if (point.method === "dlib") {
        const rightEyeGap = calculateDistance(
          point["37_x"]!, point["37_y"]!,
          point["41_x"]!, point["41_y"]!
        )
        const leftEyeGap = calculateDistance(
          point["38_x"]!, point["38_y"]!,
          point["40_x"]!, point["40_y"]!
        )
        return (rightEyeGap + leftEyeGap) / 2
      } else {
        const rightEyeGap = calculateDistance(
          point["right_upper_4_x"]!, point["right_upper_4_y"]!,
          point["right_lower_5_x"]!, point["right_lower_5_y"]!
        )
        const leftEyeGap = calculateDistance(
          point["left_upper_4_x"]!, point["left_upper_4_y"]!,
          point["left_lower_5_x"]!, point["left_lower_5_y"]!
        )
        return (rightEyeGap + leftEyeGap) / 2
      }
    }

    for (let j = startIndex + 1; j < data.length; j++) {
      const dist = getEyeDistance(data[j])
      if (dist > threshold) {
        return j
      }
    }
    return startIndex
  }

  const generateBlinkDetails = (blinks: { start: number, end: number, complete: boolean }[]) => {
    const details: BlinkDetail[] = []
    let lastBlinkStart = 0

    blinks.forEach((blink, index) => {
      const startTime = blink.start / 30 // Convertendo frames para segundos (30 FPS)
      const endTime = blink.end / 30
      const timeSinceLastBlink = index === 0 ? 0 : (blink.start - lastBlinkStart) / 30

      details.push({
        eye: "Both", // Como estamos analisando ambos os olhos juntos
        blinkNumber: index + 1,
        startFrame: blink.start,
        endFrame: blink.end,
        startTime: startTime,
        endTime: endTime,
        duration: endTime - startTime,
        timeSinceLastBlink: timeSinceLastBlink,
        isComplete: blink.complete
      })

      lastBlinkStart = blink.start
    })

    return details
  }

  return (
    <SidebarInset>
      <div className="flex-1 space-y-6 p-8 relative">
        <InfoButton />
        <div>
          <h1 className="text-3xl font-bold mb-2">Estatísticas das Piscadas</h1>
          <p className="text-muted-foreground">
            Analise as estatísticas das piscadas detectadas no vídeo
          </p>
        </div>

        <div className="grid gap-6">
          <CSVSelector 
            selectedCSV={selectedCSVUrl}
            onCSVSelect={(url, filename) => {
              setSelectedCSVUrl(url)
              setSelectedCSVFilename(filename)
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
            <CardContent className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold">Planilha Selecionada:</p>
                  <p className="text-sm text-muted-foreground">{selectedCSVFilename}</p>
                </div>
                
                <Button 
                  onClick={handleCSVLoad}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    "Processando arquivo..."
                  ) : (
                    "Carregar e Analisar Planilha"
                  )}
                </Button>
                
                {isLoading && (
                  <div className="text-sm text-muted-foreground">
                    Processando arquivo...
                  </div>
                )}
                {error && (
                  <div className="text-sm text-red-500">
                    Erro: {error}
                  </div>
                )}
                {data.length > 0 && (
                  <div className="text-sm text-green-500">
                    {data.length} pontos carregados
                  </div>
                )}
            </CardContent>
          </Card>
          )}

          {data.length > 0 && metrics && (
            <>
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="general">Métricas Gerais</TabsTrigger>
                  <TabsTrigger value="timing">Análise Temporal</TabsTrigger>
                  <TabsTrigger value="fissure">Medidas de Fissura</TabsTrigger>
                  <TabsTrigger value="firstblinks">Primeiras Piscadas</TabsTrigger>
                  <TabsTrigger value="details">Detalhes das Piscadas</TabsTrigger>
                </TabsList>

                {/* Aba: Métricas Gerais */}
                <TabsContent value="general" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Card: Contagem de Piscadas */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Contagem de Piscadas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Piscadas Completas</h4>
                            <p className="text-2xl font-bold">{metrics.completeBlinks}</p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Piscadas Incompletas</h4>
                            <p className="text-2xl font-bold">{metrics.incompleteBlinks}</p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Total de Piscadas</h4>
                            <p className="text-2xl font-bold">{metrics.totalBlinks}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Card: Gráfico de Distribuição */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Distribuição</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PlotlyComponent
                          data={getPlotData()}
                          layout={{
                            height: 300,
                            showlegend: true,
                            margin: { t: 20, r: 20, l: 20, b: 20 }
                          }}
                          config={{ responsive: true }}
                        />
                      </CardContent>
                    </Card>

                    {/* Card: Velocidade e RBA */}
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg">Velocidade e Amplitude</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Velocidade Média</h4>
                            <p className="text-2xl font-bold">{metrics.avgVelocity.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">pixels/s</p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">RBA</h4>
                            <p className="text-2xl font-bold">{metrics.rba.toFixed(1)}%</p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Por Velocidade</h4>
                            <p className="text-2xl font-bold">{metrics.velocityBasedBlinks}</p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Duração Média</h4>
                            <p className="text-2xl font-bold">{metrics.avgDuration.toFixed(3)} <span className="text-xs">s</span></p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Aba: Análise Temporal */}
                <TabsContent value="timing" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Card: Intervalos de Tempo */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Intervalos de Tempo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Piscadas (60-120s)</h4>
                            <p className="text-2xl font-bold">{metrics.blinks60to120}</p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Piscadas (120-180s)</h4>
                            <p className="text-2xl font-bold">{metrics.blinks120to180}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Card: Taxas e Médias */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Taxas e Médias</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Média por Minuto</h4>
                            <p className="text-2xl font-bold">{metrics.blinkRate.toFixed(1)}</p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Intervalo Médio</h4>
                            <p className="text-2xl font-bold">{metrics.avgBlinkInterval.toFixed(1)} <span className="text-xs">s</span></p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Card: Gráfico de Velocidade */}
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg">Velocidade ao Longo do Tempo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <PlotlyComponent
                          data={velocityData}
                          layout={{
                            xaxis: { title: "Frame" },
                            yaxis: { title: "Velocidade (pixels/s)" },
                            height: 300,
                            margin: { t: 20, r: 30, l: 50, b: 50 },
                            showlegend: true,
                            paper_bgcolor: "transparent",
                            plot_bgcolor: "transparent"
                          }}
                          config={{
                            displayModeBar: false,
                            responsive: true
                          }}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Aba: Medidas de Fissura */}
                <TabsContent value="fissure" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Card: Fissuras */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Fissuras</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Fissura Vertical</h4>
                            <p className="text-2xl font-bold">{metrics.verticalFissure.toFixed(2)} <span className="text-xs">mm</span></p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">Fissura Horizontal</h4>
                            <p className="text-2xl font-bold">{metrics.horizontalFissure.toFixed(2)} <span className="text-xs">mm</span></p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Card: Distâncias Marginais */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Distâncias Marginais</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">DMR1</h4>
                            <p className="text-2xl font-bold">{metrics.dmr1.toFixed(2)} <span className="text-xs">mm</span></p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">DMR2</h4>
                            <p className="text-2xl font-bold">{metrics.dmr2.toFixed(2)} <span className="text-xs">mm</span></p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Aba: Primeiras Piscadas */}
                <TabsContent value="firstblinks" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Card: Primeiro Piscar Completo */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Primeiro Piscar Completo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">ECP (Fase de Fechamento)</h4>
                            <p className="text-2xl font-bold">{metrics.firstCompleteBlink.ecp.toFixed(3)} <span className="text-xs">s</span></p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">CDP (Duração do Fechamento)</h4>
                            <p className="text-2xl font-bold">{metrics.firstCompleteBlink.cdp.toFixed(3)} <span className="text-xs">s</span></p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">EOP (Fase de Abertura)</h4>
                            <p className="text-2xl font-bold">{metrics.firstCompleteBlink.eop.toFixed(3)} <span className="text-xs">s</span></p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">IBL (Latência)</h4>
                            <p className="text-2xl font-bold">{metrics.firstCompleteBlink.ibl.toFixed(3)} <span className="text-xs">s</span></p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Card: Primeiro Piscar Incompleto */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Primeiro Piscar Incompleto</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">ECP (Fase de Fechamento)</h4>
                            <p className="text-2xl font-bold">{metrics.firstIncompleteBlink.ecp.toFixed(3)} <span className="text-xs">s</span></p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">CDP (Duração do Fechamento)</h4>
                            <p className="text-2xl font-bold">{metrics.firstIncompleteBlink.cdp.toFixed(3)} <span className="text-xs">s</span></p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">EOP (Fase de Abertura)</h4>
                            <p className="text-2xl font-bold">{metrics.firstIncompleteBlink.eop.toFixed(3)} <span className="text-xs">s</span></p>
                          </div>
                          <div className="bg-secondary/10 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-muted-foreground">IBL (Latência)</h4>
                            <p className="text-2xl font-bold">{metrics.firstIncompleteBlink.ibl.toFixed(3)} <span className="text-xs">s</span></p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Aba: Detalhes das Piscadas */}
                <TabsContent value="details" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Detalhes de Cada Piscada</CardTitle>
                        <Button onClick={downloadBlinkDetails} variant="outline" size="sm">
                          <FileDown className="h-4 w-4 mr-2" />
                          Download CSV
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Olho</TableHead>
                              <TableHead>Nº</TableHead>
                              <TableHead>Frame Inicial</TableHead>
                              <TableHead>Frame Final</TableHead>
                              <TableHead>Início (s)</TableHead>
                              <TableHead>Fim (s)</TableHead>
                              <TableHead>Duração (s)</TableHead>
                              <TableHead>Tempo desde última (s)</TableHead>
                              <TableHead>Tipo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {blinkDetails.map((detail, index) => (
                              <TableRow key={index}>
                                <TableCell>{detail.eye}</TableCell>
                                <TableCell>{detail.blinkNumber}</TableCell>
                                <TableCell>{detail.startFrame}</TableCell>
                                <TableCell>{detail.endFrame}</TableCell>
                                <TableCell>{detail.startTime.toFixed(3)}</TableCell>
                                <TableCell>{detail.endTime.toFixed(3)}</TableCell>
                                <TableCell>{detail.duration.toFixed(3)}</TableCell>
                                <TableCell>{detail.timeSinceLastBlink.toFixed(3)}</TableCell>
                                <TableCell className={detail.isComplete ? "text-green-600 font-medium" : "text-yellow-600 font-medium"}>
                                  {detail.isComplete ? "Completa" : "Incompleta"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </SidebarInset>
  )
} 