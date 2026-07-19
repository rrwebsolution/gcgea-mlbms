import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { loanTypeSchema, type LoanTypeFormValues } from "@/schemas/loan-type.schema"
import type { InterestMethod, LoanType } from "@/types"

interface LoanTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loanType?: LoanType
  onSubmit: (values: LoanTypeFormValues) => Promise<void>
}

const DEFAULT_VALUES: LoanTypeFormValues = {
  name: "",
  description: "",
  minAmount: 0,
  maxAmount: 0,
  defaultInterestRate: 0,
  interestMethod: "Diminishing Balance",
  processingFee: 0,
  maxTermMonths: 12,
  requiredMembershipMonths: 0,
  requiredContributionMonths: 0,
  allowExistingActiveLoan: false,
  status: "Active",
}

export function LoanTypeFormDialog({ open, onOpenChange, loanType, onSubmit }: LoanTypeFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoanTypeFormValues>({
    resolver: zodResolver(loanTypeSchema),
    defaultValues: DEFAULT_VALUES,
  })

  React.useEffect(() => {
    if (open) {
      reset(
        loanType
          ? {
              name: loanType.name,
              description: loanType.description,
              minAmount: loanType.minAmount,
              maxAmount: loanType.maxAmount,
              defaultInterestRate: loanType.defaultInterestRate,
              interestMethod: loanType.interestMethod,
              processingFee: loanType.processingFee,
              maxTermMonths: loanType.maxTermMonths,
              requiredMembershipMonths: loanType.requiredMembershipMonths,
              requiredContributionMonths: loanType.requiredContributionMonths,
              allowExistingActiveLoan: loanType.allowExistingActiveLoan,
              status: loanType.status,
            }
          : DEFAULT_VALUES
      )
    }
  }, [open, loanType, reset])

  async function handleFormSubmit(values: LoanTypeFormValues) {
    await onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{loanType ? "Edit Loan Type" : "Add Loan Type"}</DialogTitle>
          <DialogDescription>{loanType ? "Update this loan product's configuration." : "Configure a new loan product for GCGEA members."}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="loan-type-name">
                Loan Type Name <span className="text-destructive">*</span>
              </Label>
              <Input id="loan-type-name" placeholder="e.g. Salary Loan" aria-invalid={!!errors.name} {...register("name")} />
              {errors.name && <p className="text-xs font-medium text-destructive">{errors.name.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loan-type-description">Description</Label>
            <Textarea id="loan-type-description" rows={2} placeholder="Brief description of this loan product (optional)" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="loan-type-min-amount">
                Minimum Amount <span className="text-destructive">*</span>
              </Label>
              <Input id="loan-type-min-amount" type="number" step="0.01" min={0} aria-invalid={!!errors.minAmount} {...register("minAmount", { valueAsNumber: true })} />
              {errors.minAmount && <p className="text-xs font-medium text-destructive">{errors.minAmount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loan-type-max-amount">
                Maximum Amount <span className="text-destructive">*</span>
              </Label>
              <Input id="loan-type-max-amount" type="number" step="0.01" min={0} aria-invalid={!!errors.maxAmount} {...register("maxAmount", { valueAsNumber: true })} />
              {errors.maxAmount && <p className="text-xs font-medium text-destructive">{errors.maxAmount.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="loan-type-interest-rate">
                Interest Rate (% / month) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loan-type-interest-rate"
                type="number"
                step="0.01"
                min={0}
                aria-invalid={!!errors.defaultInterestRate}
                {...register("defaultInterestRate", { valueAsNumber: true })}
              />
              {errors.defaultInterestRate && <p className="text-xs font-medium text-destructive">{errors.defaultInterestRate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loan-type-interest-method">Interest Method</Label>
              <Select value={watch("interestMethod")} onValueChange={(v) => setValue("interestMethod", v as InterestMethod)}>
                <SelectTrigger id="loan-type-interest-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Flat Interest">Flat Interest</SelectItem>
                  <SelectItem value="Diminishing Balance">Diminishing Balance</SelectItem>
                  <SelectItem value="Zero Interest">Zero Interest</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="loan-type-processing-fee">
                Processing Fee <span className="text-destructive">*</span>
              </Label>
              <Input id="loan-type-processing-fee" type="number" step="0.01" min={0} aria-invalid={!!errors.processingFee} {...register("processingFee", { valueAsNumber: true })} />
              {errors.processingFee && <p className="text-xs font-medium text-destructive">{errors.processingFee.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loan-type-max-term">
                Max Term (months) <span className="text-destructive">*</span>
              </Label>
              <Input id="loan-type-max-term" type="number" min={1} aria-invalid={!!errors.maxTermMonths} {...register("maxTermMonths", { valueAsNumber: true })} />
              {errors.maxTermMonths && <p className="text-xs font-medium text-destructive">{errors.maxTermMonths.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="loan-type-req-membership">
                Min. Membership (months) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loan-type-req-membership"
                type="number"
                min={0}
                aria-invalid={!!errors.requiredMembershipMonths}
                {...register("requiredMembershipMonths", { valueAsNumber: true })}
              />
              {errors.requiredMembershipMonths && <p className="text-xs font-medium text-destructive">{errors.requiredMembershipMonths.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loan-type-req-contribution">
                Min. Contributions (months) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loan-type-req-contribution"
                type="number"
                min={0}
                aria-invalid={!!errors.requiredContributionMonths}
                {...register("requiredContributionMonths", { valueAsNumber: true })}
              />
              {errors.requiredContributionMonths && <p className="text-xs font-medium text-destructive">{errors.requiredContributionMonths.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="loan-type-status">Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "Active" | "Inactive")}>
                <SelectTrigger id="loan-type-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 self-end pb-1.5 text-sm text-foreground">
              <Switch checked={watch("allowExistingActiveLoan")} onCheckedChange={(v) => setValue("allowExistingActiveLoan", v)} />
              Allow Existing Active Loan
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Saving…" : loanType ? "Save Changes" : "Add Loan Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
