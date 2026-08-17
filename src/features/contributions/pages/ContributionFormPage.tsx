import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
  User,
  Calendar,
  Coins,
  Receipt,
  Sparkles,
  Plus,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { MemberSelectionStep } from "@/components/shared/MemberSelectionStep"
import { MemberSummaryCard } from "@/components/shared/MemberSummaryCard"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { FormSkeleton } from "@/components/shared/loaders/FormSkeleton"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getMember } from "@/services/members.service"
import {
  getAllContributions,
  getContribution,
  hasExistingContribution,
  createContribution,
  updateContribution,
  defaultContributionAmountForType,
} from "@/services/contributions.service"
import { getMemberLoans } from "@/services/loans.service"
import { listDeductionTypes } from "@/services/deduction-types.service"
import { formatCurrency } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import { getSettings, loadSystemSettings } from "@/services/settings.service"
import { cn } from "@/lib/utils"
import type { Contribution, ContributionType, ContributionSettings, PaymentMethod } from "@/types"

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function defaultPostingDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function defaultPaymentMethodSetting(): PaymentMethod {
  const value = getSettings().contribution.defaultPaymentMethod
  return (PAYMENT_METHODS as string[]).includes(value) ? (value as PaymentMethod) : "Payroll Deduction"
}

interface ContributionEntry {
  key: string
  contributionType: ContributionType
  contributionPeriod: string
  amount: number | undefined
  paymentMethod: PaymentMethod
  officialReceiptNumber: string
  payrollReference: string
  paymentDate: string
  remarks: string
}

let entryCounter = 0
function makeEntry(overrides?: Partial<ContributionEntry>): ContributionEntry {
  entryCounter += 1
  const contributionType = overrides?.contributionType ?? "Monthly Dues"
  return {
    key: `entry-${entryCounter}`,
    contributionType,
    contributionPeriod: currentPeriod(),
    amount: defaultContributionAmountForType(contributionType),
    paymentMethod: defaultPaymentMethodSetting(),
    officialReceiptNumber: "",
    payrollReference: "",
    paymentDate: defaultPostingDate(),
    remarks: "",
    ...overrides,
  }
}

