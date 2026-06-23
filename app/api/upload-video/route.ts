import { NextRequest, NextResponse } from "next/server"
import { storeLocalUpload } from "@/lib/server/local-upload"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("video")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 })
    }

    const upload = await storeLocalUpload(file, "video")
    return NextResponse.json({ success: true, ...upload })
  } catch {
    return NextResponse.json({ error: "Erro ao salvar arquivo." }, { status: 500 })
  }
}
