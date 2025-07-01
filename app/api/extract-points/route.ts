import { NextRequest } from "next/server"
import { spawn } from "child_process"
import { writeFile, mkdir, readFile, unlink } from "fs/promises"
import path from "path"
import { existsSync } from "fs"
import fetch from "node-fetch"
import { NextResponse } from 'next/server'

const PREDICTOR_URL = "https://github.com/italojs/facial-landmarks-recognition/raw/master/shape_predictor_68_face_landmarks.dat"
const PREDICTOR_PATH = path.join(process.cwd(), "models", "shape_predictor_68_face_landmarks.dat")

async function downloadPredictor() {
  try {
    const modelsDir = path.join(process.cwd(), "models")
    if (!existsSync(modelsDir)) {
      await mkdir(modelsDir, { recursive: true })
    }

    if (!existsSync(PREDICTOR_PATH)) {
      console.log("Baixando predictor...")
      const response = await fetch(PREDICTOR_URL)
      const buffer = await response.buffer()
      await writeFile(PREDICTOR_PATH, buffer)
      console.log("Predictor baixado com sucesso!")
    }
    return { downloading: false }
  } catch (error) {
    console.error("Erro ao baixar predictor:", error)
    throw error
  }
}

// Nova forma de configuração para App Router
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos

// Configuração específica para o tamanho do corpo da requisição
export const fetchCache = 'force-no-store'
export const revalidate = 0

async function saveVideoFile(formData: FormData): Promise<string> {
  const video = formData.get("video") as File
  if (!video) {
    throw new Error("Nenhum vídeo fornecido")
  }

  const buffer = Buffer.from(await video.arrayBuffer())
  const tempDir = path.join(process.cwd(), "temp")
  
  if (!existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true })
  }

  const videoPath = path.join(tempDir, `video_${Date.now()}.mp4`)
  await writeFile(videoPath, buffer)
  return videoPath
}

export async function POST(request: Request) {
  let videoPath = ''
  
  try {
    const formData = await request.formData()
    const method = formData.get("method") as string

    // Verifica se precisa baixar o predictor para o método dlib
    if (method === "normal") {
      const predictorStatus = await downloadPredictor()
      if (predictorStatus.downloading) {
        return NextResponse.json({ status: 'downloading_model' })
      }
    }

    // Salva o vídeo temporariamente
    videoPath = await saveVideoFile(formData)

    // Escolhe o script Python apropriado baseado no método
    const scriptPath = method === 'potente' 
      ? 'scripts/extract_points_mediapipe.py'
      : 'scripts/extract_points_dlib.py'

    // Executa o script Python
    const process = spawn('python', [scriptPath, videoPath])
    
    let scriptOutput = ''
    let scriptError = ''

    process.stdout.on('data', (data) => {
      scriptOutput += data.toString()
    })

    process.stderr.on('data', (data) => {
      const message = data.toString()
      // Ignora mensagens informativas
      if (message.includes("INFO:") || 
          message.includes("TensorFlow") || 
          message.includes("UserWarning") ||
          message.includes("SymbolDatabase")) {
        console.log("Info:", message)
        return
      }
      scriptError += message
    })

    await new Promise((resolve, reject) => {
      process.on('close', (code) => {
        if (code === 0) {
          resolve(null)
        } else {
          reject(new Error(`Script Python falhou com código ${code}`))
        }
      })
    })

    // Tenta parsear a saída do script
    try {
      const result = JSON.parse(scriptOutput)
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido no script Python')
      }

      return NextResponse.json({ 
        success: true,
        points: result.points,
        totalPoints: result.points.length,
        totalFrames: result.total_frames
      })
    } catch (e) {
      console.error("Erro ao parsear saída do script:", e)
      throw new Error("Erro ao processar resultado do script Python")
    }

  } catch (error) {
    console.error("Erro completo:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao processar o vídeo'
    }, {
      status: 500
    })
  } finally {
    // Limpa o arquivo temporário
    if (videoPath) {
      try {
        await unlink(videoPath)
      } catch (e) {
        console.error("Erro ao remover arquivo temporário:", e)
      }
    }
  }
} 