export default function ContributionFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isEditMode = !!id

  const { data: existing, isLoading: isLoadingExisting } = useQuery({
    queryKey: ["contributions", id],
    queryFn: () => getContribution(id!),
    enabled: isEditMode,
  })

  useBreadcrumbExtra(isEditMode ? existing?.referenceNumber : undefined)

  const [memberId, setMemberId] = React.useState(searchParams.get("member") ?? "")

  React.useEffect(() => {
    const paramMemberId = searchParams.get("member")
    if (paramMemberId && paramMemberId !== memberId && !isEditMode) {
      setMemberId(paramMemberId)
    }
  }, [searchParams, memberId, isEditMode])

  // Edit mode fields
  const [editPeriod, setEditPeriod] = React.useState("")
  const [editType, setEditType] = React.useState<ContributionType>("Monthly Dues")
  const [editAmount, setEditAmount] = React.useState<number>()
  const [editPaymentMethod, setEditPaymentMethod] = React.useState<PaymentMethod>("Payroll Deduction")
  const [editOfficialReceiptNumber, setEditOfficialReceiptNumber] = React.useState("")
  const [editPayrollReference, setEditPayrollReference] = React.useState("")
  const [editPaymentDate, setEditPaymentDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [editRemarks, setEditRemarks] = React.useState("")

  const [entries, setEntries] = React.useState<ContributionEntry[]>(() => {
    const period = searchParams.get("period")
    return [makeEntry(period ? { contributionPeriod: period } : undefined)]
  })

  const [isSaving, setIsSaving] = React.useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false)
  const [successDialog, setSuccessDialog] = React.useState<{ created: Contribution[] } | null>(null)
  const [pendingAddAnother, setPendingAddAnother] = React.useState(false)

  const [contributionSettings, setContributionSettings] = React.useState<ContributionSettings>(
    () => getSettings().contribution
  )

  React.useEffect(() => {
    void loadSystemSettings().then((loaded) => setContributionSettings(loaded.settings.contribution))

    function handleSettingsChanged(event: Event) {
      const detail = (event as CustomEvent<{ section: string; value: unknown }>).detail
      if (detail.section !== "contribution") return
      const value = detail.value as ContributionSettings
      setContributionSettings(value)
      setEntries((prev) =>
        prev.map((entry) =>
          entry.contributionType === "Monthly Dues"
            ? { ...entry, amount: value.defaultMonthlyContribution }
            : entry
        )
      )
    }

    window.addEventListener("gcgea:settings-changed", handleSettingsChanged)
    return () => window.removeEventListener("gcgea:settings-changed", handleSettingsChanged)
  }, [])

  React.useEffect(() => {
    if (!existing) return
    setMemberId(existing.memberId)
    setEditPeriod(existing.contributionPeriod)
    setEditType(existing.contributionType)
    setEditAmount(existing.amount)
    setEditPaymentMethod(existing.paymentMethod)
    setEditOfficialReceiptNumber(existing.officialReceiptNumber ?? "")
    setEditPayrollReference(existing.payrollReference ?? "")
    setEditPaymentDate(existing.paymentDate)
    setEditRemarks(existing.remarks ?? "")
  }, [existing])

  React.useEffect(() => {
    if (isEditMode && editType === "Monthly Dues") {
      setEditAmount(contributionSettings.defaultMonthlyContribution)
    }
  }, [isEditMode, editType, contributionSettings.defaultMonthlyContribution])

  const { data: member } = useQuery({
    queryKey: ["members", memberId],
    queryFn: () => getMember(memberId),
    enabled: !!memberId,
  })
  const { data: deductionTypes = [] } = useQuery({
    queryKey: ["deduction-types"],
    queryFn: listDeductionTypes,
  })
  const globalPabaonAmount = deductionTypes.find(
    (t) => t.code.toLowerCase() === "pabaon" && t.isActive
  )?.defaultAmount

  const memberContributions = memberId
    ? getAllContributions().filter((c) => c.memberId === memberId && c.status === "Posted" && c.id !== id)
    : []
  const totalContributions = memberContributions.reduce((sum, c) => sum + c.amount, 0)
  const lastContribution = memberContributions
    .slice()
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0]
  const memberLoans = memberId ? getMemberLoans(memberId) : []
  const activeLoans = memberLoans.filter((l) => ["Active", "Overdue", "Released"].includes(l.status))
  const overdueLoans = memberLoans.filter((l) => l.status === "Overdue")
  const outstandingLoanBalance = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0)

  // Edit mode duplicate check
  const isEditDuplicate =
    !!memberId &&
    !!editPeriod &&
    hasExistingContribution(memberId, editPeriod, editType) &&
    (existing?.contributionPeriod !== editPeriod || existing?.contributionType !== editType)
  const canSaveEdit =
    !!member && !!editPeriod && !!editAmount && editAmount > 0 && !!editPaymentDate && !isEditDuplicate

  // Create mode duplicate check
  function isEntryDuplicate(entry: ContributionEntry): boolean {
    if (!memberId || !entry.contributionPeriod) return false
    const dupWithinForm = entries.some(
      (e) =>
        e.key !== entry.key &&
        e.contributionPeriod === entry.contributionPeriod &&
        e.contributionType === entry.contributionType
    )
    return (
      dupWithinForm || hasExistingContribution(memberId, entry.contributionPeriod, entry.contributionType)
    )
  }

  function findVoidedEntryContribution(entry: ContributionEntry) {
    if (!memberId || !entry.contributionPeriod) return undefined
    return getAllContributions().find(
      (c) =>
        c.memberId === memberId &&
        c.contributionPeriod === entry.contributionPeriod &&
        c.contributionType === entry.contributionType &&
        c.status === "Voided"
    )
  }

  function isEntryAdvance(entry: ContributionEntry): boolean {
    return !!entry.contributionPeriod && entry.contributionPeriod > currentPeriod()
  }

  function findUnresolvedVoidedPeriod(entry: ContributionEntry): string | undefined {
    if (!memberId || !entry.contributionPeriod) return undefined
    const memberTypeContributions = getAllContributions().filter(
      (c) => c.memberId === memberId && c.contributionType === entry.contributionType
    )
    const voidedPeriods = Array.from(
      new Set(
        memberTypeContributions
          .filter((c) => c.status === "Voided" && c.contributionPeriod < entry.contributionPeriod)
          .map((c) => c.contributionPeriod)
      )
    ).sort()
    return voidedPeriods.find(
      (period) => !memberTypeContributions.some((c) => c.contributionPeriod === period && c.status === "Posted")
    )
  }

  const entryDuplicates = entries.filter(isEntryDuplicate)
  const entriesBlockedByVoidedMonth = contributionSettings.requireResolvedVoidedMonths
    ? entries.filter((e) => !!findUnresolvedVoidedPeriod(e))
    : []
  const canSaveEntries =
    !!member &&
    entries.length > 0 &&
    entries.every((e) => !!e.contributionPeriod && !!e.amount && e.amount > 0 && !!e.paymentDate) &&
    entryDuplicates.length === 0 &&
    entriesBlockedByVoidedMonth.length === 0

  const canSave = isEditMode ? canSaveEdit : canSaveEntries

  function updateEntry(key: string, patch: Partial<ContributionEntry>) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)))
  }

  function resetForNewEntry() {
    setMemberId("")
    setEntries([makeEntry()])
  }

  async function handleSave(addAnother: boolean) {
    if (!member || !user) return

    setIsSaving(true)
    setPendingAddAnother(addAnother)
    try {
      if (isEditMode && id) {
        if (!editAmount) return
        const updated = await updateContribution(id, {
          contributionPeriod: editPeriod,
          contributionType: editType,
          amount: editAmount,
          paymentMethod: editPaymentMethod,
          officialReceiptNumber: editOfficialReceiptNumber || undefined,
          payrollReference: editPayrollReference || undefined,
          paymentDate: editPaymentDate,
          remarks: editRemarks || undefined,
        })
        toast.success("Contribution record updated.")
        navigate(`/contributions/${updated.id}`)
        return
      }

      const created: Contribution[] = []
      for (const entry of entries) {
        if (!entry.amount) continue
        const result = await createContribution({
          memberId: member.id,
          memberNumber: member.memberNumber,
          memberName: member.fullName,
          officeName: member.officeName,
          contributionPeriod: entry.contributionPeriod,
          contributionType: entry.contributionType,
          amount: entry.amount,
          paymentMethod: entry.paymentMethod,
          officialReceiptNumber: entry.officialReceiptNumber || undefined,
          payrollReference: entry.payrollReference || undefined,
          paymentDate: entry.paymentDate,
          remarks: entry.remarks || undefined,
          encodedBy: user.fullName,
        })
        created.push(result)
      }

      queryClient.invalidateQueries({ queryKey: ["deductions"] })

      toast.success(
        created.length > 1
          ? `${created.length} contributions recorded successfully.`
          : `Contribution ${created[0]?.referenceNumber} recorded successfully.`
      )
      if (addAnother) {
        resetForNewEntry()
      } else {
        setSuccessDialog({ created })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save the contribution record(s).")
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditMode && isLoadingExisting) {
    return <FormSkeleton fields={["text", "date", "select", "select"]} columns={2} />
  }
  if (isEditMode && !isLoadingExisting && !existing) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Contribution record not found"
        description="This record may have been removed or voided."
      />
    )
  }
  if (isEditMode && existing?.status === "Voided") {
    return (
      <AlertBanner
        tone="warning"
        title="This contribution has been voided"
        description="Voided records cannot be edited. View the record to see its audit history."
      />
    )
  }

  return (
    <div className="space-y-8 pb-28 mx-auto">
      {/* Page Header */}
      <PageHeader
        title={isEditMode ? "Edit Contribution Record" : "Encode Contribution"}
        description={
          isEditMode
            ? "Update payment metadata, official receipt numbers, and remarks for this entry."
            : "Record Monthly Dues and associated deduction allocations for an active member."
        }
      />

      {/* Step 1: Member Selection */}
      <FormSection
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
              <User className="size-4" strokeWidth={2.2} />
            </div>
            <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
              Step 1 · Member Identification
            </span>
          </div>
        }
      >
        {isEditMode && member ? (
          <MemberSummaryCard
            member={member}
            totalContributions={totalContributions}
            outstandingLoanBalance={outstandingLoanBalance}
            activeLoanCount={activeLoans.length}
            overdueLoanCount={overdueLoans.length}
          />
        ) : (
          <MemberSelectionStep
            selectedMemberId={memberId || undefined}
            member={member}
            onSelect={setMemberId}
            totalContributions={totalContributions}
            outstandingLoanBalance={outstandingLoanBalance}
            activeLoanCount={activeLoans.length}
            overdueLoanCount={overdueLoans.length}
            extra={
              <div className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-2xs backdrop-blur-xs">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-primary shadow-2xs">
                  <Calendar className="size-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Last Recorded Contribution
                  </p>
                  <p className="mt-0.5 truncate font-heading text-xs font-semibold text-foreground">
                    {lastContribution
                      ? `${lastContribution.contributionType} · ${lastContribution.contributionPeriod} · ${formatCurrency(lastContribution.amount)}`
                      : "No historical contributions found for this member"}
                  </p>
                </div>
              </div>
            }
          />
        )}
      </FormSection>

      {/* Step 2: Contribution Details (EDIT MODE) */}
      {member && isEditMode && (
        <FormSection
          title={
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <Coins className="size-4" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Step 2 · Payment Details
              </span>
            </div>
          }
        >
          {isEditDuplicate && (
            <AlertBanner
              tone="danger"
              title="Duplicate contribution conflict"
              description={`A posted ${editType} contribution already exists for ${member.fullName} for period ${editPeriod}. Change the period to proceed.`}
              className="mb-4"
            />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Contribution Period <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                type="month"
                value={editPeriod}
                onChange={(e) => setEditPeriod(e.target.value)}
                className="h-10 font-mono text-xs shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Monthly Dues <span className="text-destructive font-bold">*</span>
              </Label>
              <CurrencyInput
                value={editAmount}
                onChange={() => {}}
                readOnly
                disabled
                className="h-10 bg-muted/40 font-mono text-xs font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">
                Configured standard rate from Contribution Settings.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Cash Pabaon (Linked Deduction)
              </Label>
              <CurrencyInput
                value={existing?.cashPabaonAmount ?? globalPabaonAmount}
                onChange={() => {}}
                readOnly
                disabled
                className="h-10 bg-muted/40 font-mono text-xs font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">
                Synchronized deduction for the selected period.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Payment Method
              </Label>
              <CommandSelect
                className="w-full h-10 text-xs shadow-2xs"
                value={editPaymentMethod}
                onValueChange={(v) => setEditPaymentMethod((v ?? "Payroll Deduction") as PaymentMethod)}
                options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                hideSearch
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Payment Date <span className="text-destructive font-bold">*</span>
              </Label>
              <Input
                type="date"
                value={editPaymentDate}
                onChange={(e) => setEditPaymentDate(e.target.value)}
                className="h-10 font-mono text-xs shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Official Receipt Number
              </Label>
              <Input
                placeholder="e.g. OR-2026-004521"
                value={editOfficialReceiptNumber}
                onChange={(e) => setEditOfficialReceiptNumber(e.target.value)}
                className="h-10 font-mono text-xs shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Payroll Reference
              </Label>
              <Input
                placeholder="e.g. PR-2026-07-001"
                value={editPayrollReference}
                onChange={(e) => setEditPayrollReference(e.target.value)}
                className="h-10 font-mono text-xs shadow-2xs"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Remarks & Notes
              </Label>
              <Textarea
                rows={2}
                placeholder="Additional audit notes about this payment (optional)"
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                className="bg-background text-xs resize-none"
              />
            </div>
          </div>
        </FormSection>
      )}

      {/* Step 2: Contribution Details (CREATE MODE) */}
      {member && !isEditMode && (
        <FormSection
          title={
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                <Receipt className="size-4" strokeWidth={2.2} />
              </div>
              <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Step 2 · Payment Ledger Encoding
              </span>
            </div>
          }
          description="Monthly Dues are posted as standard contributions. Corresponding Cash Pabaon allocations post to the deduction ledger automatically."
        >
          <div className="space-y-6">
            {entries.map((entry, index) => {
              const duplicate = isEntryDuplicate(entry)
              const voidedRecord = !duplicate ? findVoidedEntryContribution(entry) : undefined
              const blockingVoidedPeriod = contributionSettings.requireResolvedVoidedMonths
                ? findUnresolvedVoidedPeriod(entry)
                : undefined

              return (
                <div
                  key={entry.key}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border bg-card/90 p-5 shadow-xs backdrop-blur-xs space-y-4 transition-all duration-200",
                    duplicate || blockingVoidedPeriod
                      ? "border-destructive/40 ring-2 ring-destructive/10"
                      : "border-border/60 hover:border-border"
                  )}
                >
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <p className="font-heading text-xs font-bold tracking-wider uppercase text-foreground">
                        Monthly Dues Contribution Entry
                      </p>
                    </div>
                  </div>

                  {voidedRecord && !blockingVoidedPeriod && (
                    <AlertBanner
                      tone="info"
                      title="Previously voided contribution period"
                      description="This period was voided previously. Saving this entry will record a clean replacement contribution."
                    />
                  )}

                  {blockingVoidedPeriod && (
                    <AlertBanner
                      tone="danger"
                      title="Earlier voided period unresolved"
                      description={`A voided ${entry.contributionType} contribution for ${blockingVoidedPeriod} has not been posted yet. Settle ${blockingVoidedPeriod} before continuing to ${entry.contributionPeriod}.`}
                      actions={
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateEntry(entry.key, { contributionPeriod: blockingVoidedPeriod })
                          }
                          className="h-7 text-xs"
                        >
                          Set to {blockingVoidedPeriod}
                        </Button>
                      }
                    />
                  )}

                  {duplicate && (
                    <AlertBanner
                      tone="danger"
                      title="Duplicate period conflict"
                      description={`A posted ${entry.contributionType} contribution already exists for ${member.fullName} for period ${entry.contributionPeriod}. Please choose an open period.`}
                    />
                  )}

                  {!contributionSettings.allowAdvanceContribution && isEntryAdvance(entry) && (
                    <AlertBanner
                      tone="warning"
                      title="Advance payment warning"
                      description="This period exceeds current calendar month. Allow Advance Contribution is disabled in system settings."
                    />
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Contribution Period <span className="text-destructive font-bold">*</span>
                      </Label>
                      <Input
                        type="month"
                        value={entry.contributionPeriod}
                        onChange={(e) => updateEntry(entry.key, { contributionPeriod: e.target.value })}
                        className="h-10 font-mono text-xs shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Monthly Contribution
                      </Label>
                      <CurrencyInput
                        value={entry.amount}
                        onChange={() => {}}
                        readOnly
                        disabled
                        className="h-10 bg-muted/40 font-mono text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Cash Pabaon Setting
                      </Label>
                      <CurrencyInput
                        value={contributionSettings.defaultCashPabaonContribution}
                        onChange={() => {}}
                        readOnly
                        disabled
                        className="h-10 bg-muted/40 font-mono text-xs font-semibold"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Auto-posted via Deduction Types → Pabaon
                        {typeof globalPabaonAmount === "number"
                          ? ` (${formatCurrency(globalPabaonAmount)})`
                          : ""}
                        .
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Payment Method
                      </Label>
                      <CommandSelect
                        className="w-full h-10 text-xs shadow-2xs"
                        value={entry.paymentMethod}
                        onValueChange={(v) =>
                          updateEntry(entry.key, {
                            paymentMethod: (v ?? "Payroll Deduction") as PaymentMethod,
                          })
                        }
                        options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                        hideSearch
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Payment Date <span className="text-destructive font-bold">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={entry.paymentDate}
                        onChange={(e) => updateEntry(entry.key, { paymentDate: e.target.value })}
                        className="h-10 font-mono text-xs shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Official Receipt #
                      </Label>
                      <Input
                        placeholder="e.g. OR-2026-004521"
                        value={entry.officialReceiptNumber}
                        onChange={(e) =>
                          updateEntry(entry.key, { officialReceiptNumber: e.target.value })
                        }
                        className="h-10 font-mono text-xs shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Payroll Reference
                      </Label>
                      <Input
                        placeholder="e.g. PR-2026-07-001"
                        value={entry.payrollReference}
                        onChange={(e) =>
                          updateEntry(entry.key, { payrollReference: e.target.value })
                        }
                        className="h-10 font-mono text-xs shadow-2xs"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-3">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        Remarks
                      </Label>
                      <Textarea
                        rows={2}
                        placeholder="Additional notes about this contribution (optional)"
                        value={entry.remarks}
                        onChange={(e) => updateEntry(entry.key, { remarks: e.target.value })}
                        className="bg-background text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium pl-1">
              <Sparkles className="size-3 text-primary" />
              <span>
                System generated tracking reference (e.g. GCGEA-CON-2026-000001) will be assigned upon save.
              </span>
            </div>
          </div>
        </FormSection>
      )}

      {/* Floating Action Dock */}
      <div className="sticky bottom-4 z-30 flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/85 px-5 py-3.5 shadow-xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 sm:px-6">
        <Button
          variant="outline"
          onClick={() => setShowCancelConfirm(true)}
          className="h-9 rounded-xl px-4 text-xs font-semibold active:scale-95 transition-transform"
        >
          Cancel
        </Button>

        <div className="flex items-center gap-2.5">
          {!isEditMode && (
            <Button
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={!canSave || isSaving}
              className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95 shadow-2xs"
            >
              {isSaving && pendingAddAnother ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              <span>Save & Encode Another</span>
            </Button>
          )}

          <Button
            variant="success"
            onClick={() => handleSave(false)}
            disabled={!canSave || isSaving}
            className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold shadow-xs active:scale-95 transition-all"
          >
            {isSaving && !pendingAddAnother ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" strokeWidth={2.2} />
            )}
            <span>
              {isSaving
                ? "Recording…"
                : isEditMode
                  ? "Save Changes"
                  : entries.length > 1
                    ? `Save ${entries.length} Contributions`
                    : "Save Contribution"}
            </span>
          </Button>
        </div>
      </div>

      {/* Discard confirmation dialog */}
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Discard contribution form?"
        description="Any unsaved payment information entered in this session will be discarded."
        confirmLabel="Discard & Exit"
        destructive
        onConfirm={() => {
          setShowCancelConfirm(false)
          navigate("/contributions")
        }}
      />

      {/* Success Dialog overlay */}
      <Dialog open={!!successDialog} onOpenChange={(open) => !open && setSuccessDialog(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm">
              <CheckCircle2 className="size-7" />
            </div>
            <DialogTitle className="text-center font-heading text-xl font-bold tracking-tight text-foreground">
              {successDialog && successDialog.created.length > 1
                ? "Contributions Recorded"
                : "Contribution Recorded"}
            </DialogTitle>
            <DialogDescription className="text-center text-xs leading-relaxed text-muted-foreground">
              {successDialog?.created.map((c) => (
                <span key={c.id} className="block mt-1">
                  <span className="font-mono font-bold text-foreground">{c.referenceNumber}</span> (
                  {c.contributionType} · {c.contributionPeriod})
                </span>
              ))}
              {" "}posted successfully to the GCGEA ledger.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-col">
            {successDialog && successDialog.created.length === 1 && (
              <Button
                className="w-full h-9 rounded-xl text-xs font-semibold shadow-xs active:scale-95"
                onClick={() => navigate(`/contributions/${successDialog.created[0].id}`)}
              >
                View Contribution Record
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full h-9 rounded-xl text-xs font-semibold active:scale-95"
              onClick={() => {
                setSuccessDialog(null)
                resetForNewEntry()
              }}
            >
              Add Another Contribution
            </Button>
            <Button
              variant="ghost"
              className="w-full h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/contributions")}
            >
              Return to Contribution Records
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}