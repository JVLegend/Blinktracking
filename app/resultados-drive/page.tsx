import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileSearch,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import { driveResults } from "./data"

const numberFormatter = new Intl.NumberFormat("pt-BR")
const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

function StatCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string
  value: string | number
  detail: string
  tone?: "default" | "success" | "warning" | "info"
}) {
  const toneClass = {
    default: "border-slate-200 bg-white",
    success: "border-emerald-200 bg-emerald-50",
    warning: "border-amber-200 bg-amber-50",
    info: "border-sky-200 bg-sky-50",
  }[tone]

  return (
    <Card className={`${toneClass} shadow-sm`}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl text-slate-900">
          {typeof value === "number" ? numberFormatter.format(value) : value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">{detail}</p>
      </CardContent>
    </Card>
  )
}

function CategoryBadge({ category }: { category: string }) {
  if (category === "sem_candidato") {
    return <Badge variant="outline" className="border-slate-300 text-slate-700">Sem candidato</Badge>
  }

  if (category === "alto_potencial") {
    return <Badge className="bg-amber-600 text-white hover:bg-amber-600">Priorizar revisão</Badge>
  }

  return <Badge variant="secondary">Baixo volume</Badge>
}

export default function DriveResultsPage() {
  const {
    summary,
    rescueSummary,
    clinicalCandidateReview,
    highReviewRows,
    zeroRows,
    rescueRows,
    algorithmChanges,
    clinicalNotes,
  } = driveResults

  const noCandidateRows = rescueRows.filter((row) => row.candidates === 0)
  const rescueCandidateRows = rescueRows.filter((row) => row.candidates > 0)

  return (
    <SidebarInset>
      <main className="min-h-full bg-slate-50 text-slate-900">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-8 p-6 md:p-8">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Resultados consolidados do Drive</h1>
                <p className="text-sm text-slate-600">
                  Relatório integrado da análise dos 71 vídeos e da recuperação dos casos com zero piscadas.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">Atualizado em {summary.generatedAt}</Badge>
              <Badge variant="outline">Método: EAR de 6 pontos</Badge>
              <Badge variant="outline">Recuperação: candidatos para revisão manual</Badge>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Vídeos processados"
              value={summary.videosWithMetrics}
              detail={`${summary.failures} falhas no lote principal`}
              tone="success"
            />
            <StatCard
              label="Piscadas clínicas"
              value={summary.totalBlinks}
              detail={`${summary.nonZeroCount} vídeos com evento; ${summary.leftDominantBlinks}/${summary.rightDominantBlinks} dominantes E/D`}
              tone="info"
            />
            <StatCard
              label="Vídeos com zero eventos"
              value={summary.zeroCount}
              detail={`${rescueSummary.videosWithRescueCandidates} tiveram candidatos relaxados`}
              tone="warning"
            />
            <StatCard
              label="Candidatos de recuperação"
              value={rescueSummary.totalCandidates}
              detail={`${rescueSummary.leftDominantCandidates}/${rescueSummary.rightDominantCandidates} dominantes E/D`}
              tone="warning"
            />
            <StatCard
              label="Candidatos clínicos"
              value={clinicalCandidateReview.totalCandidates}
              detail={`${clinicalCandidateReview.videosWithCandidates} vídeos; ${clinicalCandidateReview.leftDominantCandidates}/${clinicalCandidateReview.rightDominantCandidates} E/D`}
              tone="info"
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  O que mudou nesta versão
                </CardTitle>
                <CardDescription>
                  Alterações aplicadas para reduzir falso positivo, preservar rastreabilidade e aproximar a métrica do evento clínico.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 md:grid-cols-2">
                  {algorithmChanges.map((item) => (
                    <li key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-950">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                  Leitura clínica
                </CardTitle>
                <CardDescription className="text-amber-900">
                  Pontos que não devem ser tratados como confirmação automática.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm leading-relaxed text-amber-950">
                  {clinicalNotes.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-amber-700" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Horas de vídeo" value={decimalFormatter.format(summary.durationHours)} detail="Duração total analisada" />
            <StatCard label="Horas de processamento" value={decimalFormatter.format(summary.processingHours)} detail="Tempo computacional acumulado" />
            <StatCard label="Taxa mediana" value={`${decimalFormatter.format(summary.medianRate)}/min`} detail={`Média: ${decimalFormatter.format(summary.meanRate)}/min`} />
            <StatCard label="Mediana por vídeo" value={summary.medianBlinks} detail="Piscadas clínicas por arquivo" />
            <StatCard label="Pico observado" value={`${decimalFormatter.format(summary.maxRate)}/min`} detail={`${summary.maxBlinks} piscadas no maior total`} />
          </section>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-sky-700" />
                Casos para revisão por volume alto
              </CardTitle>
              <CardDescription>
                Vídeos com taxa clínica maior ou igual a 30/min ou total maior ou igual a 100. Estes casos podem conter piscadas reais frequentes, mas também são os mais sensíveis a movimento e perda de rastreamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-3 pr-4">Paciente</th>
                      <th className="py-3 pr-4">Vídeo</th>
                      <th className="py-3 pr-4 text-right">Clínicas</th>
                      <th className="py-3 pr-4 text-right">Cru por olho</th>
                      <th className="py-3 pr-4 text-right">Taxa/min</th>
                      <th className="py-3 pr-4 text-right">Duração média</th>
                      <th className="py-3 pr-4 text-right">Detecção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {highReviewRows.map((row) => (
                      <tr key={`${row.idx}-${row.video}`} className="align-top">
                        <td className="py-3 pr-4 font-medium text-slate-900">{row.paciente}</td>
                        <td className="py-3 pr-4 text-slate-600">{row.video}</td>
                        <td className="py-3 pr-4 text-right font-semibold">{row.totalBlinks}</td>
                        <td className="py-3 pr-4 text-right text-slate-600">{row.rawEyeBlinks}</td>
                        <td className="py-3 pr-4 text-right">{decimalFormatter.format(row.blinkRatePerMinute)}</td>
                        <td className="py-3 pr-4 text-right">{decimalFormatter.format(row.meanDurationMs)} ms</td>
                        <td className="py-3 pr-4 text-right">{decimalFormatter.format(row.detectionRatio)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 xl:grid-cols-[1fr_2fr]">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-sky-700" />
                  Recuperação dos zeros
                </CardTitle>
                <CardDescription>
                  Reprocessamento dos 20 vídeos que ficaram com zero piscadas no detector principal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-slate-500">Reprocessados</p>
                    <p className="text-2xl font-bold">{rescueSummary.successfulReprocess}/{rescueSummary.videosReprocessed}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-slate-500">Confirmados</p>
                    <p className="text-2xl font-bold">{rescueSummary.confirmedByMainDetector}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-slate-500">Com candidato</p>
                    <p className="text-2xl font-bold">{rescueSummary.videosWithRescueCandidates}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-slate-500">Sem candidato</p>
                    <p className="text-2xl font-bold">{rescueSummary.videosWithoutCandidates}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-slate-500">Bilaterais/unilaterais</p>
                    <p className="text-2xl font-bold">{rescueSummary.bilateralCandidates}/{rescueSummary.unilateralCandidates}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-slate-500">Dominantes E/D</p>
                    <p className="text-2xl font-bold">{rescueSummary.leftDominantCandidates}/{rescueSummary.rightDominantCandidates}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  A recuperação relaxada serve como triagem: ela aponta trechos para assistir e anotar, mas não substitui validação manual.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-sky-700" />
                  Vídeos com candidatos relaxados
                </CardTitle>
                <CardDescription>
                  Ordenados pelo volume de candidatos encontrados na segunda varredura.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="py-3 pr-4">Paciente</th>
                        <th className="py-3 pr-4">Vídeo</th>
                        <th className="py-3 pr-4 text-right">Candidatos</th>
                        <th className="py-3 pr-4 text-right">Bilaterais</th>
                        <th className="py-3 pr-4 text-right">Unilaterais</th>
                        <th className="py-3 pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rescueCandidateRows
                        .slice()
                        .sort((a, b) => b.candidates - a.candidates)
                        .map((row) => (
                          <tr key={`${row.idx}-${row.video}`} className="align-top">
                            <td className="py-3 pr-4 font-medium text-slate-900">{row.paciente}</td>
                            <td className="py-3 pr-4 text-slate-600">{row.video}</td>
                            <td className="py-3 pr-4 text-right font-semibold">{row.candidates}</td>
                            <td className="py-3 pr-4 text-right">{row.bilateralCandidates}</td>
                            <td className="py-3 pr-4 text-right">{row.unilateralCandidates}</td>
                            <td className="py-3 pr-4"><CategoryBadge category={row.category} /></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card className="border-slate-300 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-slate-700" />
                Zeros sem candidato relaxado
              </CardTitle>
              <CardDescription>
                Estes dois vídeos continuaram sem evento detectado mesmo na busca relaxada. São bons candidatos para revisão manual completa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {noCandidateRows.map((row) => (
                  <div key={`${row.idx}-${row.video}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{row.paciente}</p>
                    <p className="text-sm text-slate-600">{row.video}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Lista completa dos 20 zeros originais</CardTitle>
              <CardDescription>
                Mantida para rastreabilidade entre o relatório principal e a recuperação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-3 pr-4">Paciente</th>
                      <th className="py-3 pr-4">Vídeo</th>
                      <th className="py-3 pr-4 text-right">Duração</th>
                      <th className="py-3 pr-4 text-right">FPS</th>
                      <th className="py-3 pr-4 text-right">Detecção</th>
                      <th className="py-3 pr-4 text-right">Tempo proc.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {zeroRows.map((row) => (
                      <tr key={`${row.idx}-${row.video}`} className="align-top">
                        <td className="py-3 pr-4 font-medium text-slate-900">{row.paciente}</td>
                        <td className="py-3 pr-4 text-slate-600">{row.video}</td>
                        <td className="py-3 pr-4 text-right">{decimalFormatter.format(row.durationSeconds)} s</td>
                        <td className="py-3 pr-4 text-right">{decimalFormatter.format(row.fps)}</td>
                        <td className="py-3 pr-4 text-right">{decimalFormatter.format(row.detectionRatio)}%</td>
                        <td className="py-3 pr-4 text-right">{decimalFormatter.format(row.elapsedSeconds)} s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </SidebarInset>
  )
}
