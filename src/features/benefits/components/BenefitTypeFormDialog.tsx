import * as React from "react"
import { Link } from "react-router-dom"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Loader2,
  Plus,
  Trash2,
  FileText,
  Coins,
  ShieldCheck,
  Layers,
  AlertCircle,
  Gift,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
    prorationTiers: benefitType.prorationTiers.map((t) => ({
      membershipScope: t.membershipScope ?? "all",
      minMonths: t.minMonths,
      maxMonths: t.maxMonths,
      percentage: t.percentage,
    })),
    fyAmounts: benefitType.fyAmounts.map((fy) => ({
      fiscalYear: fy.fiscalYear,
      baseAmount: fy.baseAmount,
    })),
    eligibilityRequirements: benefitType.eligibilityRequirements,
    requiredMembershipMonths: benefitType.requiredMembershipMonths,
    frequencyLimit: benefitType.frequencyLimit,
    requiredDocuments: benefitType.requiredDocuments,
    approvalRequired: benefitType.approvalRequired,
    status: benefitType.status,
  }
}

export function BenefitTypeFormDialog({
  open,
  onOpenChange,
  benefitType,
  onSubmit,
}: BenefitTypeFormDialogProps) {
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [financialEditing, setFinancialEditing] = React.useState(false)
  const [prorationEditing, setProrationEditing] = React.useState(false)

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
  const isFinancialReadOnly = isComputationManaged && !financialEditing
  const isProrationReadOnly = isComputationManaged && !prorationEditing

  const [documentsText, setDocumentsText] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setSubmitError(null)
      setFinancialEditing(!benefitType)
      setProrationEditing(!benefitType)
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
      tiersArray.append({ membershipScope: "all", minMonths: 0, maxMonths: null, percentage: 100 })
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
      setSubmitError(error instanceof Error ? error.message : "Unable to save the benefit program.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 border-b border-border/40 bg-muted/15">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-2xs">
              <Gift className="size-5" strokeWidth={2.2} />
            </div>
            <div>
              <DialogTitle className="font-heading text-base font-bold tracking-tight text-foreground sm:text-lg">
                {benefitType ? "Configure Benefit Program" : "Create Benefit Program"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {benefitType
                  ? "Refine program thresholds, proration rules, and document prerequisites."
                  : "Establish policy parameters, limits, and eligibility matrices for a new assistance program."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-border/80 scrollbar-track-transparent"
          onSubmit={handleSubmit(handleFormSubmit)}
          noValidate
        >
          {/* Section 1: Basic Information */}
          <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/10 p-4 sm:p-5 shadow-2xs backdrop-blur-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
              <FileText className="size-4 text-primary" />
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Basic Program Identification
              </h4>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="benefit-type-name" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Benefit Program Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="benefit-type-name"
                placeholder="e.g. Emergency Medical Assistance"
                className={cn("h-10 text-xs font-semibold shadow-2xs", errors.name && "border-destructive focus-visible:ring-destructive")}
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="flex items-center gap-1 text-[11px] font-medium text-destructive mt-1">
                  <AlertCircle className="size-3" /> {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="benefit-type-description" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Program Description
              </Label>
              <Textarea
                id="benefit-type-description"
                rows={2}
                placeholder="Summary description of program objectives and coverage (optional)"
                className="text-xs bg-background resize-none shadow-2xs"
                {...register("description")}
              />
            </div>
          </div>

          {/* Section 2: Financial Limits */}
          <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/10 p-4 sm:p-5 shadow-2xs backdrop-blur-xs">
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Coins className="size-4 text-primary" />
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Financial Grant Thresholds
                </h4>
              </div>
              {isComputationManaged && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="benefit-financial-toggle" className="text-[11px] font-bold text-muted-foreground cursor-pointer">
                    Unlock Override
                  </Label>
                  <Switch id="benefit-financial-toggle" checked={financialEditing} onCheckedChange={setFinancialEditing} />
                </div>
              )}
            </div>

            {isComputationManaged && (
              <div className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <p className="leading-relaxed text-muted-foreground text-[11px]">
                  Synchronized with{" "}
                  <Link
                    to="/admin/settings?section=benefit"
                    className="font-bold text-primary underline-offset-2 hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    Global Benefit Settings
                  </Link>. Updates made here reflect association-wide.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="benefit-type-default-amount" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Default Grant Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="benefit-type-default-amount"
                  type="number"
                  step="0.01"
                  min={0}
                  readOnly={isFinancialReadOnly}
                  className={cn(
                    "h-10 font-mono text-xs font-semibold shadow-2xs",
                    isFinancialReadOnly && "cursor-not-allowed bg-muted/50",
                    errors.defaultAmount && "border-destructive focus-visible:ring-destructive"
                  )}
                  aria-invalid={!!errors.defaultAmount}
                  {...register("defaultAmount", { valueAsNumber: true })}
                />
                {errors.defaultAmount && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-destructive mt-1">
                    <AlertCircle className="size-3" /> {errors.defaultAmount.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="benefit-type-maximum-amount" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Maximum Allowable Cap <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="benefit-type-maximum-amount"
                  type="number"
                  step="0.01"
                  min={0}
                  readOnly={isFinancialReadOnly}
                  className={cn(
                    "h-10 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs",
                    isFinancialReadOnly && "cursor-not-allowed bg-muted/50",
                    errors.maximumAmount && "border-destructive focus-visible:ring-destructive"
                  )}
                  aria-invalid={!!errors.maximumAmount}
                  {...register("maximumAmount", { valueAsNumber: true })}
                />
                {errors.maximumAmount && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-destructive mt-1">
                    <AlertCircle className="size-3" /> {errors.maximumAmount.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Proration Matrix */}
          <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/10 p-4 sm:p-5 shadow-2xs backdrop-blur-xs">
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <Label htmlFor="proration-toggle" className="text-xs font-bold uppercase tracking-wider text-foreground cursor-pointer">
                    Prorate by Contribution Tenure
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Dynamically scale benefit grant amounts based on applicant verified contribution months.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isComputationManaged && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Unlock Override
                  </span>
                )}
                <Switch
                  id="proration-toggle"
                  checked={isComputationManaged ? prorationEditing : isProrated}
                  onCheckedChange={isComputationManaged ? setProrationEditing : toggleProrated}
                />
              </div>
            </div>

            {isProrated && (
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="benefit-type-proration-basis" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Tenure Ledger Source
                  </Label>
                  <CommandSelect
                    className="w-full h-10 text-xs shadow-2xs"
                    disabled={isProrationReadOnly}
                    value={watch("prorationBasis") ?? "dues"}
                    onValueChange={(v) => setValue("prorationBasis", v as "dues" | "pabaon")}
                    options={[
                      { value: "dues", label: "Monthly Dues Contribution Ledger" },
                      { value: "pabaon", label: "Cash Pabaon Deduction Ledger" },
                    ]}
                    hideSearch
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Configured Tenure Tiers
                    </Label>
                    {!isProrationReadOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 rounded-lg border-dashed font-semibold active:scale-95"
                        onClick={() =>
                          tiersArray.append({
                            membershipScope: watch("prorationBasis") === "pabaon" ? "legacy" : "all",
                            minMonths: 0,
                            maxMonths: null,
                            percentage: 0,
                          })
                        }
                      >
                        <Plus className="size-3" /> Add Tier
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {tiersArray.fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 items-end gap-3 rounded-2xl border border-border/60 bg-background/90 p-3 shadow-2xs sm:grid-cols-[1.2fr_1fr_auto_1fr_auto_1fr_1.15fr_auto]"
                      >
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase text-muted-foreground">Member Rule</span>
                          <CommandSelect
                            size="sm"
                            hideSearch
                            disabled={isProrationReadOnly}
                            value={watch(`prorationTiers.${index}.membershipScope`) ?? "all"}
                            onValueChange={(value) =>
                              setValue(`prorationTiers.${index}.membershipScope`, value as "all" | "legacy" | "new")
                            }
                            options={[
                              { value: "all", label: "All Members" },
                              { value: "legacy", label: "Old · Res. 24" },
                              { value: "new", label: "New · Res. 27" },
                            ]}
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">Min Months</span>
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            readOnly={isProrationReadOnly}
                            className="h-8.5 font-mono text-xs shadow-2xs read-only:bg-muted/50"
                            {...register(`prorationTiers.${index}.minMonths`, { valueAsNumber: true })}
                          />
                        </div>

                        <span className="text-xs text-muted-foreground pb-2">to</span>

                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">Max Months</span>
                          <Input
                            type="number"
                            min={0}
                            placeholder="Open limit"
                            readOnly={isProrationReadOnly}
                            className="h-8.5 font-mono text-xs shadow-2xs read-only:bg-muted/50"
                            {...register(`prorationTiers.${index}.maxMonths`, {
                              setValueAs: (v) => (v === "" ? null : Number(v)),
                            })}
                          />
                        </div>

                        <span className="text-xs text-muted-foreground pb-2">yields</span>

                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">Scale (%)</span>
                          <div className="relative">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              placeholder="100.00"
                              readOnly={isProrationReadOnly}
                              className="h-8.5 font-mono text-xs pr-6 shadow-2xs read-only:bg-muted/50"
                              {...register(`prorationTiers.${index}.percentage`, { valueAsNumber: true })}
                            />
                            <span className="absolute right-2 top-2 text-[10px] font-bold text-muted-foreground/60">%</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase text-muted-foreground">Calculated Aid</span>
                          <div className="flex h-8.5 items-center rounded-lg border border-border/60 bg-muted/40 px-2.5 font-mono text-xs font-bold text-foreground">
                            {formatCurrency(
                              (watch("maximumAmount") || 0) *
                                ((watch(`prorationTiers.${index}.percentage`) || 0) / 100)
                            )}
                          </div>
                        </div>

                        {!isProrationReadOnly && (
                          <div className="pb-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg active:scale-90"
                              onClick={() => tiersArray.remove(index)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fiscal Year escalation sub-panel */}
                <div className="pt-4 border-t border-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fy-escalation-switch" className="text-xs font-semibold text-foreground cursor-pointer">
                      Base Amount Escalates by Fiscal Year
                    </Label>
                    <Switch
                      id="fy-escalation-switch"
                      checked={isFyScoped}
                      disabled={isProrationReadOnly}
                      onCheckedChange={toggleFyScoped}
                    />
                  </div>

                  {isFyScoped && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Fiscal Year Matrix
                        </Label>
                        {!isProrationReadOnly && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 rounded-lg border-dashed font-semibold active:scale-95"
                            onClick={() => fyAmountsArray.append({ fiscalYear: null, baseAmount: 0 })}
                          >
                            <Plus className="size-3" /> Add Year
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {fyAmountsArray.fields.map((field, index) => (
                          <div
                            key={field.id}
                            className="grid grid-cols-[1fr_auto_1.4fr_auto] gap-3 items-center bg-background/90 p-2.5 rounded-2xl border border-border/60 shadow-2xs"
                          >
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">Fiscal Year</span>
                              <Input
                                type="number"
                                placeholder="e.g. 2026"
                                readOnly={isProrationReadOnly}
                                className="h-8.5 font-mono text-xs shadow-2xs read-only:bg-muted/50"
                                {...register(`fyAmounts.${index}.fiscalYear`, {
                                  setValueAs: (v) => (v === "" ? null : Number(v)),
                                })}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground pt-3.5">=</span>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">Base Amount</span>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="0.00"
                                readOnly={isProrationReadOnly}
                                className="h-8.5 font-mono text-xs font-semibold shadow-2xs read-only:bg-muted/50"
                                {...register(`fyAmounts.${index}.baseAmount`, { valueAsNumber: true })}
                              />
                            </div>
                            {!isProrationReadOnly && (
                              <div className="pt-3.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg active:scale-90"
                                  onClick={() => fyAmountsArray.remove(index)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Eligibility & Access Rules */}
          <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/10 p-4 sm:p-5 shadow-2xs backdrop-blur-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
              <ShieldCheck className="size-4 text-primary" />
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Eligibility &amp; Mandatory Credentials
              </h4>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="benefit-type-eligibility" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Eligibility Criteria Summary
              </Label>
              <Textarea
                id="benefit-type-eligibility"
                rows={2}
                placeholder="e.g. Active member in good standing with at least 6 months continuous contributions"
                className="text-xs bg-background resize-none shadow-2xs"
                {...register("eligibilityRequirements")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="benefit-type-req-membership" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Required Tenure (months) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="benefit-type-req-membership"
                  type="number"
                  min={0}
                  className={cn(
                    "h-10 font-mono text-xs shadow-2xs",
                    errors.requiredMembershipMonths && "border-destructive focus-visible:ring-destructive"
                  )}
                  aria-invalid={!!errors.requiredMembershipMonths}
                  {...register("requiredMembershipMonths", { valueAsNumber: true })}
                />
                {errors.requiredMembershipMonths && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-destructive mt-1">
                    <AlertCircle className="size-3" /> {errors.requiredMembershipMonths.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="benefit-type-frequency" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Frequency Limit Policy
                </Label>
                <Input
                  id="benefit-type-frequency"
                  placeholder="e.g. Once per fiscal year, Once in a lifetime"
                  className="h-10 text-xs shadow-2xs"
                  {...register("frequencyLimit")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="benefit-type-documents" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Mandatory Documentation Checklist
              </Label>
              <Textarea
                id="benefit-type-documents"
                rows={3}
                placeholder={"One document requirement per line:\nMedical Certificate\nIncident / Police Report\nValid Government ID"}
                value={documentsText}
                onChange={handleDocumentsChange}
                className="text-xs bg-background resize-none shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="benefit-type-status" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Operational Status
                </Label>
                <CommandSelect
                  className="w-full h-10 text-xs shadow-2xs"
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as "Active" | "Inactive")}
                  options={[
                    { value: "Active", label: "Active Program" },
                    { value: "Inactive", label: "Inactive / Suspended" },
                  ]}
                  hideSearch
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 p-3 h-10 shadow-2xs">
                <Label htmlFor="approval-required-switch" className="text-xs font-semibold text-foreground cursor-pointer">
                  Approval Workflow Required
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

        {/* Modal Footer */}
        <DialogFooter className="p-4 sm:p-5 border-t border-border/40 bg-muted/15 z-10 flex items-center justify-between gap-3">
          {submitError ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="size-3.5 shrink-0" /> {submitError}
            </p>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              onClick={handleSubmit(handleFormSubmit)}
              className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              <span>{isSubmitting ? "Saving changes…" : benefitType ? "Save Changes" : "Create Benefit Program"}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}