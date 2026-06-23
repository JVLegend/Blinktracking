import { NextResponse } from "next/server"
import { listLocalUploads } from "@/lib/server/local-upload"

export const runtime = "nodejs"

export async function GET() {
  try {
    const files = await listLocalUploads()
    const videoFiles = files.filter((file) => file.category === "video").map((file) => file.filename)
    return NextResponse.json({ videos: videoFiles })
  } catch {
    return NextResponse.json({ videos: [] })
  }
}
