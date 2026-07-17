import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, FilePlus2, Loader2, Save, ShieldAlert } from "lucide-react"
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
import { createBenefitApplication, getBenefitTypesSync, getMemberBenefits } from "@/services/benefits.service"
import { evaluateBenefitEligibility, resultFor } from "@/utils/eligibility"
import { formatCurrency } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"

const STEPS = ["Select Member", "Benefit Details", "Eligibility & Requirements", "Review & Submit"]

export default function CreateBenefitApplicationPage() {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuth()
  const canOverride = hasPermission("benefits.override_eligibility")

  const [step, setStep] = React.useState(1)
  const [memberId, setMemberId] = React.useState("")
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
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false)

  const { data: member } = useQuery({ queryKey: ["members", memberId], queryFn: () => getMember(memberId), enabled: !!memberId })
  const benefitTypes = getBenefitTypesSync()
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
      setRequirements(Object.fromEntries(benefitType.requiredDocuments.map((d) => [d, false])))
      setRecipientName((prev) => prev || member?.fullName || "")
    }
  }, [benefitType, member])

  const eligibilityItems = member && benefitType
    ? evaluateBenefitEligibility(member, benefitType, requestedAmount, priorBenefitOfType.length, pendingBenefitOfType)
    : []
  const eligibilityResult: EligibilityResult = eligibilityItems.length > 0 ? resultFor(eligibilityItems) : "Not Eligible"
  const isBlocked = eligibilityResult === "Not Eligible" && !(overrideEnabled && overrideReason.trim() && overrideConfirmed)

  const requirementEntries = benefitType ? benefitType.requiredDocuments.map((label) => ({ label, completed: !!requirements[label] })) : []
  const missingRequirements = requirementEntries.filter((r) => !r.completed)

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
  }
  function goBack() {
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleSubmit(asDraft: boolean) {
    if (!member || !benefitType || !requestedAmount) return
    if (!asDraft && isBlocked) {
      toast.error("This application cannot be submitted until eligibility is met or overridden.")
      return
    }
    if (!asDraft && !agree) {
      toast.error("Please confirm the information has been reviewed and is accurate.")
      return
    }
    setIsSubmitting(true)
    try {
      const benefit = await createBenefitApplication({
        memberId: member.id,
        memberNumber: member.memberNumber,
        memberName: member.fullName,
        officeName: member.officeName,
        benefitTypeId: benefitType.id,
        benefitTypeName: benefitType.name,
        requestedAmount,
        applicationDate,
        incidentDate: incidentDate || undefined,
        reason,
        beneficiaryOrRecipient: `${recipientName}${recipientType === "Beneficiary" && relationship ? ` (${relationship})` : ""}`,
        requirements: requirementEntries,
        remarks,
        asDraft,
        createdBy: user?.fullName ?? "System",
      })
      toast.success(asDraft ? "Benefit application saved as draft." : "Benefit application submitted successfully.")
      setSuccessDialog({ id: benefit.id, applicationNumber: benefit.applicationNumber })
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

  return (
    <div className="space-y-5 pb-16">
      <PageHeader title="Create Benefit Application" description="Encode a benefit application based on the physical documents submitted by the member." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <WizardStepIndicator steps={STEPS} currentStep={step} />
      </div>

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
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Recent Benefits: </span>
                  {memberBenefits.slice(0, 3).map((b) => `${b.benefitTypeName} (${b.status})`).join(", ")}
                </div>
              ) : undefined
            }
          />
        </FormSection>
      )}

      {step === 2 && (
        <FormSection title="Step 2 · Benefit Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Application Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Benefit Type <span className="text-destructive">*</span></Label>
              <Select value={benefitTypeId} onValueChange={(v) => setBenefitTypeId(v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select benefit type" /></SelectTrigger>
                <SelectContent>
                  {benefitTypes.filter((bt) => bt.status === "Active").map((bt) => (
                    <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Requested Amount <span className="text-destructive">*</span></Label>
              <CurrencyInput value={requestedAmount} onChange={setRequestedAmount} />
            </div>
            <div className="space-y-1.5">
              <Label>Incident Date</Label>
              <Input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Recipient Type</Label>
              <Select value={recipientType} onValueChange={(v) => setRecipientType((v ?? "Member") as "Member" | "Beneficiary")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Member">Member</SelectItem>
                  <SelectItem value="Beneficiary">Beneficiary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recipient Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Juan Dela Cruz" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            </div>
            {recipientType === "Beneficiary" && (
              <>
                <div className="space-y-1.5">
                  <Label>Relationship to Member</Label>
                  <Input placeholder="e.g. Spouse, Child, Parent" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Number</Label>
                  <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="09XXXXXXXXX" />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Assigned Benefits Officer <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Juan Dela Cruz" value={assignedOfficer} onChange={(e) => setAssignedOfficer(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Purpose / Reason <span className="text-destructive">*</span></Label>
              <Textarea rows={2} placeholder="e.g. Hospitalization, bereavement, calamity assistance" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Remarks</Label>
              <Textarea rows={2} placeholder="Additional notes about this application (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>

          {benefitType && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <p className="mb-1.5 font-medium text-foreground">{benefitType.name} — Policy Information</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground sm:grid-cols-3">
                <span>Default Amount: <strong className="text-foreground">{formatCurrency(benefitType.defaultAmount)}</strong></span>
                <span>Maximum Amount: <strong className="text-foreground">{formatCurrency(benefitType.maximumAmount)}</strong></span>
                <span>Min. Membership: <strong className="text-foreground">{benefitType.requiredMembershipMonths} mos.</strong></span>
                <span>Frequency Limit: <strong className="text-foreground">{benefitType.frequencyLimit}</strong></span>
                <span>Approval Required: <strong className="text-foreground">{benefitType.approvalRequired ? "Yes" : "No"}</strong></span>
              </div>
              {requestedAmount != null && requestedAmount > benefitType.maximumAmount && (
                <p className="mt-2 flex items-center gap-1 font-medium text-destructive">
                  <AlertTriangle className="size-3.5" /> Requested amount exceeds the maximum for this benefit type.
                </p>
              )}
            </div>
          )}
        </FormSection>
      )}

      {step === 3 && (
        <FormSection title="Step 3 · Eligibility & Requirements">
          {eligibilityItems.length === 0 ? (
            <AlertBanner tone="warning" title="Incomplete information" description="Select a member and benefit type first." />
          ) : (
            <div className="space-y-4">
              <EligibilityChecklist items={eligibilityItems} result={eligibilityResult} />

              {eligibilityResult === "Not Eligible" && canOverride && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Checkbox checked={overrideEnabled} onCheckedChange={(v) => setOverrideEnabled(!!v)} />
                    Override eligibility for this application
                  </label>
                  {overrideEnabled && (
                    <div className="mt-3 space-y-3">
                      <div className="space-y-1.5">
                        <Label>Override Reason <span className="text-destructive">*</span></Label>
                        <Textarea rows={2} placeholder="Explain why this application should proceed despite failing eligibility…" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <Checkbox checked={overrideConfirmed} onCheckedChange={(v) => setOverrideConfirmed(!!v)} />
                        I confirm I am authorized to override eligibility for this application.
                      </label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowOverrideDialog(true)} disabled={!overrideReason.trim() || !overrideConfirmed}>
                        <ShieldAlert /> Confirm Override
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {eligibilityResult === "Not Eligible" && !canOverride && (
                <AlertBanner tone="danger" title="Eligibility override not available" description="You do not have permission to override eligibility." />
              )}

              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">Requirements Checklist</p>
                <div className="space-y-2">
                  {requirementEntries.map((req) => (
                    <div key={req.label} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <Checkbox checked={requirements[req.label]} onCheckedChange={(v) => setRequirements((prev) => ({ ...prev, [req.label]: !!v }))} />
                        {req.label}
                      </label>
                      <StatusBadge label={req.completed ? "Submitted" : "Missing"} tone={req.completed ? "success" : "warning"} />
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <FileUploader
                    label="Other Supporting Document (optional)"
                    fileName={fileMeta?.fileName}
                    onFileSelect={(file) => setFileMeta(file ? { fileName: file.name, fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB` } : null)}
                  />
                </div>
                {missingRequirements.length > 0 && (
                  <AlertBanner tone="warning" className="mt-3" title={`${missingRequirements.length} requirement(s) missing`} description="You may still proceed, but missing requirements will be flagged in the review step." />
                )}
              </div>
            </div>
          )}
        </FormSection>
      )}

      {step === 4 && member && benefitType && (
        <FormSection title="Step 4 · Review and Submit">
          <div className="space-y-4">
            <ReviewBlock title="Member">
              <ReviewRow label="Name" value={member.fullName} />
              <ReviewRow label="Member Number" value={member.memberNumber} />
              <ReviewRow label="Office" value={member.officeName} />
            </ReviewBlock>
            <ReviewBlock title="Application">
              <ReviewRow label="Benefit Type" value={benefitType.name} />
              <ReviewRow label="Requested Amount" value={formatCurrency(requestedAmount ?? 0)} />
              <ReviewRow label="Recipient" value={recipientName} />
              <ReviewRow label="Reason" value={reason} />
            </ReviewBlock>
            <ReviewBlock title="Eligibility">
              <ReviewRow label="Result" value={eligibilityResult} />
              {overrideEnabled && <ReviewRow label="Override Reason" value={overrideReason} />}
            </ReviewBlock>
            <ReviewBlock title="Requirements">
              <ReviewRow label="Submitted" value={`${requirementEntries.filter((r) => r.completed).length} / ${requirementEntries.length}`} />
            </ReviewBlock>

            {isBlocked && (
              <AlertBanner tone="danger" title="Cannot submit" description="This application does not meet eligibility requirements and has not been overridden. You may still save it as a draft." />
            )}

            <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
              I confirm that the information has been reviewed and is accurate.
            </label>
          </div>
        </FormSection>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-3 sm:mx-0 sm:rounded-xl sm:border sm:shadow-sm">
        <Button variant="outline" onClick={() => setShowCancelConfirm(true)}>Cancel</Button>
        <div className="flex flex-wrap gap-2">
          {step > 1 && <Button variant="outline" onClick={goBack}>Previous</Button>}
          <Button variant="secondary" onClick={() => handleSubmit(true)} disabled={!member || isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} Save Draft
          </Button>
          {step < STEPS.length ? (
            <Button onClick={goNext} disabled={!canProceedFromStep(step)}>Next</Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={isSubmitting || isBlocked || !agree}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <FilePlus2 />} Submit Application
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

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancel this application?"
        description="Any information entered so far will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setShowCancelConfirm(false)
          navigate("/benefits")
        }}
      />

      <Dialog open={!!successDialog} onOpenChange={(open) => !open && setSuccessDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-6" />
            </div>
            <DialogTitle className="text-center">Application Saved</DialogTitle>
            <DialogDescription className="text-center">
              {successDialog?.applicationNumber} has been recorded successfully.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={() => successDialog && navigate(`/benefits/${successDialog.id}`)}>
              View Application
            </Button>
            <Button variant="outline" className="w-full" onClick={resetWizard}>
              Create Another
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/benefits")}>
              Back to Benefit List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{children}</dl>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm sm:block">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}
