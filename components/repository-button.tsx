"use client"

import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"

export function RepositoryButton() {
  return (
    <Button size="lg" onClick={() => {}}>
      <Github className="mr-2 h-5 w-5" />
      Repositório Privado
    </Button>
  )
}
