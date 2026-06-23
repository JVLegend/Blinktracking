import { randomUUID } from "crypto"
import { mkdir, open, readdir, stat, unlink } from "fs/promises"
import path from "path"

const UPLOAD_DIR = path.join(process.cwd(), "public/uploads")
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024
const MAX_CSV_SIZE_BYTES = 25 * 1024 * 1024

const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"])
const CSV_TYPES = new Set(["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"])
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".avi"])
const CSV_EXTENSIONS = new Set([".csv"])

export type StoredFileCategory = "video" | "csv"

export interface StoredUpload {
  filename: string
  originalFilename: string
  url: string
  size: number
  type: string
  uploadedAt: string
  category: StoredFileCategory
}

function getCategory(file: File, extension: string): StoredFileCategory {
  const type = file.type.toLowerCase()
  if (VIDEO_EXTENSIONS.has(extension) && VIDEO_TYPES.has(type)) {
    return "video"
  }
  if (CSV_EXTENSIONS.has(extension) && (!type || CSV_TYPES.has(type))) {
    return "csv"
  }

  throw new Error("unsupported file type")
}

async function writeFileStream(file: File, filePath: string, maxBytes: number) {
  const handle = await open(filePath, "wx")
  const reader = file.stream().getReader()
  let totalBytes = 0
  let completed = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        completed = true
        break
      }

      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        throw new Error("upload limit exceeded")
      }

      await handle.write(value)
    }
  } finally {
    await reader.cancel().catch(() => undefined)
    await handle.close()
    if (!completed) {
      await unlink(filePath).catch(() => undefined)
    }
  }
}

export async function storeLocalUpload(file: File, expectedCategory?: StoredFileCategory): Promise<StoredUpload> {
  if (file.size <= 0) {
    throw new Error("empty file")
  }

  const originalFilename = path.basename(path.win32.basename(file.name || ""))
  const extension = path.extname(originalFilename).toLowerCase()
  if (!originalFilename || originalFilename !== file.name || /[\0\r\n]/.test(originalFilename)) {
    throw new Error("invalid filename")
  }

  const category = getCategory(file, extension)
  if (expectedCategory && category !== expectedCategory) {
    throw new Error("unexpected file type")
  }

  const maxBytes = category === "video" ? MAX_VIDEO_SIZE_BYTES : MAX_CSV_SIZE_BYTES
  if (file.size > maxBytes) {
    throw new Error("file too large")
  }

  await mkdir(UPLOAD_DIR, { recursive: true })
  const filename = `${randomUUID()}${extension}`
  const filePath = path.join(UPLOAD_DIR, filename)
  await writeFileStream(file, filePath, maxBytes)

  return {
    filename,
    originalFilename,
    url: `/uploads/${filename}`,
    size: file.size,
    type: file.type || (category === "csv" ? "text/csv" : "application/octet-stream"),
    uploadedAt: new Date().toISOString(),
    category,
  }
}

export async function listLocalUploads() {
  await mkdir(UPLOAD_DIR, { recursive: true })
  const names = await readdir(UPLOAD_DIR)
  const files = await Promise.all(
    names.map(async (name) => {
      const extension = path.extname(name).toLowerCase()
      if (!VIDEO_EXTENSIONS.has(extension) && !CSV_EXTENSIONS.has(extension)) {
        return null
      }

      const fileStat = await stat(path.join(UPLOAD_DIR, name))
      if (!fileStat.isFile()) {
        return null
      }

      return {
        url: `/uploads/${name}`,
        filename: name,
        size: fileStat.size,
        uploadedAt: fileStat.mtime.toISOString(),
        category: VIDEO_EXTENSIONS.has(extension) ? "video" as const : "csv" as const,
      }
    })
  )

  return files.filter((file): file is NonNullable<typeof file> => file !== null)
}
