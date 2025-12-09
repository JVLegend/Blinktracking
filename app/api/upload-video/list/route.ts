import { NextRequest, NextResponse } from "next/server"
import { readdir } from "fs/promises"
import path from "path"

export const runtime = "nodejs"

export async function GET() {
  const uploadDir = path.join(process.cwd(), "public/uploads")
  try {
    const files = await readdir(uploadDir)
    // Filtrar apenas arquivos de vídeo comuns
    const videoFiles = files.filter(f => f.match(/\.(mp4|avi|mov|mkv)$/i))
    return NextResponse.json({ videos: videoFiles })
  } catch (err) {
    return NextResponse.json({ videos: [] })
  }
} 