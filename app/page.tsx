"use client"

import { SidebarInset } from "@/components/ui/sidebar";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { Scan, Video, Image, BarChart3, PieChart, Clock, Eye, Upload, FileVideo, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const videoFeatures = [
  {
    Icon: Scan,
    name: "Extração de Pontos",
    description: "Extraia coordenadas faciais de vídeos usando dlib ou MediaPipe para análise detalhada de piscadas.",
    href: "/funcionalidades/extrair-pontos",
    cta: "Extrair pontos",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "",
  },
  {
    Icon: Video,
    name: "Geração de Vídeos",
    description: "Gere vídeos com marcações dos pontos faciais detectados para visualização do processamento.",
    href: "/funcionalidades/gerar-video",
    cta: "Gerar vídeo",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "",
  },
  {
    Icon: Image,
    name: "Visualização de Frames",
    description: "Visualize os frames do vídeo com as marcações dos pontos faciais detectados.",
    href: "/funcionalidades/visualizar-frames",
    cta: "Visualizar frames",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "",
  },
];

const csvFeatures = [
  {
    Icon: BarChart3,
    name: "Análise de Coordenadas",
    description: "Analise as coordenadas extraídas através de gráficos interativos e métricas detalhadas.",
    href: "/analise/coordenadas",
    cta: "Analisar coordenadas",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "",
  },
  {
    Icon: PieChart,
    name: "Estatísticas das Piscadas",
    description: "Visualize estatísticas detalhadas sobre as piscadas detectadas, incluindo duração, velocidade e distribuição.",
    href: "/analise/estatisticas",
    cta: "Ver estatísticas",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "",
  },
  {
    Icon: Clock,
    name: "Análise de Piscadas",
    description: "Analise detalhadamente os frames e timestamps de cada piscada detectada no vídeo.",
    href: "/analise/piscadas",
    cta: "Analisar piscadas",
    background: <div className="absolute -right-20 -top-20 opacity-60" />,
    className: "",
  },
];

export default function HomePage() {
  return (
    <SidebarInset>
      <div className="flex-1 space-y-8 p-8">
        {/* Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-2xl -m-4" />
          
          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                <Eye className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent mb-1">
                  SmartBlink
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Sistema Ativo</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>Análise de Piscadas</span>
                </div>
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground/80 max-w-2xl leading-relaxed">
              Para começar a utilizar a plataforma, faça o upload de um <span className="font-semibold text-foreground">vídeo (.MOV)</span> ou 
              de uma <span className="font-semibold text-foreground">planilha (.CSV)</span> com dados de coordenadas.
            </p>
            
            <div className="mt-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </div>

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Video Upload Card */}
          <Card className="relative overflow-hidden border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <FileVideo className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Upload de Vídeo</CardTitle>
              <CardDescription>
                Envie um arquivo de vídeo (.MOV) para análise facial e detecção de piscadas
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" />
                Selecionar Vídeo (.MOV)
              </Button>
              <p className="text-sm text-muted-foreground">
                Formatos suportados: .MOV
              </p>
            </CardContent>
          </Card>

          {/* CSV Upload Card */}
          <Card className="relative overflow-hidden border-2 border-dashed border-green-600/20 hover:border-green-600/40 transition-colors">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Upload de Planilha</CardTitle>
              <CardDescription>
                Envie uma planilha (.CSV) com coordenadas já extraídas para análise
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Button size="lg" className="w-full bg-green-600 hover:bg-green-700">
                <Upload className="w-4 h-4 mr-2" />
                Selecionar Planilha (.CSV)
              </Button>
              <p className="text-sm text-muted-foreground">
                Formatos suportados: .CSV
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Video Features Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileVideo className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Funcionalidades para Vídeo</h2>
              <p className="text-muted-foreground">Disponíveis após upload de arquivo .MOV</p>
            </div>
          </div>
          
          <BentoGrid>
            {videoFeatures.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </div>

        {/* CSV Features Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Funcionalidades para Planilha</h2>
              <p className="text-muted-foreground">Disponíveis após upload de arquivo .CSV</p>
            </div>
          </div>
          
          <BentoGrid>
            {csvFeatures.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </div>
      </div>
    </SidebarInset>
  );
}
