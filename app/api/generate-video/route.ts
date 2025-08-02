import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL, REQUEST_TIMEOUT } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    console.log("=== INICIANDO API GENERATE-VIDEO (VERSÃO SIMPLIFICADA) ===")
    
    // Processar o FormData
    const formData = await req.formData()
    const videoUrl = formData.get('videoUrl') as string
    const videoFilename = formData.get('videoFilename') as string
    const method = formData.get('method') as string

    console.log("Dados recebidos:", { videoUrl, videoFilename, method })

    if (!videoUrl || !videoFilename || !method) {
      console.error("Dados faltando:", { videoUrl, videoFilename, method })
      return NextResponse.json({ error: "URL do vídeo, nome do arquivo ou método não fornecido" }, { status: 400 })
    }

    // Buscar o vídeo do blob storage
    console.log("Baixando vídeo do storage...")
    
    const videoResponse = await fetch(videoUrl, {
      signal: AbortSignal.timeout(30000) // 30 segundos timeout
    })
    
    if (!videoResponse.ok) {
      console.error("Erro ao baixar vídeo:", videoResponse.status)
      return NextResponse.json({ error: "Erro ao baixar vídeo do storage" }, { status: 500 })
    }

    console.log("Vídeo baixado com sucesso, convertendo para blob...")
    const videoBlob = await videoResponse.blob()
    console.log("Vídeo baixado, tamanho:", videoBlob.size, "bytes")

    // Criar FormData para o backend
    console.log("Criando FormData para backend...")
    const backendFormData = new FormData()
    backendFormData.append('video', videoBlob, videoFilename)
    backendFormData.append('method', method)

    // Enviar para o backend Flask
    console.log("Enviando para backend Flask...")
    const backendResponse = await fetch(`${BACKEND_URL}/process-video`, {
      method: 'POST',
      body: backendFormData,
      signal: AbortSignal.timeout(60000) // 60 segundos timeout para debug
    })

    console.log("Resposta do backend:", backendResponse.status)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error("Erro no backend:", errorText)
      return NextResponse.json({ error: `Erro no backend: ${errorText}` }, { status: backendResponse.status })
    }

    console.log("Lendo resposta JSON do backend...")
    const result = await backendResponse.json()
    console.log("Resultado do backend:", result)

    if (result.success) {
      // Verificar se há arquivo de output
      if (result.output_file) {
        console.log("Baixando arquivo processado...")
        // Baixar o arquivo processado do backend
        const downloadResponse = await fetch(`${BACKEND_URL}/download/${result.output_file}`)
        if (downloadResponse.ok) {
          const videoData = await downloadResponse.arrayBuffer()
          console.log("Vídeo processado baixado, tamanho:", videoData.byteLength)
          return NextResponse.json({ 
            status: 'complete',
            videoData: Buffer.from(videoData).toString('base64'),
            message: 'Vídeo processado com sucesso!'
          })
        } else {
          console.error("Erro ao baixar vídeo processado:", downloadResponse.status)
          return NextResponse.json({ error: "Erro ao baixar vídeo processado" }, { status: 500 })
        }
      } else {
        console.log("Processamento concluído sem arquivo")
        return NextResponse.json({ 
          status: 'complete',
          message: result.output || 'Processamento concluído'
        })
      }
    } else {
      console.error("Erro no processamento:", result.error)
      return NextResponse.json({ error: result.error || "Erro ao processar o vídeo" }, { status: 500 })
    }

  } catch (error) {
    console.error("Erro na API generate-video:", error)
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: "Timeout: processamento demorou mais que o esperado" }, { status: 408 })
    }

    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
} 