import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export const runtime = "nodejs"

const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
])
const ALLOWED_VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".avi"])

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("video") as File
  if (!file) {
    return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 })
  }

  if (file.size <= 0 || file.size > MAX_VIDEO_SIZE_BYTES) {
    return NextResponse.json({ error: "Tamanho de arquivo inválido." }, { status: 400 })
  }

  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Tipo de arquivo não permitido." }, { status: 400 })
  }

  const safeFilename = path.basename(path.win32.basename(file.name))
  const extension = path.extname(safeFilename).toLowerCase()
  if (!safeFilename || safeFilename !== file.name || !ALLOWED_VIDEO_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: "Nome ou extensão de arquivo inválido." }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const uploadDir = path.join(process.cwd(), "public/uploads")
  await mkdir(uploadDir, { recursive: true })
  const filePath = path.join(uploadDir, safeFilename)
  await writeFile(filePath, buffer)

  return NextResponse.json({ success: true, filename: safeFilename })
}
