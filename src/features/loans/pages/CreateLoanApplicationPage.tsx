import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FilePlus2,
  Loader2,
  Printer,
  ShieldAlert,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { WizardStepIndicator } from "@/components/shared/WizardStepIndicator"
import { MemberSelectionStep } from "@/components/shared/MemberSelectionStep"
import { EligibilityChecklist, type EligibilityResult } from "@/components/shared/EligibilityChecklist"
import { FileUploader } from "@/components/shared/FileUploader"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { AlertBanner } from "@/components/shared/AlertBanner"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { getMember } from "@/services/members.service"
import { getAllContributions } from "@/services/contributions.service"
import { createLoanApplication, getLoan, listLoanTypes, getMemberLoans, updateLoanApplication, type CreateLoanApplicationInput } from "@/services/loans.service"
import { computeLoan } from "@/utils/loan-math"
import { evaluateLoanEligibility, resultFor } from "@/utils/eligibility"
import { downloadCsv } from "@/utils/csv"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import { useDraft } from "@/hooks/useDraft"
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft"
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges"
import type { LoanApplication, LoanRequirementItem, PaymentMethod } from "@/types"

const STEPS = ["Select Member", "Loan Details", "Eligibility Check", "Loan Computation", "Requirements", "Review & Submit"]

const REQUIREMENT_LABELS = [
  "Accomplished Loan Application Form",
  "Latest Payslip",
  "Valid Government ID",
  "Authorization for Salary Deduction",
  "Promissory Note",
]

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]

