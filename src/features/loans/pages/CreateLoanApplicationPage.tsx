import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  Loader2,
  ShieldAlert,
  User,
  Coins,
  ClipboardCheck,
  Calculator,
  FileCheck,
  Sparkles,
  Info,
  XCircle,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { WizardStepIndicator } from "@/components/shared/WizardStepIndicator"
import { MemberSummaryCard } from "@/components/shared/MemberSummaryCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { EligibilityChecklist, type EligibilityResult } from "@/components/shared/EligibilityChecklist"
import { FileUploader } from "@/components/shared/FileUploader"
import { FormSkeleton } from "@/components/shared/loaders/FormSkeleton"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { SaveDraftButton } from "@/components/shared/SaveDraftButton"
import { DraftStatusBadge } from "@/components/shared/DraftStatusBadge"
import { UnsavedChangesDialog } from "@/components/shared/UnsavedChangesDialog"
import { LoanOfficerCommandSelect } from "@/features/loans/components/LoanOfficerCommandSelect"
import { MemberEligibilitySelect } from "@/features/loans/components/MemberEligibilitySelect"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DataTable } from "@/components/shared/DataTable"
import { UserSearch } from "lucide-react"
import { getMember } from "@/services/members.service"
import { listAllContributions } from "@/services/contributions.service"
import { listAllDeductions } from "@/services/deductions.service"
import { getLoanSettings } from "@/services/loan-settings.service"
import { createLoanApplication, getLoan, listLoanTypes, getMemberLoans, updateLoanApplication, type CreateLoanApplicationInput } from "@/services/loans.service"
import { bracketForNetPay, computeLoan, type LoanComputationResult } from "@/utils/loan-math"
import { evaluateLoanEligibility, resultFor, type DuesStanding, type PaidMonthlyDuesSummary } from "@/utils/eligibility"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import { useDraft } from "@/hooks/useDraft"
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft"
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges"
import { cn } from "@/lib/utils"
import type { AmortizationEntry, EligibilityCheckItem, LoanApplication, LoanRequirementItem, LoanType, Member, PaymentMethod } from "@/types"

const STEPS = ["Select Member", "Loan Details", "Eligibility Check", "Loan Computation", "Requirements", "Review & Submit"]

const REQUIREMENT_LABELS = [
  "Accomplished Loan Application Form",
  "Latest Payslip",
  "Valid Government ID",
  "Authorization for Salary Deduction",
  "Promissory Note",
]

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]

const AMORTIZATION_COLUMNS: ColumnDef<AmortizationEntry, unknown>[] = [
  { accessorKey: "installmentNumber", header: "#", cell: ({ row }) => <span className="font-medium">{row.original.installmentNumber}</span> },
  { accessorKey: "dueDate", header: "Due Date", cell: ({ row }) => formatDateShort(row.original.dueDate) },
  { accessorKey: "beginningBalance", header: "Beginning Balance", cell: ({ row }) => formatCurrency(row.original.beginningBalance) },
  { accessorKey: "principal", header: "Principal", cell: ({ row }) => formatCurrency(row.original.principal) },
  { accessorKey: "interest", header: "Interest", cell: ({ row }) => formatCurrency(row.original.interest) },
  { accessorKey: "amountDue", header: "Amount Due", cell: ({ row }) => <span className="font-semibold">{formatCurrency(row.original.amountDue)}</span> },
  { accessorKey: "remainingBalance", header: "Remaining Balance", cell: ({ row }) => formatCurrency(row.original.remainingBalance) },
]

type MonthlyDuesStatus = { period: string; label: string; status: "paid" | "due" | "overdue" }

