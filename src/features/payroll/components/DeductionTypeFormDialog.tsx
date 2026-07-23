import * as React from "react"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import type { DeductionType } from "@/types"

export interface DeductionTypeFormValues {
  name: string
  code: string
  description: string
  defaultAmount: number
  isActive: boolean
  sortOrder: number
}

interface DeductionTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deductionType?: DeductionType
  onSubmit: (values: DeductionTypeFormValues) => Promise<void>
}

const DEFAULT_VALUES: DeductionTypeFormValues = { name: "", code: "", description: "", defaultAmount: 200, isActive: true, sortOrder: 0 }

export function DeductionTypeFormDialog({ open, onOpenChange, deductionType, onSubmit }: DeductionTypeFormDialogProps) {
  const [values, setValues] = React.useState<DeductionTypeFormValues>(DEFAULT_VALUES)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setValues(
        deductionType
          ? {
              name: deductionType.name,
              code: deductionType.code,
              description: deductionType.description ?? "",
              defaultAmount: deductionType.defaultAmount,
              isActive: deductionType.isActive,
              sortOrder: deductionType.sortOrder,
            }
          : DEFAULT_VALUES
      )
    }
  }, [open, deductionType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.name.trim() || !values.code.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit(values)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{deductionType ? "Edit Deduction Type" : "Add Deduction Type"}</DialogTitle>
          <DialogDescription>
            {deductionType
              ? "Update this deduction category's name and settings."
              : "Configure a new payroll deduction category (e.g. Pabaon)."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="deduction-type-default-amount">Default Amount</Label>
            <CurrencyInput
              id="deduction-type-default-amount"
              value={values.defaultAmount}
              onChange={(amount) => setValues((v) => ({ ...v, defaultAmount: amount ?? 0 }))}
            />
            <p className="text-xs text-muted-foreground">Pre-filled when this deduction is used. Cash Pabaon defaults to ₱200.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deduction-type-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="deduction-type-name"
              placeholder="e.g. Pabaon"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deduction-type-code">
              Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="deduction-type-code"
              placeholder="e.g. pabaon"
              value={values.code}
              onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
              required
            />
            <p className="text-xs text-muted-foreground">A stable machine key — used to detect this column in uploaded payroll files.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deduction-type-description">Description</Label>
            <Textarea
              id="deduction-type-description"
              rows={2}
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? "Saving…" : deductionType ? "Save Changes" : "Add Deduction Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
