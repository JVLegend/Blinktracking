"use client"

import Image from "next/image"
import { InfoIcon, Brain, Activity, Grid2X2, Calculator, Layers } from "lucide-react"
import { SidebarInset } from "@/components/ui/sidebar"

export default function FacialPointsPage() {
  return (
    <SidebarInset>
      <div className="flex-1 space-y-10 p-10 max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold">Pontos Faciais & Metodologia</h1>
          <p className="text-lg text-slate-500">
            Documentação técnica sobre a malha facial (MediaPipe) e o algoritmo de análise ocular.
          </p>
        </div>

        {/* Visão Geral - MediaPipe Only */}
        <div className="card bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Brain className="h-7 w-7 text-sky-600" />
              <h2 className="text-2xl font-bold text-slate-800">MediaPipe Face Mesh</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                  O projeto utiliza exclusivamente o <strong>Google MediaPipe Face Mesh</strong>, uma solução de visão computacional de última geração que mapeia <strong>478 pontos tridimensionais</strong> na face humana.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold mt-1">1</span>
                    <div>
                      <h4 className="font-semibold text-slate-800">Alta Densidade</h4>
                      <p className="text-sm text-slate-500">Mapeamento detalhado de sobrancelhas, lábios e, crucialmente, a geometria complexa dos olhos e íris.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold mt-1">2</span>
                    <div>
                      <h4 className="font-semibold text-slate-800">Robustez</h4>
                      <p className="text-sm text-slate-500">Funciona bem sob variações de iluminação e rotação da cabeça, superando métodos antigos baseados em 68 pontos.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold mt-1">3</span>
                    <div>
                      <h4 className="font-semibold text-slate-800">Rastreamento de Íris</h4>
                      <p className="text-sm text-slate-500">Inclui pontos específicos para o centro e contorno da íris, permitindo métricas de direção do olhar.</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <Image
                  src="/docs/mediapipe-landmarks.png"
                  alt="MediaPipe Mesh"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-sm mix-blend-multiply opacity-90 hover:opacity-100 transition-opacity"
                />
                <p className="text-center text-xs text-slate-400 mt-4">Visualização da malha de 468/478 pontos</p>
              </div>
            </div>
          </div>
        </div>

        {/* CÁLCULO DO EAR (Eye Aspect Ratio) */}
        <div className="card bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <Calculator className="h-7 w-7 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-800">Cálculo do EAR (Eye Aspect Ratio)</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-10">

              {/* Coluna da Esquerda: Explicação Teórica */}
              <div className="space-y-6">
                <p className="text-slate-600">
                  Para detectar piscadas de forma confiável e independente da distância da câmera, utilizamos a métrica <strong>EAR (Eye Aspect Ratio)</strong>.
                  Esta fórmula matemática relaciona a altura e a largura do olho para determinar seu grau de abertura.
                </p>

                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">A Fórmula</h3>
                  <div className="font-mono text-lg md:text-xl text-center py-4 text-slate-800 bg-white rounded-lg border border-slate-100 shadow-sm">
                    EAR = (|P2-P6| + |P3-P5|) / (2 * |P1-P4|)
                  </div>
                  <p className="text-xs text-slate-400 mt-4 text-center italic">
                    Onde ||Px-Py|| é a distância Euclidiana entre dois pontos.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-800">Como funciona?</h4>
                  <ul className="list-disc list-inside space-y-2 text-slate-600">
                    <li><strong>Olho Aberto:</strong> EAR constante (aprox. 0.30)</li>
                    <li><strong>Olho Fechado:</strong> A distância vertical tende a zero, e o EAR cai drasticamente (para &lt; 0.15).</li>
                  </ul>
                </div>
              </div>

              {/* Coluna da Direita: Diagrama e Índices */}
              <div className="bg-slate-900 text-slate-200 p-8 rounded-xl shadow-inner font-mono text-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <Grid2X2 size={100} />
                </div>

                <h3 className="text-teal-400 font-bold mb-6">Mapeamento de Pontos</h3>

                {/* ASCII Diagram */}
                <div className="mb-8 font-mono leading-none whitespace-pre text-center text-slate-400">
                  {`
      P2   P3
      /     \\
   P1 ------- P4
      \\     /
      P6   P5
`}
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      <span className="font-bold text-sky-200">Olho Direito</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs opacity-80">
                      <span>P1 (Canto Ext): <strong>33</strong></span>
                      <span>P4 (Canto Int): <strong>133</strong></span>
                      <span>P2 (Sup): <strong>160</strong></span>
                      <span>P6 (Inf): <strong>144</strong></span>
                      <span>P3 (Sup): <strong>158</strong></span>
                      <span>P5 (Inf): <strong>153</strong></span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                      <span className="font-bold text-teal-200">Olho Esquerdo</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs opacity-80">
                      <span>P1 (Canto Int): <strong>362</strong></span>
                      <span>P4 (Canto Ext): <strong>263</strong></span>
                      <span>P2 (Sup): <strong>385</strong></span>
                      <span>P6 (Inf): <strong>380</strong></span>
                      <span>P3 (Sup): <strong>387</strong></span>
                      <span>P5 (Inf): <strong>373</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nota sobre os Dados */}
        <div className="alert bg-sky-50 border-sky-100 text-sky-900 rounded-xl p-6 flex gap-4">
          <InfoIcon className="h-6 w-6 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-lg mb-2">Padrão de Dados (CSV)</h3>
            <p className="text-sm opacity-90 max-w-3xl">
              Nossos scripts atuais geram arquivos CSV contendo todos os <strong>478 pontos</strong> (x, y, z) para cada frame.
              Isso garante que, mesmo que mudemos a fórmula do EAR no futuro, não será necessário reprocessar os vídeos originais, pois temos a geometria facial completa salva.
            </p>
          </div>
        </div>

      </div>
    </SidebarInset>
  )
}