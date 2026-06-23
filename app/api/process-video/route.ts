import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Processamento local de vídeo não está implementado neste endpoint.",
    },
    { status: 501 }
  )
}
