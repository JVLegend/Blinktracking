"use client"

import { useRouter } from "next/navigation"
import { useState, useCallback } from "react"

// Definindo a estrutura dos itens pesquisáveis
type SearchableItem = {
  title: string
  content: string
  url: string
}

// Base de dados pesquisável
const searchableContent: SearchableItem[] = [
  {
    title: "Visão do Projeto",
    content: "Inteligência Artificial revolucionando o diagnóstico oftalmológico",
    url: "/visao-projeto",
  },
  {
    title: "Gerar Vídeo com Pontos",
    content: "Gere um vídeo com pontos de referência faciais e métricas de piscar",
    url: "/funcionalidades/gerar-video",
  },
  {
    title: "Analytics",
    content: "Dashboard com análises e estatísticas dos pacientes",
    url: "/",
  },
  // Adicione mais itens conforme necessário
]

export function useSearch() {
  const router = useRouter()
  const [results, setResults] = useState<SearchableItem[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = useCallback((searchTerm: string) => {
    setIsSearching(true)
    
    if (!searchTerm.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    // Realiza a busca
    const searchResults = searchableContent.filter((item) => {
      const searchable = `${item.title} ${item.content}`.toLowerCase()
      return searchable.includes(searchTerm.toLowerCase())
    })

    setResults(searchResults)
    setIsSearching(false)
  }, [])

  const navigateToResult = useCallback((url: string) => {
    router.push(url)
    setResults([])
  }, [router])

  return {
    results,
    isSearching,
    handleSearch,
    navigateToResult,
  }
}
