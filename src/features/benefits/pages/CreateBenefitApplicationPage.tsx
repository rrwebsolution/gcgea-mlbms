import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, FilePlus2, Loader2, ShieldAlert } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { WizardStepIndicator } from "@/components/shared/WizardStepIndicator"
import { MemberSelectionStep } from "@/components/shared/MemberSelectionStep"
import { EligibilityChecklist, type EligibilityResult } from "@/components/shared/EligibilityChecklist"
import { FileUploader } from "@/components/shared/FileUploader"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getMember } from "@/services/members.service"
import { getAllContributions } from "@/services/contributions.service"
import { getMemberLoans } from "@/services/loans.service"
import { createBenefitApplication, getBenefit, listBenefitTypes, getMemberBenefits, updateBenefitApplication, type CreateBenefitApplicationInput } from "@/services/benefits.service"
import { evaluateBenefitEligibility, resultFor } from "@/utils/eligibility"
import { formatCurrency } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import { useDraft } from "@/hooks/useDraft"
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft"
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges"
import type { BenefitApplication } from "@/types"

const STEPS = ["Select Member", "Benefit Details", "Eligibility & Requirements", "Review & Submit"]

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
  const [benefitTypeId, setBenefitTypeId] = React.useState("")
  const [requestedAmount, setRequestedAmount] = React.useState<number>()
  const [applicationDate, setApplicationDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [incidentDate, setIncidentDate] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [recipientType, setRecipientType] = React.useState<"Member" | "Beneficiary">("Member")
  const [recipientName, setRecipientName] = React.useState("")
  const [relationship, setRelationship] = React.useState("")
  const [contactNumber, setContactNumber] = React.useState("")
  const [assignedOfficer, setAssignedOfficer] = React.useState(user?.fullName ?? "")
  const [remarks, setRemarks] = React.useState("")

  const [overrideEnabled, setOverrideEnabled] = React.useState(false)
  const [overrideReason, setOverrideReason] = React.useState("")
  const [overrideConfirmed, setOverrideConfirmed] = React.useState(false)
  const [showOverrideDialog, setShowOverrideDialog] = React.useState(false)

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

  React.useEffect(() => {
    if (benefitType) {
      setRequestedAmount((prev) => prev ?? benefitType.defaultAmount)
      setRequirements((prev) => Object.fromEntries(benefitType.requiredDocuments.map((d) => [d, prev[d] ?? false])))
      setRecipientName((prev) => prev || member?.fullName || "")
    }
  }, [benefitType, member])

  React.useEffect(() => {
    if (!existingBenefit) return
    setMemberId(existingBenefit.memberId)
    setBenefitTypeId(existingBenefit.benefitTypeId)
    setRequestedAmount(existingBenefit.requestedAmount || undefined)
    setIncidentDate(existingBenefit.incidentDate ?? "")
    setReason(existingBenefit.reason ?? "")
    setRecipientName(existingBenefit.beneficiaryOrRecipient ?? "")
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

  const recipientLabel = `${recipientName}${recipientType === "Beneficiary" && relationship ? ` (${relationship})` : ""}`

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
    } catch {
      // Surfaced via benefitDraft's onError above.
    }
  }

  const autosave = useAutosaveDraft(draftSnapshot, (snap) => (memberId ? benefitDraft.save(snap) : Promise.resolve(undefined)), {
    enabled: Boolean(memberId) && (!isEdit || isDraftContext) && benefitDraft.status !== "saving" && !isSubmitting,
    delayMs: 30000,
  })

  const hasUnsavedChanges = Boolean(memberId) && !successDialog
  const { showPrompt: showUnsavedPrompt, promptLeave, resolvePrompt } = useUnsavedChanges(hasUnsavedChanges)

  function canProceedFromStep(s: number): boolean {
    if (s === 1) return !!member
    if (s === 2) return !!benefitTypeId && !!requestedAmount && !!reason.trim() && !!recipientName.trim() && !!assignedOfficer.trim()
    if (s === 3) return !isBlocked
    return true
  }

  function goNext() {
    if (!canProceedFromStep(step)) {
      toast.error("Please complete the required fields before continuing.")
      return
    }
    setStep((s) => Math.min(STEPS.length, s + 1))
    if (memberId) void autosave.triggerNow()
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
    setRecipientName("")
    setRelationship("")
    setContactNumber("")
    setRemarks("")
    setOverrideEnabled(false)
    setOverrideReason("")
    setOverrideConfirmed(false)
    setRequirements({})
    setFileMeta(null)
    setAgree(false)
    setSuccessDialog(null)
  }

  if (isEdit && isLoadingBenefit) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center animate-pulse" role="status">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading benefit draft</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title={isDraftContext ? "Continue Benefit Draft" : "Create Benefit Application"}
        description="Encode a benefit application based on the physical documents submitted by the member."
        actions={isDraftContext && <DraftStatusBadge status="Draft" />}
      />

      {/* Step Indicator Panel */}
      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
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
                <div className="rounded-xl border border-border/40 bg-muted/10 p-4 text-xs text-muted-foreground/90 shadow-inner">
                  <span className="font-semibold text-foreground">Recent Benefits: </span>
                  {memberBenefits.slice(0, 3).map((b) => `${b.benefitTypeName} (${b.status})`).join(", ")}
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
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                Application Date <span className="text-destructive font-bold">*</span>
              </Label>
              <Input type="date" value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                Benefit Type <span className="text-destructive font-bold">*</span>
              </Label>
              <Select value={benefitTypeId} onValueChange={(v) => setBenefitTypeId(v ?? "")}>
                <SelectTrigger className="w-full h-10 text-sm bg-background border-border/80 hover:bg-accent/40 transition-all">
                  <SelectValue placeholder="Select benefit type" />
                </SelectTrigger>
                <SelectContent>
                  {benefitTypes.filter((bt) => bt.status === "Active").map((bt) => (
                    <SelectItem key={bt.id} value={bt.id} className="text-xs">{bt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                Requested Amount <span className="text-destructive font-bold">*</span>
              </Label>
              <CurrencyInput value={requestedAmount} onChange={setRequestedAmount} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">Incident Date</Label>
              <Input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">Recipient Type</Label>
              <Select value={recipientType} onValueChange={(v) => setRecipientType((v ?? "Member") as "Member" | "Beneficiary")}>
                <SelectTrigger className="w-full h-10 text-sm bg-background border-border/80 hover:bg-accent/40 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Member" className="text-xs">Member</SelectItem>
                  <SelectItem value="Beneficiary" className="text-xs">Beneficiary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                Recipient Name <span className="text-destructive font-bold">*</span>
              </Label>
              <Input placeholder="e.g. Juan Dela Cruz" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="h-10 text-sm" />
            </div>
            {recipientType === "Beneficiary" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">Relationship to Member</Label>
                  <Input placeholder="e.g. Spouse, Child, Parent" value={relationship} onChange={(e) => setRelationship(e.target.value)} className="h-10 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">Contact Number</Label>
                  <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="09XXXXXXXXX" className="h-10 text-sm" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                Assigned Benefits Officer <span className="text-destructive font-bold">*</span>
              </Label>
              <Input placeholder="e.g. Juan Dela Cruz" value={assignedOfficer} onChange={(e) => setAssignedOfficer(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">
                Purpose / Reason <span className="text-destructive font-bold">*</span>
              </Label>
              <Textarea rows={2} placeholder="e.g. Hospitalization, bereavement, calamity assistance" value={reason} onChange={(e) => setReason(e.target.value)} className="text-sm bg-background" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/90">Remarks</Label>
              <Textarea rows={2} placeholder="Additional notes about this application (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="text-sm bg-background" />
            </div>
          </div>

          {/* Policy Information Panel */}
          {benefitType && (
            <div className="mt-5 rounded-xl border border-border/50 bg-muted/10 p-4 text-xs shadow-inner">
              <p className="mb-2.5 font-bold uppercase tracking-wider text-[10px] text-foreground">
                {benefitType.name} — Policy Information
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground sm:grid-cols-3">
                <span>Default Amount: <strong className="text-foreground">{formatCurrency(benefitType.defaultAmount)}</strong></span>
                <span>Maximum Amount: <strong className="text-foreground">{formatCurrency(benefitType.maximumAmount)}</strong></span>
                <span>Min. Membership: <strong className="text-foreground">{benefitType.requiredMembershipMonths} mos.</strong></span>
                <span>Frequency Limit: <strong className="text-foreground">{benefitType.frequencyLimit}</strong></span>
                <span>Approval Required: <strong className="text-foreground">{benefitType.approvalRequired ? "Yes" : "No"}</strong></span>
              </div>
              {requestedAmount != null && requestedAmount > benefitType.maximumAmount && (
                <p className="mt-3 flex items-center gap-1.5 font-semibold text-destructive">
                  <AlertTriangle className="size-4" /> Requested amount exceeds the maximum for this benefit type.
                </p>
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
            <div className="space-y-5">
              <EligibilityChecklist items={eligibilityItems} result={eligibilityResult} />

              {eligibilityResult === "Not Eligible" && canOverride && (
                <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-3">
                  <label className="flex items-center gap-2.5 text-sm font-semibold text-foreground cursor-pointer">
                    <Checkbox checked={overrideEnabled} onCheckedChange={(v) => setOverrideEnabled(!!v)} />
                    Override eligibility for this application
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

              <div>
                <p className="mb-3 text-sm font-bold tracking-tight text-foreground">Requirements Checklist</p>
                <div className="space-y-2">
                  {requirementEntries.map((req) => (
                    <div key={req.label} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3.5 hover:border-border transition-all">
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
      <div className="sticky bottom-0 -mx-4 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/85 bg-background/80 backdrop-blur-md px-6 py-4 sm:mx-0 sm:rounded-xl sm:border sm:shadow-lg transition-all">
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
    <div className="rounded-xl border border-border/60 bg-muted/5 p-4 shadow-sm">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{title}</p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</dl>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/20 pb-2 last:border-0 sm:border-b-0 sm:pb-0">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground truncate">{value}</dd>
    </div>
  )
}