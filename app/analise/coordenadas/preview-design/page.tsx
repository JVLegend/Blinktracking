"use client"

import React, { useState, useEffect } from "react"
import { Inter, JetBrains_Mono } from "next/font/google"
import { motion } from "framer-motion"
import {
    Activity,
    Eye,
    Settings,
    Share,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Maximize2,
    FileText
} from "lucide-react"

// Font Configuration
const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter"
})

const mono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono"
})

export default function ClinicalPreviewPage() {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentFrame, setCurrentFrame] = useState(1350)
    const totalFrames = 2868
    const [playbackSpeed, setPlaybackSpeed] = useState(1)

    // Simulation of playback
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentFrame(prev => (prev >= totalFrames ? 0 : prev + 1))
            }, 1000 / (30 * playbackSpeed))
        }
        return () => clearInterval(interval)
    }, [isPlaying, playbackSpeed])

    const togglePlay = () => setIsPlaying(!isPlaying)

    return (
        <div className={`min-h-screen bg-gradient-to-b from-[#f0f9ff] to-slate-50 text-slate-900 p-8 font-sans ${inter.variable} ${mono.variable}`}>

            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* H E A D E R */}
                <header className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-sky-600 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
                                <Eye size={24} strokeWidth={2} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
                                    Análise de Rastreamento Ocular
                                </h1>
                                <span className="text-xs font-medium text-sky-600 uppercase tracking-wider">Clinical Suite v2.0</span>
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm ml-[3.25rem]">
                            Relatório Clínico: Paciente #8492 • Sessão de 12 Dez 2024
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium text-sm hover:bg-slate-50 hover:text-sky-600 transition-colors shadow-sm">
                            <Settings size={18} />
                            Configurações
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white border border-transparent rounded-lg font-medium text-sm hover:bg-slate-800 transition-all shadow-md hover:shadow-lg">
                            <FileText size={18} />
                            Exportar Laudo
                        </button>
                    </div>
                </header>

                {/* S T A T U S   B A R */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 flex items-center gap-6 shadow-sm"
                >
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50/50 text-sky-700 rounded-full text-xs font-semibold border border-sky-100">
                        <Activity size={14} />
                        MediaPipe Integrity: 99.8%
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                        Resolução: 1920x1080
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                        FPS: 60.0
                    </div>
                    <div className="ml-auto font-mono text-xs text-slate-400">
                        ARQUIVO: paciente10_3746.MOV
                    </div>
                </motion.div>

                {/* M A I N   G R I D */}
                <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] gap-6">

                    {/* C O L U M N   1 :   V I S U A L I Z A T I O N */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-4"
                    >
                        {/* CANVAS CONTAINER */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative h-[600px] group">

                            {/* Grid Background */}
                            <div className="absolute inset-0 pointer-events-none"
                                style={{
                                    backgroundImage: `linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)`,
                                    backgroundSize: '40px 40px'
                                }}>
                            </div>

                            {/* Legend & Labels */}
                            <div className="absolute top-6 left-0 right-0 flex justify-around pointer-events-none">
                                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-100 uppercase tracking-widest opacity-80">
                                    Olho Direito (OD)
                                </span>
                                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100 uppercase tracking-widest opacity-80">
                                    Olho Esquerdo (OE)
                                </span>
                            </div>

                            {/* SVG VISUALIZATION */}
                            <svg className="w-full h-full" viewBox="0 0 800 600">
                                {/* Right Eye (OD) Group */}
                                <g className="transition-transform duration-75" style={{ transform: `translateY(${Math.sin(currentFrame * 0.1) * 2}px)` }}>
                                    {/* Sclera Outline Shadow */}
                                    <path d="M220,300 Q280,260 340,300 Q280,340 220,300"
                                        fill="none" stroke="#0ea5e9" strokeWidth="1" opacity="0.2" strokeDasharray="4 4" />

                                    {/* Connected Lines */}
                                    <path d="M250,275 L280,265 L310,275 M250,325 L280,335 L310,325"
                                        stroke="#0ea5e9" strokeWidth="1" opacity="0.3" />

                                    {/* Points */}
                                    <circle cx="250" cy="275" r="4" fill="#0ea5e9" className="animate-pulse" />
                                    <circle cx="280" cy="265" r="4" fill="#0ea5e9" />
                                    <circle cx="310" cy="275" r="4" fill="#0ea5e9" className="animate-pulse" />

                                    <circle cx="250" cy="325" r="4" fill="#0ea5e9" opacity="0.6" />
                                    <circle cx="280" cy="335" r="4" fill="#0ea5e9" opacity="0.6" />
                                    <circle cx="310" cy="325" r="4" fill="#0ea5e9" opacity="0.6" />

                                    {/* Pupil Center */}
                                    <circle cx="280" cy="300" r="6" fill="#0284c7" stroke="white" strokeWidth="2" />
                                </g>

                                {/* Left Eye (OE) Group */}
                                <g className="transition-transform duration-75" style={{ transform: `translateY(${Math.sin(currentFrame * 0.1 + 1) * 2}px)` }}>
                                    <path d="M460,300 Q520,260 580,300 Q520,340 460,300"
                                        fill="none" stroke="#0d9488" strokeWidth="1" opacity="0.2" strokeDasharray="4 4" />

                                    <path d="M490,275 L520,265 L550,275 M490,325 L520,335 L550,325"
                                        stroke="#0d9488" strokeWidth="1" opacity="0.3" />

                                    <circle cx="490" cy="275" r="4" fill="#0d9488" className="animate-pulse" />
                                    <circle cx="520" cy="265" r="4" fill="#0d9488" />
                                    <circle cx="550" cy="275" r="4" fill="#0d9488" className="animate-pulse" />

                                    <circle cx="490" cy="325" r="4" fill="#0d9488" opacity="0.6" />
                                    <circle cx="520" cy="335" r="4" fill="#0d9488" opacity="0.6" />
                                    <circle cx="550" cy="325" r="4" fill="#0d9488" opacity="0.6" />

                                    <circle cx="520" cy="300" r="6" fill="#0f766e" stroke="white" strokeWidth="2" />
                                </g>
                            </svg>

                            {/* Scale Indicator */}
                            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded border border-slate-200 text-[10px] font-mono text-slate-400">
                                SCALE: 1px = 0.23mm
                            </div>
                        </div>

                        {/* CONTROLS BAR */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
                            <button
                                onClick={togglePlay}
                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 active:scale-95"
                            >
                                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                            </button>

                            <div className="flex gap-1">
                                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                                    <SkipBack size={18} />
                                </button>
                                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                                    <SkipForward size={18} />
                                </button>
                            </div>

                            {/* Timeline Scrubber */}
                            <div className="flex-1 h-8 bg-slate-100 rounded-lg relative overflow-hidden cursor-pointer group">
                                <div
                                    className="absolute top-0 bottom-0 left-0 bg-sky-100 border-r-2 border-sky-500 transition-all duration-75 ease-linear group-hover:bg-sky-200/50"
                                    style={{ width: `${(currentFrame / totalFrames) * 100}%` }}
                                ></div>
                                <div className="absolute inset-0 flex items-center justify-start pointer-events-none pl-3">
                                    <span className="text-[10px] font-mono font-medium text-sky-700/50">TIMELINE</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end min-w-[100px]">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frame Atual</span>
                                <div className="font-mono text-sm font-medium text-slate-700">
                                    <span className="text-sky-600 font-bold">{currentFrame}</span> / {totalFrames}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* C O L U M N   2 :   M E T R I C S */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col gap-6"
                    >
                        {/* EAR CARD */}
                        <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Eye size={14} />
                                Abertura Palpebral (EAR)
                            </h3>

                            <div className="space-y-6">
                                <div className="pl-4 border-l-4 border-sky-500">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Olho Direito</div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-light text-slate-900 tracking-tight transition-all duration-75">
                                            {(25.3 + Math.sin(currentFrame * 0.1) * 0.5).toFixed(1)}
                                        </span>
                                        <span className="text-sm font-medium text-slate-500">px</span>
                                    </div>
                                </div>

                                <div className="pl-4 border-l-4 border-teal-500">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Olho Esquerdo</div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-light text-slate-900 tracking-tight transition-all duration-75">
                                            {(24.8 + Math.sin(currentFrame * 0.1 + 1) * 0.5).toFixed(1)}
                                        </span>
                                        <span className="text-sm font-medium text-slate-500">px</span>
                                    </div>
                                </div>
                            </div>

                            {/* Micro Chart */}
                            <div className="mt-8 h-16 bg-slate-50 rounded border border-slate-100 relative overflow-hidden">
                                <svg className="w-full h-full" preserveAspectRatio="none">
                                    <path d={`M0,30 Q20,${25 + Math.sin(currentFrame * 0.1) * 5} 40,30 T80,30 T120,${30 + Math.sin(currentFrame * 0.2) * 10} T160,30 T200,30`}
                                        fill="none" stroke="#0ea5e9" strokeWidth="2" />
                                    <path d={`M0,35 Q20,30 40,${33 + Math.sin(currentFrame * 0.1 + 2) * 5} T80,35 T120,35 T160,${35 + Math.sin(currentFrame * 0.2 + 1) * 5} T200,35`}
                                        fill="none" stroke="#0d9488" strokeWidth="2" opacity="0.5" />
                                </svg>
                            </div>
                        </div>

                        {/* COORDINATES LIST */}
                        <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 flex-1 min-h-[300px] flex flex-col shadow-sm">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Coordenadas Raw</h3>
                                <button className="text-[10px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-2 py-1 rounded">
                                    EXPORTAR CSV
                                </button>
                            </div>

                            <div className="overflow-y-auto flex-1 p-2 font-mono text-xs custom-scrollbar">
                                {/* Fake Data Rows */}
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded transition-colors border-b border-slate-50 last:border-0">
                                        <span className="font-bold text-slate-500 flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${i % 2 === 0 ? 'bg-sky-500' : 'bg-teal-500'}`}></div>
                                            P:{30 + i * 5} ({i % 2 === 0 ? 'OD' : 'OE'})
                                        </span>
                                        <div className="space-x-4 text-slate-600">
                                            <span>X: <span className="text-slate-900">{(245 + Math.random() * 5).toFixed(1)}</span></span>
                                            <span>Y: <span className="text-slate-900">{(150 + Math.random() * 5).toFixed(1)}</span></span>
                                        </div>
                                    </div>
                                ))}
                                <div className="p-2 text-center text-slate-400 text-[10px] italic">
                                    Atualizando em tempo real...
                                </div>
                            </div>
                        </div>

                    </motion.div>

                </div>
            </div>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
        </div>
    )
}
