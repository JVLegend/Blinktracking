import { NextResponse } from 'next/server'
import { BACKEND_URL, REQUEST_TIMEOUT } from '@/lib/config'
import { RequestValidationError, requireAllowedMethod, sanitizeUploadFilename } from '@/lib/server/api-validation'
import { RemoteVideoError, fetchRemoteVideoBlob } from '@/lib/server/remote-video'

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

    const safeFilename = sanitizeUploadFilename(videoFilename)
    const safeMethod = requireAllowedMethod(method, ["normal", "potente"])
    const videoBlob = await fetchRemoteVideoBlob(videoUrl)

    // Criar FormData para o backend
    const backendFormData = new FormData()
    backendFormData.append('video', videoBlob, safeFilename)
    backendFormData.append('method', safeMethod)

    // Enviar para o backend Flask
    const backendResponse = await fetch(`${BACKEND_URL}/extract-points`, {
      method: 'POST',
      body: backendFormData,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT)
    })

    if (!backendResponse.ok) {
      await backendResponse.text().catch(() => '')
      return NextResponse.json({
        success: false,
        error: "Erro ao extrair pontos"
      }, { status: backendResponse.status })
    }

    const result = await backendResponse.json()
    return NextResponse.json(result)

  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: error.status })
    }

    if (error instanceof RemoteVideoError) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: error.status })
    }

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({
        success: false,
        error: "Timeout: processamento demorou mais que o esperado"
      }, { status: 408 })
    }

    return NextResponse.json({
      success: false,
      error: 'Erro ao processar o vídeo'
    }, { status: 500 })
  }
}
