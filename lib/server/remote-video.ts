import { REMOTE_VIDEO_ALLOWED_HOSTS, REMOTE_VIDEO_MAX_BYTES } from '@/lib/config'

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
])

const DEFAULT_TIMEOUT_MS = 30_000

export class RemoteVideoError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'RemoteVideoError'
    this.status = status
  }
}

export function validateRemoteVideoUrl(videoUrl: string): URL {
  let parsed: URL

  try {
    parsed = new URL(videoUrl)
  } catch {
    throw new RemoteVideoError('URL do video invalida')
  }

  if (parsed.protocol !== 'https:') {
    throw new RemoteVideoError('URL do video nao permitida')
  }

  const host = parsed.hostname.toLowerCase()
  if (!REMOTE_VIDEO_ALLOWED_HOSTS.includes(host)) {
    throw new RemoteVideoError('Origem do video nao permitida')
  }

  if (parsed.username || parsed.password) {
    throw new RemoteVideoError('URL do video nao permitida')
  }

  return parsed
}

function validateResponseHeaders(headers: Headers) {
  const contentType = headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
  if (!contentType || !ALLOWED_VIDEO_TYPES.has(contentType)) {
    throw new RemoteVideoError('Tipo de video remoto nao permitido', 415)
  }

  const contentLength = headers.get('content-length')
  if (contentLength) {
    const size = Number(contentLength)
    if (!Number.isFinite(size) || size <= 0 || size > REMOTE_VIDEO_MAX_BYTES) {
      throw new RemoteVideoError('Video remoto excede o limite permitido', 413)
    }
  }
}

async function bestEffortHead(url: URL, timeoutMs: number) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (response.ok) {
      validateResponseHeaders(response.headers)
    }
  } catch (error) {
    if (error instanceof RemoteVideoError) {
      throw error
    }
  }
}

export async function fetchRemoteVideoBlob(videoUrl: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Blob> {
  const parsedUrl = validateRemoteVideoUrl(videoUrl)
  await bestEffortHead(parsedUrl, timeoutMs)

  const response = await fetch(parsedUrl, {
    method: 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    throw new RemoteVideoError('Erro ao baixar video remoto', 502)
  }

  validateResponseHeaders(response.headers)

  if (!response.body) {
    throw new RemoteVideoError('Resposta remota invalida', 502)
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    totalBytes += value.byteLength
    if (totalBytes > REMOTE_VIDEO_MAX_BYTES) {
      await reader.cancel()
      throw new RemoteVideoError('Video remoto excede o limite permitido', 413)
    }

    chunks.push(value)
  }

  if (totalBytes === 0) {
    throw new RemoteVideoError('Video remoto vazio')
  }

  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || 'video/mp4'
  return new Blob(chunks, { type: contentType })
}
