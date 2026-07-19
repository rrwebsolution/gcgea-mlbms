export const MAX_UPLOAD_SIZE_MB = 10
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
export const IMAGE_EXTENSIONS = ["JPG", "JPEG", "PNG", "WEBP"]

export const DOCUMENT_MIME_TYPES = ["application/pdf", ...IMAGE_MIME_TYPES]
export const DOCUMENT_EXTENSIONS = ["PDF", ...IMAGE_EXTENSIONS]

export type UploadStatus = "idle" | "uploading" | "uploaded" | "failed" | "cancelled" | "rejected"

export interface FileValidationResult {
  valid: boolean
  error?: string
}

function extensionOf(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".")
  return dotIndex === -1 ? "" : fileName.slice(dotIndex + 1).toLowerCase()
}

function matchesAccept(file: File, mimeTypes: string[]): boolean {
  if (mimeTypes.includes(file.type)) return true
  // Some browsers/OSes don't populate `file.type` reliably — fall back to extension.
  const ext = extensionOf(file.name)
  return mimeTypes.some((mime) => mime.endsWith(`/${ext}`) || (ext === "jpg" && mime === "image/jpeg"))
}

export function validateFile(
  file: File,
  options: { mimeTypes: string[]; extensions: string[]; maxSizeMB?: number; sizeErrorMessage?: string }
): FileValidationResult {
  const maxBytes = (options.maxSizeMB ?? MAX_UPLOAD_SIZE_MB) * 1024 * 1024
  if (file.size > maxBytes) {
    return { valid: false, error: options.sizeErrorMessage ?? `File must not exceed ${options.maxSizeMB ?? MAX_UPLOAD_SIZE_MB} MB.` }
  }
  if (!matchesAccept(file, options.mimeTypes)) {
    return { valid: false, error: `Unsupported file type. Accepted formats: ${options.extensions.join(", ")}.` }
  }
  return { valid: true }
}

export function isDuplicateFile(file: File, existing?: { name: string; sizeBytes?: number } | null): boolean {
  if (!existing) return false
  return existing.name === file.name && (existing.sizeBytes === undefined || existing.sizeBytes === file.size)
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

export function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(null)
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      resolve(null)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

export function isImageFile(fileNameOrType: string): boolean {
  const lower = fileNameOrType.toLowerCase()
  return IMAGE_MIME_TYPES.some((m) => lower === m) || ["jpg", "jpeg", "png", "webp"].some((ext) => lower.endsWith(`.${ext}`))
}

export function isPdfFile(fileNameOrType: string): boolean {
  const lower = fileNameOrType.toLowerCase()
  return lower === "application/pdf" || lower.endsWith(".pdf")
}
