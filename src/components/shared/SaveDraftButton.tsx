import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DraftSaveStatus } from "@/hooks/useDraft"

interface SaveDraftButtonProps {
  status: DraftSaveStatus
  lastSavedAt?: Date | null
  onClick: () => void
  label?: string
  disabled?: boolean
  className?: string
}

function formatSavedAt(date: Date): string {
  return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }).format(date)
}

/** Save as Draft / Update Draft button with Saving…/Draft saved/Failed to save draft states. */
export function SaveDraftButton({ status, lastSavedAt, onClick, label = "Save as Draft", disabled, className }: SaveDraftButtonProps) {
  const isSaving = status === "saving"

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <Button type="button" variant="secondary" onClick={onClick} disabled={disabled || isSaving} aria-busy={isSaving}>
        {isSaving ? <Loader2 className="animate-spin" /> : status === "error" ? <AlertTriangle /> : <Save />}
        {isSaving ? "Saving draft…" : status === "error" ? "Failed to save draft" : label}
      </Button>
      {status === "saved" && lastSavedAt && (
        <span className="flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="size-3" /> Draft saved · Last saved at {formatSavedAt(lastSavedAt)}
        </span>
      )}
      {status === "error" && <span className="text-xs text-destructive">Retry saving — your changes are still on this page.</span>}
      {status !== "saved" && status !== "error" && lastSavedAt && (
        <span className="text-xs text-muted-foreground">Last saved at {formatSavedAt(lastSavedAt)}</span>
      )}
    </div>
  )
}
