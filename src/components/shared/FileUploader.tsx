import * as React from "react"
import { Download, Eye, FileText, ImageIcon, RefreshCw, Trash2, UploadCloud, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { UploadStatusBadge } from "@/components/shared/UploadStatusBadge"
import { ImagePreviewDialog } from "@/components/shared/ImagePreviewDialog"
import { PDFPreviewDialog } from "@/components/shared/PDFPreviewDialog"
import { cn } from "@/lib/utils"
import {
  formatFileSize,
  isDuplicateFile,
  isImageFile,
  isPdfFile,
  readImageDimensions,
  validateFile,
  MAX_UPLOAD_SIZE_MB,
  type UploadStatus,
} from "@/lib/upload-validation"

export interface FileUploaderProps {
  label: string
  description?: string
  required?: boolean
  disabled?: boolean
  /** MIME types (preferred) or a native `accept` string (e.g. ".csv,.xls"). Omit for no restriction. */
  accept?: string[] | string
  /** Enables strict client-side validation (size + type) and duplicate-file detection when provided. */
  acceptExtensions?: string[]
  maxSizeMB?: number
  multiple?: boolean
  preview?: boolean
  variant?: "default" | "avatar"
  className?: string

  fileName?: string
  fileUrl?: string
  fileSizeBytes?: number
  uploadedAt?: string

  status?: UploadStatus
  progress?: number

  onUpload?: (file: File) => void
  onRemove?: () => void
  onReplace?: (file: File) => void
  onCancel?: () => void
  /** @deprecated Use `onUpload`/`onRemove`. Kept for existing non-Member callers. */
  onFileSelect?: (file: File | null) => void
}

export function FileUploader({
  label,
  description,
  required,
  disabled,
  accept,
  acceptExtensions,
  maxSizeMB = MAX_UPLOAD_SIZE_MB,
  multiple,
  preview = true,
  variant = "default",
  className,
  fileName,
  fileUrl,
  fileSizeBytes,
  uploadedAt,
  status = "idle",
  progress = 0,
  onUpload,
  onRemove,
  onReplace,
  onCancel,
  onFileSelect,
}: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const [localFile, setLocalFile] = React.useState<File | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = React.useState<string | null>(null)
  const [localDimensions, setLocalDimensions] = React.useState<{ width: number; height: number } | null>(null)
  const [previewOpen, setPreviewOpen] = React.useState(false)

  // Strict validation/duplicate-guard only applies when a caller opts in via `acceptExtensions`
  // (all Member Registration/Edit usages do). Other pages keep their original permissive behavior.
  const strict = Boolean(acceptExtensions && acceptExtensions.length)
  const mimeTypes = Array.isArray(accept) ? accept : accept ? accept.split(",").map((s) => s.trim()) : []
  const effectiveOnRemove = onRemove ?? (onFileSelect ? () => onFileSelect(null) : undefined)

  React.useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPreviewUrl])

  const displayName = localFile?.name ?? fileName
  const displayUrl = localPreviewUrl ?? fileUrl
  const displaySize = localFile?.size ?? fileSizeBytes
  const displayDimensions = localDimensions
  const hasFile = Boolean(displayName)
  const isUploading = status === "uploading"
  const isImage = displayName ? isImageFile(displayName) : false
  const isPdf = displayName ? isPdfFile(displayName) : false

  function processFile(file: File, replace: boolean) {
    setValidationError(null)

    if (strict) {
      if (isDuplicateFile(file, hasFile ? { name: displayName!, sizeBytes: displaySize } : null)) {
        setValidationError("This file has already been uploaded.")
        return
      }

      const result = validateFile(file, { mimeTypes, extensions: acceptExtensions!, maxSizeMB })
      if (!result.valid) {
        setValidationError(result.error!)
        return
      }
    }

    setLocalFile(file)
    const url = URL.createObjectURL(file)
    setLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })

    if (file.type.startsWith("image/")) {
      readImageDimensions(file).then(setLocalDimensions)
    } else {
      setLocalDimensions(null)
    }

    if (replace && onReplace) onReplace(file)
    else if (onUpload) onUpload(file)
    onFileSelect?.(file)
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const list = multiple ? Array.from(files) : [files[0]]
    list.forEach((file) => processFile(file, hasFile))
  }

  function openBrowse() {
    if (disabled) return
    inputRef.current?.click()
  }

  const acceptAttr = mimeTypes.length ? mimeTypes.join(",") : undefined
  const acceptHint = strict ? `${acceptExtensions!.join(", ")} · Max ${maxSizeMB} MB` : undefined

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={acceptAttr}
      multiple={multiple}
      disabled={disabled}
      className="hidden"
      onChange={(e) => {
        handleFiles(e.target.files)
        e.target.value = ""
      }}
    />
  )

  const previewDialog =
    preview && hasFile && displayUrl ? (
      isImage ? (
        <ImagePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} images={[{ url: displayUrl, name: displayName! }]} />
      ) : isPdf ? (
        <PDFPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={displayUrl} name={displayName!} />
      ) : null
    ) : null

  if (variant === "avatar") {
    return (
      <div className={cn("space-y-1.5", className)}>
        <p className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled) setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            if (!disabled) handleFiles(e.dataTransfer.files)
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-lg border border-dashed p-5 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30",
            validationError && "border-destructive bg-destructive/5"
          )}
        >
          <button
            type="button"
            onClick={() => (hasFile && preview ? setPreviewOpen(true) : openBrowse())}
            className="relative shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar size="lg" className="size-24">
              {displayUrl && <AvatarImage src={displayUrl} alt={displayName ?? "Profile photo"} />}
              <AvatarFallback>
                <ImageIcon className="size-8 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="flex w-full min-w-0 flex-col items-center gap-2">
            {hasFile ? (
              <>
                <p className="max-w-full truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {displaySize !== undefined && formatFileSize(displaySize)}
                  {displayDimensions && ` · ${displayDimensions.width} × ${displayDimensions.height}px`}
                </p>
                {(isUploading || status === "uploaded") && (
                  <UploadProgress status={status} progress={progress} />
                )}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {isUploading ? (
                    <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                      <X /> Cancel
                    </Button>
                  ) : (
                    <>
                      <Button type="button" variant="outline" size="sm" onClick={openBrowse} disabled={disabled}>
                        <RefreshCw /> Replace Photo
                      </Button>
                      {effectiveOnRemove && (
                        <Button type="button" variant="destructive" size="sm" onClick={effectiveOnRemove} disabled={disabled}>
                          <Trash2 /> Remove Photo
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Drag and drop a photo, or</p>
                <Button type="button" variant="outline" size="sm" onClick={openBrowse} disabled={disabled}>
                  <UploadCloud /> Browse Photo
                </Button>
                {acceptHint && <p className="text-xs text-muted-foreground">{acceptHint}</p>}
              </>
            )}
          </div>
          {hiddenInput}
        </div>
        {validationError && <p className="text-xs font-medium text-destructive">{validationError}</p>}
        {previewDialog}
      </div>
    )
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (!disabled) handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30",
          hasFile && status !== "failed" && !validationError && "border-success/40 bg-success/5",
          (validationError || status === "rejected" || status === "failed") && "border-destructive bg-destructive/5"
        )}
      >
        {hasFile ? (
          <div className="w-full space-y-2 text-left">
            <div className="flex items-start gap-3">
              {isImage && displayUrl ? (
                <button type="button" onClick={() => preview && setPreviewOpen(true)} className="shrink-0">
                  <img src={displayUrl} alt={displayName} className="size-12 rounded-md border border-border object-cover" />
                </button>
              ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {displaySize !== undefined && formatFileSize(displaySize)}
                  {displayDimensions && ` · ${displayDimensions.width} × ${displayDimensions.height}px`}
                  {uploadedAt && !localFile && ` · ${uploadedAt}`}
                </p>
                <div className="mt-1">
                  <UploadStatusBadge status={status} />
                </div>
              </div>
            </div>

            {(isUploading || status === "uploaded") && <UploadProgress status={status} progress={progress} />}

            <div className="flex flex-wrap justify-end gap-1.5 pt-1">
              {isUploading ? (
                <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                  <X /> Cancel Upload
                </Button>
              ) : (
                <>
                  {preview && (isImage || isPdf) && displayUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
                      <Eye /> Preview
                    </Button>
                  )}
                  {displayUrl && !localFile && (
                    <Button type="button" variant="ghost" size="sm" render={<a href={displayUrl} download={displayName} />}>
                      <Download /> Download
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={openBrowse} disabled={disabled}>
                    <RefreshCw /> Replace
                  </Button>
                  {effectiveOnRemove && (
                    <Button type="button" variant="destructive" size="sm" onClick={effectiveOnRemove} disabled={disabled}>
                      <Trash2 /> Remove
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <UploadCloud className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag and drop a file, or</p>
            <Button type="button" variant="outline" size="sm" onClick={openBrowse} disabled={disabled}>
              Browse File
            </Button>
            {acceptHint && <p className="text-xs text-muted-foreground">{acceptHint}</p>}
          </>
        )}
        {hiddenInput}
      </div>
      {validationError && <p className="text-xs font-medium text-destructive">{validationError}</p>}
      {previewDialog}
    </div>
  )
}

function UploadProgress({ status, progress }: { status: UploadStatus; progress: number }) {
  return (
    <div className="space-y-1 transition-all duration-300">
      {status === "uploaded" ? (
        <p className="text-xs font-medium text-success">Upload Complete</p>
      ) : (
        <Progress value={progress} className="gap-1.5">
          <ProgressLabel className="text-xs font-normal text-muted-foreground">Uploading…</ProgressLabel>
          <ProgressValue className="text-xs text-muted-foreground tabular-nums" />
        </Progress>
      )}
    </div>
  )
}
