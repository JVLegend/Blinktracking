import path from "path"

export class RequestValidationError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "RequestValidationError"
    this.status = status
  }
}

export function requireAllowedMethod(method: string, allowed: readonly string[]) {
  if (!allowed.includes(method)) {
    throw new RequestValidationError("Metodo de processamento invalido")
  }

  return method
}

export function sanitizeUploadFilename(filename: string) {
  const safeFilename = path.basename(path.win32.basename(filename || ""))
  if (!safeFilename || safeFilename !== filename || /[\0\r\n]/.test(safeFilename)) {
    throw new RequestValidationError("Nome de arquivo invalido")
  }

  return safeFilename
}

export function requireFrameNumber(frame: string) {
  if (!/^\d+$/.test(frame)) {
    throw new RequestValidationError("Numero de frame invalido")
  }

  const value = Number(frame)
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) {
    throw new RequestValidationError("Numero de frame fora do limite permitido")
  }

  return String(value)
}
