"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BarChart2,
  Code2,
  Eye,
  FileVideo,
  Home,
  Settings,
  Users,
  Film,
  FileText,
  Activity,
  Ruler,
  Menu,
  Wrench,
  BookOpen,
  LineChart,
  BarChart,
  Timer
} from "lucide-react";
import { SidebarInset } from "@/components/ui/sidebar";

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight flex items-center gap-2">
          <Menu className="h-5 w-5 text-primary" />
          Menu Principal
        </h2>
        <div className="space-y-2">
          <Link href="/">
            <Button
              variant={pathname === "/" ? "secondary" : "ghost"}
              className="w-full justify-start hover:bg-accent"
            >
              <Home className="mr-2 h-4 w-4" />
              Início
            </Button>
          </Link>
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Funcionalidades
        </h2>
        <div className="space-y-2">
          <Link href="/funcionalidades/extrair-pontos">
            <Button
              variant={
                pathname === "/funcionalidades/extrair-pontos"
                  ? "secondary"
                  : "ghost"
              }
              className="w-full justify-start hover:bg-accent"
            >
              <Eye className="mr-2 h-4 w-4" />
              Extrair Pontos
            </Button>
          </Link>
          <Link href="/funcionalidades/gerar-video">
            <Button
              variant={
                pathname === "/funcionalidades/gerar-video"
                  ? "secondary"
                  : "ghost"
              }
              className="w-full justify-start hover:bg-accent"
            >
              <FileVideo className="mr-2 h-4 w-4" />
              Gerar Vídeo
            </Button>
          </Link>
          <Link href="/funcionalidades/visualizar-frames">
            <Button
              variant={
                pathname === "/funcionalidades/visualizar-frames"
                  ? "secondary"
                  : "ghost"
              }
              className="w-full justify-start hover:bg-accent"
            >
              <Film className="mr-2 h-4 w-4" />
              Visualizar Frames
            </Button>
          </Link>
          <Link href="/analise/coordenadas">
            <Button
              variant={
                pathname === "/analise/coordenadas"
                  ? "secondary"
                  : "ghost"
              }
              className="w-full justify-start hover:bg-accent"
            >
              <Eye className="mr-2 h-4 w-4" />
              Análise de Coordenadas
            </Button>
          </Link>
          <Link href="/analise/estatisticas">
            <Button
              variant={
                pathname === "/analise/estatisticas"
                  ? "secondary"
                  : "ghost"
              }
              className="w-full justify-start hover:bg-accent"
            >
              <BarChart className="mr-2 h-4 w-4" />
              Estatísticas das Piscadas
            </Button>
          </Link>
          <Link href="/alinhamento">
            <Button
              variant={pathname === "/alinhamento" ? "secondary" : "ghost"}
              className="w-full justify-start hover:bg-accent"
            >
              <Eye className="mr-2 h-4 w-4" />
              Alinhamento
            </Button>
          </Link>
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Documentação
        </h2>
        <div className="space-y-2">
          {/* Códigos removido */}
          <Link href="/visao-projeto">
            <Button
              variant={pathname === "/visao-projeto" ? "secondary" : "ghost"}
              className="w-full justify-start hover:bg-accent"
            >
              <Eye className="mr-2 h-4 w-4" />
              Visão do Projeto
            </Button>
          </Link>
          <Link href="/documentacao/facial-points">
            <Button
              variant={pathname === "/documentacao/facial-points" ? "secondary" : "ghost"}
              className="w-full justify-start hover:bg-accent"
            >
              <Users className="mr-2 h-4 w-4" />
              Pontos Faciais
            </Button>
          </Link>
          <Link href="/documentacao/paper">
            <Button
              variant={pathname === "/documentacao/paper" ? "secondary" : "ghost"}
              className="w-full justify-start hover:bg-accent"
            >
              <FileText className="mr-2 h-4 w-4" />
              O que é uma piscada?
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AlinhamentoPage() {
  return (
    <SidebarInset>
      {/* Todo o conteúdo da página de alinhamento aqui */}
    </SidebarInset>
  );
} 