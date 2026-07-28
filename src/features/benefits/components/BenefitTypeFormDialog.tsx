import * as React from "react"
import { Link } from "react-router-dom"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, Trash2, FileText, Coins, ShieldCheck, Layers, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Switch } from "@/components/ui/switch"
import { benefitTypeSchema, type BenefitTypeFormValues } from "@/schemas/benefit-type.schema"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/utils/format"
import type { BenefitType } from "@/types"

interface BenefitTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  benefitType?: BenefitType
  onSubmit: (values: BenefitTypeFormValues) => Promise<void>
}

const DEFAULT_VALUES: BenefitTypeFormValues = {
  name: "",
  description: "",
  defaultAmount: 0,
  maximumAmount: 0,
  prorationBasis: null,
  prorationTiers: [],
  fyAmounts: [],
  eligibilityRequirements: "",
  requiredMembershipMonths: 0,
  frequencyLimit: "",
  requiredDocuments: [],
  approvalRequired: true,
  status: "Active",
}

const SETTINGS_MANAGED_BENEFIT_NAMES = new Set([
  "Retirement and Separation Benefit",
  "Mortuary Cash Assistance",
  "Mortuary Cash Assistance for Nuclear Family Member",
  "Cash Pabaon Program",
])

function toFormValues(benefitType?: BenefitType): BenefitTypeFormValues {
  if (!benefitType) return DEFAULT_VALUES
  return {
    name: benefitType.name,
    description: benefitType.description,
    defaultAmount: benefitType.defaultAmount,
    maximumAmount: benefitType.maximumAmount,
    prorationBasis: benefitType.prorationBasis ?? null,
    prorationTiers: benefitType.prorationTiers.map((t) => ({ minMonths: t.minMonths, maxMonths: t.maxMonths, percentage: t.percentage })),
    fyAmounts: benefitType.fyAmounts.map((fy) => ({ fiscalYear: fy.fiscalYear, baseAmount: fy.baseAmount })),
    eligibilityRequirements: benefitType.eligibilityRequirements,
    requiredMembershipMonths: benefitType.requiredMembershipMonths,
    frequencyLimit: benefitType.frequencyLimit,
    requiredDocuments: benefitType.requiredDocuments,
    approvalRequired: benefitType.approvalRequired,
    status: benefitType.status,
  }
}

