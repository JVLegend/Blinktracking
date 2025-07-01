import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, Lock, Mail } from "lucide-react"
import { RepositoryButton } from "@/components/repository-button"

export default function CodigosPage() {
  return (
    <SidebarInset>
      <div className="flex-1 space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Códigos do Projeto</h1>
          <p className="text-muted-foreground">
            Acesso ao repositório do SmartBlink
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Github className="h-6 w-6 text-primary" />
              <CardTitle>Repositório Privado</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4 bg-muted p-4 rounded-lg">
              <Lock className="h-5 w-5 mt-1 text-muted-foreground" />
              <div className="space-y-2">
                <p>
                  Os códigos do SmartBlink estão versionados em um repositório privado 
                  no GitHub do pesquisador João Victor Dias. Para obter acesso, é necessário 
                  solicitar autorização direta.
                </p>
                <p className="text-sm text-muted-foreground">
                  O acesso é controlado para proteger a propriedade intelectual e 
                  garantir o uso adequado da tecnologia.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Como solicitar acesso:</h4>
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>Envie um e-mail para: joao.victor@wingsgroup.ai</span>
                </div>
                <div className="text-sm text-muted-foreground pl-6">
                  No e-mail, inclua:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Seu nome completo</li>
                    <li>Instituição</li>
                    <li>Área de pesquisa</li>
                    <li>Motivo do interesse no projeto</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <RepositoryButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  )
}
