"use client"

import { SidebarInset } from "@/components/ui/sidebar"
import { Inter, JetBrains_Mono } from "next/font/google"
import {
  Brain,
  Eye,
  Microscope,
  Lightbulb,
  Users,
  FileText,
  ClipboardList,
  Calendar,
  Calculator,
  Scale,
  AlertTriangle,
  GraduationCap,
  Building2,
  CheckCircle2
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

export default function VisionPage() {
  return (
    <SidebarInset>
      <div className={`min-h-full bg-gradient-to-b from-[#f0f9ff] to-slate-50 text-slate-900 p-8 font-sans ${inter.variable} ${mono.variable}`}>

        <div className="max-w-[1200px] mx-auto space-y-8">

          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="wd-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center p-2 text-sky-700">
                <Lightbulb size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Visão do Projeto</h1>
                <p className="text-slate-500 font-medium">
                  Inteligência Artificial revolucionando o diagnóstico oftalmológico
                </p>
              </div>
            </div>
          </div>

          {/* PESQUISADORES */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-sm">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Users className="text-sky-600" size={20} />
              <h2 className="font-semibold text-slate-700 uppercase tracking-wider text-xs">Equipe de Pesquisa</h2>
            </div>
            <div className="p-8 grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-4">
                  <Building2 size={16} className="text-slate-400" /> Instituição
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Disciplina de Oftalmologia, Departamento de Oftalmologia e Otorrinolaringologia,
                  Faculdade de Medicina da Universidade de São Paulo (FMUSP).
                </p>

                <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-4">
                  <GraduationCap size={16} className="text-slate-400" /> Pesquisador Responsável
                </h3>
                <p className="text-slate-700 font-medium">Dr. Allan Christian Pieroni Gonçalves</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                <h3 className="font-bold text-slate-900 mb-4">Colaboradores</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2 flex-shrink-0" />
                    <span className="text-slate-700">
                      <strong className="text-slate-900">Dra. Larissa Caroline Mansano Soares</strong>
                      <span className="block text-slate-500 text-xs">Oftalmologista e pesquisadora principal</span>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2 flex-shrink-0" />
                    <span className="text-slate-700">
                      <strong className="text-slate-900">João Victor Dias</strong>
                      <span className="block text-slate-500 text-xs">Estatístico e desenvolvedor do projeto</span>
                    </span>
                  </li>
                  {[
                    "Dr. Lucas Costa Cortez",
                    "Dra. Suzana Matayoshi",
                    "Dr. Mario Luiz Monteiro",
                    "Dra. Maria Antonieta (Pesquisadora Colaboradora)"
                  ].map((name, i) => (
                    <li key={i} className="flex gap-3 items-center text-slate-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* A REVOLUÇÃO DA IA */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-white shadow-lg overflow-hidden relative">
              <Brain className="absolute right-[-20px] bottom-[-20px] text-white/10 w-64 h-64" />
              <h2 className="text-2xl font-bold mb-4 relative z-10">A Revolução da IA na Oftalmologia</h2>
              <div className="space-y-4 text-indigo-100 relative z-10 leading-relaxed text-sm lg:text-base">
                <p>
                  A integração da Inteligência Artificial representa um dos avanços mais significativos na medicina moderna.
                  Com sua capacidade de processar grandes volumes de dados, a IA transforma diagnósticos.
                </p>
                <p className="font-medium text-white bg-white/10 p-4 rounded-lg border border-white/10 inline-block">
                  O <strong>SmartBlink</strong> utiliza essa tecnologia para analisar o piscar de olhos com precisão milimétrica.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { icon: Eye, title: "Diagnóstico Preciso", desc: "Detecção precoce de anomalias funcionais.", color: "text-sky-600", bg: "bg-sky-50" },
                { icon: Microscope, title: "Análise Objetiva", desc: "Eliminação da subjetividade manual.", color: "text-teal-600", bg: "bg-teal-50" },
                { icon: Lightbulb, title: "Inovação Contínua", desc: "Evolução constante via Machine Learning.", color: "text-amber-600", bg: "bg-amber-50" }
              ].map((item, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${item.bg} ${item.color}`}>
                    <item.icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CONTEUDO TECNICO */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* RESUMO */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-slate-400" size={20} />
                <h2 className="font-bold text-slate-900">Resumo do Projeto</h2>
              </div>
              <div className="text-sm text-slate-600 space-y-3 leading-relaxed text-justify">
                <p>
                  O piscar adequado é essencial para a manutenção da saúde ocular: distribui o filme lacrimal,
                  remove debris, exclui estímulos visuais e auxilia na drenagem lacrimal.
                </p>
                <p>
                  Alterações na dinâmica do piscar podem ter implicações sérias na superfície ocular e indicar
                  desordens sistêmicas ou neurológicas.
                </p>
                <p className="p-3 bg-slate-50 rounded-lg border border-slate-100 italic text-slate-700">
                  "O propósito é investigar a dinâmica do piscar comparando olhos saudáveis, patologias e estados pós-cirúrgicos."
                </p>
              </div>
            </section>

            {/* OBJETIVOS */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="text-emerald-500" size={20} />
                <h2 className="font-bold text-slate-900">Objetivos Específicos</h2>
              </div>
              <ul className="space-y-4 mt-2">
                {[
                  "Análise da Dinâmica do Piscar Espontâneo em pacientes do HCFMUSP",
                  "Comparar métricas quantitativas entre grupos (saudáveis vs patológicos)",
                  "Avaliar correlações clínicas com a estabilidade ocular"
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-600 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100/50">
                    <span className="font-bold text-emerald-600">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* METODOLOGIA E RISCOS */}
          <div className="grid md:grid-cols-3 gap-6">
            <section className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6 text-slate-900 font-bold border-b border-slate-100 pb-4">
                <ClipboardList className="text-indigo-500" /> Metodologia
              </div>
              <div className="grid sm:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Estudo</h4>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-400 rounded-full" /> Prospectivo</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-400 rounded-full" /> Não intervencionista</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-400 rounded-full" /> Comparativo</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-400 rounded-full" /> 100 Pacientes</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-400 rounded-full" /> 2023 - 2026</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Avaliações</h4>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-400 rounded-full" /> Foto e Filmagem (High Speed)</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-400 rounded-full" /> Questionário OSDI</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-400 rounded-full" /> Prontuário Clínico</li>
                    <li className="flex items-center gap-2"><div className="w-1 h-1 bg-slate-400 rounded-full" /> Análise de Superfície</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 font-bold text-slate-900 p-2 bg-amber-50 rounded-lg text-amber-800 border-amber-100 w-fit">
                  <AlertTriangle size={18} /> Riscos e Benefícios
                </div>
                <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                  <p>
                    <strong className="block text-slate-900 mb-1">Risco Mínimo:</strong>
                    Possível desconforto ou constrangimento pela exposição de imagem (mesmo sem dados pessoais).
                  </p>
                  <p>
                    <strong className="block text-slate-900 mb-1">Benefício Elevado:</strong>
                    Identificação de complicações, quantificação de impacto cirúrgico e aprimoramento de técnicas.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono text-center">
                Protocolo ético aprovado
              </div>
            </section>
          </div>

          {/* TABELAS: CRONOGRAMA E ORCAMENTO */}
          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Calendar className="text-slate-400" size={18} />
                <h3 className="font-bold text-slate-700 text-sm">Cronograma</h3>
              </div>
              <div className="p-0">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ["Recrutamento", "M1 - M40"],
                      ["Medidas", "M2 - M40"],
                      ["Análise", "M6 - M40"],
                      ["Manuscritos", "M40 - M42"],
                      ["Divulgação", "M41 - M42"]
                    ].map(([task, time], i) => (
                      <tr key={i}>
                        <td className="p-3 text-slate-600 font-medium pl-6">{task}</td>
                        <td className="p-3 text-slate-500 font-mono text-right pr-6">{time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Calculator className="text-slate-400" size={18} />
                <h3 className="font-bold text-slate-700 text-sm">Orçamento Estimado</h3>
              </div>
              <div className="p-0">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 text-slate-600 pl-6">Materiais e Equipamentos</td>
                      <td className="p-3 text-slate-900 font-mono text-right pr-6">R$ 8.880,00</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-600 pl-6">Serviços</td>
                      <td className="p-3 text-slate-900 font-mono text-right pr-6">R$ 5.780,00</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-3 text-slate-900 font-bold pl-6">Total</td>
                      <td className="p-3 text-slate-900 font-bold font-mono text-right pr-6">R$ 14.660,00</td>
                    </tr>
                  </tbody>
                </table>
                <div className="p-3 text-[10px] text-slate-400 text-center italic border-t border-slate-100">
                  * Custos arcados pelos pesquisadores
                </div>
              </div>
            </section>
          </div>

        </div>
      </div>
    </SidebarInset>
  )
}
