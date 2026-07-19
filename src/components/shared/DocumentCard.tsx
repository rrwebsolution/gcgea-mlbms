import * as React from "react"
import { Download, Eye, FileText, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UploadStatusBadge } from "@/components/shared/UploadStatusBadge"
import { ImagePreviewDialog } from "@/components/shared/ImagePreviewDialog"
import { PDFPreviewDialog } from "@/components/shared/PDFPreviewDialog"
import { isDuplicateFile, isImageFile, isPdfFile, validateFile, DOCUMENT_EXTENSIONS, DOCUMENT_MIME_TYPES, MAX_UPLOAD_SIZE_MB, type UploadStatus } from "@/lib/upload-validation"
import { cn } from "@/lib/utils"

interface DocumentCardProps {
  title: string
  fileName: string
  fileUrl: string
  fileSize?: string
  uploadedAt?: string
  uploadedBy?: string
  status?: UploadStatus
  onReplace?: (file: File) => void
  onRemove?: () => void
  className?: string
}

export function DocumentCard({
  title,
  fileName,
  fileUrl,
  fileSize,
  uploadedAt,
  uploadedBy,
  status = "uploaded",
  onReplace,
  onRemove,
  className,
}: DocumentCardProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const isImage = isImageFile(fileName)
  const isPdf = isPdfFile(fileName)

  function handleReplaceFile(files: FileList | null) {
    const file = files?.[0]
    if (!file || !onReplace) return
    setError(null)

    if (isDuplicateFile(file, { name: fileName })) {
      setError("This file has already been uploaded.")
      return
    }
    const result = validateFile(file, { mimeTypes: DOCUMENT_MIME_TYPES, extensions: DOCUMENT_EXTENSIONS, maxSizeMB: MAX_UPLOAD_SIZE_MB })
    if (!result.valid) {
      setError(result.error!)
      return
    }
    onReplace(file)
  }

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border border-border bg-card p-3", className)}>
      {isImage ? (
        <button type="button" onClick={() => setPreviewOpen(true)} className="shrink-0">
          <img src={fileUrl} alt={fileName} className="size-11 rounded-lg border border-border object-cover" />
        </button>
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
        <p className="text-xs text-muted-foreground">
          {[fileSize, uploadedAt && `Uploaded ${uploadedAt}`, uploadedBy].filter(Boolean).join(" · ")}
        </p>
        <UploadStatusBadge status={status} />
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(isImage || isPdf) && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye /> Preview
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" render={<a href={fileUrl} download={fileName} />}>
            <Download /> Download
          </Button>
          {onReplace && (
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <RefreshCw /> Replace
            </Button>
          )}
          {onRemove && (
            <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
              <Trash2 /> Remove
            </Button>
          )}
        </div>
      </div>

      {onReplace && (
        <input
          ref={inputRef}
          type="file"
          accept={DOCUMENT_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            handleReplaceFile(e.target.files)
            e.target.value = ""
          }}
        />
      )}

      {isImage && <ImagePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} images={[{ url: fileUrl, name: fileName }]} />}
      {isPdf && <PDFPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={fileUrl} name={fileName} />}
    </div>
  )
}
