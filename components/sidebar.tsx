"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LucideIcon } from "lucide-react"
import {
  Home,
  Lightbulb,
  Brain,
  Activity,
  Eye,
  FileText,
  Settings,
  Users,
  LayoutDashboard,
  Cog,
  BookOpen,
  LineChart,
} from "lucide-react"

interface SidebarItem {
  label: string
  icon: LucideIcon
  href: string
}

interface SidebarSection {
  category: string
  icon: LucideIcon
  items: SidebarItem[]
}

const routes: SidebarSection[] = [
  {
    category: "Principal",
    icon: LayoutDashboard,
    items: [
      {
        label: "Início",
        icon: Home,
        href: "/",
      },
      {
        label: "Visão do Projeto",
        icon: Lightbulb,
        href: "/visao-projeto",
      },
    ]
  },
  {
    category: "Funcionalidades",
    icon: Brain,
    items: [
      {
        label: "Extrair Pontos",
        icon: Eye,
        href: "/funcionalidades/extrair-pontos",
      },
      {
        label: "Gerar Vídeo",
        icon: Activity,
        href: "/funcionalidades/gerar-video",
      },
      {
        label: "Visualizar Frames",
        icon: Eye,
        href: "/funcionalidades/visualizar-frames",
      },
      {
        label: "Visualizar Sincronizado",
        icon: Activity,
        href: "/funcionalidades/visualizar-sincronizado",
      },
      {
        label: "Alinhamento",
        icon: Eye,
        href: "/alinhamento",
      }
    ]
  },
  {
    category: "Análise",
    icon: LineChart,
    items: [
      {
        label: "Coordenadas",
        icon: Eye,
        href: "/analise/coordenadas",
      },
      {
        label: "Estatísticas das Piscadas",
        icon: Activity,
        href: "/analise/piscadas",
      }
    ]
  },
  {
    category: "Documentação",
    icon: BookOpen,
    items: [
      {
        label: "Pontos Faciais",
        icon: FileText,
        href: "/documentacao/facial-points",
      },
      {
        label: "Paper",
        icon: FileText,
        href: "/documentacao/paper",
      }
    ]
  }
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="drawer-side">
      <label htmlFor="my-drawer" className="drawer-overlay"></label>
      <aside className="bg-base-200 w-72 min-h-screen">
        {/* Logo/Header */}
        <div className="p-4 border-b border-base-300">
          <h1 className="text-xl font-bold">Análise Facial</h1>
          <p className="text-sm opacity-50">Sistema de Análise</p>
        </div>

        {/* Menu */}
        <nav className="p-4 space-y-6">
          {routes.map((section) => (
            <div key={section.category} className="space-y-2">
              {/* Título da Seção */}
              <div className="flex items-center gap-2 px-2">
                <section.icon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider opacity-50">
                  {section.category}
                </h2>
              </div>

              {/* Links da Seção */}
              <ul className="menu menu-sm">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 hover:bg-base-300 rounded-lg transition-colors
                        ${pathname === item.href ? 'bg-primary/10 text-primary font-medium' : ''}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Seção Sistema */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2">
              <Cog className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider opacity-50">
                Sistema
              </h2>
            </div>

            <ul className="menu menu-sm">
              <li>
                <Link
                  href="/configuracoes"
                  className={`flex items-center gap-3 px-3 py-2 hover:bg-base-300 rounded-lg transition-colors
                    ${pathname === '/configuracoes' ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Configurações</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/usuarios"
                  className={`flex items-center gap-3 px-3 py-2 hover:bg-base-300 rounded-lg transition-colors
                    ${pathname === '/usuarios' ? 'bg-primary/10 text-primary font-medium' : ''}`}
                >
                  <Users className="h-4 w-4" />
                  <span>Usuários</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </aside>
    </div>
  )
}