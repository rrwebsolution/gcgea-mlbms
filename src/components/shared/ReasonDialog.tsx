import * as React from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  reasonLabel?: string
  reasonPlaceholder?: string
  confirmLabel?: string
  /** Label shown in place of `confirmLabel` while `isLoading` (e.g. "Rolling Back…"). Defaults to `confirmLabel` unchanged. */
  confirmingLabel?: string
  destructive?: boolean
  isLoading?: boolean
  onConfirm: (reason: string) => void
}

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  reasonLabel = "Reason",
  reasonPlaceholder = "Provide a reason for this action…",
  confirmLabel = "Confirm",
  confirmingLabel,
  destructive,
  isLoading,
  onConfirm,
}: ReasonDialogProps) {
  const [reason, setReason] = React.useState("")
  const [touched, setTouched] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setReason("")
      setTouched(false)
    }
  }, [open])

  const isInvalid = touched && reason.trim().length === 0

  function handleConfirm() {
    if (reason.trim().length === 0) {
      setTouched(true)
      return
    }
    onConfirm(reason.trim())
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <div className="grid gap-1.5 text-left">
          <Label htmlFor="reason-dialog-textarea">
            {reasonLabel} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reason-dialog-textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            rows={3}
            aria-invalid={isInvalid}
          />
          {isInvalid && <p className="text-xs font-medium text-destructive">This field is required.</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "default"} disabled={isLoading} onClick={handleConfirm}>
            {isLoading && <Loader2 className="animate-spin" aria-hidden="true" />}
            {isLoading && confirmingLabel ? confirmingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
