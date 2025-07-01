import { NextRequest } from "next/server"
import { spawn } from "child_process"
import { writeFile, mkdir, readFile } from "fs/promises"
import path from "path"
import { existsSync } from "fs"
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData()
    const video = formData.get("video") as File
    const frame = formData.get("frame") as string

    if (!video || !frame) {
      return NextResponse.json(
        { error: "Vídeo ou número do frame não fornecido" },
        { status: 400 }
      )
    }

    // Criar diretório temporário se não existir
    const tempDir = path.join(process.cwd(), "temp")
    await mkdir(tempDir, { recursive: true })

    // Salvar o vídeo temporariamente
    const videoBuffer = Buffer.from(await video.arrayBuffer())
    const videoPath = path.join(tempDir, `input_${Date.now()}.mp4`)
    await writeFile(videoPath, videoBuffer)

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn("python", [
        "scripts/extract_frame.py",
        videoPath,
        frame
      ], {
        env: { ...process.env, PYTHONIOENCODING: "utf-8" }
      })

      const chunks: Buffer[] = []

      pythonProcess.stdout.on("data", (data) => {
        chunks.push(Buffer.from(data))
      })

      pythonProcess.stderr.on("data", (data) => {
        console.error(`Python Error: ${data.toString()}`)
      })

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          resolve(NextResponse.json(
            { error: "Erro ao extrair frame" },
            { status: 500 }
          ))
          return
        }

        const buffer = Buffer.concat(chunks)
        resolve(new Response(buffer, {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "no-cache"
          }
        }))
      })

      pythonProcess.on("error", (error) => {
        reject(error)
      })
    })
  } catch (error) {
    console.error("Erro:", error)
    return NextResponse.json(
      { error: "Erro ao processar requisição" },
      { status: 500 }
    )
  }
} 