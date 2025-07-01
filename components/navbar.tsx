import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, FileText, Video, Eye } from "lucide-react"

export function Navbar() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-14 flex items-center gap-4 max-w-7xl">
        <Link href="/" className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          <span className="font-medium">Início</span>
        </Link>

        <div className="flex items-center gap-2 ml-auto">
          <Link href="/documentacao/facial-points">
            <Button variant="ghost" className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>Documentação</span>
            </Button>
          </Link>
          <Link href="/funcionalidades/extrair-pontos">
            <Button variant="ghost" className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <span>Extrair Pontos</span>
            </Button>
          </Link>
          <Link href="/funcionalidades/visualizar-frames">
            <Button variant="ghost" className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              <span>Visualizar Frames</span>
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
} 