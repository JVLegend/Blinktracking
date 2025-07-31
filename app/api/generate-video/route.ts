import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL, REQUEST_TIMEOUT } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  try {
    // Processar o FormData
    const formData = await req.formData()
    const videoUrl = formData.get('videoUrl') as string
    const videoFilename = formData.get('videoFilename') as string
    const method = formData.get('method') as string

    if (!videoUrl || !videoFilename || !method) {
      return new Response(
        encoder.encode('data: ' + JSON.stringify({ error: "URL do vídeo, nome do arquivo ou método não fornecido" }) + '\n\n'),
        { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
      )
    }

    // Buscar o vídeo do blob storage
    const videoResponse = await fetch(videoUrl)
    if (!videoResponse.ok) {
      return new Response(
        encoder.encode('data: ' + JSON.stringify({ error: "Erro ao baixar vídeo do storage" }) + '\n\n'),
        { status: 500, headers: { 'Content-Type': 'text/event-stream' } }
      )
    }

    const videoBlob = await videoResponse.blob()

    // Criar FormData para o backend
    const backendFormData = new FormData()
    backendFormData.append('video', videoBlob, videoFilename)
    backendFormData.append('method', method)

    // Criar stream de resposta
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Enviar para o backend Flask
    const backendResponse = await fetch(`${BACKEND_URL}/process-video`, {
      method: 'POST',
      body: backendFormData,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT)
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      await writer.write(encoder.encode('data: ' + JSON.stringify({ error: `Erro no backend: ${errorText}` }) + '\n\n'))
      await writer.close()
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

    const result = await backendResponse.json()

    if (result.success) {
      // Verificar se há arquivo de output
      if (result.output_file) {
        // Baixar o arquivo processado do backend
        const downloadResponse = await fetch(`${BACKEND_URL}/download/${result.output_file}`)
        if (downloadResponse.ok) {
          const videoData = await downloadResponse.arrayBuffer()
          await writer.write(encoder.encode('data: ' + JSON.stringify({ 
            status: 'complete',
            videoData: Buffer.from(videoData).toString('base64'),
            message: 'Vídeo processado com sucesso!'
          }) + '\n\n'))
        } else {
          await writer.write(encoder.encode('data: ' + JSON.stringify({ 
            error: "Erro ao baixar vídeo processado" 
          }) + '\n\n'))
        }
      } else {
        await writer.write(encoder.encode('data: ' + JSON.stringify({ 
          status: 'complete',
          message: result.output || 'Processamento concluído'
        }) + '\n\n'))
      }
    } else {
      await writer.write(encoder.encode('data: ' + JSON.stringify({ 
        error: result.error || "Erro ao processar o vídeo" 
      }) + '\n\n'))
    }

    await writer.close()

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    console.error("Erro na API generate-video:", error)
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return new Response(
        encoder.encode('data: ' + JSON.stringify({ error: "Timeout: processamento demorou mais que o esperado" }) + '\n\n'),
        { status: 408, headers: { 'Content-Type': 'text/event-stream' } }
      )
    }

    return new Response(
      encoder.encode('data: ' + JSON.stringify({ error: "Erro interno do servidor" }) + '\n\n'),
      { status: 500, headers: { 'Content-Type': 'text/event-stream' } }
    )
  }
} 