import * as React from "react"
import { CheckCircle2, FileUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileUploaderProps {
  label: string
  description?: string
  fileName?: string
  onFileSelect: (file: File | null) => void
  accept?: string
  required?: boolean
}

export function FileUploader({ label, description, fileName, onFileSelect, accept, required }: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  function handleFiles(files: FileList | null) {
    if (files && files[0]) onFileSelect(files[0])
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30",
          fileName && "border-success/40 bg-success/5"
        )}
      >
        {fileName ? (
          <>
            <CheckCircle2 className="size-6 text-success" />
            <p className="max-w-full truncate text-sm font-medium text-foreground">{fileName}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => onFileSelect(null)}>
              <X />
              Remove file
            </Button>
          </>
        ) : (
          <>
            <FileUp className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag and drop a file, or</p>
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Browse File
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  )
}
