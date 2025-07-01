"use client"

import { useState, useRef, useEffect } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceArea,
  ResponsiveContainer 
} from "recharts"
import { Upload, Play, Pause, ZoomIn, ZoomOut, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface Point {
  frame: number
  "37_x": number
  "37_y": number
  "38_x": number
  "38_y": number
  "40_x": number
  "40_y": number
  "41_x": number
  "41_y": number
}

interface BlinkData {
  frame: number
  distance: number
  isBlink: boolean
}

export default function VisualizarSincronizadoPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [points, setPoints] = useState<Point[]>([])
  const [blinkData, setBlinkData] = useState<BlinkData[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [zoomDomain, setZoomDomain] = useState<{ start: number; end: number } | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selectStart, setSelectStart] = useState<number | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setVideoFile(file)
    const videoUrl = URL.createObjectURL(file)
    if (videoRef.current) {
      videoRef.current.src = videoUrl
    }

    // Processar o vídeo para extrair pontos
    const formData = new FormData()
    formData.append("video", file)

    try {
      const response = await fetch("/api/extract-points", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Falha ao processar vídeo")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("Falha ao ler resposta")

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const message = new TextDecoder().decode(value)
        const data = JSON.parse(message)

        if (data.points) {
          setPoints(data.points)
          // Calcular dados de piscadas
          const blinks = calculateBlinks(data.points)
          setBlinkData(blinks)
        }
      }

      toast.success("Vídeo processado com sucesso!")
    } catch (error) {
      toast.error("Erro ao processar o vídeo")
      console.error(error)
    }
  }

  const calculateBlinks = (points: Point[]): BlinkData[] => {
    return points.map(point => {
      // Calcular distância vertical entre os pontos das pálpebras
      const distance = Math.abs(point["37_y"] - point["41_y"])
      // Definir um limiar para considerar como piscada
      const threshold = 10 // Ajuste conforme necessário
      return {
        frame: point.frame,
        distance,
        isBlink: distance < threshold
      }
    })
  }

  const drawFacialPoints = (frame: number) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video || !points.length) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Encontrar pontos do frame atual
    const currentPoints = points.find(p => p.frame === frame)
    if (!currentPoints) return

    // Desenhar pontos
    ctx.fillStyle = "#FF0000"
    const pointsArray = [
      [currentPoints["37_x"], currentPoints["37_y"]],
      [currentPoints["38_x"], currentPoints["38_y"]],
      [currentPoints["40_x"], currentPoints["40_y"]],
      [currentPoints["41_x"], currentPoints["41_y"]]
    ]

    pointsArray.forEach(([x, y]) => {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    })

    // Conectar pontos
    ctx.strokeStyle = "#FF0000"
    ctx.beginPath()
    ctx.moveTo(currentPoints["37_x"], currentPoints["37_y"])
    pointsArray.forEach(([x, y]) => {
      ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.stroke()
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const fps = 30 // Assumindo 30 fps
      const currentFrame = Math.floor(video.currentTime * fps)
      setCurrentFrame(currentFrame)
      drawFacialPoints(currentFrame)
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    return () => video.removeEventListener("timeupdate", handleTimeUpdate)
  }, [points])

  const handlePlayPause = () => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleZoom = (start: number, end: number) => {
    setZoomDomain({ start, end })
  }

  const resetZoom = () => {
    setZoomDomain(null)
  }

  return (
    <SidebarInset>
      <div className="flex-1 space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Visualização Sincronizada</h1>
          <p className="text-muted-foreground">
            Visualize o vídeo sincronizado com os dados das piscadas
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload do Vídeo</CardTitle>
            </CardHeader>
            <CardContent>
              <Input 
                type="file" 
                accept="video/*" 
                onChange={handleVideoUpload}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Vídeo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video">
                  <video 
                    ref={videoRef} 
                    className="w-full h-full"
                    controls={false}
                  />
                  <canvas 
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                  />
                </div>
                <div className="flex items-center justify-center mt-4 space-x-2">
                  <Button onClick={handlePlayPause}>
                    {isPlaying ? (
                      <Pause className="h-4 w-4 mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {isPlaying ? "Pausar" : "Reproduzir"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gráfico de Piscadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={blinkData}
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="frame"
                        domain={zoomDomain ? [zoomDomain.start, zoomDomain.end] : ["auto", "auto"]}
                      />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="distance" 
                        stroke="#8884d8"
                        dot={false}
                      />
                      {blinkData.map((point, index) => 
                        point.isBlink && (
                          <ReferenceArea
                            key={index}
                            x1={point.frame}
                            x2={point.frame + 1}
                            fill="red"
                            fillOpacity={0.3}
                          />
                        )
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-end mt-4 space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={resetZoom}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarInset>
  )
} 