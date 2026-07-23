import * as React from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Switch } from "@/components/ui/switch"
import { benefitTypeSchema, type BenefitTypeFormValues } from "@/schemas/benefit-type.schema"
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

  // The requiredDocuments field is a string[] on the form, but authored as free text
  // (one document per line). This local state holds the raw textarea text so that a
  // trailing blank line (from pressing Enter) isn't stripped mid-typing — the RHF
  // field always holds the filtered array, computed on every change.
  const [documentsText, setDocumentsText] = React.useState("")

  React.useEffect(() => {
    if (open) {
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
    await onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{benefitType ? "Edit Benefit Type" : "Add Benefit Type"}</DialogTitle>
          <DialogDescription>{benefitType ? "Update this benefit program's configuration." : "Configure a new benefit program for GCGEA members."}</DialogDescription>
        </DialogHeader>
        <form className="max-h-[70vh] space-y-4 overflow-y-auto pr-1" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="benefit-type-name">
              Benefit Type Name <span className="text-destructive">*</span>
            </Label>
            <Input id="benefit-type-name" placeholder="e.g. Medical Assistance" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && <p className="text-xs font-medium text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="benefit-type-description">Description</Label>
            <Textarea id="benefit-type-description" rows={2} placeholder="Brief description of this benefit program (optional)" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="benefit-type-default-amount">
                Default Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="benefit-type-default-amount"
                type="number"
                step="0.01"
                min={0}
                aria-invalid={!!errors.defaultAmount}
                {...register("defaultAmount", { valueAsNumber: true })}
              />
              {errors.defaultAmount && <p className="text-xs font-medium text-destructive">{errors.defaultAmount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="benefit-type-maximum-amount">
                Maximum Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="benefit-type-maximum-amount"
                type="number"
                step="0.01"
                min={0}
                aria-invalid={!!errors.maximumAmount}
                {...register("maximumAmount", { valueAsNumber: true })}
              />
              {errors.maximumAmount && <p className="text-xs font-medium text-destructive">{errors.maximumAmount.message}</p>}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <label className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
              <span>Prorate by Contribution Months</span>
              <Switch checked={isProrated} onCheckedChange={toggleProrated} />
            </label>
            {isProrated && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="benefit-type-proration-basis">Count Months Against</Label>
                  <CommandSelect
                    className="w-full"
                    value={watch("prorationBasis") ?? "dues"}
                    onValueChange={(v) => setValue("prorationBasis", v as "dues" | "pabaon")}
                    options={[
                      { value: "dues", label: "Monthly Dues Contributions" },
                      { value: "pabaon", label: "Cash Pabaon Deductions" },
                    ]}
                    hideSearch
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Proration Tiers</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => tiersArray.append({ minMonths: 0, maxMonths: null, percentage: 0 })}>
                      <Plus className="size-3.5" /> Add Tier
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {tiersArray.fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="Min months"
                          className="w-24"
                          {...register(`prorationTiers.${index}.minMonths`, { valueAsNumber: true })}
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Max (blank=open)"
                          className="w-28"
                          {...register(`prorationTiers.${index}.maxMonths`, {
                            setValueAs: (v) => (v === "" ? null : Number(v)),
                          })}
                        />
                        <span className="text-xs text-muted-foreground">mos =</span>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          placeholder="%"
                          className="w-20"
                          {...register(`prorationTiers.${index}.percentage`, { valueAsNumber: true })}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => tiersArray.remove(index)}>
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                  <span>Base Amount Escalates by Fiscal Year</span>
                  <Switch checked={isFyScoped} onCheckedChange={toggleFyScoped} />
                </label>
                {isFyScoped && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Fiscal Year Amounts</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => fyAmountsArray.append({ fiscalYear: null, baseAmount: 0 })}>
                        <Plus className="size-3.5" /> Add Year
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {fyAmountsArray.fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Year (blank=beyond)"
                            className="w-36"
                            {...register(`fyAmounts.${index}.fiscalYear`, {
                              setValueAs: (v) => (v === "" ? null : Number(v)),
                            })}
                          />
                          <span className="text-xs text-muted-foreground">=</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="Base amount"
                            className="flex-1"
                            {...register(`fyAmounts.${index}.baseAmount`, { valueAsNumber: true })}
                          />
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => fyAmountsArray.remove(index)}>
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="benefit-type-eligibility">Eligibility Requirements</Label>
            <Textarea id="benefit-type-eligibility" rows={2} placeholder="e.g. Active member for at least 6 months" {...register("eligibilityRequirements")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="benefit-type-req-membership">
                Min. Membership (months) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="benefit-type-req-membership"
                type="number"
                min={0}
                aria-invalid={!!errors.requiredMembershipMonths}
                {...register("requiredMembershipMonths", { valueAsNumber: true })}
              />
              {errors.requiredMembershipMonths && <p className="text-xs font-medium text-destructive">{errors.requiredMembershipMonths.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="benefit-type-frequency">Frequency Limit</Label>
              <Input id="benefit-type-frequency" placeholder="e.g. Twice per year" {...register("frequencyLimit")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="benefit-type-documents">Required Documents</Label>
            <Textarea
              id="benefit-type-documents"
              rows={3}
              placeholder={"One document per line, e.g.\nMedical Certificate\nValid ID"}
              value={documentsText}
              onChange={handleDocumentsChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="benefit-type-status">Status</Label>
              <CommandSelect
                className="w-full"
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as "Active" | "Inactive")}
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ]}
                hideSearch
              />
            </div>
            <label className="flex items-center gap-2 self-end pb-1.5 text-sm text-foreground">
              <Switch checked={watch("approvalRequired")} onCheckedChange={(v) => setValue("approvalRequired", v)} />
              Approval Required
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
              {isSubmitting ? "Saving…" : benefitType ? "Save Changes" : "Add Benefit Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
