import { NextRequest, NextResponse } from "next/server"
import { storeLocalUpload } from "@/lib/server/local-upload"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    const upload = await storeLocalUpload(file)
    return NextResponse.json({ success: true, ...upload })
  } catch {
    return NextResponse.json(
      { success: false, error: "Arquivo invalido ou acima do limite permitido" },
      { status: 400 }
    )
  }
}
