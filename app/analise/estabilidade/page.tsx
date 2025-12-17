"use client"

import React, { useState, useMemo, useRef } from "react"
import { Inter, JetBrains_Mono } from "next/font/google"
import { SidebarInset } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import dynamic from "next/dynamic"
import { PlotParams } from "react-plotly.js"
import {
    Move,
    Upload,
    Activity,
    Info,
    Loader2,
    MousePointer2,
} from "lucide-react"

// --- FONT CONFIG ---
const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter"
})

const mono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono"
})

// --- PLOTLY LAZY LOAD ---
const Plot = dynamic(() => import("react-plotly.js").then((mod) => mod.default), {
    ssr: false,
    loading: () => (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-sm">Carregando visualizador gráfico...</span>
        </div>
    )
}) as React.ComponentType<PlotParams>;

// --- CONFIG DEFAULT (ALL POINTS) ---
const DEFAULT_POINTS_CONFIG = [
    { id: 'r_p1', idx: 33, label: 'Olho Direito - Canto Externo (P33)' },
    { id: 'r_p2', idx: 160, label: 'Olho Direito - Pálpebra Sup 1 (P160)' },
    { id: 'r_p3', idx: 158, label: 'Olho Direito - Pálpebra Sup 2 (P158)' },
    { id: 'r_p4', idx: 133, label: 'Olho Direito - Canto Interno (P133)' },
    { id: 'r_p5', idx: 153, label: 'Olho Direito - Pálpebra Inf 1 (P153)' },
    { id: 'r_p6', idx: 144, label: 'Olho Direito - Pálpebra Inf 2 (P144)' },

    { id: 'l_p1', idx: 362, label: 'Olho Esquerdo - Canto Interno (P362)' },
    { id: 'l_p2', idx: 385, label: 'Olho Esquerdo - Pálpebra Sup 1 (P385)' },
    { id: 'l_p3', idx: 387, label: 'Olho Esquerdo - Pálpebra Sup 2 (P387)' },
    { id: 'l_p4', idx: 263, label: 'Olho Esquerdo - Canto Externo (P263)' },
    { id: 'l_p5', idx: 373, label: 'Olho Esquerdo - Pálpebra Inf 1 (P373)' },
    { id: 'l_p6', idx: 380, label: 'Olho Esquerdo - Pálpebra Inf 2 (P380)' },
]

interface PointOption {
    id: string;
    label: string;
    colX?: string; // Para CSV eyes_only
    colY?: string; // Para CSV eyes_only
    idx?: number;  // Para CSV all_points
}

