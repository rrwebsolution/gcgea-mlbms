import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2, Loader2, RotateCw, ShieldAlert } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { WizardStepIndicator } from "@/components/shared/WizardStepIndicator"
import { ReloanEligibilityCard } from "@/features/loans/components/ReloanEligibilityCard"
import { FileUploader } from "@/components/shared/FileUploader"
import { FormSkeleton } from "@/components/shared/loaders/FormSkeleton"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { SaveDraftButton } from "@/components/shared/SaveDraftButton"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { getLoan, getReloanEligibility, listLoanTypes, createReloanDraft, updateLoanApplication, type CreateLoanApplicationInput } from "@/services/loans.service"
import { getMember } from "@/services/members.service"
import { getAllLoanPayments, listAllLoanPayments } from "@/services/loan-payments.service"
import { computeLoan, bracketForNetPay } from "@/utils/loan-math"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import { useDraft } from "@/hooks/useDraft"
import type { LoanApplication, LoanRequirementItem, PaymentMethod } from "@/types"

const STEPS = ["Previous Loan Summary", "Member & Eligibility", "Current Financial Info", "New Loan Details", "Computation", "Requirements", "Review & Submit"]

const REQUIREMENT_LABELS = [
  "Updated Payslip",
  "New Authorization for Salary Deduction",
  "New Promissory Note",
  "Valid Government ID",
]

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]