function monthlyDuesWindow(paidPeriods: string[], requiredMonths: number): MonthlyDuesStatus[] {
  if (requiredMonths < 1) return []
  const paid = new Set(paidPeriods)
  const current = new Date()
  current.setDate(1)
  const currentPeriod = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
  const latestPaidPeriod = paidPeriods.at(-1)
  const timelineEnd = latestPaidPeriod && latestPaidPeriod > currentPeriod
    ? new Date(`${latestPaidPeriod}-01T12:00:00`)
    : current
  const rollingStart = new Date(current)
  rollingStart.setMonth(rollingStart.getMonth() - requiredMonths + 1)
  const earliestPaid = paidPeriods.at(0)
  const earliest = earliestPaid && earliestPaid < `${rollingStart.getFullYear()}-${String(rollingStart.getMonth() + 1).padStart(2, "0")}`
    ? new Date(`${earliestPaid}-01T00:00:00`)
    : rollingStart
  const cursor = new Date(earliest)
  const months: MonthlyDuesStatus[] = []
  while (cursor <= timelineEnd) {
    const period = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
    months.push({
      period,
      label: cursor.toLocaleDateString("en-PH", { month: "long", year: "numeric" }),
      status: paid.has(period) ? "paid" : period >= currentPeriod ? "due" : "overdue",
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return months
}

function previousContributionPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number)
  const previousMonth = month === 1 ? 12 : month - 1
  const previousYear = month === 1 ? year - 1 : year
  return `${previousYear}-${String(previousMonth).padStart(2, "0")}`
}

interface LoanEntry {
  key: string
  loanTypeId: string
  requestedAmount: number | undefined
  termMonths: number | undefined
  purpose: string
  paymentMethod: PaymentMethod
  remarks: string
  overrideEnabled: boolean
  overrideReason: string
  overrideConfirmed: boolean
  overrideApplied: boolean
  boardResolutionReference: string
}

let entryCounter = 0
function makeLoanEntry(overrides?: Partial<LoanEntry>): LoanEntry {
  entryCounter += 1
  return {
    key: `loan-entry-${entryCounter}`,
    loanTypeId: "",
    requestedAmount: undefined,
    termMonths: undefined,
    purpose: "",
    paymentMethod: "Payroll Deduction",
    remarks: "",
    overrideEnabled: false,
    overrideReason: "",
    overrideConfirmed: false,
    overrideApplied: false,
    boardResolutionReference: "",
    ...overrides,
  }
}

interface EntryDerived {
  loanType?: LoanType
  isBracketedLoanType: boolean
  effectiveAmount: number | undefined
  eligibilityItems: EligibilityCheckItem[]
  eligibilityResult: EligibilityResult
  isBlocked: boolean
  computation: LoanComputationResult | null
}

export default function CreateLoanApplicationPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { hasPermission } = useAuth()
  const hasOverridePermission = hasPermission("loans.override_eligibility")

  const { data: existingLoan, isLoading: isLoadingLoan } = useQuery({
    queryKey: ["loans", id],
    queryFn: () => getLoan(id!),
    enabled: isEdit,
  })

  const [step, setStep] = React.useState(1)
  const [memberId, setMemberId] = React.useState(() => searchParams.get("member") ?? "")
  const [applicationDate, setApplicationDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [assignedOfficer, setAssignedOfficer] = React.useState("")

  React.useEffect(() => {
    const paramMemberId = searchParams.get("member")
    if (paramMemberId && paramMemberId !== memberId && !isEdit) {
      setMemberId(paramMemberId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const [entries, setEntries] = React.useState<LoanEntry[]>(() => [makeLoanEntry()])

  React.useEffect(() => {
    setEntries((current) => current.length > 1 ? [current[0]] : current)
  }, [])
  const [overrideDialogEntryKey, setOverrideDialogEntryKey] = React.useState<string | null>(null)

  const [requirements, setRequirements] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(REQUIREMENT_LABELS.map((label) => [label, false]))
  )
  const [fileMeta, setFileMeta] = React.useState<Record<string, { fileName: string; fileSize: string; dateSelected: string }>>({})

  const [agree, setAgree] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [successDialog, setSuccessDialog] = React.useState<{ created: LoanApplication[] } | null>(null)

  const { data: member } = useQuery({ queryKey: ["members", memberId], queryFn: () => getMember(memberId), enabled: !!memberId })
  const { data: loanTypes = [] } = useQuery({ queryKey: ["loan-types"], queryFn: listLoanTypes })
  const { data: loanSettings } = useQuery({ queryKey: ["loan-settings"], queryFn: getLoanSettings })
  const canOverride = hasOverridePermission && (loanSettings?.allowEligibilityOverride ?? true)
  React.useEffect(() => {
    if (isEdit || !loanSettings?.defaultPaymentMethod) return
    setEntries((current) => current.map((entry) =>
      entry.loanTypeId || entry.requestedAmount || entry.purpose
        ? entry
        : { ...entry, paymentMethod: loanSettings.defaultPaymentMethod as PaymentMethod }
    ))
  }, [isEdit, loanSettings?.defaultPaymentMethod])
  const { data: liveContributions = [] } = useQuery({
    queryKey: ["contributions", "all"],
    queryFn: listAllContributions,
  })
  const { data: liveDeductions = [] } = useQuery({
    queryKey: ["deductions", "all"],
    queryFn: listAllDeductions,
  })
  const minimumMembershipMonths = loanSettings?.minimumMembershipMonths ?? 6
  const requiredMonthlyDuesAmount = loanSettings?.requiredMonthlyDuesAmount ?? 100

  const memberLoans = memberId ? getMemberLoans(memberId) : []
  const memberContributions = memberId ? liveContributions.filter((c) => c.memberId === memberId && c.status === "Posted") : []
  const memberDeductions = memberId ? liveDeductions.filter((deduction) => deduction.memberId === memberId && deduction.status === "Posted") : []
  const paidMonthlyDuesPeriods = [...new Set(
    memberContributions
      .filter((c) => c.contributionType === "Monthly Dues" && c.amount >= requiredMonthlyDuesAmount)
      .map((c) => c.contributionPeriod)
  )].sort()
  let consecutivePaidMonths = paidMonthlyDuesPeriods.length > 0 ? 1 : 0
  for (let index = paidMonthlyDuesPeriods.length - 1; index > 0; index--) {
    if (previousContributionPeriod(paidMonthlyDuesPeriods[index]) !== paidMonthlyDuesPeriods[index - 1]) break
    consecutivePaidMonths++
  }
  const requiredPaidMonths = loanSettings?.minimumPaidContributionMonths ?? 6
  const verifiedPaidMonths = loanSettings?.requireConsecutiveContributionMonths === false
    ? paidMonthlyDuesPeriods.length
    : consecutivePaidMonths
  const hasAnyFullyPaidMonthlyDues = loanSettings?.requirePaidContributions === false
    || paidMonthlyDuesPeriods.length > 0
  const paidDuesPrecheckMessage = paidMonthlyDuesPeriods.length === 0
    ? "This member cannot apply for a loan because no fully paid Monthly Dues contributions are recorded."
    : `Only ${verifiedPaidMonths} of required ${requiredPaidMonths} fully paid Monthly Dues months were verified.`
  const totalContributions = memberContributions.reduce((sum, c) => sum + c.amount, 0)

  const currentPeriod = new Date().toISOString().slice(0, 7)
  const priorPeriodDate = new Date()
  priorPeriodDate.setMonth(priorPeriodDate.getMonth() - 1)
  const priorPeriod = priorPeriodDate.toISOString().slice(0, 7)
  const duesStanding: DuesStanding = {
    hasCurrentMonthlyDues: memberContributions.some((c) => c.contributionType === "Monthly Dues" && c.amount >= requiredMonthlyDuesAmount && [currentPeriod, priorPeriod].includes(c.contributionPeriod)),
    hasCurrentCashPabaon: memberDeductions.some(
      (deduction) => deduction.deductionTypeCode?.toLowerCase() === "pabaon"
        && [currentPeriod, priorPeriod].includes(deduction.period)
    ),
  }
  const activeLoans = memberLoans.filter((l) => ["Active", "Overdue", "Released"].includes(l.status))
  const overdueLoans = memberLoans.filter((l) => l.status === "Overdue")
  const outstandingLoanBalance = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0)

  function handleMemberSelect(selectedMemberId: string) {
    setMemberId(selectedMemberId)
    if (loanSettings?.requirePaidContributions === false) return

    const qualifyingPeriods = new Set(
      liveContributions
        .filter((contribution) =>
          contribution.memberId === selectedMemberId
          && contribution.status === "Posted"
          && contribution.contributionType === "Monthly Dues"
          && contribution.amount >= requiredMonthlyDuesAmount
        )
        .map((contribution) => contribution.contributionPeriod)
    )

    if (qualifyingPeriods.size === 0) {
      toast.error("This member cannot apply for a loan because no fully paid Monthly Dues contributions are recorded.")
    }
  }

  function deriveEntry(entry: LoanEntry, memberForEval: Member | undefined): EntryDerived {
    const loanType = loanTypes.find((lt) => lt.id === entry.loanTypeId)
    const isBracketedLoanType = Boolean(loanType && loanType.incomeBrackets.length > 0)
    const effectiveAmount = entry.requestedAmount
    const paidMonthlyDues: PaidMonthlyDuesSummary = {
      paidMonths: paidMonthlyDuesPeriods.length,
      consecutivePaidMonths,
      requiredMonths: Math.max(loanType?.requiredContributionMonths ?? 0, loanSettings?.minimumPaidContributionMonths ?? 6),
      requiredAmount: requiredMonthlyDuesAmount,
      requirePaidContributions: loanSettings?.requirePaidContributions ?? true,
      requireConsecutiveMonths: loanSettings?.requireConsecutiveContributionMonths ?? true,
    }

    const eligibilityItems = memberForEval && loanType
      ? evaluateLoanEligibility(memberForEval, loanType, effectiveAmount, entry.termMonths, paidMonthlyDues, memberLoans, minimumMembershipMonths, duesStanding)
      : []
    const eligibilityResult: EligibilityResult = eligibilityItems.length > 0 ? resultFor(eligibilityItems) : "Not Eligible"
    const isBlocked = eligibilityResult === "Not Eligible" && !(entry.overrideEnabled && entry.overrideReason.trim() && entry.overrideConfirmed)

    let computation: LoanComputationResult | null = null
    if (loanType && effectiveAmount && entry.termMonths) {
      const firstDue = new Date(applicationDate)
      firstDue.setMonth(firstDue.getMonth() + 1)
      computation = computeLoan({
        principal: effectiveAmount,
        annualRatePercent: loanType.defaultInterestRate,
        termMonths: entry.termMonths,
        processingFee: loanType.processingFee,
        interestMethod: loanType.interestMethod,
        firstDueDate: firstDue,
        serviceChargePercent: loanType.serviceChargePercent,
      })
    }

    return { loanType, isBracketedLoanType, effectiveAmount, eligibilityItems, eligibilityResult, isBlocked, computation }
  }

  const derivedByKey = React.useMemo(() => {
    const map = new Map<string, EntryDerived>()
    entries.forEach((entry) => map.set(entry.key, deriveEntry(entry, member)))
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, member, loanTypes, applicationDate, paidMonthlyDuesPeriods.length, consecutivePaidMonths, memberLoans.length, minimumMembershipMonths, requiredMonthlyDuesAmount, loanSettings, duesStanding.hasCurrentMonthlyDues, duesStanding.hasCurrentCashPabaon])

  function derivedFor(key: string): EntryDerived {
    return derivedByKey.get(key) ?? deriveEntry(entries.find((e) => e.key === key)!, member)
  }

  React.useEffect(() => {
    if (!existingLoan) return
    setMemberId(existingLoan.memberId)
    setAssignedOfficer(existingLoan.assignedOfficer || "")
    setEntries([
      makeLoanEntry({
        loanTypeId: existingLoan.loanTypeId,
        requestedAmount: existingLoan.requestedAmount || undefined,
        termMonths: existingLoan.termMonths || undefined,
        purpose: existingLoan.purpose ?? "",
        paymentMethod: existingLoan.paymentMethod ?? "Payroll Deduction",
      }),
    ])
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

  const requirementItems: LoanRequirementItem[] = REQUIREMENT_LABELS.map((label) => ({ label, completed: requirements[label] }))
  const missingRequirements = requirementItems.filter((r) => !r.completed)

  const canUseDraft = entries.length === 1
  const soloDraftSnapshot: CreateLoanApplicationInput | null = canUseDraft
    ? (() => {
        const entry = entries[0]
        return {
          memberId,
          loanTypeId: entry.loanTypeId || undefined,
          requestedAmount: entry.requestedAmount,
          termMonths: entry.termMonths,
          purpose: entry.purpose || undefined,
          paymentMethod: entry.paymentMethod,
          requirements: requirementItems,
          asDraft: true,
          draftCurrentStep: step,
          eligibilityOverridden: entry.overrideEnabled && entry.overrideConfirmed,
          eligibilityOverrideReason: entry.overrideReason || undefined,
          boardResolutionReference: entry.boardResolutionReference || undefined,
        }
      })()
    : null

  async function saveDraft() {
    if (!memberId) {
      toast.error("Select a member before saving a draft.")
      return
    }
    if (!canUseDraft || !soloDraftSnapshot) {
      toast.error("Save as Draft is only available for a single loan application. Remove the extra entries first, or submit directly.")
      return
    }
    try {
      await loanDraft.save(soloDraftSnapshot)
      toast.success("Draft saved successfully.")
    } catch {}
  }

  const autosave = useAutosaveDraft(
    soloDraftSnapshot ?? { memberId, requirements: requirementItems, asDraft: true },
    (snap) => (memberId && canUseDraft ? loanDraft.save(snap) : Promise.resolve(undefined)),
    {
      enabled: Boolean(memberId) && Boolean(loanDraft.draftId) && canUseDraft && (!isEdit || isDraftContext) && loanDraft.status !== "saving" && !isSubmitting,
      delayMs: 30000,
    }
  )

  const hasUnsavedChanges = Boolean(memberId) && !successDialog
  const { showPrompt: showUnsavedPrompt, promptLeave, resolvePrompt } = useUnsavedChanges(hasUnsavedChanges)

  function updateEntry(key: string, patch: Partial<LoanEntry>) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)))
  }

  function handleLoanTypeChange(key: string, loanTypeId: string) {
    const loanType = loanTypes.find((lt) => lt.id === loanTypeId)
    const incomeBracket = loanType && loanType.incomeBrackets.length > 0 && member?.netPay != null
      ? bracketForNetPay(loanType.incomeBrackets, member.netPay)
      : null
    setEntries((prev) =>
      prev.map((e) =>
        e.key === key
          ? {
              ...e,
              loanTypeId,
              termMonths: e.termMonths ?? (loanType ? Math.min(12, loanType.maxTermMonths) : e.termMonths),
              requestedAmount: incomeBracket?.loanableAmount ?? loanType?.maxAmount ?? e.requestedAmount,
            }
          : e
      )
    )
  }

  function canProceedFromStep(s: number): boolean {
    if (s === 1) return !!member && hasAnyFullyPaidMonthlyDues
    if (s === 2) return entries.length > 0 && entries.every((e) => {
      const monthlyDuesCheck = derivedFor(e.key).eligibilityItems.find((item) => item.label === "Fully Paid Monthly Dues")
      const selectedLoanType = loanTypes.find((loanType) => loanType.id === e.loanTypeId)
      const bracket = selectedLoanType && selectedLoanType.incomeBrackets.length > 0 && member?.netPay != null
        ? bracketForNetPay(selectedLoanType.incomeBrackets, member.netPay)
        : null
      const amountWithinBracket = !selectedLoanType?.incomeBrackets.length || (
        bracket !== null
        && e.requestedAmount != null
        && e.requestedAmount >= selectedLoanType.minAmount
        && e.requestedAmount <= bracket.loanableAmount
      )
      return !!e.loanTypeId
        && !!e.requestedAmount
        && amountWithinBracket
        && !!e.termMonths
        && !!e.purpose.trim()
        && monthlyDuesCheck?.passed !== false
    }) && !!assignedOfficer.trim()
    if (s === 3) return entries.every((e) => !derivedFor(e.key).isBlocked)
    if (s === 4) return entries.every((e) => !!derivedFor(e.key).computation)
    return true
  }

  function goNext() {
    if (!canProceedFromStep(step)) {
      toast.error("Please complete the required fields before continuing.")
      return
    }
    setStep((s) => Math.min(STEPS.length, s + 1))
    if (memberId && loanDraft.draftId && canUseDraft) void autosave.triggerNow()
  }
  function goBack() {
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleSubmit(asDraft: boolean) {
    if (!member) return

    if (asDraft) {
      await saveDraft()
      return
    }

    const anyBlocked = entries.some((e) => derivedFor(e.key).isBlocked)
    if (anyBlocked) {
      toast.error("One or more entries cannot be submitted until eligibility is met or overridden.")
      return
    }
    if (entries.some((e) => !derivedFor(e.key).computation)) return
    if (!agree) {
      toast.error("Please confirm the information has been reviewed and is accurate.")
      return
    }

    setIsSubmitting(true)
    try {
      if (isEdit && id) {
        const entry = entries[0]
        const loan = await loanDraft.save({
          memberId: member.id,
          loanTypeId: entry.loanTypeId || undefined,
          requestedAmount: entry.requestedAmount,
          termMonths: entry.termMonths,
          purpose: entry.purpose || undefined,
          paymentMethod: entry.paymentMethod,
          requirements: requirementItems,
          asDraft: false,
          draftCurrentStep: step,
          eligibilityOverridden: entry.overrideEnabled && entry.overrideConfirmed,
          eligibilityOverrideReason: entry.overrideReason || undefined,
          boardResolutionReference: entry.boardResolutionReference || undefined,
        })
        toast.success("Loan application submitted successfully.")
        setSuccessDialog({ created: [loan] })
      } else {
        const created: LoanApplication[] = []
        for (const entry of entries) {
          const derived = derivedFor(entry.key)
          const loan = await createLoanApplication({
            memberId: member.id,
            loanTypeId: entry.loanTypeId || undefined,
            requestedAmount: derived.effectiveAmount,
            termMonths: entry.termMonths,
            purpose: entry.purpose || undefined,
            paymentMethod: entry.paymentMethod,
            requirements: requirementItems,
            asDraft: false,
            eligibilityOverridden: entry.overrideEnabled && entry.overrideConfirmed,
            eligibilityOverrideReason: entry.overrideReason || undefined,
            boardResolutionReference: entry.boardResolutionReference || undefined,
          })
          created.push(loan)
        }
        toast.success(
          created.length > 1 ? `${created.length} loan applications submitted successfully.` : "Loan application submitted successfully."
        )
        setSuccessDialog({ created })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save the loan application(s).")
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetWizardForNewApplication() {
    setStep(1)
    setMemberId("")
    setAssignedOfficer("")
    setEntries([makeLoanEntry()])
    setRequirements(Object.fromEntries(REQUIREMENT_LABELS.map((label) => [label, false])))
    setFileMeta({})
    setAgree(false)
    setSuccessDialog(null)
  }

  if (isEdit && isLoadingLoan) {
    return <FormSkeleton fields={["select", "text", "date", "select"]} columns={2} showUpload />
  }

  return (
    <div className="space-y-6 pb-20 mx-auto px-4 md:px-0">
      <PageHeader
        title={isDraftContext ? "Continue Loan Draft" : "Create Loan Application"}
        description="Encode a loan application based on the physical documents submitted by the member."
        actions={isDraftContext && <DraftStatusBadge status="Draft" />}
      />

      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
        <WizardStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* STEP 1: Select Member */}
      {step === 1 && (
        <FormSection 
          title={
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
                <User className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Step 1 · Select Member</span>
            </span>
          } 
          description={`Only members who have completed at least ${minimumMembershipMonths} month(s) of approved and active GCGEA membership are selectable.`}
        >
          <div className="space-y-4">
            <div className="max-w-2xl">
              <MemberEligibilitySelect value={memberId || undefined} selectedMember={member} onSelect={handleMemberSelect} />
            </div>
            {member ? (
              <>
                <MemberSummaryCard
                  member={member}
                  totalContributions={totalContributions}
                  outstandingLoanBalance={outstandingLoanBalance}
                  activeLoanCount={activeLoans.length}
                  overdueLoanCount={overdueLoans.length}
                  onChangeMember={() => setMemberId("")}
                />
                {!hasAnyFullyPaidMonthlyDues && (
                  <AlertBanner
                    tone="danger"
                    title="Fully Paid Monthly Dues — Not Eligible"
                    description={paidDuesPrecheckMessage}
                  />
                )}
              </>
            ) : (
              <EmptyState icon={UserSearch} title="No member selected" description="Search and select the member this application is being encoded for." />
            )}
          </div>
        </FormSection>
      )}

      {/* STEP 2: Loan Details Form */}
      {step === 2 && (
        <FormSection
          title={
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
                <Coins className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Step 2 · Loan Details</span>
            </span>
          }
          description="Enter one loan type and one requested amount for this application."
        >
          {member && (
            <div className="mb-5">
              <MemberSummaryCard
                member={member}
                totalContributions={totalContributions}
                outstandingLoanBalance={outstandingLoanBalance}
                activeLoanCount={activeLoans.length}
                overdueLoanCount={overdueLoans.length}
                onChangeMember={() => setStep(1)}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Application Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Assigned Loan Officer <span className="text-destructive">*</span></Label>
              <LoanOfficerCommandSelect value={assignedOfficer} onValueChange={setAssignedOfficer} />
            </div>
          </div>

          <div className="space-y-4">
            {entries.slice(0, 1).map((entry) => {
              const derived = derivedFor(entry.key)
              return (
                <div key={entry.key} className="rounded-xl border border-border/60 bg-muted/5 p-4 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Loan Type <span className="text-destructive">*</span></Label>
                      <CommandSelect
                        className="w-full h-10 text-sm bg-background border border-border hover:bg-accent/40 transition-all"
                        value={entry.loanTypeId}
                        onValueChange={(v) => handleLoanTypeChange(entry.key, v)}
                        options={loanTypes.filter((lt) => lt.status === "Active").map((lt) => ({ value: lt.id, label: lt.name }))}
                        placeholder="Select loan type"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Requested Amount <span className="text-destructive">*</span></Label>
                      {derived.isBracketedLoanType ? (
                        <div className="space-y-2 bg-muted/20 border border-border/60 rounded-xl p-4 shadow-inner">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Loanable Amount Range</span>
                          <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-semibold text-foreground">
                            {member?.netPay == null
                              ? "Unavailable"
                              : `${formatCurrency(derived.loanType?.minAmount ?? 0)} – ${formatCurrency(
                                  bracketForNetPay(derived.loanType?.incomeBrackets ?? [], member.netPay)?.loanableAmount ?? 0
                                )}`}
                          </div>
                          <Label className="block pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                            Requested Amount <span className="text-destructive">*</span>
                          </Label>
                          <CurrencyInput value={entry.requestedAmount} onChange={(value) => updateEntry(entry.key, { requestedAmount: value })} />
                          <p className={cn("mt-1 text-[11px] leading-relaxed", member?.netPay == null ? "font-medium text-destructive" : "text-muted-foreground")}>
                            {member?.netPay == null
                              ? "Member has no net pay on file — set it on the member's profile to compute the correct loanable limit."
                              : "Enter the actual amount the member wants to borrow within the calculated range above."}
                          </p>
                          {member?.netPay != null && entry.requestedAmount != null && (() => {
                            const bracket = bracketForNetPay(derived.loanType?.incomeBrackets ?? [], member.netPay)
                            return bracket && (entry.requestedAmount < (derived.loanType?.minAmount ?? 0) || entry.requestedAmount > bracket.loanableAmount) ? (
                              <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                                <AlertTriangle className="size-3.5" /> Enter an amount within the allowed net-pay range.
                              </p>
                            ) : null
                          })()}
                        </div>
                      ) : (
                        <CurrencyInput value={entry.requestedAmount} onChange={(v) => updateEntry(entry.key, { requestedAmount: v })} />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Loan Term (Months) <span className="text-destructive">*</span></Label>
                      <Input type="number" min={1} placeholder="e.g. 12" value={entry.termMonths ?? ""} onChange={(e) => updateEntry(entry.key, { termMonths: e.target.value ? Number(e.target.value) : undefined })} className="h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Payment Method</Label>
                      <CommandSelect
                        className="w-full h-10 text-sm bg-background border border-border hover:bg-accent/40 transition-all"
                        hideSearch
                        value={entry.paymentMethod}
                        onValueChange={(v) => updateEntry(entry.key, { paymentMethod: (v ?? "Payroll Deduction") as PaymentMethod })}
                        options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                        placeholder="Select payment method"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Purpose of Loan <span className="text-destructive">*</span></Label>
                      <Textarea rows={2} placeholder="e.g. Home repair, tuition, medical expenses" value={entry.purpose} onChange={(e) => updateEntry(entry.key, { purpose: e.target.value })} className="text-sm bg-background resize-none" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Remarks</Label>
                      <Textarea rows={2} placeholder="Additional notes about this application (optional)" value={entry.remarks} onChange={(e) => updateEntry(entry.key, { remarks: e.target.value })} className="text-sm bg-background resize-none" />
                    </div>
                  </div>

                  {derived.loanType && (
                    /* Placard-style Policy Panel */
                    <div className="rounded-xl border border-border bg-muted/20 p-5 shadow-inner relative overflow-hidden mt-4">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary" />
                      <p className="mb-3.5 font-bold uppercase tracking-wider text-[10px] text-foreground flex items-center gap-2">
                        <Info className="size-4 text-primary" />
                        {derived.loanType.name} — Core Policy Information
                      </p>
                      <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 text-xs text-muted-foreground sm:grid-cols-3 pt-1">
                        <div className="space-y-0.5">
                          <span className="block text-[10px] uppercase text-muted-foreground/60">Min Amount</span>
                          <strong className="text-sm font-semibold text-foreground">{formatCurrency(derived.loanType.minAmount)}</strong>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] uppercase text-muted-foreground/60">Max Amount</span>
                          <strong className="text-sm font-semibold text-foreground">{formatCurrency(derived.loanType.maxAmount)}</strong>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] uppercase text-muted-foreground/60">Interest Rate</span>
                          <strong className="text-sm font-semibold text-foreground">{derived.loanType.defaultInterestRate}% / mo</strong>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] uppercase text-muted-foreground/60">Interest Method</span>
                          <strong className="text-sm font-semibold text-foreground">{derived.loanType.interestMethod}</strong>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] uppercase text-muted-foreground/60">Max Term</span>
                          <strong className="text-sm font-semibold text-foreground">{derived.loanType.maxTermMonths} months</strong>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] uppercase text-muted-foreground/60">Processing Fee</span>
                          <strong className="text-sm font-semibold text-foreground">{formatCurrency(derived.loanType.processingFee)}</strong>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] uppercase text-muted-foreground/60">Min. Tenure</span>
                          <strong className="text-sm font-semibold text-foreground">{derived.loanType.requiredMembershipMonths} months</strong>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] uppercase text-muted-foreground/60">Min. Contributions</span>
                          <strong className="text-sm font-semibold text-foreground">{derived.loanType.requiredContributionMonths} months</strong>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] uppercase text-muted-foreground/60">Concurrent Active</span>
                          <strong className="text-sm font-semibold text-foreground">{derived.loanType.allowExistingActiveLoan ? "Permitted" : "Not Allowed"}</strong>
                        </div>
                      </div>
                      {entry.requestedAmount != null && !derived.isBracketedLoanType && (entry.requestedAmount < derived.loanType.minAmount || entry.requestedAmount > derived.loanType.maxAmount) && (
                        <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/25 p-3 text-xs font-semibold text-destructive animate-pulse">
                          <AlertTriangle className="size-4 shrink-0" /> Requested amount is outside the allowed range for this loan type.
                        </div>
                      )}
                      {entry.termMonths != null && entry.termMonths > derived.loanType.maxTermMonths && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/25 p-3 text-xs font-semibold text-destructive animate-pulse">
                          <AlertTriangle className="size-4 shrink-0" /> Term exceeds the maximum allowed for this loan type.
                        </div>
                      )}
                    </div>
                  )}
                  {derived.loanType && (() => {
                    const monthlyDuesCheck = derived.eligibilityItems.find((item) => item.label === "Fully Paid Monthly Dues")
                    const requiredMonths = Math.max(derived.loanType.requiredContributionMonths, requiredPaidMonths)
                    const monthStatuses = loanSettings?.requireConsecutiveContributionMonths === false
                      ? []
                      : monthlyDuesWindow(paidMonthlyDuesPeriods, requiredMonths)
                    return monthlyDuesCheck && !monthlyDuesCheck.passed ? (
                      <AlertBanner
                        tone="danger"
                        title="Fully Paid Monthly Dues — Not Eligible"
                        description={
                          <div className="space-y-2.5">
                            <p>{monthlyDuesCheck.detail} Requirement applied for {derived.loanType.name}: {requiredMonths} fully paid month(s).</p>
                            {monthStatuses.length > 0 && (
                              <div>
                                <p className="mb-1.5 text-xs font-semibold text-foreground/80">Required monthly payment status</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {monthStatuses.map((month) => (
                                    <span
                                      key={month.period}
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold",
                                        month.status === "paid"
                                          ? "border-success/30 bg-success/10 text-success"
                                          : month.status === "due"
                                            ? "border-warning/40 bg-warning/10 text-warning"
                                            : "border-destructive/30 bg-destructive/10 text-destructive"
                                      )}
                                    >
                                      {month.status === "paid"
                                        ? <CheckCircle2 className="size-3.5" />
                                        : month.status === "due"
                                          ? <AlertTriangle className="size-3.5" />
                                          : <XCircle className="size-3.5" />}
                                      {month.label}
                                    </span>
                                  ))}
                                </div>
                                <p className="mt-2 text-xs font-semibold text-success">
                                  Paid month(s): {monthStatuses.filter((month) => month.status === "paid").map((month) => month.label).join(", ") || "None"}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-warning">
                                  Current month to pay: {monthStatuses.filter((month) => month.status === "due").map((month) => month.label).join(", ") || "None"}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-destructive">
                                  Missed past month(s): {monthStatuses.filter((month) => month.status === "overdue").map((month) => month.label).join(", ") || "None"}
                                </p>
                              </div>
                            )}
                          </div>
                        }
                      />
                    ) : null
                  })()}
                </div>
              )
            })}
          </div>
        </FormSection>
      )}

      {/* STEP 3: Eligibility Checklist */}
      {step === 3 && (
        <FormSection 
          title={
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
                <ClipboardCheck className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Step 3 · Eligibility Check</span>
            </span>
          }
        >
          <div className="space-y-6">
            {entries.map((entry, idx) => {
              const derived = derivedFor(entry.key)
              return (
                <div key={entry.key} className="space-y-3">
                  {entries.length > 1 && (
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                      Entry {idx + 1}{derived.loanType ? ` · ${derived.loanType.name}` : ""}
                    </p>
                  )}
                  {derived.eligibilityItems.length === 0 ? (
                    <AlertBanner tone="warning" title="Incomplete information" description="Select a member and loan type first." />
                  ) : (
                    <div className="space-y-4">
                      <EligibilityChecklist items={derived.eligibilityItems} result={derived.eligibilityResult} />
                      {derived.eligibilityResult === "Not Eligible" && canOverride && (
                        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-4">
                          <label className="flex items-center gap-2.5 text-sm font-semibold text-foreground cursor-pointer">
                            <Checkbox checked={entry.overrideEnabled} onCheckedChange={(v) => updateEntry(entry.key, { overrideEnabled: !!v })} />
                            Override eligibility for this entry
                          </label>
                          {entry.overrideEnabled && (
                            <div className="mt-3 space-y-4 animate-in fade-in duration-200">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Override Reason <span className="text-destructive">*</span></Label>
                                <Textarea rows={2} value={entry.overrideReason} onChange={(e) => updateEntry(entry.key, { overrideReason: e.target.value })} placeholder="Explain why this application should proceed despite failing eligibility…" className="text-sm bg-background resize-none" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Board Resolution Reference</Label>
                                <Input value={entry.boardResolutionReference} onChange={(e) => updateEntry(entry.key, { boardResolutionReference: e.target.value })} placeholder="e.g. Board Resolution No. 24-2026 (optional unless required for the amount involved)" className="h-10 text-sm" />
                              </div>
                              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                <Checkbox checked={entry.overrideConfirmed} onCheckedChange={(v) => updateEntry(entry.key, { overrideConfirmed: !!v })} />
                                I confirm I am authorized to override eligibility for this entry.
                              </label>
                              <Button type="button" variant="outline" size="sm" onClick={() => setOverrideDialogEntryKey(entry.key)} disabled={!entry.overrideReason.trim() || !entry.overrideConfirmed} className="h-9 gap-1.5 text-xs">
                                <ShieldAlert className="size-3.5" /> Confirm Override
                              </Button>
                              {entry.overrideApplied && (
                                <p className="text-xs font-semibold text-success">Override recorded — this will be saved with the application and logged to the audit trail.</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {derived.eligibilityResult === "Not Eligible" && !canOverride && (
                        <AlertBanner tone="danger" title="Eligibility override not available" description="You do not have permission to override eligibility. Please coordinate with an authorized officer." />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </FormSection>
      )}

      {/* STEP 4: Loan Computation */}
      {step === 4 && (
        <FormSection 
          title={
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
                <Calculator className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Step 4 · Loan Computation</span>
            </span>
          }
        >
          <div className="space-y-6">
            {entries.map((entry, idx) => {
              const derived = derivedFor(entry.key)
              if (!derived.computation) return null
              const computation = derived.computation
              return (
                <div key={entry.key} className="space-y-4">
                  {entries.length > 1 && (
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                      Entry {idx + 1}{derived.loanType ? ` · ${derived.loanType.name}` : ""}
                    </p>
                  )}
                  <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Payment Term</p>
                      <p className="text-[11px] text-muted-foreground">Change the number of payment months to recalculate the loan.</p>
                    </div>
                    <div className="w-full sm:w-52">
                      <Label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Months to Pay
                      </Label>
                      <CommandSelect
                        className="h-9 w-full bg-background text-sm"
                        hideSearch
                        value={entry.termMonths ? String(entry.termMonths) : undefined}
                        onValueChange={(value) => updateEntry(entry.key, { termMonths: value ? Number(value) : undefined })}
                        options={Array.from({ length: derived.loanType?.maxTermMonths ?? 1 }, (_, month) => ({
                          value: String(month + 1),
                          label: `${month + 1} month${month === 0 ? "" : "s"}`,
                        }))}
                        placeholder="Select months"
                      />
                    </div>
                  </div>
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

                  <div className="rounded-lg border border-info/25 bg-info/5 px-4 py-3 text-xs leading-relaxed text-foreground/80">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <p className="font-semibold text-foreground">Computation Basis</p>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {derived.loanType?.interestMethod ?? "Configured method"} · {derived.loanType?.defaultInterestRate ?? 0}%/month · {entry.termMonths} month(s)
                      </span>
                    </div>
                    <div className="mt-2 grid gap-x-5 gap-y-1 sm:grid-cols-2">
                      <p>
                        <span className="font-medium text-foreground">Interest = </span>
                        {derived.loanType?.interestMethod === "Zero Interest"
                          ? <><strong>{formatCurrency(computation.principal)}</strong> Principal Loan Amount × <strong>0%</strong> Monthly Interest = <strong>{formatCurrency(computation.totalInterest)}</strong></>
                          : derived.loanType?.interestMethod === "Flat Interest"
                            ? <><strong>{formatCurrency(computation.principal)}</strong> Principal Loan Amount × <strong>{derived.loanType.defaultInterestRate}%</strong> Monthly Interest × <strong>{entry.termMonths}</strong> Months = <strong>{formatCurrency(computation.totalInterest)}</strong></>
                            : <>Sum of (<strong>Remaining Principal Balance</strong> × <strong>{derived.loanType?.defaultInterestRate ?? 0}%</strong> Monthly Interest) for <strong>{entry.termMonths}</strong> Months = <strong>{formatCurrency(computation.totalInterest)}</strong></>}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Total Payable = </span>
                        <strong>{formatCurrency(computation.principal)}</strong> Principal Loan Amount + <strong>{formatCurrency(computation.totalInterest)}</strong> Total Interest = <strong>{formatCurrency(computation.totalAmountPayable)}</strong>
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Monthly Amortization = </span>
                        {derived.loanType?.interestMethod === "Diminishing Balance"
                          ? <><strong>{formatCurrency(computation.principal)}</strong> Principal × Monthly Rate Formula for <strong>{entry.termMonths}</strong> Months = <strong>{formatCurrency(computation.monthlyAmortization)}</strong></>
                          : <><strong>{formatCurrency(computation.totalAmountPayable)}</strong> Total Payable ÷ <strong>{entry.termMonths}</strong> Payment Months = <strong>{formatCurrency(computation.monthlyAmortization)}</strong></>}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Net Proceeds = </span>
                        <strong>{formatCurrency(computation.principal)}</strong> Principal Loan Amount − <strong>{formatCurrency(computation.processingFee)}</strong> Processing Fee
                        {computation.serviceCharge > 0 && <> − <strong>{formatCurrency(computation.serviceCharge)}</strong> Service Charge</>}
                        {" = "}<strong>{formatCurrency(computation.netProceeds)}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                    <DataTable
                      columns={AMORTIZATION_COLUMNS}
                      data={computation.schedule}
                      getRowId={(row) => String(row.installmentNumber)}
                      enableColumnVisibility={false}
                      maxHeight="max-h-96"
                      emptyTitle="No amortization schedule"
                      emptyDescription="Complete the loan amount and term to generate the schedule."
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </FormSection>
      )}

      {/* STEP 5: Requirements Checklist */}
      {step === 5 && (
        <FormSection 
          title={
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
                <FileCheck className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Step 5 · Requirements</span>
            </span>
          } 
          description="Confirm which supporting documents have been submitted. Shared across every entry in this session."
        >
          <div className="grid grid-cols-1 gap-2">
            {REQUIREMENT_LABELS.map((label) => (
              <div 
                key={label} 
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition-all duration-200",
                  requirements[label]
                    ? "bg-emerald-500/[0.02] border-emerald-500/25 shadow-sm"
                    : "bg-card border-border/60 hover:border-border"
                )}
              >
                <label className="flex items-center gap-2.5 text-sm text-foreground font-medium cursor-pointer">
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
            <AlertBanner tone="warning" className="mt-4 animate-in fade-in duration-200" title={`${missingRequirements.length} requirement(s) missing`} description="You may still proceed, but missing requirements will be flagged in the review step." />
          )}
        </FormSection>
      )}

      {/* STEP 6: Review & Consent */}
      {step === 6 && member && (
        <FormSection 
          title={
            <span className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background border border-border/60 shadow-xs">
                <Sparkles className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Step 6 · Review and Submit</span>
            </span>
          }
        >
          <div className="space-y-4">
            <ReviewBlock title="Member Overview">
              <ReviewRow label="Full Name" value={member.fullName} />
              <ReviewRow label="Member Number" value={member.memberNumber} />
              <ReviewRow label="Office Name" value={member.officeName} />
              <ReviewRow label="Assigned Officer" value={assignedOfficer} />
            </ReviewBlock>

            {entries.map((entry, idx) => {
              const derived = derivedFor(entry.key)
              return (
                <div key={entry.key} className="space-y-4 rounded-xl border border-border/60 bg-muted/5 p-4">
                  {entries.length > 1 && (
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Entry {idx + 1}</p>
                  )}
                  <ReviewBlock title="Loan Details">
                    <ReviewRow label="Loan Type" value={derived.loanType?.name ?? "—"} />
                    <ReviewRow label="Requested Amount" value={formatCurrency(derived.effectiveAmount ?? 0)} />
                    <ReviewRow label="Term" value={`${entry.termMonths} months`} />
                    <ReviewRow label="Purpose" value={entry.purpose} />
                    <ReviewRow label="Payment Method" value={entry.paymentMethod} />
                  </ReviewBlock>
                  <ReviewBlock title="Eligibility">
                    <ReviewRow label="Result" value={derived.eligibilityResult} />
                    {entry.overrideEnabled && <ReviewRow label="Override Reason" value={entry.overrideReason} />}
                  </ReviewBlock>
                  {derived.computation && (
                    <ReviewBlock title="Computation">
                      <ReviewRow label="Monthly Amortization" value={formatCurrency(derived.computation.monthlyAmortization)} />
                      <ReviewRow label="Total Amount Payable" value={formatCurrency(derived.computation.totalAmountPayable)} />
                      <ReviewRow label="Net Proceeds" value={formatCurrency(derived.computation.netProceeds)} />
                    </ReviewBlock>
                  )}
                  {entry.remarks && (
                    <ReviewBlock title="Staff Remarks">
                      <p className="text-sm text-foreground/80 pl-1">{entry.remarks}</p>
                    </ReviewBlock>
                  )}
                </div>
              )
            })}

            <ReviewBlock title="Requirements">
              <ReviewRow label="Submitted" value={`${requirementItems.filter((r) => r.completed).length} / ${requirementItems.length}`} />
            </ReviewBlock>

            {entries.some((e) => derivedFor(e.key).isBlocked) && (
              <AlertBanner tone="danger" title="Cannot submit" description="One or more entries do not meet eligibility requirements and have not been overridden. You may still save a single entry as a draft." />
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
        <Button variant="outline" onClick={() => promptLeave(() => navigate("/loans"))} className="h-9 text-xs">Cancel</Button>
        <div className="flex flex-wrap items-center gap-2">
          {step > 1 && <Button variant="outline" onClick={goBack} className="h-9 text-xs">Previous</Button>}
          <SaveDraftButton status={loanDraft.status} lastSavedAt={loanDraft.lastSavedAt} onClick={saveDraft} disabled={!memberId || isSubmitting || !canUseDraft} />
          {step < STEPS.length ? (
            <Button onClick={goNext} disabled={!canProceedFromStep(step)} className="h-9 text-xs">Next</Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={isSubmitting || entries.some((e) => derivedFor(e.key).isBlocked) || !agree} aria-busy={isSubmitting} className="h-9 text-xs gap-1.5 shadow-sm active:scale-97 transition-all">
              {isSubmitting ? <Loader2 className="animate-spin size-3.5" aria-hidden="true" /> : <FilePlus2 className="size-3.5" aria-hidden="true" />}
              {isSubmitting ? "Submitting…" : entries.length > 1 ? `Submit ${entries.length} Applications` : "Submit Application"}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!overrideDialogEntryKey}
        onOpenChange={(open) => !open && setOverrideDialogEntryKey(null)}
        title="Confirm eligibility override"
        description="You are about to override a failed eligibility check for this entry. This action will be recorded in the application's history."
        confirmLabel="Confirm Override"
        destructive
        onConfirm={() => {
          if (overrideDialogEntryKey) updateEntry(overrideDialogEntryKey, { overrideApplied: true })
          setOverrideDialogEntryKey(null)
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
        <DialogContent className="sm:max-w-sm rounded-2xl p-6">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">{successDialog && successDialog.created.length > 1 ? "Applications Saved" : "Application Saved"}</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              {successDialog?.created.map((l) => (
                <span key={l.id} className="block mt-0.5">
                  <span className="font-bold text-foreground">{l.applicationNumber}</span>
                </span>
              ))}
              {" "}has been recorded successfully.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-4">
            {successDialog && successDialog.created.length === 1 && (
              <Button className="w-full h-9 text-xs shadow-sm" onClick={() => navigate(`/loans/${successDialog.created[0].id}`)}>
                View Loan Application
              </Button>
            )}
            <Button variant="outline" className="w-full h-9 text-xs" onClick={resetWizardForNewApplication}>
              Create Another Application
            </Button>
            <Button variant="ghost" className="w-full h-9 text-xs text-muted-foreground" onClick={() => navigate("/loans")}>
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
    <div className="rounded-xl border border-border/60 bg-muted/5 p-4 flex flex-col justify-between space-y-1.5 transition-all hover:bg-muted/10 duration-200">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">{label}</span>
      <span className="text-sm font-bold text-foreground">{value}</span>
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
