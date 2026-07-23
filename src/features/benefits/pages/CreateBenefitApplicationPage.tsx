import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { 
  AlertTriangle, 
  Check, 
  CheckCircle2, 
  ChevronsUpDown, 
  FilePlus2, 
  Loader2, 
  ShieldAlert, 
  Info,
  Layers,
  Sparkles,
  Users
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { WizardStepIndicator } from "@/components/shared/WizardStepIndicator"
import { MemberSelectionStep } from "@/components/shared/MemberSelectionStep"
import { EligibilityChecklist, type EligibilityResult } from "@/components/shared/EligibilityChecklist"
import { FileUploader } from "@/components/shared/FileUploader"
import { FormSkeleton } from "@/components/shared/loaders/FormSkeleton"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { SaveDraftButton } from "@/components/shared/SaveDraftButton"
import { DraftStatusBadge } from "@/components/shared/DraftStatusBadge"
import { UnsavedChangesDialog } from "@/components/shared/UnsavedChangesDialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { BenefitsOfficerCommandSelect } from "@/features/benefits/components/BenefitsOfficerCommandSelect"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { getMember } from "@/services/members.service"
import { getAllContributions } from "@/services/contributions.service"
import { getAllDeductions } from "@/services/deductions.service"
import { getMemberLoans } from "@/services/loans.service"
import { createBenefitApplication, getBenefit, listBenefitTypes, getMemberBenefits, updateBenefitApplication, type CreateBenefitApplicationInput } from "@/services/benefits.service"
import { evaluateBenefitEligibility, resultFor } from "@/utils/eligibility"
import { computeProratedAmount, countDistinctPeriods } from "@/utils/proration"
import { formatCurrency } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import { useDraft } from "@/hooks/useDraft"
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft"
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges"
import { cn } from "@/lib/utils"
import type { BenefitApplication } from "@/types"

const STEPS = ["Select Member", "Benefit Details", "Eligibility & Requirements", "Review & Submit"]

/** Fixed per-sibling schedule for an unmarried member's Nuclear Family Mortuary claim (Resolution No. 24-2026) — not prorated by months, capped at 3 siblings. */
const SIBLING_SCHEDULE = [15000, 10000, 5000]
const NUCLEAR_MORTUARY_BENEFIT_NAME = "Mortuary Cash Assistance for Nuclear Family Member"

export default function CreateBenefitApplicationPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { user, hasPermission } = useAuth()
  const canOverride = hasPermission("benefits.override_eligibility")

  const { data: existingBenefit, isLoading: isLoadingBenefit } = useQuery({
    queryKey: ["benefits", id],
    queryFn: () => getBenefit(id!),
    enabled: isEdit,
  })

  const [step, setStep] = React.useState(1)
  const [memberId, setMemberId] = React.useState(() => searchParams.get("member") ?? "")

  React.useEffect(() => {
    const paramMemberId = searchParams.get("member")
    if (paramMemberId && paramMemberId !== memberId && !isEdit) {
      setMemberId(paramMemberId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const [benefitTypeId, setBenefitTypeId] = React.useState("")
  const [requestedAmount, setRequestedAmount] = React.useState<number>()
  const [applicationDate, setApplicationDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [incidentDate, setIncidentDate] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [recipientType, setRecipientType] = React.useState<"Member" | "Beneficiary">("Member")
  const [recipientNames, setRecipientNames] = React.useState<string[]>([])
  const [assignedOfficer, setAssignedOfficer] = React.useState(user?.fullName ?? "")
  const [remarks, setRemarks] = React.useState("")

  const [overrideEnabled, setOverrideEnabled] = React.useState(false)
  const [overrideReason, setOverrideReason] = React.useState("")
  const [overrideConfirmed, setOverrideConfirmed] = React.useState(false)
  const [showOverrideDialog, setShowOverrideDialog] = React.useState(false)

  /** Up to 3 beneficiary ids, in claim order — Nuclear Mortuary sibling schedule (unmarried member) only. */
  const [siblingBeneficiaryIds, setSiblingBeneficiaryIds] = React.useState<string[]>([])

  const [requirements, setRequirements] = React.useState<Record<string, boolean>>({})
  const [fileMeta, setFileMeta] = React.useState<{ fileName: string; fileSize: string } | null>(null)

  const [agree, setAgree] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [successDialog, setSuccessDialog] = React.useState<{ id: string; applicationNumber: string } | null>(null)

  const { data: member } = useQuery({ queryKey: ["members", memberId], queryFn: () => getMember(memberId), enabled: !!memberId })
  const { data: benefitTypes = [] } = useQuery({ queryKey: ["benefit-types"], queryFn: listBenefitTypes })
  const benefitType = benefitTypes.find((bt) => bt.id === benefitTypeId)

  const memberLoans = memberId ? getMemberLoans(memberId) : []
  const memberContributions = memberId ? getAllContributions().filter((c) => c.memberId === memberId && c.status === "Posted") : []
  const totalContributions = memberContributions.reduce((sum, c) => sum + c.amount, 0)
  const activeLoans = memberLoans.filter((l) => ["Active", "Overdue", "Released"].includes(l.status))
  const overdueLoans = memberLoans.filter((l) => l.status === "Overdue")
  const outstandingLoanBalance = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0)
  const memberBenefits = memberId ? getMemberBenefits(memberId) : []
  const priorBenefitOfType = memberBenefits.filter((b) => b.benefitTypeId === benefitTypeId && ["Released", "Completed"].includes(b.status))
  const pendingBenefitOfType = memberBenefits.some((b) => b.benefitTypeId === benefitTypeId && ["Draft", "Submitted", "Under Review", "For Approval"].includes(b.status))

  const memberPabaonDeductions = memberId
    ? getAllDeductions().filter((d) => d.memberId === memberId && d.status === "Posted" && d.deductionTypeCode === "pabaon")
    : []

  const isSiblingSchedule = benefitType?.name === NUCLEAR_MORTUARY_BENEFIT_NAME && member?.civilStatus !== "Married"
  const siblingSiblingBeneficiaries = member?.beneficiaries.filter((b) => /sibling|brother|sister/i.test(b.relationship)) ?? []
  const siblingScheduleTotal = siblingBeneficiaryIds.slice(0, 3).reduce((sum, _id, i) => sum + SIBLING_SCHEDULE[i], 0)

  const monthsPaid = benefitType?.prorationBasis === "pabaon"
    ? countDistinctPeriods(memberPabaonDeductions.map((d) => d.period))
    : countDistinctPeriods(memberContributions.map((c) => c.contributionPeriod))
  const prorationPreview = benefitType && benefitType.prorationTiers.length > 0 && !isSiblingSchedule
    ? computeProratedAmount(benefitType.prorationTiers, benefitType.fyAmounts, benefitType.maximumAmount, monthsPaid, new Date(applicationDate).getFullYear())
    : null
  const isComputedAmount = Boolean(prorationPreview) || isSiblingSchedule

  React.useEffect(() => {
    if (isSiblingSchedule) {
      setRequestedAmount(siblingScheduleTotal)
    } else if (prorationPreview) {
      setRequestedAmount(prorationPreview.amount)
    } else if (benefitType) {
      setRequestedAmount((prev) => prev ?? benefitType.defaultAmount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benefitType, prorationPreview?.amount, isSiblingSchedule, siblingScheduleTotal])

  React.useEffect(() => {
    if (benefitType) {
      setRequirements((prev) => Object.fromEntries(benefitType.requiredDocuments.map((d) => [d, prev[d] ?? false])))
      setRecipientNames((prev) => prev.length > 0 ? prev : member?.fullName ? [member.fullName] : [])
    }
  }, [benefitType, member])

  React.useEffect(() => {
    if (!existingBenefit) return
    setMemberId(existingBenefit.memberId)
    setBenefitTypeId(existingBenefit.benefitTypeId)
    setRequestedAmount(existingBenefit.requestedAmount || undefined)
    setIncidentDate(existingBenefit.incidentDate ?? "")
    setReason(existingBenefit.reason ?? "")
    setRecipientNames((existingBenefit.beneficiaryOrRecipient ?? "").split(",").map((name) => name.replace(/\s*\([^)]*\)\s*$/, "").trim()).filter(Boolean))
    setRequirements(Object.fromEntries((existingBenefit.requirements ?? []).map((r) => [r.label, r.completed])))
    setStep(existingBenefit.draftCurrentStep ?? 1)
  }, [existingBenefit])

  const isDraftContext = isEdit ? existingBenefit?.status === "Draft" : false

  const benefitDraft = useDraft<CreateBenefitApplicationInput, BenefitApplication>({
    draftId: isEdit ? id : undefined,
    create: createBenefitApplication,
    update: updateBenefitApplication,
    getId: (b) => b.id,
    onSaved: (b) => {
      queryClient.setQueryData(["benefits", b.id], b)
      queryClient.invalidateQueries({ queryKey: ["benefits"] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save draft."),
  })

  const eligibilityItems = member && benefitType
    ? evaluateBenefitEligibility(member, benefitType, requestedAmount, priorBenefitOfType.length, pendingBenefitOfType)
    : []
  const eligibilityResult: EligibilityResult = eligibilityItems.length > 0 ? resultFor(eligibilityItems) : "Not Eligible"
  const isBlocked = eligibilityResult === "Not Eligible" && !(overrideEnabled && overrideReason.trim() && overrideConfirmed)

  const requirementEntries = benefitType ? benefitType.requiredDocuments.map((label) => ({ label, completed: !!requirements[label] })) : []
  const missingRequirements = requirementEntries.filter((r) => !r.completed)

  const recipientName = recipientNames.join(", ")
  const recipientLabel = recipientNames.map((name) => {
    const beneficiary = member?.beneficiaries.find((item) => item.fullName === name)
    return recipientType === "Beneficiary" && beneficiary ? `${name} (${beneficiary.relationship})` : name
  }).join(", ")

  const draftSnapshot: CreateBenefitApplicationInput = {
    memberId,
    benefitTypeId: benefitTypeId || undefined,
    requestedAmount,
    incidentDate: incidentDate || undefined,
    reason: reason || undefined,
    beneficiaryOrRecipient: recipientName ? recipientLabel : undefined,
    requirements: requirementEntries,
    asDraft: true,
    draftCurrentStep: step,
  }

  async function saveDraft() {
    if (!memberId) {
      toast.error("Select a member before saving a draft.")
      return
    }
    try {
      await benefitDraft.save(draftSnapshot)
      toast.success("Draft saved successfully.")
    } catch {}
  }

  const autosave = useAutosaveDraft(draftSnapshot, (snap) => (memberId ? benefitDraft.save(snap) : Promise.resolve(undefined)), {
    enabled: Boolean(memberId) && Boolean(benefitDraft.draftId) && (!isEdit || isDraftContext) && benefitDraft.status !== "saving" && !isSubmitting,
    delayMs: 30000,
  })

  const hasUnsavedChanges = Boolean(memberId) && !successDialog
  const { showPrompt: showUnsavedPrompt, promptLeave, resolvePrompt } = useUnsavedChanges(hasUnsavedChanges)

  function canProceedFromStep(s: number): boolean {
    if (s === 1) return !!member
    if (s === 2) {
      if (isSiblingSchedule && siblingBeneficiaryIds.length === 0) return false
      return !!benefitTypeId && !!requestedAmount && !!reason.trim() && !!recipientName.trim() && !!assignedOfficer.trim()
    }
    if (s === 3) return !isBlocked
    return true
  }

  function goNext() {
    if (!canProceedFromStep(step)) {
      toast.error("Please complete the required fields before continuing.")
      return
    }
    setStep((s) => Math.min(STEPS.length, s + 1))
    if (memberId && benefitDraft.draftId) void autosave.triggerNow()
  }
  function goBack() {
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleSubmit(asDraft: boolean) {
    if (!member) return
    if (!asDraft) {
      if (!benefitType || !requestedAmount) return
      if (isBlocked) {
        toast.error("This application cannot be submitted until eligibility is met or overridden.")
        return
      }
      if (!agree) {
        toast.error("Please confirm the information has been reviewed and is accurate.")
        return
      }
    }
    setIsSubmitting(true)
    try {
      const benefit = await benefitDraft.save({
        memberId: member.id,
        benefitTypeId: benefitType?.id,
        requestedAmount,
        incidentDate: incidentDate || undefined,
        reason: reason || undefined,
        beneficiaryOrRecipient: recipientName ? recipientLabel : undefined,
        requirements: requirementEntries,
        asDraft,
        draftCurrentStep: step,
      })
      if (asDraft) {
        toast.success("Draft saved successfully.")
      } else {
        toast.success("Benefit application submitted successfully.")
        setSuccessDialog({ id: benefit.id, applicationNumber: benefit.applicationNumber })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save the benefit application.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetWizard() {
    setStep(1)
    setMemberId("")
    setBenefitTypeId("")
    setRequestedAmount(undefined)
    setIncidentDate("")
    setReason("")
    setRecipientNames([])
    setRemarks("")
    setOverrideEnabled(false)
    setOverrideReason("")
    setOverrideConfirmed(false)
    setRequirements({})
    setFileMeta(null)
    setSiblingBeneficiaryIds([])
    setAgree(false)
    setSuccessDialog(null)
  }

  if (isEdit && isLoadingBenefit) {
    return <FormSkeleton fields={["select", "text", "date", "select"]} columns={2} showUpload />
  }

  return (
    <div className="space-y-6 pb-20 mx-auto px-4 md:px-0">
      <PageHeader
        title={isDraftContext ? "Continue Benefit Draft" : "Create Benefit Application"}
        description="Encode a benefit application based on the physical documents submitted by the member."
        actions={isDraftContext && <DraftStatusBadge status="Draft" />}
      />

      {/* Step Indicator Panel */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
        <WizardStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* STEP 1: Select Member */}
      {step === 1 && (
        <FormSection title="Step 1 · Select Member">
          <MemberSelectionStep
            selectedMemberId={memberId || undefined}
            member={member}
            onSelect={setMemberId}
            totalContributions={totalContributions}
            outstandingLoanBalance={outstandingLoanBalance}
            activeLoanCount={activeLoans.length}
            overdueLoanCount={overdueLoans.length}
            extra={
              memberBenefits.length > 0 ? (
                <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground/90 shadow-inner flex items-center gap-2.5">
                  <Layers className="size-4 text-primary" />
                  <span>
                    <strong className="text-foreground">Recent Benefits: </strong>
                    {memberBenefits.slice(0, 3).map((b) => `${b.benefitTypeName} (${b.status})`).join(", ")}
                  </span>
                </div>
              ) : undefined
            }
          />
        </FormSection>
      )}

      {/* STEP 2: Benefit Details Form */}
      {step === 2 && (
        <FormSection title="Step 2 · Benefit Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Application Date <span className="text-destructive font-bold">*</span>
              </Label>
              <Input type="date" value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} className="h-10 text-sm" />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Benefit Type <span className="text-destructive font-bold">*</span>
              </Label>
              <CommandSelect
                className="w-full h-10 text-sm bg-background border-border hover:bg-accent/40 transition-all"
                value={benefitTypeId}
                onValueChange={(v) => setBenefitTypeId(v ?? "")}
                options={benefitTypes.filter((bt) => bt.status === "Active").map((bt) => ({ value: bt.id, label: bt.name }))}
                placeholder="Select benefit type"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Requested Amount <span className="text-destructive font-bold">*</span>
              </Label>
              {isComputedAmount ? (
                /* Dynamic Computation Display Block */
                <div className="space-y-2 bg-muted/20 border border-border/60 rounded-xl p-4 shadow-inner">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 block">Calculated System Amount</span>
                  <div className="text-xl font-bold text-foreground">{formatCurrency(requestedAmount ?? 0)}</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isSiblingSchedule
                      ? "Evaluated based on the unmarried member's fixed sibling mortuary schedule."
                      : `Automated proration: Based on ${monthsPaid} month(s) paid (${prorationPreview?.tier ? `${prorationPreview.tier.percentage}% tier` : "no matching tier"}). Not editable.`}
                  </p>
                </div>
              ) : (
                <CurrencyInput value={requestedAmount} onChange={setRequestedAmount} />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Incident Date</Label>
              <Input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className="h-10 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Recipient Type</Label>
              <CommandSelect
                className="w-full h-10 text-sm bg-background border-border hover:bg-accent/40 transition-all"
                value={recipientType}
                onValueChange={(v) => {
                  const nextType = (v ?? "Member") as "Member" | "Beneficiary"
                  setRecipientType(nextType)
                  setRecipientNames(nextType === "Member" && member ? [member.fullName] : [])
                }}
                options={[
                  { value: "Member", label: "Member" },
                  { value: "Beneficiary", label: "Beneficiary" },
                ]}
                hideSearch
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Recipient Name <span className="text-destructive font-bold">*</span>
              </Label>
              <RecipientMultiSelect
                values={recipientNames}
                onChange={setRecipientNames}
                options={recipientType === "Member"
                  ? (member ? [{ value: member.fullName, label: member.fullName, description: "Member" }] : [])
                  : (member?.beneficiaries.map((beneficiary) => ({
                      value: beneficiary.fullName,
                      label: beneficiary.fullName,
                      description: beneficiary.relationship,
                    })) ?? [])}
                placeholder={recipientType === "Member" ? "Select member" : "Select one or more beneficiaries"}
              />
            </div>

            {recipientType === "Beneficiary" && (
              <>
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Relationship to Member</Label>
                  <Input
                    value={recipientNames.map((name) => member?.beneficiaries.find((beneficiary) => beneficiary.fullName === name)?.relationship).filter(Boolean).join(", ")}
                    placeholder="Based on selection"
                    disabled
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Contact Number</Label>
                  <Input
                    value={recipientNames.map((name) => member?.beneficiaries.find((beneficiary) => beneficiary.fullName === name)?.contactNumber).filter(Boolean).join(", ")}
                    placeholder="No registered contact number"
                    disabled
                    className="h-10 text-sm"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Assigned Benefits Officer <span className="text-destructive font-bold">*</span>
              </Label>
              <BenefitsOfficerCommandSelect value={assignedOfficer} onValueChange={setAssignedOfficer} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Purpose / Reason <span className="text-destructive font-bold">*</span>
              </Label>
              <Textarea rows={2} placeholder="e.g. Hospitalization, bereavement, calamity assistance" value={reason} onChange={(e) => setReason(e.target.value)} className="text-sm bg-background" />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Remarks</Label>
              <Textarea rows={2} placeholder="Additional notes about this application (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="text-sm bg-background" />
            </div>
          </div>

          {/* Sibling Schedule Picker — Nuclear Mortuary, unmarried member only */}
          {isSiblingSchedule && (
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs shadow-inner">
              <p className="mb-2 font-bold uppercase tracking-wider text-[10px] text-foreground flex items-center gap-1.5">
                <Users className="size-4 text-primary" />
                Sibling Mortuary Schedule (Unmarried Member)
              </p>
              <p className="mb-3 text-muted-foreground">
                Select up to 3 siblings in claim order — 1st sibling {formatCurrency(SIBLING_SCHEDULE[0])}, 2nd {formatCurrency(SIBLING_SCHEDULE[1])}, 3rd {formatCurrency(SIBLING_SCHEDULE[2])}.
              </p>
              {siblingSiblingBeneficiaries.length === 0 ? (
                <p className="font-medium text-warning">No beneficiary on record is tagged as a sibling. Add one to the member's beneficiary list first.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {siblingSiblingBeneficiaries.map((b) => {
                    const order = siblingBeneficiaryIds.indexOf(b.id)
                    const checked = order !== -1
                    return (
                      <label 
                        key={b.id} 
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl border p-3.5 cursor-pointer transition-all hover:shadow-sm",
                          checked 
                            ? "bg-primary/[0.02] border-primary/40 shadow-sm" 
                            : "bg-card border-border hover:border-border/80"
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <Checkbox
                            checked={checked}
                            disabled={!checked && siblingBeneficiaryIds.length >= 3}
                            onCheckedChange={(v) =>
                              setSiblingBeneficiaryIds((prev) => (v ? [...prev, b.id].slice(0, 3) : prev.filter((id) => id !== b.id)))
                            }
                          />
                          <span className="font-semibold text-foreground text-sm">{b.fullName}</span>
                          <span className="text-xs text-muted-foreground">({b.relationship})</span>
                        </span>
                        {checked && <StatusBadge label={`${formatCurrency(SIBLING_SCHEDULE[order])} · #${order + 1}`} tone="info" />}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Policy Information Panel */}
          {benefitType && (
            <div className="mt-6 rounded-xl border border-border bg-muted/20 p-5 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary" />
              <p className="mb-3.5 font-bold uppercase tracking-wider text-[10px] text-foreground flex items-center gap-2">
                <Info className="size-4 text-primary" />
                {benefitType.name} — Core Policy Information
              </p>
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 text-xs text-muted-foreground sm:grid-cols-3 pt-1">
                <div className="space-y-0.5">
                  <span className="block text-[10px] uppercase text-muted-foreground/60">Default Amount</span>
                  <strong className="text-sm font-semibold text-foreground">{formatCurrency(benefitType.defaultAmount)}</strong>
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[10px] uppercase text-muted-foreground/60">Maximum Limit</span>
                  <strong className="text-sm font-semibold text-foreground">{formatCurrency(benefitType.maximumAmount)}</strong>
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[10px] uppercase text-muted-foreground/60">Min. Tenure Required</span>
                  <strong className="text-sm font-semibold text-foreground">{benefitType.requiredMembershipMonths} months</strong>
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[10px] uppercase text-muted-foreground/60">Frequency Limit</span>
                  <strong className="text-sm font-semibold text-foreground">{benefitType.frequencyLimit}</strong>
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[10px] uppercase text-muted-foreground/60">Officer Approval</span>
                  <strong className="text-sm font-semibold text-foreground">{benefitType.approvalRequired ? "Mandatory" : "Optional"}</strong>
                </div>
              </div>
              {requestedAmount != null && requestedAmount > benefitType.maximumAmount && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/25 p-3 text-xs font-semibold text-destructive animate-pulse">
                  <AlertTriangle className="size-4 shrink-0" /> 
                  Requested amount exceeds the maximum limit for this benefit type.
                </div>
              )}
            </div>
          )}
        </FormSection>
      )}

      {/* STEP 3: Eligibility & Requirements Checklist */}
      {step === 3 && (
        <FormSection title="Step 3 · Eligibility & Requirements">
          {eligibilityItems.length === 0 ? (
            <AlertBanner tone="warning" title="Incomplete information" description="Select a member and benefit type first." />
          ) : (
            <div className="space-y-6">
              <EligibilityChecklist items={eligibilityItems} result={eligibilityResult} />

              {eligibilityResult === "Not Eligible" && canOverride && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
                  <label className="flex items-center gap-2.5 text-sm font-semibold text-foreground cursor-pointer">
                    <Checkbox checked={overrideEnabled} onCheckedChange={(v) => setOverrideEnabled(!!v)} />
                    Override eligibility requirements for this application
                  </label>
                  {overrideEnabled && (
                    <div className="mt-4 space-y-4 animate-in fade-in duration-200">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                          Override Reason <span className="text-destructive font-bold">*</span>
                        </Label>
                        <Textarea rows={2} placeholder="Explain why this application should proceed despite failing eligibility…" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} className="text-sm bg-background" />
                      </div>
                      <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer">
                        <Checkbox checked={overrideConfirmed} onCheckedChange={(v) => setOverrideConfirmed(!!v)} />
                        I confirm I am authorized to override eligibility for this application.
                      </label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="h-9 gap-1.5 text-xs hover:bg-accent/80 active:scale-97 transition-all"
                        onClick={() => setShowOverrideDialog(true)} 
                        disabled={!overrideReason.trim() || !overrideConfirmed}
                      >
                        <ShieldAlert className="size-3.5" /> Confirm Override
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {eligibilityResult === "Not Eligible" && !canOverride && (
                <AlertBanner tone="danger" title="Eligibility override not available" description="You do not have permission to override eligibility." />
              )}

              <div className="space-y-3">
                <p className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  Requirements Checklist
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {requirementEntries.map((req) => (
                    <div 
                      key={req.label} 
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition-all duration-200",
                        requirements[req.label]
                          ? "bg-emerald-500/[0.02] border-emerald-500/25 shadow-sm"
                          : "bg-card border-border/60 hover:border-border"
                      )}
                    >
                      <label className="flex items-center gap-2.5 text-sm text-foreground font-medium cursor-pointer">
                        <Checkbox checked={requirements[req.label]} onCheckedChange={(v) => setRequirements((prev) => ({ ...prev, [req.label]: !!v }))} />
                        {req.label}
                      </label>
                      <StatusBadge label={req.completed ? "Submitted" : "Missing"} tone={req.completed ? "success" : "warning"} />
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <FileUploader
                    label="Other Supporting Document (optional)"
                    fileName={fileMeta?.fileName}
                    onFileSelect={(file) => setFileMeta(file ? { fileName: file.name, fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB` } : null)}
                  />
                </div>
                {missingRequirements.length > 0 && (
                  <AlertBanner tone="warning" className="mt-4 animate-in fade-in duration-250" title={`${missingRequirements.length} requirement(s) missing`} description="You may still proceed, but missing requirements will be flagged in the review step." />
                )}
              </div>
            </div>
          )}
        </FormSection>
      )}

      {/* STEP 4: Review Block & Consent */}
      {step === 4 && member && benefitType && (
        <FormSection title="Step 4 · Review and Submit">
          <div className="space-y-4">
            <ReviewBlock title="Member Overview">
              <ReviewRow label="Full Name" value={member.fullName} />
              <ReviewRow label="Member Number" value={member.memberNumber} />
              <ReviewRow label="Office Name" value={member.officeName} />
            </ReviewBlock>
            <ReviewBlock title="Application Overview">
              <ReviewRow label="Benefit Type" value={benefitType.name} />
              <ReviewRow label="Requested Amount" value={formatCurrency(requestedAmount ?? 0)} />
              <ReviewRow label="Recipient Name" value={recipientName} />
              <ReviewRow label="Application Reason" value={reason} />
            </ReviewBlock>
            <ReviewBlock title="Eligibility Audit">
              <ReviewRow label="System Result" value={eligibilityResult} />
              {overrideEnabled && <ReviewRow label="Override Reason" value={overrideReason} />}
            </ReviewBlock>
            <ReviewBlock title="Requirements Status">
              <ReviewRow label="Submitted Docs" value={`${requirementEntries.filter((r) => r.completed).length} / ${requirementEntries.length}`} />
            </ReviewBlock>

            {isBlocked && (
              <AlertBanner tone="danger" title="Cannot submit" description="This application does not meet eligibility requirements and has not been overridden. You may still save it as a draft." />
            )}

            <label className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/10 p-3.5 text-xs text-foreground font-medium cursor-pointer">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
              I confirm that the information has been reviewed and is accurate.
            </label>
          </div>
        </FormSection>
      )}

      {/* Floating Action Bar */}
      <div className="sticky bottom-4 z-15 flex flex-wrap items-center justify-between gap-3 border border-border bg-background/80 backdrop-blur-md px-6 py-4 shadow-lg transition-all duration-200">
        <Button variant="outline" onClick={() => promptLeave(() => navigate("/benefits"))} className="h-9 text-xs">Cancel</Button>
        <div className="flex flex-wrap items-center gap-2">
          {step > 1 && <Button variant="outline" onClick={goBack} className="h-9 text-xs">Previous</Button>}
          <SaveDraftButton status={benefitDraft.status} lastSavedAt={benefitDraft.lastSavedAt} onClick={saveDraft} disabled={!memberId || isSubmitting} />
          {step < STEPS.length ? (
            <Button onClick={goNext} disabled={!canProceedFromStep(step)} className="h-9 text-xs">Next</Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={isSubmitting || isBlocked || !agree} aria-busy={isSubmitting} className="h-9 text-xs gap-1.5 shadow-sm active:scale-97 transition-all">
              {isSubmitting ? <Loader2 className="animate-spin size-3.5" aria-hidden="true" /> : <FilePlus2 className="size-3.5" aria-hidden="true" />}
              {isSubmitting ? "Submitting…" : "Submit Application"}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showOverrideDialog}
        onOpenChange={setShowOverrideDialog}
        title="Confirm eligibility override"
        description="You are about to override a failed eligibility check for this application."
        confirmLabel="Confirm Override"
        destructive
        onConfirm={() => {
          setShowOverrideDialog(false)
          toast.success("Eligibility override applied.")
        }}
      />

      <UnsavedChangesDialog
        open={showUnsavedPrompt}
        onOpenChange={(open) => !open && resolvePrompt("stay")}
        isSaving={benefitDraft.status === "saving"}
        onSaveAndLeave={async () => {
          await saveDraft()
          resolvePrompt("leave")
        }}
        onLeaveWithoutSaving={() => resolvePrompt("leave")}
      />

      {/* Success Dialog overlay */}
      <Dialog open={!!successDialog} onOpenChange={(open) => !open && setSuccessDialog(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-6">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">Application Saved</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Reference <span className="font-bold text-foreground">{successDialog?.applicationNumber}</span> has been recorded successfully.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-4">
            <Button className="w-full h-9 text-xs shadow-sm" onClick={() => successDialog && navigate(`/benefits/${successDialog.id}`)}>
              View Application Details
            </Button>
            <Button variant="outline" className="w-full h-9 text-xs" onClick={resetWizard}>
              Create Another Application
            </Button>
            <Button variant="ghost" className="w-full h-9 text-xs text-muted-foreground" onClick={() => navigate("/benefits")}>
              Back to List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-5 shadow-sm">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{title}</p>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</dl>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border/20 pb-2.5 last:border-0 sm:border-b-0 sm:pb-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-bold text-foreground truncate">{value}</dd>
    </div>
  )
}

function RecipientMultiSelect({
  values,
  onChange,
  options,
  placeholder,
}: {
  values: string[]
  onChange: (values: string[]) => void
  options: Array<{ value: string; label: string; description: string }>
  placeholder: string
}) {
  const [open, setOpen] = React.useState(false)

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" className="min-h-10 h-auto w-full justify-between px-3 py-2 font-normal" />}
      >
        {values.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          <span className="flex min-w-0 flex-wrap gap-1.5">
            {values.map((value) => (
              <span key={value} className="max-w-full truncate rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                {value}
              </span>
            ))}
          </span>
        )}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search recipient…" />
          <CommandList>
            <CommandEmpty>No registered recipient found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={`${option.label} ${option.description}`} onSelect={() => toggle(option.value)}>
                  <Check className={`size-4 ${values.includes(option.value) ? "opacity-100" : "opacity-0"}`} />
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{option.description}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
