import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import {
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
  ArrowRight,
  ArrowLeft,
  UserSearch,
  Printer,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { WizardStepIndicator } from "@/components/shared/WizardStepIndicator"
import { MemberSummaryCard } from "@/components/shared/MemberSummaryCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { EligibilityChecklist, type EligibilityResult } from "@/components/shared/EligibilityChecklist"
import { FileUploader } from "@/components/shared/FileUploader"
import { FormSkeleton } from "@/components/shared/loaders/FormSkeleton"
import { CardLoader } from "@/components/shared/loaders/CardLoader"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { SaveDraftButton } from "@/components/shared/SaveDraftButton"
import { DraftStatusBadge } from "@/components/shared/DraftStatusBadge"
import { UnsavedChangesDialog } from "@/components/shared/UnsavedChangesDialog"
import { LoanOfficerCommandSelect } from "@/features/loans/components/LoanOfficerCommandSelect"
import { MemberEligibilitySelect } from "@/features/loans/components/MemberEligibilitySelect"
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
import { Checkbox } from "@/components/ui/checkbox"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DataTable } from "@/components/shared/DataTable"
import { getMember, updateMemberLoanFinancialProfile } from "@/services/members.service"
import { listAllContributions } from "@/services/contributions.service"
import { listAllDeductions } from "@/services/deductions.service"
import { getLoanSettings } from "@/services/loan-settings.service"
import {
  createLoanApplication,
  getLoan,
  listLoanTypes,
  getMemberLoans,
  updateLoanApplication,
  uploadLoanDocument,
  type CreateLoanApplicationInput,
} from "@/services/loans.service"
import { bracketForNetPay, computeLoan, type LoanComputationResult } from "@/utils/loan-math"
import { evaluateLoanEligibility, resultFor, type DuesStanding, type PaidMonthlyDuesSummary } from "@/utils/eligibility"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import { useDraft } from "@/hooks/useDraft"
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft"
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges"
import { cn } from "@/lib/utils"
import type {
  AmortizationEntry,
  EligibilityCheckItem,
  LoanApplication,
  LoanDocument,
  LoanRequirementItem,
  LoanType,
  Member,
  PaymentMethod,
} from "@/types"

const STEPS = [
  "Select Member",
  "Loan Details",
  "Eligibility Check",
  "Loan Computation",
  "Requirements",
  "Review & Submit",
]

const REQUIREMENT_LABELS = [
  "Accomplished Loan Application Form",
  "Latest Net Take Home Pay",
  "Valid Government ID",
  "Authorization for Salary Deduction",
  "Promissory Note",
]

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]

