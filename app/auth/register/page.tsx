import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Registro - SmartBlink",
  description: "Página de registro do SmartBlink.",
}

export default function RegisterPage() {
  return (
    <div className="container flex h-screen w-full flex-col items-center justify-center">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Inscrições em Breve</h1>
          <p className="text-muted-foreground">
            O SmartBlink está em fase final de desenvolvimento. As inscrições para uso do aplicativo 
            serão abertas em breve. Fique atento às nossas redes sociais para mais informações.
          </p>
        </div>
        <Button asChild>
          <Link href="/">Voltar para Página Inicial</Link>
        </Button>
      </div>
    </div>
  )
}
