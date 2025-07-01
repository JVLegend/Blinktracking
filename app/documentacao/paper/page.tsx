"use client"

import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Brain, Activity, Table } from "lucide-react"

export default function PaperPage() {
  return (
    <SidebarInset>
      <div className="flex-1 space-y-10 p-10 max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold">Artigo: O que é uma piscada?</h1>
          <p className="text-lg opacity-70">
            Resumo do artigo "What is a blink? Classifying and characterizing blinks in eye openness signals"
          </p>
        </div>

        {/* Visão Geral */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Resumo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              O artigo investiga a detecção e caracterização de piscadas usando sinais de abertura ocular (EO) em comparação com sinais tradicionais de tamanho da pupila (PS). Os principais achados incluem:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Alta sobreposição entre piscadas detectadas por EO e PS quando a qualidade dos dados é boa (F1 score: 0.98)</li>
              <li>Piscadas detectadas por EO são em média 60ms mais longas que as detectadas por PS</li>
              <li>O sinal EO é mais robusto a posicionamentos não ideais da cabeça</li>
              <li>O sinal EO permite análises mais detalhadas da dinâmica das piscadas</li>
            </ul>
          </CardContent>
        </Card>

        {/* Definições */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Brain className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Definições de Piscadas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Tipos de Piscadas</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Piscada completa: Pálpebra cobre toda a córnea</li>
                  <li>Piscada incompleta: Pálpebra cobre parcialmente a córnea</li>
                  <li>Piscada reflexa: Em resposta a estímulos</li>
                  <li>Piscada voluntária: Controlada conscientemente</li>
                  <li>Piscada espontânea: Ocorre naturalmente</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Distribuição</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>80% são piscadas completas</li>
                  <li>17% são piscadas incompletas</li>
                  <li>3% são piscadas de contração</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parâmetros */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Activity className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Parâmetros das Piscadas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Duração</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Duração total: 150-400ms</li>
                  <li>Olhos completamente fechados: ~50ms</li>
                  <li>Tempo de fechamento: ~63ms</li>
                  <li>Tempo de abertura: ~138ms</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">Taxa de Piscadas</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>Adultos: ~20 piscadas/minuto</li>
                  <li>Crianças: 6-8 piscadas/minuto</li>
                  <li>Fetos: menos de 3 piscadas/minuto</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fórmulas */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Table className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl">Fórmulas e Medidas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Amplitude Relativa da Piscada (RBA)</h3>
                <p className="text-sm opacity-70">
                  RBA = (Amplitude da Piscada / Distância Reflexa Marginal) x 100%
                </p>
                <p className="text-sm opacity-70">
                  Onde RBA {`>`} 1 indica cobertura total da pupila
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Taxa de Piscadas</h3>
                <p className="text-sm opacity-70">
                  Taxa = (Número total de piscadas / Tempo total em minutos)
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Duração Média</h3>
                <p className="text-sm opacity-70">
                  Duração = Tempo de fechamento + Tempo de abertura
                </p>
                <p className="text-sm opacity-70">
                  Média = Soma das durações / Número de piscadas
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Velocidade de Movimento</h3>
                <p className="text-sm opacity-70">
                  Velocidade = |Δ Abertura ocular / Δ Tempo|
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Detecção por Velocidade (MAD)</h3>
                <p className="text-sm opacity-70">
                  MAD = mediana(|x - mediana(x)|)
                </p>
                <p className="text-sm opacity-70">
                  Piscada detectada quando: velocidade {`>`} 3 * MAD
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Classificação</h3>
                <p className="text-sm opacity-70">
                  Piscada Completa: RBA ≥ 1 (cobertura total)
                </p>
                <p className="text-sm opacity-70">
                  Piscada Incompleta: RBA {`<`} 1 (cobertura parcial)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </SidebarInset>
  )
} 