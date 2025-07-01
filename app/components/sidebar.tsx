"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home, 
  Scan, 
  Video, 
  Image, 
  BarChart3, 
  PieChart, 
  Clock, 
  FileText, 
  Code, 
  Lightbulb, 
  Stethoscope,
  User
} from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  // Dados temporários do usuário (será substituído pela autenticação real)
  const user = {
    name: "Dr. João Victor",
    email: "joao.silva@hospital.com",
    avatar: null, // URL da foto quando implementado
    role: "CTO"
  }

  return (
    <div className="flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border bg-sidebar">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground">SmartBlink</h1>
            <p className="text-sm text-sidebar-foreground/70">Sistema de Análise de Piscadas</p>
          </div>
        </Link>
      </div>

      {/* User Section */}
      <div className="p-4 border-b border-sidebar-border bg-sidebar/50">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/30 hover:bg-sidebar-accent/50 transition-colors duration-200">
          {/* Avatar placeholder */}
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary/30">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
          
          {/* User info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.name}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user.role}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation with scroll */}
      <nav className="flex-1 overflow-y-auto medical-scrollbar">
        <div className="p-4 space-y-6">
          
          {/* Menu Principal */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 px-2">
              Menu Principal
            </h2>
            <Link 
              href="/"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group
                ${isActive('/') ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'}`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </Link>
          </div>

          {/* Funcionalidades */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 px-2">
              Funcionalidades
            </h2>
            <div className="space-y-1">
              <Link 
                href="/funcionalidades/extrair-pontos"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group
                  ${isActive('/funcionalidades/extrair-pontos') ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'}`}
              >
                <Scan className="w-5 h-5" />
                <span className="font-medium">Extrair Pontos</span>
              </Link>
              <Link 
                href="/funcionalidades/gerar-video"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group
                  ${isActive('/funcionalidades/gerar-video') ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'}`}
              >
                <Video className="w-5 h-5" />
                <span className="font-medium">Gerar Vídeo</span>
              </Link>
              <Link 
                href="/funcionalidades/visualizar-frames"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group
                  ${isActive('/funcionalidades/visualizar-frames') ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'}`}
              >
                <Image className="w-5 h-5" />
                <span className="font-medium">Visualizar Frames</span>
              </Link>
            </div>
          </div>

          {/* Análise */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 px-2">
              Análise
            </h2>
            <div className="space-y-1">
              <Link 
                href="/analise/coordenadas"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group
                  ${isActive('/analise/coordenadas') ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'}`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Análise de Coordenadas</span>
              </Link>
              <Link 
                href="/analise/estatisticas"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group
                  ${isActive('/analise/estatisticas') ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'}`}
              >
                <PieChart className="w-5 h-5" />
                <span className="font-medium">Estatísticas das Piscadas</span>
              </Link>
              <Link 
                href="/analise/piscadas"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group
                  ${isActive('/analise/piscadas') ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'}`}
              >
                <Clock className="w-5 h-5" />
                <span className="font-medium">Análise de Piscadas</span>
              </Link>
            </div>
          </div>

          {/* Documentação */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 px-2">
              Documentação
            </h2>
            <div className="space-y-1">
              <Link 
                href="/documentacao/facial-points"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group
                  ${isActive('/documentacao/facial-points') ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'}`}
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">Pontos Faciais</span>
              </Link>
              <Link 
                href="/codigos"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group
                  ${isActive('/codigos') ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'}`}
              >
                <Code className="w-5 h-5" />
                <span className="font-medium">Códigos</span>
              </Link>
              <Link 
                href="/visao-projeto"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group
                  ${isActive('/visao-projeto') ? 'bg-primary text-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'}`}
              >
                <Lightbulb className="w-5 h-5" />
                <span className="font-medium">Visão do Projeto</span>
              </Link>
            </div>
          </div>

          {/* Espaçamento extra no final para scroll */}
          <div className="h-4"></div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar">
        <div className="text-xs text-sidebar-foreground/50 text-center">
          <p>SmartBlink v1.0</p>
          <p>Sistema Oftalmológico</p>
        </div>
      </div>
    </div>
  )
} 