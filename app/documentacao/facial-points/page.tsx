"use client"

import Image from "next/image"
import { InfoIcon, Eye, Brain, Activity, FileText, Grid2X2 } from "lucide-react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function FacialPointsPage() {
  return (
    <SidebarInset>
      <div className="flex-1 space-y-10 p-10 max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold">Pontos Faciais</h1>
          <p className="text-lg opacity-70">
            Documentação detalhada sobre os métodos de extração de pontos faciais utilizados no projeto
          </p>
        </div>

        {/* Visão Geral */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-8">
            <div className="flex items-center gap-3 mb-6">
              <Grid2X2 className="h-7 w-7 text-primary" />
              <h2 className="card-title text-2xl">Visão Geral</h2>
            </div>
            <p className="text-lg opacity-70 mb-8">
              O projeto implementa dois métodos avançados de extração de pontos faciais, cada um com suas características específicas:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
                <div className="card-body p-6">
                  <h3 className="card-title text-xl mb-3">Extração Normal</h3>
                  <div className="badge badge-primary badge-outline text-sm px-3 py-3 mb-4">dlib</div>
                  <p className="opacity-70 leading-relaxed">
                    Método tradicional e preciso para detecção facial, ideal para condições controladas de iluminação.
                  </p>
                </div>
              </div>
              <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
                <div className="card-body p-6">
                  <h3 className="card-title text-xl mb-3">Extração Potente</h3>
                  <div className="badge badge-primary badge-outline text-sm px-3 py-3 mb-4">MediaPipe</div>
                  <p className="opacity-70 leading-relaxed">
                    Solução moderna e robusta, com melhor desempenho em condições variadas de iluminação.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Métodos de Extração */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-8">
            <div className="flex items-center gap-3 mb-8">
              <Eye className="h-7 w-7 text-primary" />
              <h2 className="card-title text-2xl">Métodos de Extração</h2>
            </div>

            <div className="space-y-16">
              {/* Dlib */}
              <div>
                <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                  <Brain className="h-6 w-6 text-primary" />
                  Dlib
                </h3>
                <div className="max-w-4xl mx-auto bg-base-200 p-8 rounded-xl shadow-lg">
                  <Image
                    src="/docs/dlib-landmarks.png"
                    alt="Pontos faciais do Dlib"
                    width={800}
                    height={500}
                    className="mx-auto rounded-lg shadow-md w-auto h-auto"
                  />
                </div>
                <div className="mt-8 space-y-6">
                  <p className="text-lg opacity-70 leading-relaxed max-w-4xl">
                    O Dlib utiliza um modelo pré-treinado para detectar 68 pontos faciais.
                    Cada ponto representa uma característica específica do rosto, como olhos,
                    nariz, boca e contorno facial.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="card-body p-6">
                        <h4 className="font-semibold text-lg mb-4">Distribuição dos Pontos</h4>
                        <ul className="space-y-2 opacity-70">
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Pontos 0-16: Contorno do rosto
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Pontos 17-26: Sobrancelhas
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Pontos 27-35: Nariz
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Pontos 36-47: Olhos
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Pontos 48-67: Boca
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="card-body p-6">
                        <h4 className="font-semibold text-lg mb-4">Características</h4>
                        <ul className="space-y-2 opacity-70">
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Alta precisão em condições controladas
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Processamento rápido
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Detecção robusta de pontos
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Ideal para análise de expressões
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MediaPipe */}
              <div>
                <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                  <Brain className="h-6 w-6 text-primary" />
                  MediaPipe
                </h3>
                <div className="max-w-4xl mx-auto bg-base-200 p-8 rounded-xl shadow-lg">
                  <Image
                    src="/docs/mediapipe-landmarks.png"
                    alt="Pontos faciais do MediaPipe"
                    width={800}
                    height={500}
                    className="mx-auto rounded-lg shadow-md w-auto h-auto"
                  />
                </div>
                <div className="mt-8 space-y-6">
                  <p className="text-lg opacity-70 leading-relaxed max-w-4xl">
                    O MediaPipe Face Mesh detecta 468 pontos faciais em 3D.
                    Oferece uma malha facial mais densa e precisa, incluindo detalhes
                    como sobrancelhas, íris e lábios.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="card-body p-6">
                        <h4 className="font-semibold text-lg mb-4">Pontos dos Olhos</h4>
                        <ul className="space-y-2 opacity-70">
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Olho Direito:
                            <ul className="ml-4 mt-1">
                              <li>Pálpebra Superior: [159, 160, 161, 163, 144, 145, 153]</li>
                              <li>Pálpebra Inferior: [159, 158, 157, 173, 155, 154, 153, 145, 144]</li>
                              <li>Íris: [469, 470, 471, 472]</li>
                              <li>Contorno: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]</li>
                            </ul>
                          </li>
                          <li className="flex items-center gap-2 mt-4">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Olho Esquerdo:
                            <ul className="ml-4 mt-1">
                              <li>Pálpebra Superior: [386, 387, 388, 390, 373, 374, 380]</li>
                              <li>Pálpebra Inferior: [386, 385, 384, 398, 382, 381, 380, 374, 373]</li>
                              <li>Íris: [474, 475, 476, 477]</li>
                              <li>Contorno: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]</li>
                            </ul>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
                      <div className="card-body p-6">
                        <h4 className="font-semibold text-lg mb-4">Características</h4>
                        <ul className="space-y-2 opacity-70">
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Detecção precisa da íris
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Pontos detalhados das pálpebras
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Contorno completo dos olhos
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Melhor em condições variadas
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Suporte a poses variadas
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Importância na Análise */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-8">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="h-7 w-7 text-primary" />
              <h2 className="card-title text-2xl">Importância na Análise</h2>
            </div>
            <p className="text-lg opacity-70 leading-relaxed mb-8">
              Os pontos faciais são fundamentais para a análise precisa das expressões e movimentos faciais:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
                <div className="card-body p-6">
                  <h4 className="font-semibold text-lg mb-4">Detecção e Medição</h4>
                  <ul className="space-y-2 opacity-70">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      Detectar movimentos sutis das expressões
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      Calcular distâncias entre pontos
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      Medir ângulos e proporções
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      Acompanhar mudanças temporais
                    </li>
                  </ul>
                </div>
              </div>
              <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
                <div className="card-body p-6">
                  <h4 className="font-semibold text-lg mb-4">Análise e Identificação</h4>
                  <ul className="space-y-2 opacity-70">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      Analisar padrões de movimento
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      Identificar assimetrias faciais
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      Avaliar expressões específicas
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      Gerar dados estatísticos
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nota Informativa */}
        <div className="alert bg-base-200 shadow-lg p-6">
          <InfoIcon className="h-6 w-6 text-primary" />
          <span className="text-lg opacity-70">
            Os números dos pontos do MediaPipe foram mapeados para corresponder aos pontos do Dlib,
            mantendo a compatibilidade entre os dois métodos de extração.
          </span>
        </div>
      </div>
    </SidebarInset>
  )
} 