export default function EstabilidadePage() {
    // --- STATE ---
    const [data, setData] = useState<any[] | null>(null)
    const [availablePoints, setAvailablePoints] = useState<PointOption[]>(DEFAULT_POINTS_CONFIG)
    const [selectedPointId, setSelectedPointId] = useState<string>("r_p1")
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [fileInfo, setFileInfo] = useState<{ name: string, frames: number, fps: number } | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [csvType, setCsvType] = useState<'all_points' | 'eyes_only'>('all_points')

    const fileInputRef = useRef<HTMLInputElement>(null)

    // --- LOGIC ---
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            toast.error("Por favor, selecione um arquivo CSV");
            return;
        }

        setUploadedFile(file);
        handleProcessFile(file);
    };

    const formatLabel = (key: string) => {
        return key
            .replace('right_', 'OD - ')
            .replace('left_', 'OE - ')
            .replace('upper_', 'Sup ')
            .replace('lower_', 'Inf ')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    const handleProcessFile = async (file: File) => {
        setIsProcessing(true)

        try {
            const text = await file.text()
            // Filtrar linhas vazias e comentários (#)
            const lines = text.trim().split('\n').filter(l => l.trim().length > 0 && !l.startsWith('#'))

            if (lines.length < 2) throw new Error("Arquivo vazio ou inválido")

            const headerLine = lines[0].replace(/^\uFEFF/, '')
            const delimiter = headerLine.includes(';') ? ';' : ','
            const headers = headerLine.split(delimiter).map(h => h.trim())

            // DETECT TYPE & CONFIG
            let currentConfig: PointOption[] = [];
            let type: 'all_points' | 'eyes_only' = 'all_points';

            if (headers.includes('point_0_x')) {
                type = 'all_points';
                currentConfig = DEFAULT_POINTS_CONFIG;
                setCsvType('all_points');
            } else {
                // Eyes Only Logic
                type = 'eyes_only';
                const xCols = headers.filter(h => h.endsWith('_x'));
                if (xCols.length === 0) throw new Error("Formato de CSV desconhecido (sem colunas _x)");

                currentConfig = xCols.map(col => {
                    const baseName = col.replace('_x', '');
                    return {
                        id: baseName,
                        label: formatLabel(baseName),
                        colX: col,
                        colY: baseName + '_y'
                    };
                });
                setCsvType('eyes_only');
            }

            setAvailablePoints(currentConfig);
            if (currentConfig.length > 0) setSelectedPointId(currentConfig[0].id);

            // PARSE DATA
            const parsedData = lines.slice(1).map((line, i) => {
                const cols = line.split(delimiter)
                const frame = i
                const pointData: any = { frame }

                currentConfig.forEach(p => {
                    let idxX = -1;
                    let idxY = -1;

                    if (type === 'all_points' && p.idx !== undefined) {
                        idxX = headers.indexOf(`point_${p.idx}_x`);
                        idxY = headers.indexOf(`point_${p.idx}_y`);
                    } else if (type === 'eyes_only' && p.colX && p.colY) {
                        idxX = headers.indexOf(p.colX);
                        idxY = headers.indexOf(p.colY);
                    }

                    if (idxX !== -1 && idxY !== -1) {
                        const valX = parseFloat(cols[idxX]);
                        const valY = parseFloat(cols[idxY]);

                        // Validar NaN
                        if (!isNaN(valX) && !isNaN(valY)) {
                            pointData[p.id] = { x: valX, y: valY };
                        }
                    }
                })
                return pointData
            })

            setData(parsedData)
            setFileInfo({
                name: file.name,
                frames: parsedData.length,
                fps: 30
            })
            toast.success(`Dados carregados: ${parsedData.length} frames (${type})`)

        } catch (error: any) {
            console.error(error)
            toast.error(`Erro: ${error.message}`)
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

        if (x.length === 0) return null;

        // Inverter Y para SVG coordinate system visualization
        const yInverted = y.map(val => -val)

        return { x, y: yInverted, frames }
    }, [data, selectedPointId])

    return (
        <SidebarInset>
            <div className={`min-h-full bg-gradient-to-b from-[#fff1f2] to-slate-50 text-slate-900 p-8 font-sans ${inter.variable} ${mono.variable}`}>
                <div className="max-w-[1600px] mx-auto space-y-6">

                    {/* HEADER */}
                    <header className="flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                                    <Move size={24} strokeWidth={2} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
                                        Análise de Estabilidade
                                    </h1>
                                    <span className="text-xs font-medium text-rose-600 uppercase tracking-wider">Clinical Suite</span>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm ml-[3.25rem]">
                                Dispersão espacial (XY) frame-a-frame para detecção de tremor ou instabilidade
                            </p>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex gap-3">
                            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium text-sm hover:bg-slate-50 hover:text-rose-600 transition-colors shadow-sm cursor-pointer">
                                <Upload size={18} />
                                Carregar CSV
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </header>

                    {/* EMPTY STATE */}
                    {!data && !isProcessing && (
                        <div className="h-[400px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-white/50">
                            <Activity size={48} className="mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold text-slate-600">Nenhum dado de estabilidade</h3>
                            <p className="text-sm mb-6 max-w-md text-center">
                                Carregue um arquivo CSV (<span className="font-mono bg-slate-100 px-1 rounded text-slate-700">all_points</span> ou <span className="font-mono bg-slate-100 px-1 rounded text-slate-700">eyes_only</span>)
                            </p>
                            <Button onClick={() => fileInputRef.current?.click()} className="bg-rose-600 hover:bg-rose-700">
                                Selecionar Arquivo
                            </Button>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="h-[400px] flex flex-col items-center justify-center text-rose-600">
                            <Loader2 size={48} className="animate-spin mb-4" />
                            <p className="font-medium">Processando trajetória espacial...</p>
                        </div>
                    )}

                    {/* CONTENT GRID */}
                    {data && (
                        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

                            {/* SIDE CONTROL PANEL */}
                            <div className="space-y-6">
                                <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <MousePointer2 size={14} /> Ponto de Rastreio
                                    </h3>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-700">Selecione o Landmark ({availablePoints.length} disponíveis)</label>
                                        <select
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-rose-500 focus:border-rose-500 block p-2.5 outline-none font-medium h-64 custom-scrollbar"
                                            size={10}
                                            value={selectedPointId}
                                            onChange={(e) => setSelectedPointId(e.target.value)}
                                        >
                                            {availablePoints.map(p => (
                                                <option key={p.id} value={p.id} className="py-1 px-2 hover:bg-rose-50 rounded cursor-pointer">
                                                    {p.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* INFO BOX */}
                                    <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs space-y-2">
                                        <div className="flex items-center gap-2 text-rose-700 font-bold">
                                            <Info size={14} /> Tipo de Arquivo: {csvType === 'all_points' ? 'All Points (478)' : 'Eyes Only (Subset)'}
                                        </div>
                                        <p className="text-slate-600 leading-snug">
                                            {csvType === 'all_points'
                                                ? "Pontos principais pré-selecionados para estabilidade (Cantos e Pálpebras)."
                                                : "Visualizando todas as colunas de coordenadas disponíveis no arquivo."}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 p-5 shadow-sm">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                                        Estatística do Arquivo
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Total Frames</span>
                                            <span className="font-mono font-bold text-slate-700">{fileInfo?.frames}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Pontos Visíveis</span>
                                            <span className="font-mono font-bold text-slate-700">{plotData?.x.length || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* MAIN PLOT AREA */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative min-h-[600px] flex flex-col">
                                <div className="absolute top-4 right-4 z-10">
                                    <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full border border-slate-200">
                                        Scatter GL
                                    </span>
                                </div>
                                <div className="flex-1 rounded-xl overflow-hidden bg-slate-50/50 border border-slate-100 relative items-center justify-center flex">
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
                                                        size: 6,
                                                        // @ts-ignore
                                                        color: plotData.frames,
                                                        colorscale: 'Viridis',
                                                        showscale: true,
                                                        colorbar: {
                                                            title: 'Tempo (Frame)',
                                                            titleside: 'right',
                                                            thickness: 10,
                                                            len: 0.5,
                                                            yanchor: 'top',
                                                            y: 1,
                                                            x: 1,
                                                        },
                                                        opacity: 0.7,
                                                        line: {
                                                            color: 'white',
                                                            width: 0.5
                                                        }
                                                    },
                                                    text: plotData.frames.map(f => `Frame: ${f}`),
                                                    hoverinfo: 'x+y+text'
                                                }
                                            ]}
                                            layout={{
                                                autosize: true,
                                                hovermode: 'closest',
                                                margin: { t: 40, r: 40, b: 60, l: 60 },
                                                title: {
                                                    text: 'Dispersão Espacial (Trajetória)',
                                                    font: { family: 'Inter, sans-serif', size: 14, color: '#64748b' }
                                                },
                                                xaxis: {
                                                    title: 'Coordenada Horizontal (X)',
                                                    zeroline: false,
                                                    showgrid: true,
                                                    gridcolor: '#e2e8f0',
                                                    tickfont: { family: 'JetBrains Mono', size: 11, color: '#64748b' }
                                                } as any,
                                                yaxis: {
                                                    title: 'Coordenada Vertical (Y - Invertido)',
                                                    zeroline: false,
                                                    showgrid: true,
                                                    gridcolor: '#e2e8f0',
                                                    tickfont: { family: 'JetBrains Mono', size: 11, color: '#64748b' }
                                                } as any,
                                                paper_bgcolor: 'transparent',
                                                plot_bgcolor: 'transparent',
                                            }}
                                            style={{ width: '100%', height: '100%' }}
                                            config={{
                                                responsive: true,
                                                displayModeBar: true,
                                                displaylogo: false,
                                                modeBarButtonsToRemove: ['lasso2d', 'select2d']
                                            }}
                                        />
                                    ) : (
                                        <div className="text-slate-400 text-sm">Nenhum ponto selecionado ou dados inválidos</div>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                </div>
                <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #fda4af; 
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #f43f5e;
          }
        `}</style>
            </div>
        </SidebarInset>
    )
}
