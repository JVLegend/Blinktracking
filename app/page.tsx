"use client"

import { SidebarInset } from "@/components/ui/sidebar"
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid"
import {
  Scan,
  Video,
  Image,
  BarChart3,
  Clock,
  Eye,
  Upload,
  FileVideo,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Move,
  Brain,
  Sparkles,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useFileUpload } from "./hooks/useFileUpload"
import { useStoredFiles } from "./hooks/useStoredFiles"
import { StoredFiles } from "./components/StoredFiles"
import { useRef } from "react"
import Link from "next/link"

const analysisFeatures = [
  {
    Icon: Clock,
    name: "Análise de Piscadas (EAR)",
    description: "Algoritmo avançado de Eye Aspect Ratio (6 pontos) para detecção precisa de piscadas completas e incompletas.",
    href: "/analise/piscadas",
    cta: "Acessar Análise",
    background: <div className="absolute -right-20 -top-20 opacity-60 bg-gradient-to-br from-blue-500/20 to-transparent w-full h-full" />,
    className: "col-span-3 lg:col-span-1 border-primary/20 bg-primary/5",
  },
  {
    Icon: Move,
    name: "Estabilidade da Cabeça",
    description: "Nova ferramenta de Scatter Plot para visualizar a dispersão espacial e identificar movimentos indesejados da cabeça.",
    href: "/analise/estabilidade",
    cta: "Verificar Estabilidade",
    background: <div className="absolute -right-20 -top-20 opacity-60 bg-gradient-to-br from-purple-500/20 to-transparent w-full h-full" />,
    className: "col-span-3 lg:col-span-1 border-purple-500/20 bg-purple-500/5",
  },
  {
    Icon: BarChart3,
    name: "Coordenadas Brutas",
    description: "Visualize e exporte os dados brutos de coordenadas para validação técnica e pesquisa aprofundada.",
    href: "/analise/coordenadas",
    cta: "Explorar Dados",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "col-span-3 lg:col-span-1",
  },
]

const processingFeatures = [
  {
    Icon: Scan,
    name: "Extração de Pontos",
    description: "Processamento de vídeo para extração de 478 landmarks faciais via MediaPipe.",
    href: "/funcionalidades/extrair-pontos",
    cta: "Processar Vídeo",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "lg:col-span-1",
  },
  {
    Icon: Video,
    name: "Renderização",
    description: "Gere vídeos com overlay visual dos pontos rastreados para controle de qualidade.",
    href: "/funcionalidades/gerar-video",
    cta: "Renderizar",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "lg:col-span-1",
  },
  {
    Icon: Image,
    name: "Frames Individuais",
    description: "Extração e análise frame a frame para inspeção minuciosa de micro-expressões.",
    href: "/funcionalidades/visualizar-frames",
    cta: "Inspecionar",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "lg:col-span-1",
  },
]

export default function HomePage() {
  const videoUpload = useFileUpload()
  const csvUpload = useFileUpload()
  const { refresh: refreshStoredFiles } = useStoredFiles()
  const videoInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const handleVideoUpload = () => videoInputRef.current?.click()
  const handleCsvUpload = () => csvInputRef.current?.click()

  const handleVideoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        await videoUpload.uploadFile(file)
        refreshStoredFiles()
      } catch (error) {
        console.error('Erro no upload do vídeo:', error)
      }
    }
  }

  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        await csvUpload.uploadFile(file)
        refreshStoredFiles()
      } catch (error) {
        console.error('Erro no upload do CSV:', error)
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <SidebarInset>
      <div className="flex-1 space-y-12 p-8 max-w-[1600px] mx-auto">
        {/* Hidden inputs */}
        <input ref={videoInputRef} type="file" accept=".mov,video/quicktime" onChange={handleVideoFileChange} className="hidden" />
        <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} className="hidden" />

        {/* HERO SECTION */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>

          <div className="relative z-10 p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium backdrop-blur-sm border border-white/10 text-primary-foreground/80">
                <Sparkles className="w-3 h-3" />
                <span>Nova Versão 2.0 Disponível</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                Análise Oftalmológica <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Impulsionada por IA
                </span>
              </h1>

              <p className="text-lg text-slate-300 leading-relaxed max-w-lg">
                O SmartBlink evoluiu. Descubra a precisão do novo algoritmo EAR de 6 pontos e analise a estabilidade cefálica com nossos novos gráficos interativos.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-lg shadow-blue-500/25" asChild>
                  <Link href="/analise/piscadas">
                    <Eye className="mr-2 h-5 w-5" />
                    Análise de Piscadas
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white" asChild>
                  <Link href="/analise/estabilidade">
                    <Move className="mr-2 h-5 w-5" />
                    Verificar Estabilidade
                  </Link>
                </Button>
              </div>
            </div>

            <div className="hidden md:block relative">
              <div className="relative w-64 h-64 bg-gradient-to-tr from-white/5 to-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex items-center justify-center transform rotate-3 hover:rotate-0 transition-all duration-500 shadow-xl">
                <Brain className="w-32 h-32 text-blue-300 drop-shadow-glow animate-pulse" />
                <div className="absolute -bottom-4 -right-4 bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-lg flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                  <span className="text-xs font-mono text-slate-300">System Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURE HIGHLIGHTS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-bold tracking-tight">Ferramentas de Análise</h2>
            <Link href="/analise/piscadas" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <BentoGrid>
            {analysisFeatures.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight px-2 text-muted-foreground">Processamento de Vídeo</h2>
          <BentoGrid className="grid-cols-1 md:grid-cols-3">
            {processingFeatures.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </div>

        {/* UPLOAD SECTION (Secondary) */}
        <div className="grid md:grid-cols-2 gap-6 pt-8 border-t">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Rápido
            </h3>
            <p className="text-sm text-muted-foreground">
              Envie novos arquivos para alimentar o workflow de análise.
            </p>
          </div>

          <div className="md:col-span-2 grid md:grid-cols-2 gap-6">
            {/* Upload Cards Identical to previous version but cleaner if needed */}
            <Card className="border-dashed hover:bg-accent/5 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileVideo className="w-5 h-5 text-blue-500" /> Upload de Vídeo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {videoUpload.uploadedFile ? (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded text-sm text-green-700 dark:text-green-300">
                    <span>{videoUpload.uploadedFile.filename}</span>
                    <Button variant="ghost" size="sm" onClick={() => videoUpload.reset()} className="h-6">Trocar</Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={handleVideoUpload} disabled={videoUpload.isUploading}>
                    {videoUpload.isUploading ? "Enviando..." : "Selecionar .MOV"}
                  </Button>
                )}
                {videoUpload.error && <p className="text-xs text-red-500 mt-2">{videoUpload.error}</p>}
              </CardContent>
            </Card>

            <Card className="border-dashed hover:bg-accent/5 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-green-500" /> Upload de Planilha
                </CardTitle>
              </CardHeader>
              <CardContent>
                {csvUpload.uploadedFile ? (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded text-sm text-green-700 dark:text-green-300">
                    <span>{csvUpload.uploadedFile.filename}</span>
                    <Button variant="ghost" size="sm" onClick={() => csvUpload.reset()} className="h-6">Trocar</Button>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={handleCsvUpload} disabled={csvUpload.isUploading}>
                    {csvUpload.isUploading ? "Enviando..." : "Selecionar .CSV"}
                  </Button>
                )}
                {csvUpload.error && <p className="text-xs text-red-500 mt-2">{csvUpload.error}</p>}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stored Files */}
        <StoredFiles onRefresh={refreshStoredFiles} />
      </div>
    </SidebarInset>
  );
}
