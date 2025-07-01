"use client"

import { SidebarInset } from "@/components/ui/sidebar";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { Scan, Video, Image, BarChart3, PieChart, Clock, Activity } from "lucide-react";

const features = [
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
        {/* Header Section com design aprimorado */}
        <div className="relative">
          {/* Background gradient sutil */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 rounded-2xl -m-4" />
          
          <div className="relative p-6">
            {/* Header principal */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                <Activity className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent mb-1">
                  Dashboard
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Sistema Ativo</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>Análise de Piscadas</span>
                </div>
              </div>
            </div>
            
            {/* Subtitle */}
            <p className="text-lg text-muted-foreground/80 max-w-2xl leading-relaxed">
              Bem-vindo ao <span className="font-semibold text-foreground">SmartBlink</span>. 
              Selecione uma das funcionalidades abaixo para iniciar sua análise oftalmológica.
            </p>
            
            {/* Linha decorativa */}
            <div className="mt-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </div>

        {/* Cards Grid */}
        <BentoGrid>
          {features.map((feature) => (
            <BentoCard key={feature.name} {...feature} />
          ))}
        </BentoGrid>
      </div>
    </SidebarInset>
  );
}
