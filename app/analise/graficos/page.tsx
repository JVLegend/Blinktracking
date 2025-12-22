"use client"

import React, { useState, useRef, useMemo } from "react"
import { Inter, JetBrains_Mono } from "next/font/google"
import { motion } from "framer-motion"
import { SidebarInset } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
    LineChart as LineChartIcon,
    BarChart3,
    Activity,
    Upload,
    Clock,
    Zap,
    Ruler,
    Loader2,
    Maximize2
} from "lucide-react"
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

const dist = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

export default function GraficosPiscadasPage() {
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [rawCsvText, setRawCsvText] = useState<string>("")
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [detectedFPS, setDetectedFPS] = useState<number>(30)

    const [blinkEvents, setBlinkEvents] = useState<{ right: any[], left: any[] }>({ right: [], left: [] })
    const [timelineData, setTimelineData] = useState<any[]>([])

    const fileInputRef = useRef<HTMLInputElement>(null)

    const processCSVData = (csvText: string, fpsToUse: number) => {
        try {
            const lines = csvText.trim().split('\n').filter(line => line.trim().length > 0 && !line.startsWith('#'))
            if (lines.length < 2) throw new Error("Arquivo vazio ou inválido");

            const headerLine = lines[0].replace(/^\uFEFF/, '')
            const delimiter = headerLine.includes(';') ? ';' : ','
            const headers = headerLine.split(delimiter).map(h => h.trim())

            let csvType = 'unknown';
            if (headers.includes('point_0_x')) csvType = 'all_points';
            else if (headers.some(h => h.includes('right_upper'))) csvType = 'eyes_only';

            if (csvType === 'unknown') throw new Error("Formato de colunas desconhecido.");

            const dataRows = lines.slice(1);
            const fps = fpsToUse;

            const getPoint = (rowCols: string[], idxX: number, idxY: number) => {
                if (idxX === -1 || idxY === -1) return null;
                const x = parseFloat(rowCols[idxX]);
                const y = parseFloat(rowCols[idxY]);
                return isNaN(x) || isNaN(y) ? null : { x, y };
            }
            const getIdx = (name: string) => headers.indexOf(name);

            let indices = { right: [] as number[], left: [] as number[] };
            let colNames = { right: [] as string[], left: [] as string[] };

            if (csvType === 'all_points') {
                indices.right = [33, 160, 158, 133, 153, 144];
                indices.left = [362, 385, 387, 263, 373, 380];
            } else {
                colNames.right = ['right_lower_1', 'right_upper_3', 'right_upper_5', 'right_lower_9', 'right_lower_6', 'right_lower_4'];
                colNames.left = ['left_lower_1', 'left_upper_3', 'left_upper_5', 'left_lower_9', 'left_lower_6', 'left_lower_4'];
            }

            const rightEARs: number[] = [];
            const leftEARs: number[] = [];

            dataRows.forEach(row => {
                const cols = row.split(delimiter);
                let rPts: ({ x: number, y: number } | null)[] = [];
                let lPts: ({ x: number, y: number } | null)[] = [];

                if (csvType === 'all_points') {
                    rPts = indices.right.map(idx => getPoint(cols, getIdx(`point_${idx}_x`), getIdx(`point_${idx}_y`)));
                    lPts = indices.left.map(idx => getPoint(cols, getIdx(`point_${idx}_x`), getIdx(`point_${idx}_y`)));
                } else {
                    rPts = colNames.right.map(name => getPoint(cols, getIdx(`${name}_x`), getIdx(`${name}_y`)));
                    lPts = colNames.left.map(name => getPoint(cols, getIdx(`${name}_x`), getIdx(`${name}_y`)));
                }

                const calcEAR = (p: ({ x: number, y: number } | null)[]) => {
                    if (p.some(pt => pt === null)) return NaN;
                    const pts = p as { x: number, y: number }[];
                    const vert1 = dist(pts[1], pts[5]);
                    const vert2 = dist(pts[2], pts[4]);
                    const horiz = dist(pts[0], pts[3]);
                    return horiz === 0 ? 0 : (vert1 + vert2) / (2 * horiz);
                }
                rightEARs.push(calcEAR(rPts));
                leftEARs.push(calcEAR(lPts));
            });

            const detectBlinksForEye = (earValues: number[]) => {
                const validEars = earValues.filter(v => !isNaN(v)).sort((a, b) => a - b);
                const baselineEAR = validEars[Math.floor(validEars.length * 0.9)] || 0.3;
                const THRESHOLD_CLOSE = baselineEAR * 0.75;
                const THRESHOLD_COMPLETE = baselineEAR * 0.50;
                const MIN_FRAMES = 2;
                const MIN_INTER_BLINK_TIME = 0.5;

                const filteredBlinks: any[] = [];
                const blinkFlagArray = new Array(earValues.length).fill(0);

                let inBlink = false;
                let startFrameIdx = 0;
                let minEARInBlink = 1.0;
                let minEARFrameIdx = 0;
                let lastBlinkEndFrame = -9999;

                earValues.forEach((ear, idx) => {
                    const currentEAR = isNaN(ear) ? 1.0 : ear;

                    if (!inBlink) {
                        if (currentEAR < THRESHOLD_CLOSE) {
                            inBlink = true;
                            startFrameIdx = idx;
                            minEARInBlink = currentEAR;
                            minEARFrameIdx = idx;
                        }
                    } else {
                        if (currentEAR < minEARInBlink) {
                            minEARInBlink = currentEAR;
                            minEARFrameIdx = idx;
                        }

                        if (currentEAR >= THRESHOLD_CLOSE) {
                            const endFrameIdx = idx;
                            const durationFrames = endFrameIdx - startFrameIdx;

                            if (durationFrames >= MIN_FRAMES) {
                                const timeSinceLastBlink = (startFrameIdx - lastBlinkEndFrame) / fps;
                                if (timeSinceLastBlink >= MIN_INTER_BLINK_TIME) {
                                    const type = minEARInBlink <= THRESHOLD_COMPLETE ? 'Completa' : 'Incompleta';
                                    const startTime = startFrameIdx / fps;
                                    const duration = durationFrames / fps;
                                    const closingDuration = (minEARFrameIdx - startFrameIdx) / fps;
                                    const openingDuration = (endFrameIdx - minEARFrameIdx) / fps;
                                    const amplitude = baselineEAR - minEARInBlink;
                                    const closingSpeed = closingDuration > 0.001 ? (amplitude / closingDuration) : 0;
                                    const openingSpeed = openingDuration > 0.001 ? (amplitude / openingDuration) : 0;

                                    filteredBlinks.push({
                                        startTime: parseFloat(startTime.toFixed(2)),
                                        duration: parseFloat(duration.toFixed(3)),
                                        type,
                                        amplitude: parseFloat(amplitude.toFixed(3)),
                                        closingSpeed: parseFloat(closingSpeed.toFixed(2)),
                                        openingSpeed: parseFloat(openingSpeed.toFixed(2)),
                                    });

                                    // Mark blink in flag array
                                    for (let i = startFrameIdx; i < endFrameIdx; i++) {
                                        blinkFlagArray[i] = 1;
                                    }
                                    lastBlinkEndFrame = endFrameIdx;
                                }
                            }
                            inBlink = false;
                            minEARInBlink = 1.0;
                        }
                    }
                });
                return { blinks: filteredBlinks, blinkFlags: blinkFlagArray };
            };

            const resultRight = detectBlinksForEye(rightEARs);
            const resultLeft = detectBlinksForEye(leftEARs);

            setBlinkEvents({ right: resultRight.blinks, left: resultLeft.blinks });

            // Generate Timeline Data (Reduced density if too long)
            const maxPoints = 1000;
            const step = Math.max(1, Math.floor(dataRows.length / maxPoints));
            const timeline: any[] = [];
            for (let i = 0; i < dataRows.length; i += step) {
                timeline.push({
                    time: parseFloat((i / fps).toFixed(2)),
                    blinkRight: resultRight.blinkFlags[i],
                    blinkLeft: resultLeft.blinkFlags[i],
                });
            }
            setTimelineData(timeline);

            toast.success(`Análise concluída para visualização!`);
        } catch (error: any) {
            console.error(error);
            toast.error(`Erro: ${error.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

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

    const handleProcessFile = async (file: File) => {
        setIsAnalyzing(true);
        try {
            const text = await file.text();
            setRawCsvText(text);

            let fps = 30;
            const firstLine = text.trim().split('\n')[0];
            if (firstLine.startsWith('# FPS:')) {
                fps = parseFloat(firstLine.split(':')[1].trim()) || 30;
            }
            setDetectedFPS(fps);
            processCSVData(text, fps);
        } catch (e) {
            toast.error("Erro ao ler arquivo.");
            setIsAnalyzing(false);
        }
    };

    // Prepare Event Comparison Data
    const kinematicData = useMemo(() => {
        const data: any[] = [];
        const maxLen = Math.max(blinkEvents.right.length, blinkEvents.left.length);
        for (let i = 0; i < maxLen; i++) {
            data.push({
                index: i + 1,
                ampR: blinkEvents.right[i]?.amplitude || 0,
                ampL: blinkEvents.left[i]?.amplitude || 0,
                csR: blinkEvents.right[i]?.closingSpeed || 0,
                csL: blinkEvents.left[i]?.closingSpeed || 0,
                osR: blinkEvents.right[i]?.openingSpeed || 0,
                osL: blinkEvents.left[i]?.openingSpeed || 0,
            });
        }
        return data;
    }, [blinkEvents]);

    return (
        <SidebarInset>
            <div className={`min-h-full bg-slate-50 text-slate-900 p-8 font-sans ${inter.variable} ${mono.variable}`}>
                <div className="max-w-[1600px] mx-auto space-y-8">

                    {/* HEADER */}
                    <header className="flex justify-between items-end bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all">
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                <BarChart3 size={28} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Visualização de Cinemática</h1>
                                <p className="text-slate-500 text-sm font-medium">Gráficos avançados de dinâmica palpebral binocular</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {/* FPS CONTROL */}
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shadow-inner">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FPS:</span>
                                <input
                                    type="number"
                                    value={detectedFPS}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setDetectedFPS(val);
                                        if (rawCsvText && val > 0) processCSVData(rawCsvText, val);
                                    }}
                                    className="w-12 text-center text-sm font-mono font-bold text-indigo-600 bg-transparent outline-none"
                                />
                            </div>

                            <label className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all shadow-md hover:shadow-indigo-200 cursor-pointer">
                                <Upload size={18} />
                                Carregar CSV
                                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>
                    </header>

                    {/* EMPTY STATE */}
                    {!timelineData.length && !isAnalyzing && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[500px] bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
                            <LineChartIcon size={64} className="mb-4 text-slate-200" />
                            <h3 className="text-xl font-bold text-slate-600">Aguardando dados...</h3>
                            <p className="text-sm">Importe um arquivo CSV para visualizar os gráficos de cinemática.</p>
                        </motion.div>
                    )}

                    {isAnalyzing && (
                        <div className="h-[500px] bg-white rounded-3xl flex flex-col items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                            <Loader2 size={48} className="animate-spin mb-4" />
                            <div className="flex flex-col items-center">
                                <p className="text-lg font-bold">Processando vetores temporais...</p>
                                <div className="w-48 h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                                    <motion.div className="h-full bg-indigo-500" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {timelineData.length > 0 && (
                        <div className="grid grid-cols-1 gap-8">

                            {/* STAIRCASE TIMELINE */}
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                            <Clock size={20} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">Timeline de Piscadas (Ocorrência)</h3>
                                    </div>
                                    <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> Direito</div>
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-purple-500 rounded-full"></div> Esquerdo</div>
                                    </div>
                                </div>

                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={timelineData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="time" label={{ value: 'Tempo (s)', position: 'insideBottom', offset: -5 }} tick={{ fontSize: 10 }} />
                                            <YAxis hide domain={[0, 1.2]} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                labelFormatter={(t) => `${t}s`}
                                            />
                                            <Line
                                                type="stepAfter"
                                                dataKey="blinkRight"
                                                name="Dir"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                            <Line
                                                type="stepAfter"
                                                dataKey="blinkLeft"
                                                name="Esq"
                                                stroke="#a855f7"
                                                strokeWidth={2}
                                                dot={false}
                                                isAnimationActive={false}
                                                strokeDasharray="4 4"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                                {/* VELOCITY CHART */}
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                            <Zap size={20} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">Velocidade de Fechamento vs Abertura</h3>
                                    </div>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={kinematicData}>
                                                <defs>
                                                    <linearGradient id="colorCs" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorOs" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="index" label={{ value: 'Sequência de Piscadas', position: 'insideBottom', offset: -5 }} />
                                                <YAxis label={{ value: 'EAR/s', angle: -90, position: 'insideLeft' }} />
                                                <Tooltip />
                                                <Legend verticalAlign="top" height={36} />
                                                <Area type="monotone" dataKey="csR" name="Fechamento (D)" stroke="#f97316" fillOpacity={1} fill="url(#colorCs)" strokeWidth={3} />
                                                <Area type="monotone" dataKey="osR" name="Abertura (D)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOs)" strokeWidth={3} />
                                                <Area type="monotone" dataKey="csL" name="Fechamento (E)" stroke="#ea580c" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                                                <Area type="monotone" dataKey="osL" name="Abertura (E)" stroke="#2563eb" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </motion.div>

                                {/* AMPLITUDE CHART */}
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Ruler size={20} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">Amplitude por Evento</h3>
                                    </div>
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={kinematicData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="index" />
                                                <YAxis label={{ value: 'EAR', angle: -90, position: 'insideLeft' }} />
                                                <Tooltip />
                                                <Legend verticalAlign="top" height={36} />
                                                <Bar dataKey="ampR" name="Amplitude Dir" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="ampL" name="Amplitude Esq" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </motion.div>

                            </div>

                            {/* COMPARISON RADAR OR SCATTER COULD GO HERE */}
                            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <Activity size={20} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">Distribuição de Velocidade Binocular</h3>
                                </div>
                                <div className="h-[400px]">
                                    {/* Scatter plot of Closing vs Opening for all blinks */}
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={kinematicData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="index" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Area type="basis" dataKey="csR" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Vel. Fechamento Direito" />
                                            <Area type="basis" dataKey="csL" stackId="2" stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} name="Vel. Fechamento Esquerdo" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </SidebarInset>
    )
}
