import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/config'
import { RequestValidationError, requireAllowedMethod, sanitizeUploadFilename } from '@/lib/server/api-validation'
import { RemoteVideoError, fetchRemoteVideoBlob } from '@/lib/server/remote-video'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    // Processar o FormData
    const formData = await req.formData()
    const videoUrl = formData.get('videoUrl') as string
    const videoFilename = formData.get('videoFilename') as string
    const method = formData.get('method') as string

    if (!videoUrl || !videoFilename || !method) {
      return NextResponse.json({ error: "URL do vídeo, nome do arquivo ou método não fornecido" }, { status: 400 })
    }

    const safeFilename = sanitizeUploadFilename(videoFilename)
    const safeMethod = requireAllowedMethod(method, ["dlib", "mediapipe"])
    const videoBlob = await fetchRemoteVideoBlob(videoUrl, 30000)

    // Criar FormData para o backend
    const backendFormData = new FormData()
    backendFormData.append('video', videoBlob, safeFilename)
    backendFormData.append('method', safeMethod)

    // Enviar para o backend Flask
    const backendResponse = await fetch(`${BACKEND_URL}/process-video`, {
      method: 'POST',
      body: backendFormData,
      signal: AbortSignal.timeout(60000) // 60 segundos timeout para debug
    })

    if (!backendResponse.ok) {
      await backendResponse.text().catch(() => '')
      return NextResponse.json({ error: "Erro ao processar o vídeo" }, { status: backendResponse.status })
    }

    const result = await backendResponse.json()

    if (result.success) {
      // Verificar se há arquivo de output
      if (result.output_file) {
        // Baixar o arquivo processado do backend
        const downloadResponse = await fetch(`${BACKEND_URL}/download/${result.output_file}`)
        if (downloadResponse.ok) {
          const videoData = await downloadResponse.arrayBuffer()
          return NextResponse.json({
            status: 'complete',
            videoData: Buffer.from(videoData).toString('base64'),
            message: 'Vídeo processado com sucesso!'
          })
        } else {
          return NextResponse.json({ error: "Erro ao baixar vídeo processado" }, { status: 500 })
        }
      } else {
        return NextResponse.json({
          status: 'complete',
          message: result.output || 'Processamento concluído'
        })
      }
    } else {
      return NextResponse.json({ error: "Erro ao processar o vídeo" }, { status: 500 })
    }

  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    if (error instanceof RemoteVideoError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: "Timeout: processamento demorou mais que o esperado" }, { status: 408 })
    }

    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
