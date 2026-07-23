import * as React from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { 
  Loader2, 
  Plus, 
  Trash2, 
  FileText, 
  Coins, 
  ShieldCheck, 
  TrendingUp,
  AlertCircle 
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CommandSelect } from "@/components/shared/CommandSelect"
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
  serviceChargePercent: null,
  incomeBrackets: [],
  maxTermMonths: 12,
  requiredMembershipMonths: 0,
  requiredContributionMonths: 0,
  allowExistingActiveLoan: false,
  status: "Active",
}

export function LoanTypeFormDialog({ open, onOpenChange, loanType, onSubmit }: LoanTypeFormDialogProps) {
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoanTypeFormValues>({
    resolver: zodResolver(loanTypeSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const bracketsArray = useFieldArray({ control, name: "incomeBrackets" })
  const isIncomeTiered = watch("incomeBrackets").length > 0

  React.useEffect(() => {
    if (open) {
      setSubmitError(null)
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
              serviceChargePercent: loanType.serviceChargePercent ?? null,
              incomeBrackets: loanType.incomeBrackets.map((b) => ({ 
                minNetPay: b.minNetPay, 
                maxNetPay: b.maxNetPay, 
                loanableAmount: b.loanableAmount 
              })),
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

  function toggleIncomeTiered(enabled: boolean) {
    if (enabled && bracketsArray.fields.length === 0) {
      bracketsArray.append({ minNetPay: 0, maxNetPay: null, loanableAmount: 0 })
    } else if (!enabled) {
      setValue("incomeBrackets", [])
    }
  }

  async function handleFormSubmit(values: LoanTypeFormValues) {
    setSubmitError(null)
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save the loan type.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6 gap-0">
        <DialogHeader className="pb-4 border-b border-border/50">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {loanType ? "Edit Loan Type" : "Add Loan Type"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {loanType 
              ? "Refine rules, thresholds, and limits for this loan product configuration." 
              : "Set up details, restrictions, and financial configurations for a new loan type."}
          </DialogDescription>
        </DialogHeader>

        <form 
          className="flex-1 overflow-y-auto py-5 pr-1.5 space-y-6 scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/15 [&::-webkit-scrollbar-thumb]:rounded-full" 
          onSubmit={handleSubmit(handleFormSubmit)} 
          noValidate
        >
          {/* Section: Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-border/30">
              <FileText className="size-4 text-primary" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Basic Information</h4>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="loan-type-name" className="text-xs font-medium">
                Loan Type Name <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="loan-type-name" 
                placeholder="e.g. Salary Loan" 
                className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                aria-invalid={!!errors.name} 
                {...register("name")} 
              />
              {errors.name && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive mt-1">
                  <AlertCircle className="size-3" /> {errors.name.message}
                </p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="loan-type-description" className="text-xs font-medium">Description</Label>
              <Textarea 
                id="loan-type-description" 
                rows={2} 
                placeholder="Brief description of this loan product's objective or utility..." 
                className="resize-none"
                {...register("description")} 
              />
            </div>
          </div>

          {/* Section: Financial & Terms */}
          <div className="space-y-4 rounded-xl border border-border/50 bg-muted/5 p-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-border/30">
              <Coins className="size-4 text-primary" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Financial Terms &amp; Rates</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loan-type-min-amount" className="text-xs font-medium">
                  Minimum Amount <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input 
                    id="loan-type-min-amount" 
                    type="number" 
                    step="0.01" 
                    min={0} 
                    placeholder="0.00" 
                    className={errors.minAmount ? "border-destructive focus-visible:ring-destructive" : ""}
                    aria-invalid={!!errors.minAmount} 
                    {...register("minAmount", { valueAsNumber: true })} 
                  />
                </div>
                {errors.minAmount && (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive mt-1">
                    <AlertCircle className="size-3" /> {errors.minAmount.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loan-type-max-amount" className="text-xs font-medium">
                  Maximum Amount <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="loan-type-max-amount" 
                  type="number" 
                  step="0.01" 
                  min={0} 
                  placeholder="0.00" 
                  className={errors.maxAmount ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!errors.maxAmount} 
                  {...register("maxAmount", { valueAsNumber: true })} 
                />
                {errors.maxAmount && (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive mt-1">
                    <AlertCircle className="size-3" /> {errors.maxAmount.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loan-type-interest-rate" className="text-xs font-medium">
                  Interest Rate (% per month) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="loan-type-interest-rate"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  className={errors.defaultInterestRate ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!errors.defaultInterestRate}
                  {...register("defaultInterestRate", { valueAsNumber: true })}
                />
                {errors.defaultInterestRate && (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive mt-1">
                    <AlertCircle className="size-3" /> {errors.defaultInterestRate.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loan-type-interest-method" className="text-xs font-medium">Interest Calculation Method</Label>
                <CommandSelect
                  className="w-full"
                  hideSearch
                  value={watch("interestMethod")}
                  onValueChange={(v) => setValue("interestMethod", v as InterestMethod)}
                  options={[
                    { value: "Flat Interest", label: "Flat Interest" },
                    { value: "Diminishing Balance", label: "Diminishing Balance" },
                    { value: "Zero Interest", label: "Zero Interest" },
                    { value: "Custom", label: "Custom" },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loan-type-processing-fee" className="text-xs font-medium">
                  Processing Fee <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="loan-type-processing-fee" 
                  type="number" 
                  step="0.01" 
                  min={0} 
                  placeholder="0.00" 
                  className={errors.processingFee ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!errors.processingFee} 
                  {...register("processingFee", { valueAsNumber: true })} 
                />
                {errors.processingFee && (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive mt-1">
                    <AlertCircle className="size-3" /> {errors.processingFee.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loan-type-service-charge" className="text-xs font-medium">Service Charge (%)</Label>
                <Input
                  id="loan-type-service-charge"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="Optional %"
                  className={errors.serviceChargePercent ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!errors.serviceChargePercent}
                  {...register("serviceChargePercent", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
                />
                {errors.serviceChargePercent && (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive mt-1">
                    <AlertCircle className="size-3" /> {errors.serviceChargePercent.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loan-type-max-term" className="text-xs font-medium">
                  Max Term (months) <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="loan-type-max-term" 
                  type="number" 
                  min={1} 
                  placeholder="12" 
                  className={errors.maxTermMonths ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!errors.maxTermMonths} 
                  {...register("maxTermMonths", { valueAsNumber: true })} 
                />
                {errors.maxTermMonths && (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive mt-1">
                    <AlertCircle className="size-3" /> {errors.maxTermMonths.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section: Income Tiering */}
          <div className="space-y-4 rounded-xl border border-border/60 bg-muted/25 p-4 transition-all duration-200">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  <Label htmlFor="income-tiering-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
                    Tier by Member Net Pay
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground leading-normal pl-6">
                  Dynamically adjust maximum loan limits based on the applicant's salary range.
                </p>
              </div>
              <Switch id="income-tiering-toggle" checked={isIncomeTiered} onCheckedChange={toggleIncomeTiered} />
            </div>

            {isIncomeTiered && (
              <div className="space-y-4 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                    Configured Income Brackets
                  </Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs gap-1.5 border-dashed border-primary/30 hover:border-primary/50 transition-colors"
                    onClick={() => bracketsArray.append({ minNetPay: 0, maxNetPay: null, loanableAmount: 0 })}
                  >
                    <Plus className="size-3.5" /> Add Bracket Rule
                  </Button>
                </div>

                {/* Empty State when no brackets */}
                {bracketsArray.fields.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border/60 rounded-xl bg-background/50 text-center">
                    <TrendingUp className="size-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs font-semibold text-foreground/85">No income tiers added yet</p>
                    <p className="text-[11px] text-muted-foreground max-w-[240px] mt-0.5 mb-3">
                      Add bracket rules to restrict maximum loan values based on applicant earnings.
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs gap-1.5 border-dashed"
                      onClick={() => bracketsArray.append({ minNetPay: 0, maxNetPay: null, loanableAmount: 0 })}
                    >
                      <Plus className="size-3.5" /> Add First Bracket
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  {bracketsArray.fields.map((field, index) => (
                    <div 
                      key={field.id} 
                      className="group relative grid grid-cols-[1fr_auto_1fr_auto_1fr_auto] gap-3 items-center bg-background p-3 rounded-xl border border-border/50 shadow-sm transition-all hover:border-border/80"
                    >
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                          Min Net Pay
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0.00"
                          className="h-9 text-xs"
                          {...register(`incomeBrackets.${index}.minNetPay`, { valueAsNumber: true })}
                        />
                      </div>

                      <span className="text-xs text-muted-foreground font-medium pt-5">to</span>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                          Max Net Pay
                        </Label>
                        <Input
                          type="number"
                          min={watch(`incomeBrackets.${index}.minNetPay`) || 0}
                          placeholder="No limit"
                          className={`h-9 text-xs ${errors.incomeBrackets?.[index]?.maxNetPay ? "border-destructive focus-visible:ring-destructive" : ""}`}
                          aria-invalid={!!errors.incomeBrackets?.[index]?.maxNetPay}
                          {...register(`incomeBrackets.${index}.maxNetPay`, { setValueAs: (v) => (v === "" ? null : Number(v)) })}
                        />
                        {errors.incomeBrackets?.[index]?.maxNetPay && (
                          <p className="max-w-48 text-[10px] font-medium leading-tight text-destructive">
                            {errors.incomeBrackets[index]?.maxNetPay?.message}
                          </p>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground font-medium pt-5">→</span>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                          Max Loan Limit
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Limit"
                          className="h-9 text-xs"
                          {...register(`incomeBrackets.${index}.loanableAmount`, { valueAsNumber: true })}
                        />
                      </div>

                      <div className="pt-5">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="size-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          onClick={() => bracketsArray.remove(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Requirements & Status */}
          <div className="space-y-4 rounded-xl border border-border/50 bg-muted/5 p-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-border/30">
              <ShieldCheck className="size-4 text-primary" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Requirements &amp; Status</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="loan-type-req-membership" className="text-xs font-medium">
                  Min. Membership Tenure (months) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="loan-type-req-membership"
                  type="number"
                  min={0}
                  placeholder="0"
                  className={errors.requiredMembershipMonths ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!errors.requiredMembershipMonths}
                  {...register("requiredMembershipMonths", { valueAsNumber: true })}
                />
                {errors.requiredMembershipMonths && (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive mt-1">
                    <AlertCircle className="size-3" /> {errors.requiredMembershipMonths.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loan-type-req-contribution" className="text-xs font-medium">
                  Min. Contributions Count (months) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="loan-type-req-contribution"
                  type="number"
                  min={0}
                  placeholder="0"
                  className={errors.requiredContributionMonths ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!errors.requiredContributionMonths}
                  {...register("requiredContributionMonths", { valueAsNumber: true })}
                />
                {errors.requiredContributionMonths && (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive mt-1">
                    <AlertCircle className="size-3" /> {errors.requiredContributionMonths.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="loan-type-status" className="text-xs font-semibold">Status</Label>
                <CommandSelect
                  className="w-full h-11"
                  hideSearch
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as "Active" | "Inactive")}
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                  ]}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-4 min-h-[72px]">
                <div className="space-y-1 pr-4">
                  <Label htmlFor="allow-existing-switch" className="text-xs font-semibold text-foreground cursor-pointer">
                    Allow Multiple Active
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Let members maintain more than one active loan of this type.
                  </p>
                </div>
                <Switch 
                  id="allow-existing-switch"
                  checked={watch("allowExistingActiveLoan")} 
                  onCheckedChange={(v) => setValue("allowExistingActiveLoan", v)} 
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="pt-4 border-t border-border/50 bg-background z-10 flex items-center gap-2">
          {submitError && (
            <p className="mr-auto flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="size-3.5" /> {submitError}
            </p>
          )}
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} onClick={handleSubmit(handleFormSubmit)}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? "Saving changes…" : loanType ? "Save Changes" : "Create Loan Type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
