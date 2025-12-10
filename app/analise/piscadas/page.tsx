"use client"

import { useState } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Clock, Upload, Eye, Download, BarChart3, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import { CSVSelector } from "../../components/CSVSelector"
import { FileUploadCard } from "../../components/FileUploadCard"

export default function AnalysePiscadasPage() {
  const [selectedCSVUrl, setSelectedCSVUrl] = useState<string | null>(null)
  const [selectedCSVFilename, setSelectedCSVFilename] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [analysisData, setAnalysisData] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [detectedFPS, setDetectedFPS] = useState<number>(30)
  const [statistics, setStatistics] = useState({
    totalBlinks: 0,
    averageDuration: 0,
    blinkRate: 0,
    longestBlink: 0,
    shortestBlink: 0
  })

  // Função auxiliar para calcular distância euclidiana
  const dist = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
  }

  const processCSVData = (csvText: string) => {
    console.log("Iniciando processamento do CSV", csvText.substring(0, 100))
    const lines = csvText.trim().split('\n').filter(line => line.trim().length > 0)
    if (lines.length < 2) {
      console.error("Arquivo vazio ou apenas cabeçalho")
      toast.error("O arquivo CSV parece estar vazio ou inválido.")
      return
    }

    // Detectar delimitador e remover BOM se existir
    const headerLine = lines[0].replace(/^\uFEFF/, '')
    const delimiter = headerLine.includes(';') ? ';' : ','
    console.log("Delimitador detectado:", delimiter)

    const headers = headerLine.split(delimiter).map(h => h.trim())
    console.log("Headers encontrados:", headers)

    // Detectar FPS automaticamente
    const dataRows = lines.slice(1)
    const idx_frame_temp = headers.indexOf('frame')

    let fps = 30 // Valor padrão

    if (dataRows.length > 1 && idx_frame_temp !== -1) {
      // Pegar primeiro e último frame
      const firstFrameCols = dataRows[0].split(delimiter)
      const lastFrameCols = dataRows[dataRows.length - 1].split(delimiter)

      const firstFrame = parseInt(firstFrameCols[idx_frame_temp])
      const lastFrame = parseInt(lastFrameCols[idx_frame_temp])
      const totalFrames = lastFrame - firstFrame + 1

      // Estimar duração baseada em 30 FPS
      const estimatedDuration = totalFrames / 30

      if (totalFrames > 0 && dataRows.length > 1) {
        const framesPerMinute = totalFrames / (estimatedDuration / 60)

        // Heurística para detectar FPS
        if (framesPerMinute > 6000) {
          fps = 120
        } else if (framesPerMinute > 3000) {
          fps = 60
        } else if (framesPerMinute > 1500) {
          fps = 30
        } else {
          fps = 24
        }
      }
    }

    setDetectedFPS(fps)
    toast.info(`FPS detectado: ${fps}`)
    console.log(`FPS detectado: ${fps}`)

    // Função auxiliar para pegar índice da coluna
    const getIdx = (name: string) => headers.indexOf(name)

    // Índices necessários
    const requiredColumns = [
      'frame',
      'right_upper_4_x', 'right_upper_4_y', 'right_lower_5_x', 'right_lower_5_y',
      'right_upper_1_x', 'right_upper_1_y', 'right_upper_7_x', 'right_upper_7_y',
      'left_upper_4_x', 'left_upper_4_y', 'left_lower_5_x', 'left_lower_5_y',
      'left_upper_1_x', 'left_upper_1_y', 'left_upper_7_x', 'left_upper_7_y'
    ]

    const missingColumns = requiredColumns.filter(col => getIdx(col) === -1)

    if (missingColumns.length > 0) {
      console.error("Colunas faltando:", missingColumns)
      toast.error(`CSV inválido. Colunas faltando: ${missingColumns.slice(0, 3).join(', ')}...`)
      return
    }

    // Mapear índices
    const idx_frame = getIdx('frame')

    const idx_ru4_x = getIdx('right_upper_4_x')
    const idx_ru4_y = getIdx('right_upper_4_y')
    const idx_rl5_x = getIdx('right_lower_5_x')
    const idx_rl5_y = getIdx('right_lower_5_y')
    const idx_ru1_x = getIdx('right_upper_1_x')
    const idx_ru1_y = getIdx('right_upper_1_y')
    const idx_ru7_x = getIdx('right_upper_7_x')
    const idx_ru7_y = getIdx('right_upper_7_y')

    const idx_lu4_x = getIdx('left_upper_4_x')
    const idx_lu4_y = getIdx('left_upper_4_y')
    const idx_ll5_x = getIdx('left_lower_5_x')
    const idx_ll5_y = getIdx('left_lower_5_y')
    const idx_lu1_x = getIdx('left_upper_1_x')
    const idx_lu1_y = getIdx('left_upper_1_y')
    const idx_lu7_x = getIdx('left_upper_7_x')
    const idx_lu7_y = getIdx('left_upper_7_y')

    const detectedBlinks: any[] = []
    let blinkStartFrame: number | null = null
    const EAR_THRESHOLD = 0.30 // Increased from 0.22 based on data analysis

    let processedCount = 0
    let minEAR = 1.0
    let maxEAR = 0.0
    let sumEAR = 0.0

    dataRows.forEach((rowStr) => {
      const cols = rowStr.split(delimiter).map(Number)
      if (cols.some(isNaN) || cols.length < headers.length) return

      processedCount++
      const frame = cols[idx_frame]

      // Right Eye EAR
      const ru4 = { x: cols[idx_ru4_x], y: cols[idx_ru4_y] }
      const rl5 = { x: cols[idx_rl5_x], y: cols[idx_rl5_y] }
      const ru1 = { x: cols[idx_ru1_x], y: cols[idx_ru1_y] }
      const ru7 = { x: cols[idx_ru7_x], y: cols[idx_ru7_y] }

      const rightHeight = dist(ru4, rl5)
      const rightWidth = dist(ru1, ru7)
      const rightEAR = rightWidth > 0 ? rightHeight / rightWidth : 0

      // Left Eye EAR
      const lu4 = { x: cols[idx_lu4_x], y: cols[idx_lu4_y] }
      const ll5 = { x: cols[idx_ll5_x], y: cols[idx_ll5_y] }
      const lu1 = { x: cols[idx_lu1_x], y: cols[idx_lu1_y] }
      const lu7 = { x: cols[idx_lu7_x], y: cols[idx_lu7_y] }

      const leftHeight = dist(lu4, ll5)
      const leftWidth = dist(lu1, lu7)
      const leftEAR = leftWidth > 0 ? leftHeight / leftWidth : 0

      const avgEAR = (rightEAR + leftEAR) / 2

      // Collect stats for debugging
      if (avgEAR < minEAR) minEAR = avgEAR
      if (avgEAR > maxEAR) maxEAR = avgEAR
      sumEAR += avgEAR

      if (avgEAR < EAR_THRESHOLD) {
        if (blinkStartFrame === null) {
          blinkStartFrame = frame
        }
      } else {
        if (blinkStartFrame !== null) {
          // Piscada terminou
          const durationFrames = frame - blinkStartFrame
          const durationSec = durationFrames / fps

          if (durationSec > 0.03) {
            detectedBlinks.push({
              frame: blinkStartFrame,
              timestamp: new Date(blinkStartFrame * (1000 / fps)).toISOString().substring(11, 23),
              duration: durationSec.toFixed(3),
              type: durationSec < 0.15 ? 'fast' : durationSec > 0.3 ? 'slow' : 'normal',
            })
          }
          blinkStartFrame = null
        }
      }
    })

    if (blinkStartFrame !== null) {
      // Blink continues until end
      const frame = dataRows.length
      const durationFrames = frame - blinkStartFrame
      const durationSec = durationFrames / fps
      detectedBlinks.push({
        frame: blinkStartFrame,
        timestamp: new Date(blinkStartFrame * (1000 / fps)).toISOString().substring(11, 23),
        duration: durationSec.toFixed(3),
        type: durationSec < 0.15 ? 'fast' : durationSec > 0.3 ? 'slow' : 'normal',
      })
    }

    const avgTotalEAR = processedCount > 0 ? sumEAR / processedCount : 0
    console.log(`Estatísticas EAR - Min: ${minEAR.toFixed(3)}, Max: ${maxEAR.toFixed(3)}, Médio: ${avgTotalEAR.toFixed(3)}`)
    console.log("Processamento concluído. Piscadas:", detectedBlinks.length)

    // Estatísticas
    if (detectedBlinks.length > 0) {
      const durations = detectedBlinks.map(b => parseFloat(b.duration))
      const totalDuration = durations.reduce((a, b) => a + b, 0)
      const avg = totalDuration / durations.length

      const lastRow = dataRows[dataRows.length - 1]
      const lastFrameVal = lastRow ? lastRow.split(delimiter)[idx_frame] : '0'
      const lastFrame = parseInt(lastFrameVal || '0')
      const totalVideoSeconds = (lastFrame) / fps || 1
      const rate = (detectedBlinks.length / totalVideoSeconds) * 60

      setStatistics({
        totalBlinks: detectedBlinks.length,
        averageDuration: parseFloat(avg.toFixed(3)),
        blinkRate: parseFloat(rate.toFixed(1)),
        longestBlink: parseFloat(Math.max(...durations).toFixed(3)),
        shortestBlink: parseFloat(Math.min(...durations).toFixed(3))
      })
      setAnalysisData(detectedBlinks)
      toast.success(`Análise concluída: ${detectedBlinks.length} piscadas detectadas`)
    } else {
      setStatistics({
        totalBlinks: 0,
        averageDuration: 0,
        blinkRate: 0,
        longestBlink: 0,
        shortestBlink: 0
      })
      setAnalysisData([])
      toast.warning(`Nenhuma piscada detectada. (Min EAR: ${minEAR.toFixed(3)} | Threshold: ${EAR_THRESHOLD})`)
    }
  }

  const handleProcessUploadedFile = async () => {
    console.log("handleProcessUploadedFile chamado")

    if (!uploadedFile) {
      console.log("Nenhum arquivo no state uploadedFile")
      toast.error("Nenhum arquivo selecionado")
      return
    }

    console.log("Arquivo selecionado:", uploadedFile.name)
    setIsAnalyzing(true)
    toast.info("Lendo arquivo...")

    try {
      const csvText = await uploadedFile.text()
      console.log("Arquivo lido, tamanho:", csvText.length)
      processCSVData(csvText)

      setSelectedCSVUrl(null)
      setSelectedCSVFilename(null)
    } catch (error) {
      console.error("Erro no processamento:", error)
      toast.error("Erro ao ler o arquivo CSV: " + error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analyzeBlinkData = async () => {
    if (!selectedCSVUrl || !selectedCSVFilename) {
      toast.error("Por favor, selecione uma planilha primeiro")
      return
    }

    setIsAnalyzing(true)
    toast.info("Baixando e processando...")
    try {
      const response = await fetch(selectedCSVUrl);
      if (!response.ok) {
        throw new Error('Erro ao carregar arquivo');
      }
      const csvText = await response.text();
      processCSVData(csvText)

    } catch (error) {
      toast.error("Erro ao analisar dados de piscadas: " + error)
      console.error(error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const exportResults = () => {
    if (!analysisData.length) {
      toast.error("Nenhum dado para exportar")
      return
    }

    const csvContent = "data:text/csv;charset=utf-8," +
      "Frame,Timestamp,Duration (s),Type\n" +
      analysisData.map(row =>
        `${row.frame},${row.timestamp},${row.duration},${row.type}`
      ).join("\n")

    const link = document.createElement("a")
    link.setAttribute("href", csvContent)
    link.setAttribute("download", `analise_piscadas_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Resultados exportados!")
  }

  return (
    <SidebarInset>
      <div className="flex-1 space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            Análise de Piscadas
          </h1>
          <p className="text-muted-foreground">
            Analise detalhadamente os frames e timestamps de cada piscada detectada no vídeo.
          </p>
        </div>

        {/* Selection Section */}
        <CSVSelector
          selectedCSV={selectedCSVUrl}
          onCSVSelect={(url, filename) => {
            setSelectedCSVUrl(url)
            setSelectedCSVFilename(filename)
          }}
        />

        <FileUploadCard
          uploadedFile={uploadedFile}
          onFileSelect={setUploadedFile}
          onProcessFile={handleProcessUploadedFile}
          isLoading={isAnalyzing}
        />

        {selectedCSVUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Processar Planilha Selecionada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Planilha:</strong> {selectedCSVFilename}
                </p>
              </div>

              <Button
                onClick={analyzeBlinkData}
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>Analisando Piscadas...</>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Analisar Piscadas
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        {analysisData.length > 0 && (
          <>
            <Card className="bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">FPS Detectado</p>
                    <div className="text-2xl font-bold text-primary">{detectedFPS} FPS</div>
                  </div>
                  <Eye className="h-8 w-8 text-primary/30" />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{statistics.totalBlinks}</div>
                  <p className="text-sm text-muted-foreground">Total de Piscadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{statistics.averageDuration}s</div>
                  <p className="text-sm text-muted-foreground">Duração Média</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{statistics.blinkRate}</div>
                  <p className="text-sm text-muted-foreground">Piscadas/min</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{statistics.longestBlink}s</div>
                  <p className="text-sm text-muted-foreground">Mais Longa</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{statistics.shortestBlink}s</div>
                  <p className="text-sm text-muted-foreground">Mais Curta</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Results Table */}
        {analysisData.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resultados da Análise
              </CardTitle>
              <Button onClick={exportResults} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Frame</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Duração (s)</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisData.map((blink, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{blink.frame}</TableCell>
                      <TableCell className="font-mono">{blink.timestamp}</TableCell>
                      <TableCell className="font-mono">{blink.duration}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${blink.type === 'normal' ? 'bg-green-100 text-green-800' :
                          blink.type === 'slow' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                          {blink.type}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Como usar</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Carregue um arquivo CSV com coordenadas dos pontos faciais.</li>
              <li>O sistema calculará automaticamente o EAR (Eye Aspect Ratio).</li>
              <li>Piscadas são detectadas quando o EAR cai abaixo de 0.30.</li>
              <li>Visualize as estatísticas e resultados detalhados.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  )
}