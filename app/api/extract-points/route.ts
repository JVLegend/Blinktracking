import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL, REQUEST_TIMEOUT } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const videoUrl = formData.get("videoUrl") as string
    const videoFilename = formData.get("videoFilename") as string
    const method = formData.get("method") as string

    if (!videoUrl || !videoFilename || !method) {
      return NextResponse.json({ 
        success: false, 
        error: "URL do vídeo, nome do arquivo e método são obrigatórios" 
      }, { status: 400 })
    }

    // Buscar o vídeo do blob storage
    const videoResponse = await fetch(videoUrl)
    if (!videoResponse.ok) {
      return NextResponse.json({ 
        success: false, 
        error: "Erro ao baixar vídeo do storage" 
      }, { status: 500 })
    }

    const videoBlob = await videoResponse.blob()
    
    // Criar FormData para o backend
    const backendFormData = new FormData()
    backendFormData.append('video', videoBlob, videoFilename)
    backendFormData.append('method', method)

    // Enviar para o backend Flask
    const backendResponse = await fetch(`${BACKEND_URL}/extract-points`, {
      method: 'POST',
      body: backendFormData,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT)
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      return NextResponse.json({ 
        success: false, 
        error: `Erro no backend: ${errorText}` 
      }, { status: backendResponse.status })
    }

    const result = await backendResponse.json()
    return NextResponse.json(result)

  } catch (error) {
    console.error("Erro na API extract-points:", error)
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ 
        success: false, 
        error: "Timeout: processamento demorou mais que o esperado" 
      }, { status: 408 })
    }

    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao processar o vídeo'
    }, { status: 500 })
  }
} 