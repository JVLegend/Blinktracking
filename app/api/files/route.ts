import { NextResponse } from "next/server"
import { listLocalUploads } from "@/lib/server/local-upload"

export async function GET() {
  try {
    const files = await listLocalUploads()
    const videoFiles = files.filter((file) => file.category === "video")
    const csvFiles = files.filter((file) => file.category === "csv")

    return NextResponse.json({
      success: true,
      files: {
        videos: videoFiles.map(({ url, filename, size, uploadedAt }) => ({ url, filename, size, uploadedAt })),
        csvs: csvFiles.map(({ url, filename, size, uploadedAt }) => ({ url, filename, size, uploadedAt })),
      },
      total: files.length,
    })

  } catch (error) {
    return NextResponse.json({
      error: "Erro ao buscar arquivos"
    }, { status: 500 })
  }
}
