import { ReasonDialog } from "@/components/shared/ReasonDialog"

interface DeleteOrArchiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recordLabel: string
  mode: "archive" | "restore"
  isLoading?: boolean
  onConfirm: (reason: string) => void
}

export function DeleteOrArchiveDialog({ open, onOpenChange, recordLabel, mode, isLoading, onConfirm }: DeleteOrArchiveDialogProps) {
  if (mode === "restore") {
    return (
      <ReasonDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Restore ${recordLabel}?`}
        description="This record will be moved back to the active list and will become visible in standard searches and reports."
        reasonLabel="Restoration Remarks"
        reasonPlaceholder="Explain why this record is being restored…"
        confirmLabel="Restore Record"
        isLoading={isLoading}
        onConfirm={onConfirm}
      />
    )
  }

  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Archive ${recordLabel}?`}
      description="Archived records are hidden from standard views but are never permanently deleted. Financial history tied to this record remains intact and can be restored anytime."
      reasonLabel="Archive Reason"
      reasonPlaceholder="e.g. Separated from service, retired, deceased…"
      confirmLabel="Archive Record"
      destructive
      isLoading={isLoading}
      onConfirm={onConfirm}
    />
  )
}
