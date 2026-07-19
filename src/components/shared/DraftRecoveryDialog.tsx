import { HardDriveDownload } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/utils/format"

interface DraftRecoveryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  savedAt?: string
  onRestore: () => void
  onDiscard: () => void
}

/** "A temporary local recovery copy has been saved." — offered when a prior save attempt couldn't reach the server. */
export function DraftRecoveryDialog({ open, onOpenChange, savedAt, onRestore, onDiscard }: DraftRecoveryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning/10 text-warning">
            <HardDriveDownload className="size-6" />
          </div>
          <DialogTitle className="text-center">Unsynced changes found</DialogTitle>
          <DialogDescription className="text-center">
            A temporary local recovery copy was saved{savedAt ? ` on ${formatDateTime(savedAt)}` : ""} because the last save couldn't reach the
            server. Restore it to continue where you left off, or discard it and keep what's currently saved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={onRestore}>
            Restore Recovered Changes
          </Button>
          <Button variant="outline" className="w-full" onClick={onDiscard}>
            Discard and Keep Saved Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
