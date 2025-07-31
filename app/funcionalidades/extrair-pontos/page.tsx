"use client"

import { useState, useRef } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Upload, Download, Eye, Info, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { VideoSelector } from "../../components/VideoSelector"

export default function ExtrairPontosPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedData, setProcessedData] = useState<any[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [allPoints, setAllPoints] = useState<any[]>([])
  const [isDownloadingModel, setIsDownloadingModel] = useState(false)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null)
  const [selectedVideoFilename, setSelectedVideoFilename] = useState<string | null>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const processVideo = async (method: "normal" | "potente") => {
    if (!selectedVideoUrl || !selectedVideoFilename) {
      toast.error("Por favor, selecione um vídeo dos arquivos armazenados")
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setProcessedData([])
    setLogs([])
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
        toast.error(errorData.error || "Erro desconhecido ao processar o vídeo")
        throw new Error(errorData.error)
      }

      const data = await response.json()
      
      if (data.status === 'downloading_model') {
        setIsDownloadingModel(true)
        toast.loading("Baixando modelo do dlib... Isso pode levar alguns minutos na primeira vez.", {
          duration: 5000
        })
        setTimeout(() => processVideo(method), 5000)
        return
      }

      if (data.progress !== undefined) {
        setProgress(data.progress)
      }
      if (data.points) {
        setProcessedData(data.points.slice(0, 20))
        setAllPoints(data.points)
      }
      if (data.totalPoints) {
        setTotalPoints(data.totalPoints)
      }
      
      toast.success("Pontos extraídos com sucesso!")
    } catch (error) {
      console.error("Erro completo:", error)
      toast.error(`Erro ao processar vídeo: ${error}`)
    } finally {
      if (!isDownloadingModel) {
        setIsProcessing(false)
      }
    }
  }

  const handleDownload = () => {
    if (!allPoints.length) {
      toast.error("Nenhum dado para baixar")
      return
    }

    const csvContent = generateCSV(allPoints)
    const methodType = allPoints[0].method === 'dlib' ? 'dlib' : 'mediapipe'
    const link = document.createElement("a")
    link.setAttribute("href", csvContent)
    link.setAttribute("download", `pontos_${methodType}_${new Date().toISOString().slice(0,19).replace(/[:-]/g, '')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Download iniciado!")
  }

  const generateCSV = (points: any[]) => {
    if (!points.length) return '';

    const isMediaPipe = points[0].method === "mediapipe";
    
    // Criar o conteúdo base64 para download
    const csvContent = "data:text/csv;charset=utf-8,";
    
    if (isMediaPipe) {
      const headers = [
        "frame",
        "method",
        ...Array.from({ length: 7 }, (_, i) => `right_upper_${i + 1}_x`),
        ...Array.from({ length: 7 }, (_, i) => `right_upper_${i + 1}_y`),
        ...Array.from({ length: 9 }, (_, i) => `right_lower_${i + 1}_x`),
        ...Array.from({ length: 9 }, (_, i) => `right_lower_${i + 1}_y`),
        ...Array.from({ length: 7 }, (_, i) => `left_upper_${i + 1}_x`),
        ...Array.from({ length: 7 }, (_, i) => `left_upper_${i + 1}_y`),
        ...Array.from({ length: 9 }, (_, i) => `left_lower_${i + 1}_x`),
        ...Array.from({ length: 9 }, (_, i) => `left_lower_${i + 1}_y`),
      ];

      return csvContent + headers.join(',') + '\n' + 
        points.map(point => {
          const values = [point.frame, point.method];
          
          // Adicionar pontos superiores do olho direito
          for (let i = 1; i <= 7; i++) {
            values.push(point[`right_upper_${i}_x`] || '0');
            values.push(point[`right_upper_${i}_y`] || '0');
          }
          
          // Adicionar pontos inferiores do olho direito
          for (let i = 1; i <= 9; i++) {
            values.push(point[`right_lower_${i}_x`] || '0');
            values.push(point[`right_lower_${i}_y`] || '0');
          }
          
          // Adicionar pontos superiores do olho esquerdo
          for (let i = 1; i <= 7; i++) {
            values.push(point[`left_upper_${i}_x`] || '0');
            values.push(point[`left_upper_${i}_y`] || '0');
          }
          
          // Adicionar pontos inferiores do olho esquerdo
          for (let i = 1; i <= 9; i++) {
            values.push(point[`left_lower_${i}_x`] || '0');
            values.push(point[`left_lower_${i}_y`] || '0');
          }
          
          return values.join(',');
        }).join('\n');
    } else {
      // Headers para dlib
      const headers = [
        "frame",
        "method",
        "37_x",
        "37_y",
        "38_x",
        "38_y",
        "40_x",
        "40_y",
        "41_x",
        "41_y"
      ];

      return csvContent + headers.join(',') + '\n' + 
        points.map(point => [
          point.frame,
          point.method,
          point["37_x"] || '0',
          point["37_y"] || '0',
          point["38_x"] || '0',
          point["38_y"] || '0',
          point["40_x"] || '0',
          point["40_y"] || '0',
          point["41_x"] || '0',
          point["41_y"] || '0'
        ].join(',')).join('\n');
    }
  };

  const InfoDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="absolute top-8 right-8">
          <Info className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Extração de Pontos Faciais</DialogTitle>
          <DialogDescription>
            Como funciona o processo de extração de pontos
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <h3 className="font-semibold mb-2">Métodos de Extração</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold">Extração Normal (dlib)</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Usa a biblioteca dlib para detecção facial</li>
                  <li>Mais preciso em condições normais de iluminação</li>
                  <li>Melhor para vídeos com faces bem visíveis</li>
                  <li>Requer download do modelo predictor</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold">Extração Potente (MediaPipe)</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Usa o MediaPipe Face Mesh para detecção facial</li>
                  <li>Mais robusto em condições variadas</li>
                  <li>Melhor para vídeos com iluminação desafiadora</li>
                  <li>Não requer download de modelos adicionais</li>
                </ul>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">O Processo</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              <li>Upload do vídeo para processamento</li>
              <li>Detecção facial em cada frame</li>
              <li>Extração dos pontos faciais</li>
              <li>Exportação dos dados em CSV</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Resultados</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              <li>Tabela com coordenadas dos pontos</li>
              <li>Arquivo CSV para análise posterior</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <SidebarInset>
      <div className="flex-1 space-y-6 p-8 relative">
        <InfoDialog />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Extração de Pontos</h1>
            <p className="text-muted-foreground mt-2">
              Extraia pontos faciais de vídeos usando dlib ou MediaPipe
            </p>
          </div>
          <Eye className="h-10 w-10 text-primary" />
        </div>

        <div className="grid gap-6">
          <VideoSelector 
            selectedVideo={selectedVideoUrl}
            onVideoSelect={(url, filename) => {
              setSelectedVideoUrl(url)
              setSelectedVideoFilename(filename)
            }}
          />

          {selectedVideoUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Processar Vídeo Selecionado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold">Vídeo Selecionado:</p>
                  <p className="text-sm text-muted-foreground">{selectedVideoFilename}</p>
                </div>
                <div className="flex gap-4">
                  <Button 
                    onClick={() => processVideo("normal")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Extração Normal (dlib)"
                    )}
                  </Button>
                  <Button 
                    onClick={() => processVideo("potente")}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Extração Potente (MediaPipe)"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {processedData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-4">
                    <CardTitle>Resultados (Primeiros 20 frames)</CardTitle>
                    <Button 
                      onClick={handleDownload}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar CSV Completo
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden">
                      <Table>
                        <TableCaption>
                          Mostrando {processedData.length} de {totalPoints} frames processados
                        </TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-background">Frame</TableHead>
                            <TableHead className="sticky left-[80px] bg-background">Método</TableHead>
                            {Object.keys(processedData[0])
                              .filter(key => key !== "frame" && key !== "method")
                              .map(key => (
                                <TableHead key={key}>{key}</TableHead>
                              ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {processedData.map((point, index) => (
                            <TableRow key={index}>
                              <TableCell className="sticky left-0 bg-background">{point.frame}</TableCell>
                              <TableCell className="sticky left-[80px] bg-background">{point.method}</TableCell>
                              {Object.entries(point)
                                .filter(([key]) => key !== "frame" && key !== "method")
                                .map(([key, value]) => (
                                  <TableCell key={key}>{value as string}</TableCell>
                                ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </SidebarInset>
  )
}