const AMORTIZATION_COLUMNS: ColumnDef<AmortizationEntry, unknown>[] = [
  {
    accessorKey: "installmentNumber",
    header: "#",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold text-muted-foreground">
        {row.original.installmentNumber}
      </span>
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">{formatDateShort(row.original.dueDate)}</span>
    ),
  },
  {
    accessorKey: "beginningBalance",
    header: "Beginning Balance",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{formatCurrency(row.original.beginningBalance)}</span>
    ),
  },
  {
    accessorKey: "principal",
    header: "Principal",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold text-foreground">
        {formatCurrency(row.original.principal)}
      </span>
    ),
  },
  {
    accessorKey: "interest",
    header: "Interest",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">{formatCurrency(row.original.interest)}</span>
    ),
  },
  {
    accessorKey: "amountDue",
    header: "Amount Due",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-bold text-primary">
        {formatCurrency(row.original.amountDue)}
      </span>
    ),
  },
  {
    accessorKey: "remainingBalance",
    header: "Remaining Balance",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{formatCurrency(row.original.remainingBalance)}</span>
    ),
  },
]

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
  isFirstSolidarityLoan: boolean
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
  const { user, hasPermission } = useAuth()
  const hasOverridePermission = hasPermission("loans.override_eligibility")

  const { data: existingLoan, isLoading: isLoadingLoan } = useQuery({
    queryKey: ["loans", id],
    queryFn: () => getLoan(id!),
    enabled: isEdit,
  })

  const [step, setStep] = React.useState(1)
  const [memberId, setMemberId] = React.useState(() => searchParams.get("member") ?? "")
  const [applicationDate, setApplicationDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const loggedInUserIsLoanOfficer = ["loan officer", "senior loan officer", "assigned loan officer"].includes(
    user?.roleName.trim().toLowerCase() ?? ""
  )
  const [assignedOfficer, setAssignedOfficer] = React.useState(() =>
    !isEdit && loggedInUserIsLoanOfficer ? (user?.fullName ?? "") : ""
  )

  React.useEffect(() => {
    if (!isEdit && loggedInUserIsLoanOfficer && !assignedOfficer && user?.fullName) {
      setAssignedOfficer(user.fullName)
    }
  }, [assignedOfficer, isEdit, loggedInUserIsLoanOfficer, user?.fullName])

  React.useEffect(() => {
    const paramMemberId = searchParams.get("member")
    if (paramMemberId && paramMemberId !== memberId && !isEdit) {
      setMemberId(paramMemberId)
    }
  }, [searchParams, memberId, isEdit])

  // A GCGEA Member self-service account can only ever apply for themselves —
  // the backend force-overrides memberId on submit regardless, but locking it
  // here avoids the confusing experience of browsing/picking someone else's name.
  React.useEffect(() => {
    if (!isEdit && user?.memberId && memberId !== user.memberId) {
      setMemberId(user.memberId)
    }
  }, [isEdit, user?.memberId, memberId])

  const [entries, setEntries] = React.useState<LoanEntry[]>(() => [makeLoanEntry()])

  React.useEffect(() => {
    setEntries((current) => (current.length > 1 ? [current[0]] : current))
  }, [])
  const [overrideDialogEntryKey, setOverrideDialogEntryKey] = React.useState<string | null>(null)

  const [requirements, setRequirements] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(REQUIREMENT_LABELS.map((label) => [label, false]))
  )
  const [requirementFiles, setRequirementFiles] = React.useState<Record<string, File>>({})

  const existingDocumentsByLabel = React.useMemo(() => {
    const map = new Map<string, LoanDocument>()
    for (const doc of existingLoan?.documents ?? []) map.set(doc.requirementLabel, doc)
    return map
  }, [existingLoan])

  function hasFileFor(label: string): boolean {
    return Boolean(requirementFiles[label]) || existingDocumentsByLabel.has(label)
  }

  const [agree, setAgree] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [memberNetPay, setMemberNetPay] = React.useState<number | undefined>()
  const [netPayDocument, setNetPayDocument] = React.useState<File | null>(null)
  const [isSavingMemberFinancials, setIsSavingMemberFinancials] = React.useState(false)
  const [confirmedSavedNetPay, setConfirmedSavedNetPay] = React.useState<number | null>(null)
  const [confirmedFinancialDocument, setConfirmedFinancialDocument] = React.useState(false)
  const [isAutosaving, setIsAutosaving] = React.useState(false)
  const [successDialog, setSuccessDialog] = React.useState<{ created: LoanApplication[] } | null>(null)

  const { data: member, isLoading: isLoadingMember } = useQuery({
    queryKey: ["members", memberId],
    queryFn: () => getMember(memberId),
    enabled: !!memberId,
  })
  const effectiveMemberNetPay = confirmedSavedNetPay ?? member?.netPay
  const hasMemberNetPay = Number(effectiveMemberNetPay ?? 0) > 0
  const hasMemberNetPayDocument =
    confirmedFinancialDocument || (member?.documents.some((document) => document.category === "Payslip") ?? false)
  const hasCompleteMemberFinancialInfo = hasMemberNetPay && hasMemberNetPayDocument
  const { data: loanTypes = [] } = useQuery({ queryKey: ["loan-types"], queryFn: listLoanTypes })
  const { data: loanSettings, isLoading: isLoadingLoanSettings } = useQuery({
    queryKey: ["loan-settings"],
    queryFn: getLoanSettings,
  })
  const appliedConfiguredTermsRef = React.useRef(new Set<string>())

  React.useEffect(() => {
    if (isEdit || loanTypes.length === 0) return

    setEntries((current) =>
      current.map((entry) => {
        if (!entry.loanTypeId) return entry
        const loanType = loanTypes.find((type) => type.id === entry.loanTypeId)
        if (!loanType) return entry

        const settingKey = `${entry.key}:${loanType.id}:${loanType.maxTermMonths}`
        if (appliedConfiguredTermsRef.current.has(settingKey)) return entry
        appliedConfiguredTermsRef.current.add(settingKey)

        return { ...entry, termMonths: loanType.maxTermMonths }
      })
    )
  }, [isEdit, loanTypes])

  const canOverride = hasOverridePermission && (loanSettings?.allowEligibilityOverride ?? true)
  const appliedDefaultPaymentMethodRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (isEdit || !loanSettings?.defaultPaymentMethod) return
    if (appliedDefaultPaymentMethodRef.current === loanSettings.defaultPaymentMethod) return

    appliedDefaultPaymentMethodRef.current = loanSettings.defaultPaymentMethod
    setEntries((current) =>
      current.map((entry) => ({
        ...entry,
        paymentMethod: loanSettings.defaultPaymentMethod as PaymentMethod,
      }))
    )
  }, [isEdit, loanSettings?.defaultPaymentMethod])

  const { data: liveContributions = [], isLoading: isLoadingContributions } = useQuery({
    queryKey: ["contributions", "all"],
    queryFn: listAllContributions,
  })
  const { data: liveDeductions = [] } = useQuery({
    queryKey: ["deductions", "all"],
    queryFn: listAllDeductions,
  })
  const minimumMembershipMonths = loanSettings?.minimumMembershipMonths ?? 6
  const requiredMonthlyDuesAmount = loanSettings?.requiredMonthlyDuesAmount ?? 100
  const isVerifyingMemberEligibility = Boolean(
    memberId && (isLoadingMember || isLoadingContributions || isLoadingLoanSettings)
  )

  const memberLoans = memberId ? getMemberLoans(memberId) : []
  const memberContributions = memberId
    ? liveContributions.filter((c) => c.memberId === memberId && c.status === "Posted")
    : []
  const memberDeductions = memberId
    ? liveDeductions.filter((deduction) => deduction.memberId === memberId && deduction.status === "Posted")
    : []
  const paidMonthlyDuesPeriods = [
    ...new Set(
      memberContributions
        .filter((c) => c.contributionType === "Monthly Dues" && c.amount >= requiredMonthlyDuesAmount)
        .map((c) => c.contributionPeriod)
    ),
  ].sort()
  let consecutivePaidMonths = paidMonthlyDuesPeriods.length > 0 ? 1 : 0
  for (let index = paidMonthlyDuesPeriods.length - 1; index > 0; index--) {
    if (previousContributionPeriod(paidMonthlyDuesPeriods[index]) !== paidMonthlyDuesPeriods[index - 1]) break
    consecutivePaidMonths++
  }
  const requiredPaidMonths = loanSettings?.minimumPaidContributionMonths ?? 6
  const verifiedPaidMonths =
    loanSettings?.requireConsecutiveContributionMonths === false
      ? paidMonthlyDuesPeriods.length
      : consecutivePaidMonths
  const hasAnyFullyPaidMonthlyDues =
    loanSettings?.requirePaidContributions === false || paidMonthlyDuesPeriods.length > 0
  const paidDuesPrecheckMessage =
    paidMonthlyDuesPeriods.length === 0
      ? "This member cannot apply for a loan because no fully paid Monthly Dues contributions are recorded."
      : `Only ${verifiedPaidMonths} of required ${requiredPaidMonths} fully paid Monthly Dues months were verified.`
  const totalContributions = memberContributions.reduce((sum, c) => sum + c.amount, 0)

  const currentPeriod = new Date().toISOString().slice(0, 7)
  const priorPeriodDate = new Date()
  priorPeriodDate.setMonth(priorPeriodDate.getMonth() - 1)
  const priorPeriod = priorPeriodDate.toISOString().slice(0, 7)
  const duesStanding: DuesStanding = {
    hasCurrentMonthlyDues: memberContributions.some(
      (c) =>
        c.contributionType === "Monthly Dues" &&
        c.amount >= requiredMonthlyDuesAmount &&
        [currentPeriod, priorPeriod].includes(c.contributionPeriod)
    ),
    hasCurrentCashPabaon: memberDeductions.some(
      (deduction) =>
        deduction.deductionTypeCode?.toLowerCase() === "pabaon" &&
        [currentPeriod, priorPeriod].includes(deduction.period)
    ),
  }
  const activeLoans = memberLoans.filter((l) => ["Active", "Overdue", "Released"].includes(l.status))
  const overdueLoans = memberLoans.filter((l) => l.status === "Overdue")
  const outstandingLoanBalance = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0)

  function handleMemberSelect(selectedMemberId: string) {
    setMemberId(selectedMemberId)
    setConfirmedSavedNetPay(null)
    setConfirmedFinancialDocument(false)
    if (loanSettings?.requirePaidContributions === false) return
    if (isLoadingContributions || isLoadingLoanSettings) return

    const qualifyingPeriods = new Set(
      liveContributions
        .filter(
          (contribution) =>
            contribution.memberId === selectedMemberId &&
            contribution.status === "Posted" &&
            contribution.contributionType === "Monthly Dues" &&
            contribution.amount >= requiredMonthlyDuesAmount
        )
        .map((contribution) => contribution.contributionPeriod)
    )

    if (qualifyingPeriods.size === 0) {
      toast.error(
        "This member cannot apply for a loan because no fully paid Monthly Dues contributions are recorded."
      )
    }
  }

  function deriveEntry(entry: LoanEntry, memberForEval: Member | undefined): EntryDerived {
    const loanType = loanTypes.find((lt) => lt.id === entry.loanTypeId)
    const isBracketedLoanType = Boolean(loanType && loanType.incomeBrackets.length > 0)
    const isFirstSolidarityLoan = Boolean(
      (loanSettings?.lockFirstSolidarityLoan ?? true) &&
        loanType?.name.toLowerCase().includes("solidarity") &&
        !memberLoans.some((loan) => !["Draft", "Rejected", "Cancelled"].includes(loan.status))
    )
    const firstSolidarityLoanAmount = loanSettings?.firstSolidarityLoanAmount ?? 20_000
    const effectiveAmount = isFirstSolidarityLoan ? firstSolidarityLoanAmount : entry.requestedAmount
    const paidMonthlyDues: PaidMonthlyDuesSummary = {
      paidMonths: paidMonthlyDuesPeriods.length,
      consecutivePaidMonths,
      requiredMonths: Math.max(
        loanType?.requiredContributionMonths ?? 0,
        loanSettings?.minimumPaidContributionMonths ?? 6
      ),
      requiredAmount: requiredMonthlyDuesAmount,
      requirePaidContributions: loanSettings?.requirePaidContributions ?? true,
      requireConsecutiveMonths: loanSettings?.requireConsecutiveContributionMonths ?? true,
      lockFirstSolidarityLoan: loanSettings?.lockFirstSolidarityLoan ?? true,
      firstSolidarityLoanAmount,
    }

    const eligibilityItems =
      memberForEval && loanType
        ? evaluateLoanEligibility(
            memberForEval,
            loanType,
            effectiveAmount,
            entry.termMonths,
            paidMonthlyDues,
            memberLoans,
            minimumMembershipMonths,
            duesStanding
          )
        : []
    const eligibilityResult: EligibilityResult =
      eligibilityItems.length > 0 ? resultFor(eligibilityItems) : "Not Eligible"
    const isBlocked =
      eligibilityResult === "Not Eligible" &&
      !(entry.overrideEnabled && entry.overrideReason.trim() && entry.overrideConfirmed)

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

    return {
      loanType,
      isBracketedLoanType,
      isFirstSolidarityLoan,
      effectiveAmount,
      eligibilityItems,
      eligibilityResult,
      isBlocked,
      computation,
    }
  }

  const derivedByKey = React.useMemo(() => {
    const map = new Map<string, EntryDerived>()
    entries.forEach((entry) => map.set(entry.key, deriveEntry(entry, member)))
    return map
  }, [
    entries,
    member,
    loanTypes,
    applicationDate,
    paidMonthlyDuesPeriods.length,
    consecutivePaidMonths,
    memberLoans.length,
    minimumMembershipMonths,
    requiredMonthlyDuesAmount,
    loanSettings,
    duesStanding.hasCurrentMonthlyDues,
    duesStanding.hasCurrentCashPabaon,
  ])

  function derivedFor(key: string): EntryDerived {
    return derivedByKey.get(key) ?? deriveEntry(entries.find((e) => e.key === key)!, member)
  }

  const hydratedLoanIdRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!existingLoan) return
    if (hydratedLoanIdRef.current === existingLoan.id) return
    hydratedLoanIdRef.current = existingLoan.id
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
    const uploadedLabels = new Set((existingLoan.documents ?? []).map((d) => d.requirementLabel))
    setRequirements(
      Object.fromEntries(REQUIREMENT_LABELS.map((label) => [label, uploadedLabels.has(label)]))
    )
    setStep(existingLoan.draftCurrentStep ?? 1)
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

  const requirementItems: LoanRequirementItem[] = REQUIREMENT_LABELS.map((label) => ({
    label,
    completed: requirements[label],
  }))
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
          assignedOfficer: assignedOfficer || undefined,
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
      toast.error("Save as Draft is only available for a single loan application.")
      return
    }
    try {
      await loanDraft.save(soloDraftSnapshot)
      toast.success("Draft saved successfully.")
    } catch {}
  }

  const autosave = useAutosaveDraft(
    soloDraftSnapshot ?? { memberId, requirements: requirementItems, asDraft: true },
    async (snap) => {
      if (!memberId || !canUseDraft) return
      setIsAutosaving(true)
      try {
        await loanDraft.save(snap, { silent: true })
      } catch {} finally {
        setIsAutosaving(false)
      }
    },
    {
      enabled:
        Boolean(memberId) &&
        Boolean(loanDraft.draftId) &&
        canUseDraft &&
        (!isEdit || isDraftContext) &&
        loanDraft.status !== "saving" &&
        !isSubmitting,
      delayMs: 30000,
    }
  )

  const draftButtonStatus = isAutosaving && loanDraft.status === "saving" ? "idle" : loanDraft.status

  const hasUnsavedChanges = Boolean(memberId) && !successDialog
  const { showPrompt: showUnsavedPrompt, promptLeave, resolvePrompt } = useUnsavedChanges(hasUnsavedChanges)

  function updateEntry(key: string, patch: Partial<LoanEntry>) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)))
  }

  async function saveMemberFinancialProfile() {
    const netPay = memberNetPay ?? member?.netPay
    if (!member || !netPay || netPay <= 0 || (!hasMemberNetPayDocument && !netPayDocument)) {
      toast.error("Enter the Monthly Net Pay and attach the Net Take Home Pay document.")
      return
    }

    setIsSavingMemberFinancials(true)
    try {
      const updatedMember = await updateMemberLoanFinancialProfile(member.id, netPay, netPayDocument ?? undefined)
      setConfirmedSavedNetPay(netPay)
      setConfirmedFinancialDocument(true)
      queryClient.setQueryData(["members", member.id], updatedMember)
      setEntries((current) =>
        current.map((entry) => {
          const loanType = loanTypes.find((type) => type.id === entry.loanTypeId)
          const isFirstSolidarityLoan =
            (loanSettings?.lockFirstSolidarityLoan ?? true) &&
            loanType?.name.toLowerCase().includes("solidarity") &&
            !memberLoans.some((loan) => !["Draft", "Rejected", "Cancelled"].includes(loan.status))
          if (isFirstSolidarityLoan) {
            return { ...entry, requestedAmount: loanSettings?.firstSolidarityLoanAmount ?? 20_000 }
          }
          const bracket = loanType?.incomeBrackets.length
            ? bracketForNetPay(loanType.incomeBrackets, updatedMember.netPay ?? 0)
            : null
          return bracket ? { ...entry, requestedAmount: bracket.loanableAmount } : entry
        })
      )
      setNetPayDocument(null)
      toast.success("Monthly Net Pay and Net Take Home Pay document saved.")
    } finally {
      setIsSavingMemberFinancials(false)
    }
  }

  function handleLoanTypeChange(key: string, loanTypeId: string) {
    const loanType = loanTypes.find((lt) => lt.id === loanTypeId)
    const isFirstSolidarityLoan =
      (loanSettings?.lockFirstSolidarityLoan ?? true) &&
      loanType?.name.toLowerCase().includes("solidarity") &&
      !memberLoans.some((loan) => !["Draft", "Rejected", "Cancelled"].includes(loan.status))
    const incomeBracket =
      loanType && loanType.incomeBrackets.length > 0 && effectiveMemberNetPay != null
        ? bracketForNetPay(loanType.incomeBrackets, effectiveMemberNetPay)
        : null

    setEntries((prev) =>
      prev.map((e) =>
        e.key === key
          ? {
              ...e,
              loanTypeId,
              termMonths: loanType?.maxTermMonths ?? e.termMonths,
              requestedAmount: isFirstSolidarityLoan
                ? loanSettings?.firstSolidarityLoanAmount ?? 20_000
                : loanType?.incomeBrackets.length
                  ? incomeBracket?.loanableAmount
                  : loanType?.maxAmount ?? e.requestedAmount,
            }
          : e
      )
    )
  }

  function canProceedFromStep(s: number): boolean {
    if (s === 1) return !!member && !isVerifyingMemberEligibility && hasAnyFullyPaidMonthlyDues
    if (s === 2)
      return (
        hasCompleteMemberFinancialInfo &&
        entries.length > 0 &&
        entries.every((e) => {
          const monthlyDuesCheck = derivedFor(e.key).eligibilityItems.find(
            (item) => item.label === "Fully Paid Monthly Dues"
          )
          const selectedLoanType = loanTypes.find((loanType) => loanType.id === e.loanTypeId)
          const isFirstSolidarityLoan =
            (loanSettings?.lockFirstSolidarityLoan ?? true) &&
            selectedLoanType?.name.toLowerCase().includes("solidarity") &&
            !memberLoans.some((loan) => !["Draft", "Rejected", "Cancelled"].includes(loan.status))
          const bracket =
            selectedLoanType && selectedLoanType.incomeBrackets.length > 0 && effectiveMemberNetPay != null
              ? bracketForNetPay(selectedLoanType.incomeBrackets, effectiveMemberNetPay)
              : null
          const amountWithinBracket = isFirstSolidarityLoan
            ? e.requestedAmount === (loanSettings?.firstSolidarityLoanAmount ?? 20_000)
            : !selectedLoanType?.incomeBrackets.length ||
              (bracket !== null &&
                e.requestedAmount != null &&
                e.requestedAmount >= selectedLoanType.minAmount &&
                e.requestedAmount <= bracket.loanableAmount)
          return (
            !!e.loanTypeId &&
            !!e.requestedAmount &&
            amountWithinBracket &&
            !!e.termMonths &&
            !!e.purpose.trim() &&
            monthlyDuesCheck?.passed !== false
          )
        }) &&
        !!assignedOfficer.trim()
      )
    if (s === 3) return entries.every((e) => !derivedFor(e.key).isBlocked)
    if (s === 4) return entries.every((e) => !!derivedFor(e.key).computation)
    if (s === 5) return true
    return true
  }

  function goNext() {
    if (!canProceedFromStep(step)) {
      if (step === 2 && !hasCompleteMemberFinancialInfo) {
        toast.error("Monthly Net Pay and Net Take Home Pay document are required.")
        return
      }
      toast.error("Please complete all required fields before continuing.")
      return
    }
    const nextStep = Math.min(STEPS.length, step + 1)
    setStep(nextStep)
    if (memberId && loanDraft.draftId && canUseDraft && soloDraftSnapshot) {
      void autosave.triggerNow({ ...soloDraftSnapshot, draftCurrentStep: nextStep })
    }
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
      toast.error("One or more entries cannot be submitted until eligibility is satisfied or overridden.")
      return
    }
    if (entries.some((e) => !derivedFor(e.key).computation)) return
    if (!agree) {
      toast.error("Please confirm that the information has been reviewed.")
      return
    }
    setIsSubmitting(true)
    try {
      const uploadRequirementFiles = async (loan: LoanApplication) => {
        const failed: string[] = []
        for (const [label, file] of Object.entries(requirementFiles)) {
          try {
            await uploadLoanDocument(loan.id, label, file)
          } catch {
            failed.push(label)
          }
        }
        return failed
      }

      if (isEdit && id) {
        const entry = entries[0]
        const loan = await loanDraft.save({
          memberId: member.id,
          loanTypeId: entry.loanTypeId || undefined,
          requestedAmount: entry.requestedAmount,
          termMonths: entry.termMonths,
          purpose: entry.purpose || undefined,
          paymentMethod: entry.paymentMethod,
          assignedOfficer: assignedOfficer || undefined,
          requirements: requirementItems,
          asDraft: false,
          draftCurrentStep: step,
          eligibilityOverridden: entry.overrideEnabled && entry.overrideConfirmed,
          eligibilityOverrideReason: entry.overrideReason || undefined,
          boardResolutionReference: entry.boardResolutionReference || undefined,
        })
        const failedUploads = await uploadRequirementFiles(loan)
        if (failedUploads.length > 0) {
          toast.warning(`Loan submitted, but these files failed to upload: ${failedUploads.join(", ")}.`)
        } else {
          toast.success("Loan application submitted successfully.")
        }
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
            assignedOfficer: assignedOfficer || undefined,
            requirements: requirementItems,
            asDraft: false,
            eligibilityOverridden: entry.overrideEnabled && entry.overrideConfirmed,
            eligibilityOverrideReason: entry.overrideReason || undefined,
            boardResolutionReference: entry.boardResolutionReference || undefined,
          })
          const failedUploads = await uploadRequirementFiles(loan)
          if (failedUploads.length > 0) {
            toast.warning(`Loan created, but these files failed: ${failedUploads.join(", ")}.`)
          }
          created.push(loan)
        }
        toast.success(
          created.length > 1
            ? `${created.length} loan applications submitted successfully.`
            : "Loan application submitted successfully."
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
    setAssignedOfficer(loggedInUserIsLoanOfficer ? (user?.fullName ?? "") : "")
    setEntries([
      makeLoanEntry({
        paymentMethod: (loanSettings?.defaultPaymentMethod as PaymentMethod | undefined) ?? "Payroll Deduction",
      }),
    ])
    setRequirements(Object.fromEntries(REQUIREMENT_LABELS.map((label) => [label, false])))
    setRequirementFiles({})
    setAgree(false)
    setSuccessDialog(null)
  }

  if (isEdit && isLoadingLoan) {
    return <FormSkeleton fields={["select", "text", "date", "select"]} columns={2} showUpload />
  }

  return (
    <div className="space-y-8 pb-28 mx-auto">
      {/* Page Header */}
      <PageHeader
        title={isDraftContext ? "Continue Loan Draft" : "Create Loan Application"}
        description="Encode, compute, and submit a loan application based on physical supporting documents."
        actions={isDraftContext && <DraftStatusBadge status="Draft" />}
      />

      {/* Step Indicator */}
      <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs backdrop-blur-xs sm:p-5">
        <WizardStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* STEP 1: Select Member */}
      {step === 1 && (
        <FormSection
          title={
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <User className="size-4" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Step 1 · Member Selection
              </span>
            </div>
          }
          description={`Eligible members must have completed at least ${minimumMembershipMonths} month(s) of approved GCGEA membership.`}
        >
          <div className="space-y-4">
            <div className="max-w-2xl">
              <MemberEligibilitySelect
                value={memberId || undefined}
                selectedMember={member}
                onSelect={handleMemberSelect}
                disabled={!!user?.memberId}
              />
            </div>
            {isVerifyingMemberEligibility ? (
              <CardLoader rows={4} className="rounded-2xl border-border/60 bg-card/90" />
            ) : member ? (
              <>
                <MemberSummaryCard
                  member={member}
                  totalContributions={totalContributions}
                  paidContributionMonths={paidMonthlyDuesPeriods.length}
                  outstandingLoanBalance={outstandingLoanBalance}
                  activeLoanCount={activeLoans.length}
                  overdueLoanCount={overdueLoans.length}
                  onChangeMember={user?.memberId ? undefined : () => setMemberId("")}
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
              <EmptyState
                icon={UserSearch}
                title="No member selected"
                description="Search by name, member number, or office agency to begin."
              />
            )}
          </div>
        </FormSection>
      )}

      {/* STEP 2: Loan Details */}
      {step === 2 && (
        <FormSection
          title={
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <Coins className="size-4" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Step 2 · Loan Product Details
              </span>
            </div>
          }
          description="Specify loan product category, requested principal, term duration, and payment method."
        >
          {member && (
            <div className="mb-5 space-y-3">
              <MemberSummaryCard
                member={member}
                totalContributions={totalContributions}
                paidContributionMonths={paidMonthlyDuesPeriods.length}
                outstandingLoanBalance={outstandingLoanBalance}
                activeLoanCount={activeLoans.length}
                overdueLoanCount={overdueLoans.length}
                onChangeMember={() => setStep(1)}
              />
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/15 p-4 shadow-2xs">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Verified Monthly Net Pay
                  </p>
                  <p
                    className={cn(
                      "font-mono text-base font-bold",
                      hasMemberNetPay ? "text-foreground" : "text-destructive"
                    )}
                  >
                    {hasMemberNetPay ? formatCurrency(effectiveMemberNetPay ?? 0) : "Not yet recorded"}
                  </p>
                </div>
                {hasMemberNetPay && (
                  <StatusBadge label="Verified Profile" tone="success" />
                )}
              </div>
            </div>
          )}

          {member && !hasCompleteMemberFinancialInfo && (
            <div className="mb-5 space-y-4 rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-5">
              <div>
                <p className="font-heading text-sm font-semibold text-destructive">
                  Member Financial Verification Required
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Monthly Net Pay and Net Take Home Pay documentation must be saved before proceeding.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Monthly Net Pay <span className="text-destructive">*</span>
                  </Label>
                  <CurrencyInput
                    value={memberNetPay ?? member.netPay ?? undefined}
                    onChange={setMemberNetPay}
                    className="h-10 text-xs font-mono font-semibold"
                  />
                </div>
                {!hasMemberNetPayDocument && (
                  <FileUploader
                    label="Net Take Home Pay Document"
                    description="Upload PDF or image payslip"
                    required
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    fileName={netPayDocument?.name}
                    onFileSelect={setNetPayDocument}
                  />
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => void saveMemberFinancialProfile()}
                  disabled={
                    isSavingMemberFinancials ||
                    !(memberNetPay ?? member.netPay) ||
                    (!hasMemberNetPayDocument && !netPayDocument)
                  }
                  className="h-9 rounded-xl px-4 text-xs font-semibold shadow-xs"
                >
                  {isSavingMemberFinancials && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                  Save Financial Profile
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Application Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                className="h-10 font-mono text-xs shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Assigned Loan Officer <span className="text-destructive">*</span>
              </Label>
              {loggedInUserIsLoanOfficer ? (
                <Input
                  value={assignedOfficer}
                  readOnly
                  className="h-10 bg-muted/40 font-medium text-xs shadow-2xs"
                />
              ) : (
                <LoanOfficerCommandSelect value={assignedOfficer} onValueChange={setAssignedOfficer} />
              )}
            </div>
          </div>

          <div className="space-y-4">
            {entries.slice(0, 1).map((entry) => {
              const derived = derivedFor(entry.key)
              return (
                <div
                  key={entry.key}
                  className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Loan Product <span className="text-destructive">*</span>
                      </Label>
                      <CommandSelect
                        className="w-full h-10 text-xs shadow-2xs"
                        value={entry.loanTypeId}
                        onValueChange={(v) => handleLoanTypeChange(entry.key, v)}
                        options={loanTypes
                          .filter((lt) => lt.status === "Active")
                          .map((lt) => ({ value: lt.id, label: lt.name }))}
                        placeholder="Select loan type"
                      />
                    </div>

                    {entry.loanTypeId &&
                      (derived.isFirstSolidarityLoan || !derived.isBracketedLoanType || hasMemberNetPay) && (
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                            Requested Amount <span className="text-destructive">*</span>
                          </Label>

                          {derived.isFirstSolidarityLoan ? (
                            <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-3 shadow-2xs">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount to borrow</span>
                                <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  Fixed amount
                                </span>
                              </div>
                              <CurrencyInput
                                value={loanSettings?.firstSolidarityLoanAmount ?? 20_000}
                                onChange={() => undefined}
                                disabled
                                className="h-12 [&_input]:h-12 [&_input]:bg-background [&_input]:font-mono [&_input]:text-lg [&_input]:font-bold [&_input]:shadow-2xs [&>span]:text-base"
                              />
                              <p className="flex items-center gap-1.5 border-t border-primary/15 pt-2 text-[11px] font-medium text-primary">
                                <Sparkles className="size-3.5 shrink-0" />
                                First Solidarity loan is fixed at{" "}
                                {formatCurrency(loanSettings?.firstSolidarityLoanAmount ?? 20_000)}.
                              </p>
                            </div>
                          ) : derived.isBracketedLoanType ? (
                            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-3 shadow-2xs">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Amount to borrow
                                </span>
                                <span className="rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  Based on net pay
                                </span>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Loanable range</span>
                              <div className="rounded-xl border border-border/60 bg-background px-3 py-2 font-mono text-xs font-bold text-foreground">
                                {effectiveMemberNetPay == null
                                  ? "Unavailable"
                                  : `${formatCurrency(derived.loanType?.minAmount ?? 0)} – ${formatCurrency(
                                      bracketForNetPay(
                                        derived.loanType?.incomeBrackets ?? [],
                                        effectiveMemberNetPay
                                      )?.loanableAmount ?? 0
                                    )}`}
                              </div>
                              <Label className="block border-t border-border/50 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Desired Amount <span className="text-destructive">*</span>
                              </Label>
                              <CurrencyInput
                                value={entry.requestedAmount}
                                onChange={(value) => updateEntry(entry.key, { requestedAmount: value })}
                                className="h-12 [&_input]:h-12 [&_input]:bg-background [&_input]:font-mono [&_input]:text-lg [&_input]:font-bold [&_input]:shadow-2xs [&>span]:text-base"
                              />
                            </div>
                          ) : (
                            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-3 shadow-2xs">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount to borrow</span>
                                <span className="rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  Product limit
                                </span>
                              </div>
                              <CurrencyInput
                                value={entry.requestedAmount}
                                onChange={(v) => updateEntry(entry.key, { requestedAmount: v })}
                                className="h-12 [&_input]:h-12 [&_input]:bg-background [&_input]:font-mono [&_input]:text-lg [&_input]:font-bold [&_input]:shadow-2xs [&>span]:text-base"
                              />
                              <p className="border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                                Allowed range: <strong className="font-mono text-foreground">{formatCurrency(derived.loanType?.minAmount ?? 0)} - {formatCurrency(derived.loanType?.maxAmount ?? 0)}</strong>
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Repayment Term (Months) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={derived.loanType?.maxTermMonths}
                        placeholder={
                          derived.loanType ? `1–${derived.loanType.maxTermMonths}` : "Select loan type"
                        }
                        value={entry.termMonths ?? ""}
                        onChange={(event) => {
                          const entered = event.target.value ? Number(event.target.value) : undefined
                          const configuredMax = derived.loanType?.maxTermMonths
                          updateEntry(entry.key, {
                            termMonths:
                              entered !== undefined && configuredMax
                                ? Math.min(entered, configuredMax)
                                : entered,
                          })
                        }}
                        className="h-10 font-mono text-xs shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Payment Method
                      </Label>
                      <CommandSelect
                        className="w-full h-10 text-xs shadow-2xs"
                        hideSearch
                        value={entry.paymentMethod}
                        onValueChange={(v) =>
                          updateEntry(entry.key, {
                            paymentMethod: (v ?? "Payroll Deduction") as PaymentMethod,
                          })
                        }
                        options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                        placeholder="Select method"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Loan Purpose <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        rows={2}
                        placeholder="e.g. Home renovation, educational tuition, emergency medical expenses"
                        value={entry.purpose}
                        onChange={(e) => updateEntry(entry.key, { purpose: e.target.value })}
                        className="bg-background text-xs resize-none"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Staff Remarks
                      </Label>
                      <Textarea
                        rows={2}
                        placeholder="Additional application remarks (optional)"
                        value={entry.remarks}
                        onChange={(e) => updateEntry(entry.key, { remarks: e.target.value })}
                        className="bg-background text-xs resize-none"
                      />
                    </div>
                  </div>

                  {/* Policy Summary Placard */}
                  {derived.loanType && (
                    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-2xs backdrop-blur-xs mt-4">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary" />
                      <div className="flex items-center gap-2 text-xs font-bold text-primary mb-3">
                        <Info className="size-4" />
                        <span>{derived.loanType.name} — Product Matrix</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
                        <div className="rounded-xl border border-border/50 bg-background/80 p-2.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Range</span>
                          <p className="font-mono font-bold text-foreground mt-0.5">
                            {formatCurrency(derived.loanType.minAmount)} – {formatCurrency(derived.loanType.maxAmount)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-background/80 p-2.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Interest Rate</span>
                          <p className="font-mono font-bold text-foreground mt-0.5">
                            {derived.loanType.defaultInterestRate}% / month
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-background/80 p-2.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Method</span>
                          <p className="font-medium text-foreground mt-0.5">{derived.loanType.interestMethod}</p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-background/80 p-2.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Max Term</span>
                          <p className="font-mono font-bold text-foreground mt-0.5">
                            {derived.loanType.maxTermMonths} months
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-background/80 p-2.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Processing Fee</span>
                          <p className="font-mono font-bold text-foreground mt-0.5">
                            {formatCurrency(derived.loanType.processingFee)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-background/80 p-2.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Req. Contributions</span>
                          <p className="font-mono font-bold text-foreground mt-0.5">
                            {derived.loanType.requiredContributionMonths} months
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </FormSection>
      )}

      {/* STEP 3: Eligibility Check */}
      {step === 3 && (
        <FormSection
          title={
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <ClipboardCheck className="size-4" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Step 3 · Automated Eligibility Audit
              </span>
            </div>
          }
        >
          <div className="space-y-6">
            {entries.map((entry, idx) => {
              const derived = derivedFor(entry.key)
              return (
                <div key={entry.key} className="space-y-3">
                  {entries.length > 1 && (
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Entry {idx + 1} · {derived.loanType?.name}
                    </p>
                  )}
                  {derived.eligibilityItems.length === 0 ? (
                    <AlertBanner
                      tone="warning"
                      title="Incomplete parameters"
                      description="Select a valid member and loan product to run the audit."
                    />
                  ) : (
                    <div className="space-y-4">
                      <EligibilityChecklist
                        items={derived.eligibilityItems}
                        result={derived.eligibilityResult}
                      />

                      {derived.eligibilityResult === "Not Eligible" && canOverride && (
                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4 shadow-xs">
                          <label className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-foreground cursor-pointer">
                            <Checkbox
                              checked={entry.overrideEnabled}
                              onCheckedChange={(v) => updateEntry(entry.key, { overrideEnabled: !!v })}
                              className="size-4"
                            />
                            <span>Enable Administrative Eligibility Override</span>
                          </label>

                          {entry.overrideEnabled && (
                            <div className="mt-3 space-y-4 animate-in fade-in duration-200">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Justification Reason <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                  rows={2}
                                  value={entry.overrideReason}
                                  onChange={(e) =>
                                    updateEntry(entry.key, { overrideReason: e.target.value })
                                  }
                                  placeholder="Document reason for overriding failed criteria…"
                                  className="text-xs bg-background resize-none"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Board Resolution Reference
                                </Label>
                                <Input
                                  value={entry.boardResolutionReference}
                                  onChange={(e) =>
                                    updateEntry(entry.key, { boardResolutionReference: e.target.value })
                                  }
                                  placeholder="e.g. Resolution No. 24-2026"
                                  className="h-10 text-xs font-mono"
                                />
                              </div>

                              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                                <Checkbox
                                  checked={entry.overrideConfirmed}
                                  onCheckedChange={(v) =>
                                    updateEntry(entry.key, { overrideConfirmed: !!v })
                                  }
                                />
                                <span>I attest that this override is authorized and sanctioned.</span>
                              </label>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setOverrideDialogEntryKey(entry.key)}
                                disabled={!entry.overrideReason.trim() || !entry.overrideConfirmed}
                                className="h-9 gap-1.5 text-xs font-semibold rounded-xl"
                              >
                                <ShieldAlert className="size-3.5" /> Confirm Override
                              </Button>

                              {entry.overrideApplied && (
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  ✓ Override verified and logged to audit trail.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
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
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <Calculator className="size-4" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Step 4 · Financial Computation & Amortization
              </span>
            </div>
          }
          actions={
            <Button
              variant="outline"
              size="sm"
              className="print:hidden"
              onClick={() => window.print()}
            >
              <Printer className="size-3.5" /> Print
            </Button>
          }
        >
          <div className="space-y-6">
            {entries.map((entry) => {
              const derived = derivedFor(entry.key)
              if (!derived.computation) return null
              const computation = derived.computation

              return (
                <div key={entry.key} className="space-y-5">
                  <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                    <ComputationStat label="Principal Loan" value={formatCurrency(computation.principal)} tone="primary" />
                    <ComputationStat label="Net Proceeds" value={formatCurrency(computation.netProceeds)} tone="success" />
                    <ComputationStat label="Total Interest" value={formatCurrency(computation.totalInterest)} />
                    <ComputationStat label="Monthly Amortization" value={formatCurrency(computation.monthlyAmortization)} tone="primary" />
                    <ComputationStat label="Processing Fee" value={formatCurrency(computation.processingFee)} />
                    <ComputationStat label="Total Payable" value={formatCurrency(computation.totalAmountPayable)} />
                    <ComputationStat label="First Due Date" value={formatDateShort(computation.schedule[0]?.dueDate)} />
                    <ComputationStat label="Maturity Date" value={formatDateShort(computation.maturityDate)} />
                  </div>

                  {/* Formula Breakdown Card */}
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                      <span className="font-heading font-semibold text-primary">Computation Matrix</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {derived.loanType?.interestMethod} · {derived.loanType?.defaultInterestRate}%/mo · {entry.termMonths} months
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 text-muted-foreground text-[11px]">
                      <p>
                        <strong className="text-foreground">Net Proceeds: </strong>
                        {formatCurrency(computation.principal)} − {formatCurrency(computation.processingFee)} fee ={" "}
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(computation.netProceeds)}
                        </strong>
                      </p>
                      <p>
                        <strong className="text-foreground">Amortization: </strong>
                        {formatCurrency(computation.totalAmountPayable)} ÷ {entry.termMonths} mo ={" "}
                        <strong className="text-primary font-mono">
                          {formatCurrency(computation.monthlyAmortization)}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs">
                    <DataTable
                      columns={AMORTIZATION_COLUMNS}
                      data={computation.schedule}
                      getRowId={(row) => String(row.installmentNumber)}
                      enableColumnVisibility={false}
                      maxHeight="max-h-96"
                      emptyTitle="No schedule generated"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </FormSection>
      )}

      {/* STEP 5: Requirements */}
      {step === 5 && (
        <FormSection
          title={
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <FileCheck className="size-4" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Step 5 · Supporting Documents (Optional)
              </span>
            </div>
          }
          description="Attach scanned copies of loan prerequisites if available. Uploads are optional and not required to proceed."
        >
          <div className="grid grid-cols-1 gap-3">
            {REQUIREMENT_LABELS.map((label) => {
              const existingDoc = existingDocumentsByLabel.get(label)
              const hasFile = hasFileFor(label)
              return (
                <div
                  key={label}
                  className={cn(
                    "grid gap-3 rounded-2xl border p-4 transition-all duration-200 sm:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] sm:items-start",
                    hasFile
                      ? "border-emerald-500/30 bg-emerald-500/[0.02] shadow-2xs"
                      : "border-border/60 bg-card/90 hover:border-border"
                  )}
                >
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="flex items-center gap-2.5 text-xs font-bold text-foreground">
                      <Checkbox checked={hasFile} disabled className="size-4" />
                      {label}
                    </span>
                    <StatusBadge label={hasFile ? "Satisfied" : "Optional"} tone={hasFile ? "success" : "neutral"} />
                  </div>
                  <FileUploader
                    label="Attach credential file"
                    description="PDF or image attachment (Max 10MB)"
                    fileName={requirementFiles[label]?.name ?? existingDoc?.fileName}
                    fileUrl={requirementFiles[label] ? undefined : existingDoc?.fileUrl}
                    onFileSelect={(file) => {
                      setRequirementFiles((current) => {
                        const next = { ...current }
                        if (file) next[label] = file
                        else delete next[label]
                        return next
                      })
                      setRequirements((current) => ({
                        ...current,
                        [label]: Boolean(file) || existingDocumentsByLabel.has(label),
                      }))
                    }}
                  />
                </div>
              )
            })}
          </div>

          {missingRequirements.length > 0 && (
            <div className="mt-4">
              <AlertBanner
                tone="info"
                title={`${missingRequirements.length} item(s) not yet attached`}
                description="Optional — you may proceed and submit without attaching these files."
              />
            </div>
          )}
        </FormSection>
      )}

      {/* STEP 6: Review & Submit */}
      {step === 6 && member && (
        <FormSection
          title={
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <Sparkles className="size-4" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Step 6 · Final Application Review
              </span>
            </div>
          }
        >
          <div className="space-y-5">
            <ReviewBlock title="Member Overview">
              <ReviewRow label="Full Name" value={member.fullName} />
              <ReviewRow label="Member Number" value={member.memberNumber} />
              <ReviewRow label="Office Agency" value={member.officeName} />
              <ReviewRow label="Assigned Officer" value={assignedOfficer} />
            </ReviewBlock>

            {entries.map((entry) => {
              const derived = derivedFor(entry.key)
              return (
                <div key={entry.key} className="space-y-4">
                  <ReviewBlock title="Loan Terms">
                    <ReviewRow label="Loan Product" value={derived.loanType?.name ?? "—"} />
                    <ReviewRow label="Requested Principal" value={formatCurrency(derived.effectiveAmount ?? 0)} />
                    <ReviewRow label="Repayment Term" value={`${entry.termMonths} months`} />
                    <ReviewRow label="Payment Method" value={entry.paymentMethod} />
                    <ReviewRow label="Monthly Interest" value={`${derived.loanType?.defaultInterestRate ?? 0}%`} />
                    <ReviewRow label="Purpose" value={entry.purpose} />
                  </ReviewBlock>

                  {derived.computation && (
                    <ReviewBlock title="Computed Payables">
                      <ReviewRow label="Net Proceeds" value={formatCurrency(derived.computation.netProceeds)} />
                      <ReviewRow label="Monthly Amortization" value={formatCurrency(derived.computation.monthlyAmortization)} />
                      <ReviewRow label="Total Interest" value={formatCurrency(derived.computation.totalInterest)} />
                      <ReviewRow label="Total Payable" value={formatCurrency(derived.computation.totalAmountPayable)} />
                    </ReviewBlock>
                  )}
                </div>
              )
            })}

            <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 text-xs font-semibold text-foreground cursor-pointer">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5 size-4" />
              <span>I confirm that all financial figures, terms, and supporting attachments have been verified.</span>
            </label>
          </div>
        </FormSection>
      )}

      {/* Floating Action Dock */}
      <div className="sticky bottom-4 z-30 flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/85 px-5 py-3.5 shadow-xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 sm:px-6">
        <Button
          variant="outline"
          onClick={() => promptLeave(() => navigate("/loans"))}
          className="h-9 rounded-xl px-4 text-xs font-semibold active:scale-95"
        >
          Cancel
        </Button>

        <div className="flex items-center gap-2.5">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={goBack}
              className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              <ArrowLeft className="size-3.5" /> Previous
            </Button>
          )}

          <SaveDraftButton
            status={draftButtonStatus}
            lastSavedAt={loanDraft.lastSavedAt}
            onClick={saveDraft}
            disabled={!memberId || isSubmitting || !canUseDraft}
          />

          {step < STEPS.length ? (
            <Button
              variant="success"
              onClick={goNext}
              disabled={!canProceedFromStep(step)}
              className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold active:scale-95 shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || entries.some((e) => derivedFor(e.key).isBlocked) || !agree}
              aria-busy={isSubmitting}
              className="h-9 gap-1.5 rounded-xl px-6 text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FilePlus2 className="size-3.5" strokeWidth={2.2} />
              )}
              <span>{isSubmitting ? "Submitting…" : "Submit Loan Application"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation & Dialogs */}
      <ConfirmDialog
        open={!!overrideDialogEntryKey}
        onOpenChange={(open) => !open && setOverrideDialogEntryKey(null)}
        title="Confirm eligibility override"
        description="Override will be authorized and permanently stamped in the application audit logs."
        confirmLabel="Apply Override"
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

      {/* Success Dialog */}
      <Dialog open={!!successDialog} onOpenChange={(open) => !open && setSuccessDialog(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm">
              <CheckCircle2 className="size-7" />
            </div>
            <DialogTitle className="text-center font-heading text-xl font-bold tracking-tight text-foreground">
              Loan Application Submitted
            </DialogTitle>
            <DialogDescription className="text-center text-xs leading-relaxed text-muted-foreground">
              {successDialog?.created.map((l) => (
                <span key={l.id} className="block mt-1">
                  Reference: <span className="font-mono font-bold text-foreground">{l.applicationNumber}</span>
                </span>
              ))}
              {" "}submitted to the review and approval pipeline.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-col">
            {successDialog && successDialog.created.length === 1 && (
              <Button
                className="w-full h-9 rounded-xl text-xs font-semibold shadow-xs active:scale-95"
                onClick={() => navigate(`/loans/${successDialog.created[0].id}`)}
              >
                View Loan Account Details
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full h-9 rounded-xl text-xs font-semibold active:scale-95"
              onClick={resetWizardForNewApplication}
            >
              Encode Another Loan
            </Button>
            <Button
              variant="ghost"
              className="w-full h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/loans")}
            >
              Return to Loan Roster
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ComputationStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "primary" | "success"
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-2xs backdrop-blur-xs space-y-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</span>
      <p
        className={cn(
          "font-mono text-base font-bold tracking-tight",
          tone === "primary"
            ? "text-primary"
            : tone === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/15 px-5 py-3.5">
        <span className="size-2 rounded-full bg-primary" />
        <p className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">{title}</p>
      </div>
      <dl className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">{children}</dl>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/30 pb-2.5 last:border-0 sm:border-b-0 sm:pb-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</dt>
      <dd className="font-heading text-xs font-semibold text-foreground break-words">{value}</dd>
    </div>
  )
}