export default function CreateLoanApplicationPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { user, hasPermission } = useAuth()
  const canOverride = hasPermission("loans.override_eligibility")

  const { data: existingLoan, isLoading: isLoadingLoan } = useQuery({
    queryKey: ["loans", id],
    queryFn: () => getLoan(id!),
    enabled: isEdit,
  })

  const [step, setStep] = React.useState(1);
  const [memberId, setMemberId] = React.useState(() => searchParams.get("member") ?? "")
  const [loanTypeId, setLoanTypeId] = React.useState("")
  const [requestedAmount, setRequestedAmount] = React.useState<number>()
  const [termMonths, setTermMonths] = React.useState<number>()
  const [purpose, setPurpose] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("Payroll Deduction")
  const [applicationDate, setApplicationDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [assignedOfficer, setAssignedOfficer] = React.useState(user?.fullName ?? "")
  const [remarks, setRemarks] = React.useState("")

  const [overrideEnabled, setOverrideEnabled] = React.useState(false)
  const [overrideReason, setOverrideReason] = React.useState("")
  const [overrideConfirmed, setOverrideConfirmed] = React.useState(false)
  const [showOverrideDialog, setShowOverrideDialog] = React.useState(false)

  const [requirements, setRequirements] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(REQUIREMENT_LABELS.map((label) => [label, false]))
  )
  const [fileMeta, setFileMeta] = React.useState<Record<string, { fileName: string; fileSize: string; dateSelected: string }>>({})

  const [agree, setAgree] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [successDialog, setSuccessDialog] = React.useState<{ id: string; applicationNumber: string } | null>(null)

  const { data: member } = useQuery({ queryKey: ["members", memberId], queryFn: () => getMember(memberId), enabled: !!memberId })
  const { data: loanTypes = [] } = useQuery({ queryKey: ["loan-types"], queryFn: listLoanTypes })
  const loanType = loanTypes.find((lt) => lt.id === loanTypeId)

  const memberLoans = memberId ? getMemberLoans(memberId) : []
  const memberContributions = memberId ? getAllContributions().filter((c) => c.memberId === memberId && c.status === "Posted") : []
  const contributionMonths = new Set(memberContributions.map((c) => c.contributionPeriod)).size
  const totalContributions = memberContributions.reduce((sum, c) => sum + c.amount, 0)
  const activeLoans = memberLoans.filter((l) => ["Active", "Overdue", "Released"].includes(l.status))
  const overdueLoans = memberLoans.filter((l) => l.status === "Overdue")
  const outstandingLoanBalance = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0)

  React.useEffect(() => {
    if (loanType) {
      setRequestedAmount((prev) => prev ?? loanType.minAmount)
      setTermMonths((prev) => prev ?? Math.min(12, loanType.maxTermMonths))
    }
  }, [loanType])

  // Resuming a draft — restore every field plus the wizard step it was last saved on.
  React.useEffect(() => {
    if (!existingLoan) return
    setMemberId(existingLoan.memberId)
    setLoanTypeId(existingLoan.loanTypeId)
    setRequestedAmount(existingLoan.requestedAmount || undefined)
    setTermMonths(existingLoan.termMonths || undefined)
    setPurpose(existingLoan.purpose ?? "")
    setPaymentMethod(existingLoan.paymentMethod ?? "Payroll Deduction")
    setAssignedOfficer(existingLoan.assignedOfficer || user?.fullName || "")
    setRequirements(
      Object.fromEntries(REQUIREMENT_LABELS.map((label) => [label, existingLoan.requirements.find((r) => r.label === label)?.completed ?? false]))
    )
    setStep(existingLoan.draftCurrentStep ?? 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingLoan])

  const isDraftContext = isEdit ? existingLoan?.status === "Draft" : false

  const loanDraft = useDraft<CreateLoanApplicationInput, LoanApplication>({
    draftId: isEdit ? id : undefined,
    create: createLoanApplication,
    update: updateLoanApplication,
    getId: (l) => l.id,
    onSaved: (l) => {
      queryClient.setQueryData(["loans", l.id], l)
      queryClient.invalidateQueries({ queryKey: ["loans"] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save draft."),
  })

  const eligibilityItems = member && loanType
    ? evaluateLoanEligibility(member, loanType, requestedAmount, termMonths, contributionMonths, memberLoans)
    : []
  const eligibilityResult: EligibilityResult = eligibilityItems.length > 0 ? resultFor(eligibilityItems) : "Not Eligible"
  const isBlocked = eligibilityResult === "Not Eligible" && !(overrideEnabled && overrideReason.trim() && overrideConfirmed)

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
    })
  }, [loanType, requestedAmount, termMonths, applicationDate])

  const requirementItems: LoanRequirementItem[] = REQUIREMENT_LABELS.map((label) => ({ label, completed: requirements[label] }))
  const missingRequirements = requirementItems.filter((r) => !r.completed)

  const draftSnapshot: CreateLoanApplicationInput = {
    memberId,
    loanTypeId: loanTypeId || undefined,
    requestedAmount,
    termMonths,
    purpose: purpose || undefined,
    paymentMethod,
    requirements: requirementItems,
    asDraft: true,
    draftCurrentStep: step,
  }

  async function saveDraft() {
    if (!memberId) {
      toast.error("Select a member before saving a draft.")
      return
    }
    try {
      await loanDraft.save(draftSnapshot)
      toast.success("Draft saved successfully.")
    } catch {
      // Surfaced via loanDraft's onError above.
    }
  }

  const autosave = useAutosaveDraft(draftSnapshot, (snap) => (memberId ? loanDraft.save(snap) : Promise.resolve(undefined)), {
    enabled: Boolean(memberId) && (!isEdit || isDraftContext) && loanDraft.status !== "saving" && !isSubmitting,
    delayMs: 30000,
  })

  // No RHF here (plain wizard state) — "dirty" just means the user has started
  // the application and hasn't finished submitting it yet.
  const hasUnsavedChanges = Boolean(memberId) && !successDialog
  const { showPrompt: showUnsavedPrompt, promptLeave, resolvePrompt } = useUnsavedChanges(hasUnsavedChanges)

  function canProceedFromStep(s: number): boolean {
    if (s === 1) return !!member
    if (s === 2) return !!loanTypeId && !!requestedAmount && !!termMonths && !!purpose.trim() && !!assignedOfficer.trim()
    if (s === 3) return !isBlocked
    if (s === 4) return !!computation
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
      if (!loanType || !requestedAmount || !termMonths || !computation) return
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
      const loan = await loanDraft.save({
        memberId: member.id,
        loanTypeId: loanType?.id,
        requestedAmount,
        termMonths,
        purpose: purpose || undefined,
        paymentMethod,
        requirements: requirementItems,
        asDraft,
        draftCurrentStep: step,
      })
      if (asDraft) {
        toast.success("Draft saved successfully.")
      } else {
        toast.success("Loan application submitted successfully.")
        setSuccessDialog({ id: loan.id, applicationNumber: loan.applicationNumber })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save the loan application.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleExportSchedule() {
    if (!computation) return
    downloadCsv(
      "loan-amortization-schedule.csv",
      ["#", "Due Date", "Beginning Balance", "Principal", "Interest", "Amount Due", "Remaining Balance"],
      computation.schedule.map((e) => [e.installmentNumber, e.dueDate, e.beginningBalance.toFixed(2), e.principal.toFixed(2), e.interest.toFixed(2), e.amountDue.toFixed(2), e.remainingBalance.toFixed(2)])
    )
  }

  function resetWizardForNewApplication() {
    setStep(1)
    setMemberId("")
    setLoanTypeId("")
    setRequestedAmount(undefined)
    setTermMonths(undefined)
    setPurpose("")
    setRemarks("")
    setOverrideEnabled(false)
    setOverrideReason("")
    setOverrideConfirmed(false)
    setRequirements(Object.fromEntries(REQUIREMENT_LABELS.map((label) => [label, false])))
    setFileMeta({})
    setAgree(false)
    setSuccessDialog(null)
  }

  if (isEdit && isLoadingLoan) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading loan draft</span>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-16">
      <PageHeader
        title={isDraftContext ? "Continue Loan Draft" : "Create Loan Application"}
        description="Encode a loan application based on the physical documents submitted by the member."
        actions={isDraftContext && <DraftStatusBadge status="Draft" />}
      />

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
          />
        </FormSection>
      )}

      {step === 2 && (
        <FormSection title="Step 2 · Loan Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Application Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Loan Type <span className="text-destructive">*</span></Label>
              <Select value={loanTypeId} onValueChange={(v) => setLoanTypeId(v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select loan type" /></SelectTrigger>
                <SelectContent>
                  {loanTypes.filter((lt) => lt.status === "Active").map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Requested Amount <span className="text-destructive">*</span></Label>
              <CurrencyInput value={requestedAmount} onChange={setRequestedAmount} />
            </div>
            <div className="space-y-1.5">
              <Label>Loan Term (Months) <span className="text-destructive">*</span></Label>
              <Input type="number" min={1} placeholder="e.g. 12" value={termMonths ?? ""} onChange={(e) => setTermMonths(e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod((v ?? "Payroll Deduction") as PaymentMethod)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned Loan Officer <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Juan Dela Cruz" value={assignedOfficer} onChange={(e) => setAssignedOfficer(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Purpose of Loan <span className="text-destructive">*</span></Label>
              <Textarea rows={2} placeholder="e.g. Home repair, tuition, medical expenses" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Remarks</Label>
              <Textarea rows={2} placeholder="Additional notes about this application (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>

          {loanType && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <p className="mb-1.5 font-medium text-foreground">{loanType.name} — Policy Information</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground sm:grid-cols-3">
                <span>Min Amount: <strong className="text-foreground">{formatCurrency(loanType.minAmount)}</strong></span>
                <span>Max Amount: <strong className="text-foreground">{formatCurrency(loanType.maxAmount)}</strong></span>
                <span>Interest Rate: <strong className="text-foreground">{loanType.defaultInterestRate}%/mo</strong></span>
                <span>Interest Method: <strong className="text-foreground">{loanType.interestMethod}</strong></span>
                <span>Max Term: <strong className="text-foreground">{loanType.maxTermMonths} mos.</strong></span>
                <span>Processing Fee: <strong className="text-foreground">{formatCurrency(loanType.processingFee)}</strong></span>
                <span>Min. Membership: <strong className="text-foreground">{loanType.requiredMembershipMonths} mos.</strong></span>
                <span>Min. Contributions: <strong className="text-foreground">{loanType.requiredContributionMonths} mos.</strong></span>
                <span>Existing Active Loan: <strong className="text-foreground">{loanType.allowExistingActiveLoan ? "Allowed" : "Not Allowed"}</strong></span>
              </div>
              {requestedAmount != null && loanType && (requestedAmount < loanType.minAmount || requestedAmount > loanType.maxAmount) && (
                <p className="mt-2 flex items-center gap-1 font-medium text-destructive">
                  <AlertTriangle className="size-3.5" /> Requested amount is outside the allowed range for this loan type.
                </p>
              )}
              {termMonths != null && termMonths > loanType.maxTermMonths && (
                <p className="mt-1 flex items-center gap-1 font-medium text-destructive">
                  <AlertTriangle className="size-3.5" /> Term exceeds the maximum allowed for this loan type.
                </p>
              )}
            </div>
          )}
        </FormSection>
      )}

      {step === 3 && (
        <FormSection title="Step 3 · Eligibility Check">
          {eligibilityItems.length === 0 ? (
            <AlertBanner tone="warning" title="Incomplete information" description="Select a member and loan type first." />
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
                        <Textarea rows={2} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Explain why this application should proceed despite failing eligibility…" />
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
                <AlertBanner tone="danger" title="Eligibility override not available" description="You do not have permission to override eligibility. Please coordinate with an authorized officer." />
              )}
            </div>
          )}
        </FormSection>
      )}

      {step === 4 && computation && (
        <FormSection title="Step 4 · Loan Computation">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ComputationStat label="Principal Amount" value={formatCurrency(computation.principal)} />
            <ComputationStat label="Total Interest" value={formatCurrency(computation.totalInterest)} />
            <ComputationStat label="Processing Fee" value={formatCurrency(computation.processingFee)} />
            <ComputationStat label="Net Proceeds" value={formatCurrency(computation.netProceeds)} />
            <ComputationStat label="Total Amount Payable" value={formatCurrency(computation.totalAmountPayable)} />
            <ComputationStat label="Monthly Amortization" value={formatCurrency(computation.monthlyAmortization)} />
            <ComputationStat label="First Due Date" value={formatDateShort(computation.schedule[0]?.dueDate)} />
            <ComputationStat label="Maturity Date" value={formatDateShort(computation.maturityDate)} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer /> Print Preview
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleExportSchedule}>
              <Download /> Export CSV
            </Button>
          </div>

          <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="bg-card">#</TableHead>
                  <TableHead className="bg-card">Due Date</TableHead>
                  <TableHead className="bg-card">Beginning Balance</TableHead>
                  <TableHead className="bg-card">Principal</TableHead>
                  <TableHead className="bg-card">Interest</TableHead>
                  <TableHead className="bg-card">Amount Due</TableHead>
                  <TableHead className="bg-card">Remaining Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {computation.schedule.map((entry) => (
                  <TableRow key={entry.installmentNumber}>
                    <TableCell>{entry.installmentNumber}</TableCell>
                    <TableCell>{formatDateShort(entry.dueDate)}</TableCell>
                    <TableCell>{formatCurrency(entry.beginningBalance)}</TableCell>
                    <TableCell>{formatCurrency(entry.principal)}</TableCell>
                    <TableCell>{formatCurrency(entry.interest)}</TableCell>
                    <TableCell>{formatCurrency(entry.amountDue)}</TableCell>
                    <TableCell>{formatCurrency(entry.remainingBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </FormSection>
      )}

      {step === 5 && (
        <FormSection title="Step 5 · Requirements" description="Confirm which supporting documents have been submitted.">
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
          <div className="mt-4">
            <FileUploader
              label="Other Supporting Documents (optional)"
              description="Attach any additional files. Files are kept as local metadata only in this demo."
              fileName={fileMeta.other?.fileName}
              onFileSelect={(file) =>
                setFileMeta((prev) => {
                  const next = { ...prev }
                  if (file) next.other = { fileName: file.name, fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`, dateSelected: new Date().toISOString() }
                  else delete next.other
                  return next
                })
              }
            />
          </div>
          {missingRequirements.length > 0 && (
            <AlertBanner tone="warning" className="mt-4" title={`${missingRequirements.length} requirement(s) missing`} description="You may still proceed, but missing requirements will be flagged in the review step." />
          )}
        </FormSection>
      )}

      {step === 6 && member && loanType && computation && (
        <FormSection title="Step 6 · Review and Submit">
          <div className="space-y-4">
            <ReviewBlock title="Member">
              <ReviewRow label="Name" value={member.fullName} />
              <ReviewRow label="Member Number" value={member.memberNumber} />
              <ReviewRow label="Office" value={member.officeName} />
            </ReviewBlock>
            <ReviewBlock title="Loan Details">
              <ReviewRow label="Loan Type" value={loanType.name} />
              <ReviewRow label="Requested Amount" value={formatCurrency(requestedAmount ?? 0)} />
              <ReviewRow label="Term" value={`${termMonths} months`} />
              <ReviewRow label="Purpose" value={purpose} />
              <ReviewRow label="Payment Method" value={paymentMethod} />
              <ReviewRow label="Assigned Officer" value={assignedOfficer} />
            </ReviewBlock>
            <ReviewBlock title="Eligibility">
              <ReviewRow label="Result" value={eligibilityResult} />
              {overrideEnabled && <ReviewRow label="Override Reason" value={overrideReason} />}
            </ReviewBlock>
            <ReviewBlock title="Computation">
              <ReviewRow label="Monthly Amortization" value={formatCurrency(computation.monthlyAmortization)} />
              <ReviewRow label="Total Amount Payable" value={formatCurrency(computation.totalAmountPayable)} />
              <ReviewRow label="Net Proceeds" value={formatCurrency(computation.netProceeds)} />
            </ReviewBlock>
            <ReviewBlock title="Requirements">
              <ReviewRow label="Submitted" value={`${requirementItems.filter((r) => r.completed).length} / ${requirementItems.length}`} />
            </ReviewBlock>
            {remarks && (
              <ReviewBlock title="Staff Remarks">
                <p className="text-sm text-foreground">{remarks}</p>
              </ReviewBlock>
            )}

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
        <Button variant="outline" onClick={() => promptLeave(() => navigate("/loans"))}>Cancel</Button>
        <div className="flex flex-wrap items-center gap-2">
          {step > 1 && <Button variant="outline" onClick={goBack}>Previous</Button>}
          <SaveDraftButton status={loanDraft.status} lastSavedAt={loanDraft.lastSavedAt} onClick={saveDraft} disabled={!memberId || isSubmitting} />
          {step < STEPS.length ? (
            <Button onClick={goNext} disabled={!canProceedFromStep(step)}>Next</Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={isSubmitting || isBlocked || !agree} aria-busy={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />}
              {isSubmitting ? "Submitting…" : "Submit Application"}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showOverrideDialog}
        onOpenChange={setShowOverrideDialog}
        title="Confirm eligibility override"
        description="You are about to override a failed eligibility check for this application. This action will be recorded in the application's history."
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
        isSaving={loanDraft.status === "saving"}
        onSaveAndLeave={async () => {
          await saveDraft()
          resolvePrompt("leave")
        }}
        onLeaveWithoutSaving={() => resolvePrompt("leave")}
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
            <Button className="w-full" onClick={() => successDialog && navigate(`/loans/${successDialog.id}`)}>
              View Loan Application
            </Button>
            <Button variant="outline" className="w-full" onClick={resetWizardForNewApplication}>
              Create Another Application
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/loans")}>
              Back to Loan List
            </Button>
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
