"use client"

import { useState, useMemo } from "react"
import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUploadCard } from "../../components/FileUploadCard" // Corrigido path relativo se necessário, mas app/components deve ser acessível. O arquivo original usava path relativo ../../components
import dynamic from "next/dynamic"
import { PlotParams } from "react-plotly.js"
import { Activity, Move } from "lucide-react"
import { toast } from "sonner"

const Plot = dynamic(() => import("react-plotly.js").then((mod) => mod.default), {
    ssr: false,
    loading: () => <p className="text-center p-10 text-muted-foreground">Carregando visualização...</p>
}) as React.ComponentType<PlotParams>;

const POINTS_CONFIG = [
    { id: 'r_p1', idx: 33, label: 'Olho Direito - Canto Externo (P1 - 33)' },
    { id: 'r_p2', idx: 160, label: 'Olho Direito - Pálpebra Sup 1 (P2 - 160)' },
    { id: 'r_p3', idx: 158, label: 'Olho Direito - Pálpebra Sup 2 (P3 - 158)' },
    { id: 'r_p4', idx: 133, label: 'Olho Direito - Canto Interno (P4 - 133)' },
    { id: 'r_p5', idx: 153, label: 'Olho Direito - Pálpebra Inf 1 (P5 - 153)' },
    { id: 'r_p6', idx: 144, label: 'Olho Direito - Pálpebra Inf 2 (P6 - 144)' },

    { id: 'l_p1', idx: 362, label: 'Olho Esquerdo - Canto Interno (P1 - 362)' },
    { id: 'l_p2', idx: 385, label: 'Olho Esquerdo - Pálpebra Sup 1 (P2 - 385)' },
    { id: 'l_p3', idx: 387, label: 'Olho Esquerdo - Pálpebra Sup 2 (P3 - 387)' },
    { id: 'l_p4', idx: 263, label: 'Olho Esquerdo - Canto Externo (P4 - 263)' },
    { id: 'l_p5', idx: 373, label: 'Olho Esquerdo - Pálpebra Inf 1 (P5 - 373)' },
    { id: 'l_p6', idx: 380, label: 'Olho Esquerdo - Pálpebra Inf 2 (P6 - 380)' },
]

export default function EstabilidadePage() {
    const [data, setData] = useState<any[] | null>(null)
    const [selectedPointId, setSelectedPointId] = useState<string>("r_p1")
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [fileInfo, setFileInfo] = useState<{ name: string, frames: number, fps: number } | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const handleProcessFile = async () => {
        if (!uploadedFile) return
        setIsProcessing(true)

        try {
            const text = await uploadedFile.text()
            const lines = text.trim().split('\n').filter(l => l.trim().length > 0)

            if (lines.length < 2) throw new Error("Arquivo vazio ou inválido")

            const headerLine = lines[0].replace(/^\uFEFF/, '')
            const delimiter = headerLine.includes(';') ? ';' : ','
            const headers = headerLine.split(delimiter).map(h => h.trim())

            const isAllPoints = headers.includes('point_0_x');
            if (!isAllPoints) {
                toast.error("Por favor utilize o CSV 'all_points' para esta análise.")
                setIsProcessing(false)
                return
            }

            const parsedData = lines.slice(1).map((line, i) => {
                const cols = line.split(delimiter)
                const frame = i
                const pointData: any = { frame }

                POINTS_CONFIG.forEach(p => {
                    const idxX = headers.indexOf(`point_${p.idx}_x`)
                    const idxY = headers.indexOf(`point_${p.idx}_y`)

                    if (idxX !== -1 && idxY !== -1) {
                        pointData[p.id] = {
                            x: parseFloat(cols[idxX]),
                            y: parseFloat(cols[idxY])
                        }
                    }
                })
                return pointData
            })

            setData(parsedData)
            setFileInfo({
                name: uploadedFile.name,
                frames: parsedData.length,
                fps: 30
            })
            toast.success("Dados carregados com sucesso!")

        } catch (error) {
            console.error(error)
            toast.error("Erro ao processar arquivo")
        } finally {
            setIsProcessing(false)
        }
    }

    const plotData = useMemo(() => {
        if (!data || !selectedPointId) return null

        const x: number[] = []
        const y: number[] = []
        const frames: number[] = []

        data.forEach(row => {
            const point = row[selectedPointId]
            if (point) {
                x.push(point.x)
                y.push(point.y)
                frames.push(row.frame)
            }
        })

        const yInverted = y.map(val => -val)

        return { x, y: yInverted, frames }
    }, [data, selectedPointId])

    return (
        <SidebarInset>
            <div className="flex flex-col h-full p-8 max-w-[1600px] mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Move className="h-8 w-8 text-primary" />
                        Análise de Estabilidade da Cabeça
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Visualize a dispersão espacial dos pontos faciais.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="space-y-6">
                        <FileUploadCard
                            uploadedFile={uploadedFile}
                            onFileSelect={setUploadedFile}
                            onProcessFile={handleProcessFile}
                            isLoading={isProcessing}
                        />

                        {fileInfo && (
                            <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
                                <p><span className="font-semibold">Arquivo:</span> {fileInfo.name}</p>
                                <p><span className="font-semibold">Frames:</span> {fileInfo.frames}</p>
                            </div>
                        )}

                        {data && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Configuração</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Ponto de Interesse (EAR)</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={selectedPointId}
                                            onChange={(e) => setSelectedPointId(e.target.value)}
                                        >
                                            {POINTS_CONFIG.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
                                        <p className="font-semibold mb-1">Dica de Análise:</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>Use <strong>Cantos dos Olhos</strong> para detectar movimentos puros da cabeça.</li>
                                            <li>Use <strong>Pálpebras</strong> para ver o movimento combinado.</li>
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div className="lg:col-span-3">
                        <Card className="h-full min-h-[600px]">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>Dispersão Espacial (X vs Y)</span>
                                    {plotData && (
                                        <span className="text-sm font-normal text-muted-foreground">
                                            {plotData.x.length} pontos plotados
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[600px]">
                                {plotData ? (
                                    <Plot
                                        data={[
                                            {
                                                x: plotData.x,
                                                y: plotData.y,
                                                // @ts-ignore
                                                type: 'scattergl',
                                                mode: 'markers',
                                                marker: {
                                                    size: 4,
                                                    // @ts-ignore
                                                    color: plotData.frames,
                                                    colorscale: 'Viridis',
                                                    showscale: true,
                                                    colorbar: {
                                                        title: 'Frame',
                                                        titleside: 'right'
                                                    },
                                                    opacity: 0.6
                                                },
                                                text: plotData.frames.map(f => `Frame: ${f}`),
                                                hoverinfo: 'x+y+text'
                                            }
                                        ]}
                                        layout={{
                                            autosize: true,
                                            hovermode: 'closest',
                                            margin: { t: 20, r: 20, b: 40, l: 40 },
                                            xaxis: {
                                                title: 'Posição X (pixels)',
                                                zeroline: false,
                                                showgrid: true,
                                            } as any,
                                            yaxis: {
                                                title: 'Posição Y (pixels - invertido)',
                                                zeroline: false,
                                                showgrid: true,
                                            } as any,
                                            paper_bgcolor: 'transparent',
                                            plot_bgcolor: 'transparent',
                                        }}
                                        style={{ width: '100%', height: '100%' }}
                                        config={{ responsive: true, displayModeBar: true }}
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-4">
                                        <Activity className="h-16 w-16 opacity-20" />
                                        <p>Carregue um arquivo CSV para visualizar a análise</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </SidebarInset>
    )
}
