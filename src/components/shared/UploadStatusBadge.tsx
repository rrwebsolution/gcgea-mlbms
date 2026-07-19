import { CheckCircle2, Loader2, OctagonX, TriangleAlert, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { UploadStatus } from "@/lib/upload-validation"

const STATUS_CONFIG: Record<UploadStatus, { label: string; className: string; icon: React.ComponentType<{ className?: string }> } | null> = {
  idle: null,
  uploading: { label: "Uploading", className: "bg-primary/10 text-primary", icon: Loader2 },
  uploaded: { label: "Uploaded", className: "bg-success/10 text-success", icon: CheckCircle2 },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive", icon: XCircle },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground", icon: OctagonX },
  rejected: { label: "Rejected", className: "bg-warning/10 text-warning", icon: TriangleAlert },
}

export function UploadStatusBadge({ status, className }: { status: UploadStatus; className?: string }) {
  const config = STATUS_CONFIG[status]
  if (!config) return null
  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn("border-transparent", config.className, className)}>
      <Icon className={cn("size-3", status === "uploading" && "animate-spin")} />
      {config.label}
    </Badge>
  )
}