export default function ReloanWizardPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const canOverride = hasPermission("loans.override_eligibility")

  const [step, setStep] = React.useState(1)
  const [isCreatingDraft, setIsCreatingDraft] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [successDialog, setSuccessDialog] = React.useState<{ id: string; applicationNumber: string } | null>(null)

  // The route id is the *previous* loan on first entry; once a reloan draft
  // exists we replace the URL with the reloan's own id so a refresh resumes
  // correctly (application_type becomes "reloan" from then on).
  const { data: routeLoan, isLoading: isLoadingRouteLoan } = useQuery({
    queryKey: ["loans", id],
    queryFn: () => getLoan(id!),
    enabled: !!id,
  })
  const isResumingReloan = routeLoan?.applicationType === "reloan"
  const previousLoanId = isResumingReloan ? routeLoan?.previousLoanId : id
  const [reloanId, setReloanId] = React.useState<string | undefined>(undefined)
  React.useEffect(() => {
    if (isResumingReloan && routeLoan) setReloanId(routeLoan.id)
  }, [isResumingReloan, routeLoan])

  const { data: previousLoan, isLoading: isLoadingPrevious } = useQuery({
    queryKey: ["loans", previousLoanId],
    queryFn: () => getLoan(previousLoanId!),
    enabled: !!previousLoanId,
  })
  const { data: reloan } = useQuery({
    queryKey: ["loans", reloanId],
    queryFn: () => getLoan(reloanId!),
    enabled: !!reloanId,
  })
  const { data: member } = useQuery({
    queryKey: ["members", previousLoan?.memberId],
    queryFn: () => getMember(previousLoan!.memberId),
    enabled: !!previousLoan,
  })
  const { data: loanTypes = [] } = useQuery({ queryKey: ["loan-types"], queryFn: listLoanTypes })
  const { data: initialEligibility, isLoading: isLoadingInitialEligibility } = useQuery({
    queryKey: ["reloan-eligibility", previousLoanId],
    queryFn: () => getReloanEligibility(previousLoanId!),
    enabled: Boolean(previousLoanId) && !reloanId,
  })
  useQuery({ queryKey: ["loan-payments", "all"], queryFn: listAllLoanPayments })

  const [loanTypeId, setLoanTypeId] = React.useState("")
  const [requestedAmount, setRequestedAmount] = React.useState<number>()
  const [termMonths, setTermMonths] = React.useState<number>()
  const [purpose, setPurpose] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("Payroll Deduction")
  const [applicationDate, setApplicationDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [currentNetTakeHomePay, setCurrentNetTakeHomePay] = React.useState<number>()
  const [requirements, setRequirements] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(REQUIREMENT_LABELS.map((label) => [label, false]))
  )
  const [fileMeta, setFileMeta] = React.useState<{ fileName: string; fileSize: string } | undefined>()
  const [agree, setAgree] = React.useState(false)

  const [reloanEligible, setReloanEligible] = React.useState(true)
  const [blockedReason, setBlockedReason] = React.useState<string>()
  const [overrideEnabled, setOverrideEnabled] = React.useState(false)
  const [overrideReason, setOverrideReason] = React.useState("")
  const [overrideConfirmed, setOverrideConfirmed] = React.useState(false)
  const [boardResolutionReference, setBoardResolutionReference] = React.useState("")
  const [showOverrideDialog, setShowOverrideDialog] = React.useState(false)

  // Restore fields when resuming a reloan draft.
  React.useEffect(() => {
    if (!reloan) return
    setLoanTypeId(reloan.loanTypeId)
    setRequestedAmount(reloan.requestedAmount || undefined)
    setTermMonths(reloan.termMonths || undefined)
    setPurpose(reloan.purpose ?? "")
    setPaymentMethod(reloan.paymentMethod ?? "Payroll Deduction")
    setCurrentNetTakeHomePay(reloan.currentNetTakeHomePay ?? undefined)
    setRequirements(Object.fromEntries(REQUIREMENT_LABELS.map((label) => [label, reloan.requirements.find((r) => r.label === label)?.completed ?? false])))
    setStep(reloan.draftCurrentStep ?? 2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloan?.id])

  const loanType = loanTypes.find((lt) => lt.id === loanTypeId)
  const incomeBracket = loanType && loanType.incomeBrackets.length > 0 && member?.netPay != null
    ? bracketForNetPay(loanType.incomeBrackets, member.netPay)
    : null
  const isBracketedLoanType = Boolean(loanType && loanType.incomeBrackets.length > 0)

  React.useEffect(() => {
    if (!loanType) return
    if (loanType.incomeBrackets.length > 0) setRequestedAmount(incomeBracket?.loanableAmount)
    setTermMonths((prev) => prev ?? Math.min(12, loanType.maxTermMonths))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanType, incomeBracket?.loanableAmount])

  const previousPayments = previousLoanId ? getAllLoanPayments().filter((p) => p.loanApplicationId === previousLoanId) : []
  const totalPaid = previousPayments.reduce((sum, p) => sum + p.amountPaid, 0)
  const lastPaymentDate = previousPayments.length > 0 ? previousPayments.reduce((latest, p) => (p.paymentDate > latest ? p.paymentDate : latest), previousPayments[0].paymentDate) : undefined
  const installmentsPaid = previousLoan ? Math.round((previousLoan.principal - previousLoan.outstandingBalance) / (previousLoan.principal / previousLoan.termMonths || 1)) : 0

  const computation = React.useMemo(() => {
    if (!loanType || !requestedAmount || !termMonths) return null
    const firstDue = new Date(applicationDate)
    firstDue.setMonth(firstDue.getMonth() + 1)
    return computeLoan({
      principal: requestedAmount,
      annualRatePercent: loanType.defaultInterestRate,
      termMonths,
      processingFee: loanType.processingFee,
      interestMethod: loanType.interestMethod,
      firstDueDate: firstDue,
      serviceChargePercent: loanType.serviceChargePercent,
    })
  }, [loanType, requestedAmount, termMonths, applicationDate])

  const previousObligation = previousLoan?.outstandingBalance ?? 0
  const netProceedsAfterDeduction = computation ? computation.netProceeds - previousObligation : undefined

  const requirementItems: LoanRequirementItem[] = REQUIREMENT_LABELS.map((label) => ({ label, completed: requirements[label] }))
  const isBlocked = !reloanEligible && !(overrideEnabled && overrideReason.trim() && overrideConfirmed)

  const reloanDraft = useDraft<CreateLoanApplicationInput, LoanApplication>({
    draftId: reloanId,
    create: () => {
      throw new Error("Reloan drafts are created via the Reloan button, not this form.")
    },
    update: updateLoanApplication,
    getId: (l) => l.id,
    onSaved: (l) => {
      queryClient.setQueryData(["loans", l.id], l)
      queryClient.invalidateQueries({ queryKey: ["loans"] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save reloan draft."),
  })

  async function startReloan() {
    if (!previousLoanId) return
    const paidMonthsCheck = initialEligibility?.checks.find((check) => check.label === "Six-Month Previous Loan Payment")
    if (!initialEligibility?.eligible || paidMonthsCheck?.passed === false) {
      const message = paidMonthsCheck?.detail
        ?? initialEligibility?.checks.find((check) => !check.passed)?.detail
        ?? "This loan is not yet eligible for reloan."
      toast.error(message)
      setBlockedReason(message)
      return
    }
    setIsCreatingDraft(true)
    try {
      const draft = await createReloanDraft(previousLoanId)
      setReloanId(draft.id)
      navigate(`/loans/${draft.id}/reloan`, { replace: true })
      setStep(2)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to start a reloan for this loan.")
    } finally {
      setIsCreatingDraft(false)
    }
  }

  const buildPayload = (asDraft: boolean): CreateLoanApplicationInput => ({
    memberId: previousLoan!.memberId,
    loanTypeId: loanTypeId || undefined,
    requestedAmount,
    termMonths,
    purpose: purpose || undefined,
    paymentMethod,
    requirements: requirementItems,
    asDraft,
    draftCurrentStep: step,
    currentNetTakeHomePay,
    eligibilityOverridden: overrideEnabled && overrideConfirmed,
    eligibilityOverrideReason: overrideReason || undefined,
    boardResolutionReference: boardResolutionReference || undefined,
  })

  async function saveDraft() {
    if (!reloanId) return
    try {
      await reloanDraft.save(buildPayload(true))
      toast.success("Reloan draft saved.")
    } catch {
      // Surfaced via onError above.
    }
  }

  function canProceedFromStep(s: number): boolean {
    if (s === 1) return !!reloanId
    if (s === 2) return true
    if (s === 3) return currentNetTakeHomePay != null && currentNetTakeHomePay > 0
    if (s === 4) return !!loanTypeId && !!requestedAmount && !!termMonths && !!purpose.trim()
    if (s === 5) return !!computation
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

  async function handleSubmit() {
    if (!reloanId || !loanType || !requestedAmount || !termMonths || !computation) return
    if (isBlocked) {
      toast.error("This reloan cannot be submitted until eligibility is met or overridden.")
      return
    }
    if (!agree) {
      toast.error("Please confirm the information has been reviewed and is accurate.")
      return
    }
    setIsSubmitting(true)
    try {
      const loan = await reloanDraft.save(buildPayload(false))
      toast.success("Reloan application submitted successfully.")
      setSuccessDialog({ id: loan.id, applicationNumber: loan.applicationNumber })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to submit the reloan application.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingRouteLoan || isLoadingPrevious) {
    return <FormSkeleton fields={["select", "text", "date", "select"]} columns={2} showUpload />
  }

  if (!previousLoan) {
    return <AlertBanner tone="danger" title="Loan not found" description="The source loan for this reloan could not be found." />
  }

  return (
    <div className="space-y-5 pb-16">
      <PageHeader
        title="Reloan Application"
        description={`Linked to previous loan ${previousLoan.applicationNumber}. This creates a new loan application — the previous loan record is never edited.`}
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <WizardStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {step === 1 && (
        <FormSection title="Step 1 · Previous Loan Summary">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ComputationStat label="Previous Loan Reference" value={previousLoan.applicationNumber} />
            <ComputationStat label="Original Principal" value={formatCurrency(previousLoan.principal)} />
            <ComputationStat label="Total Paid" value={formatCurrency(totalPaid)} />
            <ComputationStat label="Remaining Balance" value={formatCurrency(previousLoan.outstandingBalance)} />
            <ComputationStat label="Installments Paid" value={String(Math.max(0, installmentsPaid))} />
            <ComputationStat label="Loan Status" value={previousLoan.status} />
            <ComputationStat label="Last Payment Date" value={lastPaymentDate ? formatDateShort(lastPaymentDate) : "—"} />
            <ComputationStat label="Reloan Sequence" value={reloan ? `#${reloan.reloanSequence ?? 1}` : "New"} />
          </div>

          {!reloanId ? (
            <div className="mt-5 flex flex-col items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-foreground">
                Starting a reloan creates a new, linked loan application — a fresh eligibility check will run and the previous loan record stays untouched.
              </p>
              {initialEligibility?.checks.find((check) => check.label === "Six-Month Previous Loan Payment" && !check.passed) && (
                <AlertBanner
                  tone="danger"
                  title="Six-Month Previous Loan Payment — Not Eligible"
                  description={initialEligibility.checks.find((check) => check.label === "Six-Month Previous Loan Payment")?.detail ?? ""}
                />
              )}
              <Button onClick={startReloan} disabled={isCreatingDraft || isLoadingInitialEligibility} aria-busy={isCreatingDraft || isLoadingInitialEligibility}>
                {isCreatingDraft ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCw aria-hidden="true" />}
                {isCreatingDraft ? "Starting…" : isLoadingInitialEligibility ? "Checking Eligibility…" : "Start Reloan Application"}
              </Button>
            </div>
          ) : (
            <AlertBanner tone="success" className="mt-4" title="Reloan draft created" description="Continue through the steps below to complete this reloan application." />
          )}
        </FormSection>
      )}

      {step === 2 && (
        <FormSection title="Step 2 · Member and Eligibility">
          {member && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ComputationStat label="Member" value={member.fullName} />
              <ComputationStat label="Membership Status" value={member.membershipStatus} />
              <ComputationStat label="Registration Status" value={member.approvalStatus ?? "—"} />
            </div>
          )}
          {previousLoanId && (
            <ReloanEligibilityCard
              loanId={previousLoanId}
              onResult={(eligible, reason) => {
                setReloanEligible(eligible)
                setBlockedReason(reason)
              }}
            />
          )}
          {!reloanEligible && (
            <div className="mt-4 space-y-3">
              {blockedReason && <p className="text-xs font-medium text-destructive">{blockedReason}</p>}
              {canOverride ? (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Checkbox checked={overrideEnabled} onCheckedChange={(v) => setOverrideEnabled(!!v)} />
                    Override reloan eligibility for this application
                  </label>
                  {overrideEnabled && (
                    <div className="mt-3 space-y-3">
                      <div className="space-y-1.5">
                        <Label>Override Reason <span className="text-destructive">*</span></Label>
                        <Textarea rows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Explain why this reloan should proceed despite failing eligibility…" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Board Resolution Reference</Label>
                        <Input value={boardResolutionReference} onChange={(e) => setBoardResolutionReference(e.target.value)} placeholder="Required when overriding the 6-month minimum or an amount above the prescribed limit" />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <Checkbox checked={overrideConfirmed} onCheckedChange={(v) => setOverrideConfirmed(!!v)} />
                        I confirm I am authorized to override eligibility for this reloan.
                      </label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowOverrideDialog(true)} disabled={!overrideReason.trim() || !overrideConfirmed}>
                        <ShieldAlert /> Confirm Override
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <AlertBanner tone="danger" title="Eligibility override not available" description="You do not have permission to override eligibility. Please coordinate with an authorized officer." />
              )}
            </div>
          )}
        </FormSection>
      )}

      {step === 3 && (
        <FormSection title="Step 3 · Current Financial Information" description="Re-entered fresh for this reloan — the previous loan's financial data is not reused.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-xl">
            <div className="space-y-1.5">
              <Label>Current Monthly Net Take-Home Pay <span className="text-destructive">*</span></Label>
              <CurrencyInput value={currentNetTakeHomePay} onChange={setCurrentNetTakeHomePay} />
            </div>
          </div>
          <div className="mt-4">
            <FileUploader
              label="Current Payslip"
              description="Attach the member's current payslip supporting the net take-home pay above."
              fileName={fileMeta?.fileName}
              onFileSelect={(file) => setFileMeta(file ? { fileName: file.name, fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB` } : undefined)}
            />
          </div>
        </FormSection>
      )}

      {step === 4 && (
        <FormSection title="Step 4 · New Loan Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Application Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Loan Type <span className="text-destructive">*</span></Label>
              <CommandSelect
                className="w-full"
                value={loanTypeId}
                onValueChange={(v) => setLoanTypeId(v)}
                options={loanTypes.filter((lt) => lt.status === "Active").map((lt) => ({ value: lt.id, label: lt.name }))}
                placeholder="Select loan type"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Requested Amount <span className="text-destructive">*</span></Label>
              {isBracketedLoanType ? (
                <Input value={formatCurrency(requestedAmount ?? 0)} disabled className="font-semibold" />
              ) : (
                <CurrencyInput value={requestedAmount} onChange={setRequestedAmount} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Term (Months) <span className="text-destructive">*</span></Label>
              <Input type="number" min={1} max={36} placeholder="e.g. 12" value={termMonths ?? ""} onChange={(e) => setTermMonths(e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <CommandSelect
                className="w-full"
                hideSearch
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod((v ?? "Payroll Deduction") as PaymentMethod)}
                options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                placeholder="Select payment method"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Purpose <span className="text-destructive">*</span></Label>
              <Textarea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="New purpose for this reloan" />
              {previousLoan.purpose && <p className="text-[11px] text-muted-foreground">Previous purpose (reference only): {previousLoan.purpose}</p>}
            </div>
          </div>
        </FormSection>
      )}

      {step === 5 && computation && (
        <FormSection title="Step 5 · Computation">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ComputationStat label="Maximum Loanable Amount" value={loanType ? formatCurrency(loanType.maxAmount) : "—"} />
            <ComputationStat label="Monthly Interest" value={loanType ? `${loanType.defaultInterestRate}%` : "—"} />
            <ComputationStat label="Service Charge" value={loanType?.serviceChargePercent ? `${loanType.serviceChargePercent}%` : "—"} />
            <ComputationStat label="Gross Loan Amount" value={formatCurrency(computation.principal)} />
            <ComputationStat label="Previous Balance Deduction" value={previousObligation > 0 ? `- ${formatCurrency(previousObligation)}` : "None"} />
            <ComputationStat label="Net Proceeds" value={formatCurrency(netProceedsAfterDeduction ?? computation.netProceeds)} />
            <ComputationStat label="Total Amount Payable" value={formatCurrency(computation.totalAmountPayable)} />
            <ComputationStat label="Monthly Amortization" value={formatCurrency(computation.monthlyAmortization)} />
            <ComputationStat label="Maturity Date" value={formatDateShort(computation.maturityDate)} />
          </div>
          {previousObligation > 0 && (
            <AlertBanner
              tone="warning"
              className="mt-4"
              title="Previous obligation outstanding"
              description={`The previous loan has an outstanding balance of ${formatCurrency(previousObligation)}. Current policy requires this to be fully settled before release.`}
            />
          )}
        </FormSection>
      )}

      {step === 6 && (
        <FormSection title="Step 6 · Requirements" description="Confirm which updated supporting documents have been submitted.">
          <div className="space-y-2">
            {REQUIREMENT_LABELS.map((label) => (
              <div key={label} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox checked={requirements[label]} onCheckedChange={(v) => setRequirements((prev) => ({ ...prev, [label]: !!v }))} />
                  {label}
                </label>
                <StatusBadge label={requirements[label] ? "Submitted" : "Missing"} tone={requirements[label] ? "success" : "warning"} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Previous requirements checklist (reference only): {previousLoan.requirements.filter((r) => r.completed).length} / {previousLoan.requirements.length} previously submitted.</p>
        </FormSection>
      )}

      {step === 7 && member && loanType && computation && (
        <FormSection title="Step 7 · Review and Submit">
          <div className="space-y-4">
            <ReviewBlock title="Member">
              <ReviewRow label="Name" value={member.fullName} />
              <ReviewRow label="Previous Loan" value={previousLoan.applicationNumber} />
            </ReviewBlock>
            <ReviewBlock title="New Loan Details">
              <ReviewRow label="Loan Type" value={loanType.name} />
              <ReviewRow label="Requested Amount" value={formatCurrency(requestedAmount ?? 0)} />
              <ReviewRow label="Term" value={`${termMonths} months`} />
              <ReviewRow label="Payment Method" value={paymentMethod} />
            </ReviewBlock>
            <ReviewBlock title="Eligibility">
              <ReviewRow label="Result" value={reloanEligible ? "Eligible" : overrideEnabled && overrideConfirmed ? "Eligible (Overridden)" : "Not Eligible"} />
              {overrideEnabled && <ReviewRow label="Override Reason" value={overrideReason} />}
            </ReviewBlock>
            <ReviewBlock title="Computation">
              <ReviewRow label="Net Proceeds" value={formatCurrency(netProceedsAfterDeduction ?? computation.netProceeds)} />
              <ReviewRow label="Monthly Amortization" value={formatCurrency(computation.monthlyAmortization)} />
            </ReviewBlock>

            {isBlocked && (
              <AlertBanner tone="danger" title="Cannot submit" description="This reloan does not meet eligibility requirements and has not been overridden. You may still save it as a draft." />
            )}

            <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
              I confirm that the information has been reviewed and is accurate.
            </label>
          </div>
        </FormSection>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-3 sm:mx-0 sm:border sm:shadow-sm">
        <Button variant="outline" onClick={() => navigate(`/loans/${previousLoan.id}`)}>Cancel</Button>
        <div className="flex flex-wrap items-center gap-2">
          {step > 1 && <Button variant="outline" onClick={goBack}>Previous</Button>}
          {reloanId && <SaveDraftButton status={reloanDraft.status} lastSavedAt={reloanDraft.lastSavedAt} onClick={saveDraft} disabled={isSubmitting} />}
          {step < STEPS.length ? (
            <Button onClick={goNext} disabled={!canProceedFromStep(step)}>Next</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting || isBlocked || !agree} aria-busy={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCw aria-hidden="true" />}
              {isSubmitting ? "Submitting…" : "Submit Reloan"}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showOverrideDialog}
        onOpenChange={setShowOverrideDialog}
        title="Confirm eligibility override"
        description="You are about to override a failed reloan eligibility check. This action will be recorded in the audit log."
        confirmLabel="Confirm Override"
        destructive
        onConfirm={() => {
          setShowOverrideDialog(false)
          toast.success("Eligibility override applied.")
        }}
      />

      <Dialog open={!!successDialog} onOpenChange={(open) => !open && setSuccessDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-6" />
            </div>
            <DialogTitle className="text-center">Reloan Submitted</DialogTitle>
            <DialogDescription className="text-center">{successDialog?.applicationNumber} has been recorded successfully.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={() => successDialog && navigate(`/loans/${successDialog.id}`)}>View Reloan Application</Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/loans")}>Back to Loan List</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ComputationStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-sm font-semibold text-foreground">{value}</p>
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
