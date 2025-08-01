import { NextRequest, NextResponse } from "next/server"
import { BACKEND_URL, REQUEST_TIMEOUT } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData()
    const videoUrl = formData.get("videoUrl") as string
    const videoFilename = formData.get("videoFilename") as string
    const frame = formData.get("frame") as string

    if (!videoUrl || !videoFilename || !frame) {
      return NextResponse.json(
        { error: "URL do vídeo, nome do arquivo ou número do frame não fornecido" },
        { status: 400 }
      )
    }

    // Buscar o vídeo do blob storage
    const videoResponse = await fetch(videoUrl)
    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: "Erro ao baixar vídeo do storage" },
        { status: 500 }
      )
    }

    const videoBlob = await videoResponse.blob()

    // Criar FormData para o backend
    const backendFormData = new FormData()
    backendFormData.append('video', videoBlob, videoFilename)
    backendFormData.append('frame_number', frame)

    // Enviar para o backend Flask
    const backendResponse = await fetch(`${BACKEND_URL}/extract-frame`, {
      method: 'POST',
      body: backendFormData,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT)
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      return NextResponse.json(
        { error: `Erro no backend: ${errorText}` },
        { status: backendResponse.status }
      )
    }

    // Verificar se a resposta é uma imagem JPEG
    const contentType = backendResponse.headers.get("content-type")
    if (contentType?.includes("image/jpeg")) {
      // Retornar a imagem diretamente
      const imageBlob = await backendResponse.blob()
      return new Response(imageBlob, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': `attachment; filename=frame_${frame}.jpg`
        }
      })
    } else {
      // Tentar processar como JSON (para erros)
      try {
        const result = await backendResponse.json()
        return NextResponse.json(
          { error: result.error || "Erro ao extrair frame" },
          { status: 500 }
        )
      } catch {
        return NextResponse.json(
          { error: "Resposta inválida do servidor" },
          { status: 500 }
        )
      }
    }

  } catch (error) {
    console.error("Erro na API extract-frame:", error)
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: "Timeout: processamento demorou mais que o esperado" },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: "Erro ao processar requisição" },
      { status: 500 }
    )
  }
} 