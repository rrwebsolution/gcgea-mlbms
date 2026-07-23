import * as React from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { Button } from "@/components/ui/button"
import type { ReleaseLoanInput } from "@/services/loans.service"

interface LoanReleaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultAmount?: number
  isLoading?: boolean
  onConfirm: (input: ReleaseLoanInput) => void
}

export function LoanReleaseDialog({ open, onOpenChange, defaultAmount, isLoading, onConfirm }: LoanReleaseDialogProps) {
  const [releaseReferenceNumber, setReleaseReferenceNumber] = React.useState("")
  const [releaseMethod, setReleaseMethod] = React.useState<ReleaseLoanInput["releaseMethod"] | "">("")
  const [actualReleasedAmount, setActualReleasedAmount] = React.useState<number | undefined>(defaultAmount)
  const [releaseRemarks, setReleaseRemarks] = React.useState("")
  const [touched, setTouched] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setReleaseReferenceNumber("")
      setReleaseMethod("")
      setActualReleasedAmount(defaultAmount)
      setReleaseRemarks("")
      setTouched(false)
    }
  }, [open, defaultAmount])

  const isInvalid = touched && (!releaseReferenceNumber.trim() || !releaseMethod || !actualReleasedAmount)

  function handleConfirm() {
    if (!releaseReferenceNumber.trim() || !releaseMethod || !actualReleasedAmount) {
      setTouched(true)
      return
    }
    onConfirm({
      releaseReferenceNumber: releaseReferenceNumber.trim(),
      releaseMethod,
      actualReleasedAmount,
      releaseRemarks: releaseRemarks.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Release Loan</DialogTitle>
          <DialogDescription>Record how and when this loan's proceeds were released to the member.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="release-reference">Release Reference # <span className="text-destructive">*</span></Label>
            <Input
              id="release-reference"
              value={releaseReferenceNumber}
              onChange={(e) => setReleaseReferenceNumber(e.target.value)}
              placeholder="e.g. DV-2026-000123"
              aria-invalid={isInvalid && !releaseReferenceNumber.trim()}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Release Method <span className="text-destructive">*</span></Label>
            <CommandSelect
              className="w-full"
              hideSearch
              value={releaseMethod}
              onValueChange={(v) => setReleaseMethod(v as ReleaseLoanInput["releaseMethod"])}
              options={[
                { value: "Cash", label: "Cash" },
                { value: "Bank Transfer", label: "Bank Transfer" },
                { value: "Check", label: "Check" },
                { value: "Payroll Deduction", label: "Payroll Deduction" },
              ]}
              placeholder="Select a method"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="release-amount">Actual Released Amount <span className="text-destructive">*</span></Label>
            <CurrencyInput id="release-amount" value={actualReleasedAmount} onChange={setActualReleasedAmount} aria-invalid={isInvalid && !actualReleasedAmount} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="release-remarks">Release Remarks</Label>
            <Textarea id="release-remarks" value={releaseRemarks} onChange={(e) => setReleaseRemarks(e.target.value)} rows={2} placeholder="Optional remarks…" />
          </div>
          {isInvalid && <p className="text-xs font-medium text-destructive">Reference #, method, and amount are required.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={isLoading} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={isLoading} onClick={handleConfirm}>
            {isLoading && <Loader2 className="animate-spin" />}
            Release Loan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
