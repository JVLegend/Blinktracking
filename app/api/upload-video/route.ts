import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("video") as File
  if (!file) {
    return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const uploadDir = path.join(process.cwd(), "public/uploads")
  await mkdir(uploadDir, { recursive: true })
  const filePath = path.join(uploadDir, file.name)
  await writeFile(filePath, buffer)

  return NextResponse.json({ success: true, filename: file.name })
} 