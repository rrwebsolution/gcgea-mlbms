import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface UnsavedChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaveAndLeave: () => void
  onLeaveWithoutSaving: () => void
  isSaving?: boolean
}

/** "You have unsaved changes." — Save Draft and Leave / Leave Without Saving / Continue Editing. */
export function UnsavedChangesDialog({ open, onOpenChange, onSaveAndLeave, onLeaveWithoutSaving, isSaving }: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have unsaved changes.</AlertDialogTitle>
          <AlertDialogDescription>Save your progress as a draft before leaving, or discard these changes.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction className="w-full" disabled={isSaving} onClick={onSaveAndLeave}>
            {isSaving && <Loader2 className="animate-spin" />}
            Save Draft and Leave
          </AlertDialogAction>
          <Button variant="destructive" className="w-full" disabled={isSaving} onClick={onLeaveWithoutSaving}>
            Leave Without Saving
          </Button>
          <AlertDialogCancel className="w-full" disabled={isSaving}>
            Continue Editing
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
