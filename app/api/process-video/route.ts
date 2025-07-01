import { NextRequest } from "next/server"
import { spawn } from "child_process"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { existsSync } from "fs"
import fetch from "node-fetch"

const PREDICTOR_URL = "https://github.com/italojs/facial-landmarks-recognition/raw/master/shape_predictor_68_face_landmarks.dat"
const PREDICTOR_PATH = path.join(process.cwd(), "models", "shape_predictor_68_face_landmarks.dat")

async function downloadPredictor() {
  try {
    // Cria o diretório models se não existir
    const modelsDir = path.join(process.cwd(), "models")
    if (!existsSync(modelsDir)) {
      await mkdir(modelsDir, { recursive: true })
    }

    // Baixa o arquivo
    console.log("Baixando arquivo predictor...")
    const response = await fetch(PREDICTOR_URL)
    const buffer = await response.arrayBuffer()

    // Salva o arquivo
    await writeFile(PREDICTOR_PATH, Buffer.from(buffer))
    console.log("Arquivo predictor baixado com sucesso!")
  } catch (error) {
    console.error("Erro ao baixar predictor:", error)
    throw error
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Verifica se o arquivo predictor existe, se não, baixa
    if (!existsSync(PREDICTOR_PATH)) {
      await downloadPredictor()
    }

    const formData = await request.formData()
    const videoFile = formData.get("video") as File
    const predictorFile = formData.get("predictor") as File

    if (!videoFile) {
      return new Response("Vídeo não fornecido", { status: 400 })
    }

    // Cria um stream de resposta
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Cria o diretório temp se não existir
    const tempDir = path.join(process.cwd(), "temp")
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true })
    }

    // Gera nomes únicos para os arquivos
    const timestamp = Date.now()
    const videoPath = path.join(tempDir, `video_${timestamp}${path.extname(videoFile.name)}`)
    const outputPath = path.join(tempDir, `output_${timestamp}.mp4`)

    // Converte o vídeo para Buffer e salva
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())
    await writeFile(videoPath, videoBuffer)

    // Executa o script Python usando o predictor baixado
    const pythonProcess = spawn("python", [
      path.join(process.cwd(), "scripts", "process_video_dlib.py"),
      videoPath,
      PREDICTOR_PATH, // Usando o predictor baixado
      outputPath
    ])

    // Log para debug
    console.log("Caminhos dos arquivos:")
    console.log("Video:", videoPath)
    console.log("Predictor:", PREDICTOR_PATH)
    console.log("Output:", outputPath)

    pythonProcess.stdout.on("data", (data) => {
      const message = data.toString()
      console.log("Python stdout:", message)
      if (message.startsWith("PROGRESS:")) {
        const progress = parseInt(message.split(":")[1])
        writer.write(
          new TextEncoder().encode(
            JSON.stringify({ progress })
          )
        )
      }
    })

    pythonProcess.stderr.on("data", (data) => {
      console.error(`Python Error: ${data.toString()}`)
    })

    pythonProcess.on("close", async (code) => {
      console.log("Python process closed with code:", code)
      if (code === 0) {
        writer.write(
          new TextEncoder().encode(
            JSON.stringify({ outputVideo: `/temp/${path.basename(outputPath)}` })
          )
        )
      } else {
        writer.write(
          new TextEncoder().encode(
            JSON.stringify({ error: "Erro ao processar o vídeo" })
          )
        )
      }
      writer.close()

      // Limpa os arquivos temporários
      try {
        await Promise.all([
          writeFile(videoPath, ""),
          writeFile(outputPath, ""),
        ])
      } catch (error) {
        console.error("Erro ao limpar arquivos temporários:", error)
      }
    })

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Erro na API:", error)
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}