export function BenefitTypeFormDialog({ open, onOpenChange, benefitType, onSubmit }: BenefitTypeFormDialogProps) {
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BenefitTypeFormValues>({
    resolver: zodResolver(benefitTypeSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const tiersArray = useFieldArray({ control, name: "prorationTiers" })
  const fyAmountsArray = useFieldArray({ control, name: "fyAmounts" })
  const isProrated = watch("prorationBasis") != null
  const isFyScoped = watch("fyAmounts").length > 0
  const isComputationManaged = !!benefitType && SETTINGS_MANAGED_BENEFIT_NAMES.has(benefitType.name)

  const [documentsText, setDocumentsText] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setSubmitError(null)
      const values = toFormValues(benefitType)
      reset(values)
      setDocumentsText(values.requiredDocuments.join("\n"))
    }
  }, [open, benefitType, reset])

  function handleDocumentsChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    setDocumentsText(text)
    setValue(
      "requiredDocuments",
      text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
  }

  function toggleProrated(enabled: boolean) {
    setValue("prorationBasis", enabled ? "dues" : null)
    if (!enabled) {
      setValue("prorationTiers", [])
      setValue("fyAmounts", [])
    } else if (tiersArray.fields.length === 0) {
      tiersArray.append({ minMonths: 0, maxMonths: null, percentage: 100 })
    }
  }

  function toggleFyScoped(enabled: boolean) {
    if (enabled && fyAmountsArray.fields.length === 0) {
      fyAmountsArray.append({ fiscalYear: new Date().getFullYear(), baseAmount: 0 })
    } else if (!enabled) {
      setValue("fyAmounts", [])
    }
  }

  async function handleFormSubmit(values: BenefitTypeFormValues) {
    setSubmitError(null)
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save the benefit type.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-6 gap-0">
        <DialogHeader className="pb-4 border-b border-border/50">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {benefitType ? "Edit Benefit Type" : "Add Benefit Type"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {benefitType ? "Refine rules, thresholds, and limits for this benefit program configuration." : "Set up details, restrictions, and financial configurations for a new benefit type."}
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
                <Label htmlFor="benefit-type-name" className="text-xs font-semibold">
                  Benefit Type Name <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="benefit-type-name" 
                  placeholder="e.g. Medical Assistance" 
                  className={cn("h-10 text-sm", errors.name && "border-destructive focus-visible:ring-destructive")}
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
                <Label htmlFor="benefit-type-description" className="text-xs font-semibold">Description</Label>
                <Textarea 
                  id="benefit-type-description" 
                  rows={2} 
                  placeholder="Brief description of this benefit program (optional)" 
                  className="text-sm bg-background resize-none"
                  {...register("description")} 
                />
              </div>
            </div>

            {/* Section: Financial Limits */}
            <div className="space-y-4 rounded-xl border border-border/50 bg-muted/5 p-4">
              <div className="flex items-center gap-2 pb-1.5 border-b border-border/30">
                <Coins className="size-4 text-primary" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Financial Limits</h4>
              </div>

              {isComputationManaged && (
                <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <p className="leading-relaxed text-muted-foreground">
                    Amount limits, proration tiers, contribution basis, and fiscal-year amounts are managed together in{" "}
                    <Link
                      to="/admin/settings?section=benefit"
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                      onClick={() => onOpenChange(false)}
                    >
                      Benefit Settings
                    </Link>.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="benefit-type-default-amount" className="text-xs font-semibold">
                    Default Amount <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="benefit-type-default-amount"
                    type="number"
                    step="0.01"
                    min={0}
                    readOnly={isComputationManaged}
                    className={cn("h-10 text-sm", isComputationManaged && "cursor-not-allowed bg-muted/50", errors.defaultAmount && "border-destructive focus-visible:ring-destructive")}
                    aria-invalid={!!errors.defaultAmount}
                    {...register("defaultAmount", { valueAsNumber: true })}
                  />
                  {errors.defaultAmount && (
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive mt-1">
                      <AlertCircle className="size-3" /> {errors.defaultAmount.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="benefit-type-maximum-amount" className="text-xs font-semibold">
                    Maximum Amount <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="benefit-type-maximum-amount"
                    type="number"
                    step="0.01"
                    min={0}
                    readOnly={isComputationManaged}
                    className={cn("h-10 text-sm", isComputationManaged && "cursor-not-allowed bg-muted/50", errors.maximumAmount && "border-destructive focus-visible:ring-destructive")}
                    aria-invalid={!!errors.maximumAmount}
                    {...register("maximumAmount", { valueAsNumber: true })}
                  />
                  {errors.maximumAmount && (
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-destructive mt-1">
                      <AlertCircle className="size-3" /> {errors.maximumAmount.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Proration Panel */}
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4 transition-all duration-200">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    <Label htmlFor="proration-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
                      Prorate by Contribution Months
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal pl-6">
                    Adjust payment limits dynamically based on the applicant's paid months.
                  </p>
                </div>
                <Switch id="proration-toggle" checked={isProrated} disabled={isComputationManaged} onCheckedChange={toggleProrated} />
              </div>

              {isProrated && (
                <div className="space-y-4 pt-4 border-t border-border/40">
                  <div className="space-y-1.5">
                    <Label htmlFor="benefit-type-proration-basis" className="text-xs font-semibold">Count Months Against</Label>
                    <CommandSelect
                      className="w-full h-10"
                      disabled={isComputationManaged}
                      value={watch("prorationBasis") ?? "dues"}
                      onValueChange={(v) => setValue("prorationBasis", v as "dues" | "pabaon")}
                      options={[
                        { value: "dues", label: "Monthly Dues Contributions" },
                        { value: "pabaon", label: "Cash Pabaon Deductions" },
                      ]}
                      hideSearch
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Proration Tiers</Label>
                      {!isComputationManaged && <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs gap-1.5 border-dashed border-primary/30 hover:border-primary/50"
                        onClick={() => tiersArray.append({ minMonths: 0, maxMonths: null, percentage: 0 })}
                      >
                        <Plus className="size-3.5" /> Add Tier
                      </Button>}
                    </div>

                    <div className="space-y-2">
                      {tiersArray.fields.map((field, index) => (
                        <div 
                          key={field.id} 
                          className="grid grid-cols-1 items-end gap-3 rounded-xl border border-border bg-background p-2.5 shadow-xs sm:grid-cols-[1fr_auto_1fr_auto_1fr_1.15fr_auto]"
                        >
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Min Months</span>
                            <Input
                              type="number"
                              min={0}
                              placeholder="0"
                              readOnly={isComputationManaged}
                              className="h-9 text-xs read-only:cursor-not-allowed read-only:bg-muted/50"
                              {...register(`prorationTiers.${index}.minMonths`, { valueAsNumber: true })}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground pt-4">to</span>
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Max Months</span>
                            <Input
                              type="number"
                              min={0}
                              placeholder="Open limit"
                              readOnly={isComputationManaged}
                              className="h-9 text-xs read-only:cursor-not-allowed read-only:bg-muted/50"
                              {...register(`prorationTiers.${index}.maxMonths`, {
                                setValueAs: (v) => (v === "" ? null : Number(v)),
                              })}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground pt-4">yields</span>
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Percent (%)</span>
                            <div className="relative">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                step="0.01"
                                placeholder="100.00"
                                readOnly={isComputationManaged}
                                className="h-9 text-xs pr-7 read-only:cursor-not-allowed read-only:bg-muted/50"
                                {...register(`prorationTiers.${index}.percentage`, { valueAsNumber: true })}
                              />
                              <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-muted-foreground/50">%</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="px-1 text-[9px] font-bold uppercase text-muted-foreground/70">Benefit Amount</span>
                            <div className="flex h-9 items-center rounded-md border border-border bg-muted/50 px-3 text-xs font-semibold text-foreground">
                              {formatCurrency(
                                (watch("maximumAmount") || 0)
                                * ((watch(`prorationTiers.${index}.percentage`) || 0) / 100)
                              )}
                            </div>
                          </div>
                          {!isComputationManaged && <div className="pt-4">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              onClick={() => tiersArray.remove(index)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fiscal Year escalation sub-panel */}
                  <div className="pt-4 border-t border-border/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="fy-escalation-switch" className="text-xs font-semibold text-foreground cursor-pointer">
                          Base Amount Escalates by Fiscal Year
                        </Label>
                      </div>
                      <Switch id="fy-escalation-switch" checked={isFyScoped} disabled={isComputationManaged} onCheckedChange={toggleFyScoped} />
                    </div>

                    {isFyScoped && (
                      <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Fiscal Year Amounts</Label>
                          {!isComputationManaged && <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1.5 border-dashed border-primary/30"
                            onClick={() => fyAmountsArray.append({ fiscalYear: null, baseAmount: 0 })}
                          >
                            <Plus className="size-3" /> Add Year
                          </Button>}
                        </div>
                        <div className="space-y-2">
                          {fyAmountsArray.fields.map((field, index) => (
                            <div 
                              key={field.id} 
                              className="grid grid-cols-[1fr_auto_1.4fr_auto] gap-3 items-center bg-background p-2.5 rounded-xl border border-border shadow-xs"
                            >
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Fiscal Year</span>
                                <Input
                                  type="number"
                                  placeholder="e.g. 2026"
                                  readOnly={isComputationManaged}
                                  className="h-9 text-xs read-only:cursor-not-allowed read-only:bg-muted/50"
                                  {...register(`fyAmounts.${index}.fiscalYear`, {
                                    setValueAs: (v) => (v === "" ? null : Number(v)),
                                  })}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground pt-4">=</span>
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-muted-foreground/70 uppercase px-1">Base Amount</span>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="0.00"
                                  readOnly={isComputationManaged}
                                  className="h-9 text-xs read-only:cursor-not-allowed read-only:bg-muted/50"
                                  {...register(`fyAmounts.${index}.baseAmount`, { valueAsNumber: true })}
                                />
                              </div>
                              {!isComputationManaged && <div className="pt-4">
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                  onClick={() => fyAmountsArray.remove(index)}
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section: Eligibility & Access Rules */}
            <div className="space-y-4 rounded-xl border border-border/50 bg-muted/5 p-4">
              <div className="flex items-center gap-2 pb-1.5 border-b border-border/30">
                <ShieldCheck className="size-4 text-primary" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Eligibility &amp; Documentation</h4>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="benefit-type-eligibility" className="text-xs font-semibold">Eligibility Requirements</Label>
                <Textarea 
                  id="benefit-type-eligibility" 
                  rows={2} 
                  placeholder="e.g. Active member for at least 6 months" 
                  className="text-sm bg-background resize-none"
                  {...register("eligibilityRequirements")} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="benefit-type-req-membership" className="text-xs font-semibold">
                    Min. Membership (months) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="benefit-type-req-membership"
                    type="number"
                    min={0}
                    className={cn("h-10 text-sm", errors.requiredMembershipMonths && "border-destructive focus-visible:ring-destructive")}
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
                  <Label htmlFor="benefit-type-frequency" className="text-xs font-semibold">Frequency Limit</Label>
                  <Input id="benefit-type-frequency" placeholder="e.g. Twice per year" className="h-10 text-sm" {...register("frequencyLimit")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="benefit-type-documents" className="text-xs font-semibold">Required Documents</Label>
                <Textarea
                  id="benefit-type-documents"
                  rows={3}
                  placeholder={"One document per line, e.g.\nMedical Certificate\nValid ID"}
                  value={documentsText}
                  onChange={handleDocumentsChange}
                  className="text-sm bg-background resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="benefit-type-status" className="text-xs font-semibold">Status</Label>
                  <CommandSelect
                    className="w-full h-10 text-sm"
                    value={watch("status")}
                    onValueChange={(v) => setValue("status", v as "Active" | "Inactive")}
                    options={[
                      { value: "Active", label: "Active" },
                      { value: "Inactive", label: "Inactive" },
                    ]}
                    hideSearch
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3 h-10">
                  <Label htmlFor="approval-required-switch" className="text-xs font-semibold text-foreground cursor-pointer">
                    Approval Required
                  </Label>
                  <Switch 
                    id="approval-required-switch"
                    checked={watch("approvalRequired")} 
                    onCheckedChange={(v) => setValue("approvalRequired", v)} 
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
            {isSubmitting ? "Saving changes…" : benefitType ? "Save Changes" : "Create Benefit Type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
