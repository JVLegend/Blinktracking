import { NextResponse } from "next/server"
import { BACKEND_URL, REQUEST_TIMEOUT } from '@/lib/config'
import { RequestValidationError, requireFrameNumber, sanitizeUploadFilename } from "@/lib/server/api-validation"
import { RemoteVideoError, fetchRemoteVideoBlob } from '@/lib/server/remote-video'

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

    const safeFilename = sanitizeUploadFilename(videoFilename)
    const safeFrame = requireFrameNumber(frame)
    const videoBlob = await fetchRemoteVideoBlob(videoUrl)

    // Criar FormData para o backend
    const backendFormData = new FormData()
    backendFormData.append('video', videoBlob, safeFilename)
    backendFormData.append('frame_number', safeFrame)

    // Enviar para o backend Flask
    const backendResponse = await fetch(`${BACKEND_URL}/extract-frame`, {
      method: 'POST',
      body: backendFormData,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT)
    })

    if (!backendResponse.ok) {
      await backendResponse.text().catch(() => '')
      return NextResponse.json(
        { error: "Erro ao extrair frame" },
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
        await backendResponse.json()
      } catch {
        return NextResponse.json(
          { error: "Resposta inválida do servidor" },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: "Erro ao extrair frame" },
        { status: 500 }
      )
    }

  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    if (error instanceof RemoteVideoError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

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
