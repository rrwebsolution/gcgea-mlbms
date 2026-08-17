import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import {
  CheckCircle2,
  Loader2,
  Save,
  Users,
  Layers,
  RotateCcw,
  Check,
  X,
  Trash2,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { OfficeMultiSelect } from "@/components/shared/OfficeMultiSelect"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { Pagination } from "@/components/shared/Pagination"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { listMembers } from "@/services/members.service"
import {
  bulkCreateContributions,
  checkDuplicateContributions,
  defaultContributionAmountForType,
  getAllContributions,
  type BulkCreateResult,
} from "@/services/contributions.service"
import { formatCurrency } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import { getSettings, loadSystemSettings } from "@/services/settings.service"
import { listDeductionTypes } from "@/services/deduction-types.service"
import { cn } from "@/lib/utils"
import type { ContributionSettings, PaymentMethod } from "@/types"

interface BulkRow {
  memberId: string
  memberNumber: string
  fullName: string
  officeName: string
  position: string
  amount: number
  originalAmount: number
  status: "Paid" | "Unpaid"
  remarks: string
  isDuplicate: boolean
}

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]

function AlreadyPaidAlert({ names, period }: { names: string[]; period: string }) {
  const [showMore, setShowMore] = React.useState(false)
  const hasMore = names.length > 3

  return (
    <AlertBanner
      tone="warning"
      title={`${names.length} already-paid member(s) excluded for ${period}`}
      description={
        <div className="space-y-2">
          <p>These members already settled Monthly Dues and will not be double-posted:</p>
          <div
            className={cn(
              "overflow-hidden rounded-md border border-current/15 bg-background/45 px-3 py-2 transition-[max-height]",
              showMore ? "max-h-60 overflow-y-auto" : "max-h-[5.25rem]"
            )}
          >
            <ol className="ml-5 list-decimal space-y-1 text-xs">
              {names.map((name) => (
                <li key={name} className="pl-1">{name}</li>
              ))}
            </ol>
          </div>
          {hasMore && (
            <button
              type="button"
              className="text-xs font-semibold underline underline-offset-2 hover:opacity-80"
              onClick={() => setShowMore((current) => !current)}
            >
              {showMore ? "View less" : `View more (${names.length - 3} more)`}
            </button>
          )}
        </div>
      }
    />
  )
}

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

export default function BulkContributionsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [period, setPeriod] = React.useState(currentPeriod())
  const [offices, setOffices] = React.useState<string[]>([])
  const [officeError, setOfficeError] = React.useState(false)
  const [membershipStatus, setMembershipStatus] = React.useState("Active")
  const [defaultAmount, setDefaultAmount] = React.useState<number>(
    () => defaultContributionAmountForType("Monthly Dues") ?? 0
  )
  const [hasActiveCashPabaon, setHasActiveCashPabaon] = React.useState(false)

  const [paymentDate, setPaymentDate] = React.useState(defaultPostingDate)
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(defaultPaymentMethodSetting)
  const [payrollReference, setPayrollReference] = React.useState("")
  const [setupRemarks, setSetupRemarks] = React.useState("")

  const [contributionSettings, setContributionSettings] = React.useState<ContributionSettings>(
    () => getSettings().contribution
  )
  const cashPabaonAmount = contributionSettings.defaultCashPabaonContribution

  const [rows, setRows] = React.useState<BulkRow[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(50)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const [showConfirm, setShowConfirm] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [result, setResult] = React.useState<BulkCreateResult | null>(null)
  const [excludedDuplicateNames, setExcludedDuplicateNames] = React.useState<string[]>([])
  const [voidedForPeriodNames, setVoidedForPeriodNames] = React.useState<string[]>([])

  React.useEffect(() => {
    function applyDeductionTypes(types: Awaited<ReturnType<typeof listDeductionTypes>>) {
      const pabaon = types.find((type) => type.code.toLowerCase() === "pabaon" && type.isActive)
      setHasActiveCashPabaon(Boolean(pabaon))
    }

    void Promise.all([loadSystemSettings(), listDeductionTypes()])
      .then(([systemSettings, types]) => {
        setDefaultAmount(systemSettings.settings.contribution.defaultMonthlyContribution)
        setContributionSettings(systemSettings.settings.contribution)
        applyDeductionTypes(types)
      })
      .catch(() => {})

    function handleSettingsChanged(event: Event) {
      const detail = (event as CustomEvent<{ section: string; value: unknown }>).detail
      if (detail.section !== "contribution") return
      const value = detail.value as ContributionSettings
      setContributionSettings(value)
      setDefaultAmount(value.defaultMonthlyContribution)
      setRows((current) =>
        current.map((row) => ({
          ...row,
          amount: value.defaultMonthlyContribution,
          originalAmount: value.defaultMonthlyContribution,
        }))
      )
    }

    function handleDeductionTypesChanged(event: Event) {
      applyDeductionTypes((event as CustomEvent<Awaited<ReturnType<typeof listDeductionTypes>>>).detail)
    }

    window.addEventListener("gcgea:settings-changed", handleSettingsChanged)
    window.addEventListener("gcgea:deduction-types-changed", handleDeductionTypesChanged)
    return () => {
      window.removeEventListener("gcgea:settings-changed", handleSettingsChanged)
      window.removeEventListener("gcgea:deduction-types-changed", handleDeductionTypesChanged)
    }
  }, [])

  async function handleLoadMembers(amountOverride = defaultAmount) {
    if (offices.length === 0) {
      setOfficeError(true)
      toast.error("Select at least one office before loading members.")
      return
    }
    setOfficeError(false)
    setIsLoadingMembers(true)
    try {
      const listParams = {
        offices,
        membershipStatus: membershipStatus === "All" ? undefined : membershipStatus,
        perPage: 500,
      }
      const firstPage = await listMembers(listParams)
      const remainingPages =
        firstPage.meta.totalPages > 1
          ? await Promise.all(
              Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) =>
                listMembers({ ...listParams, page: index + 2 })
              )
            )
          : []
      const allMembers = [firstPage.data, ...remainingPages.map((p) => p.data)].flat()

      const duplicateIds = new Set(
        await checkDuplicateContributions(
          allMembers.map((member) => member.id),
          period
        )
      )
      const excluded = allMembers
        .filter((member) => duplicateIds.has(member.id))
        .map((member) => member.fullName)
      const loaded: BulkRow[] = allMembers
        .filter((member) => !duplicateIds.has(member.id))
        .map((m) => ({
          memberId: m.id,
          memberNumber: m.memberNumber,
          fullName: m.fullName,
          officeName: m.officeName,
          position: m.position,
          amount: amountOverride,
          originalAmount: amountOverride,
          status: "Paid",
          remarks: "",
          isDuplicate: false,
        }))
      const voidedForPeriod = loaded
        .filter((row) =>
          getAllContributions().some(
            (c) =>
              c.memberId === row.memberId &&
              c.contributionPeriod === period &&
              c.contributionType === "Monthly Dues" &&
              c.status === "Voided"
          )
        )
        .map((row) => row.fullName)

      setExcludedDuplicateNames(excluded)
      setVoidedForPeriodNames(voidedForPeriod)
      setRows(loaded)
      setRowSelection(Object.fromEntries(loaded.map((r) => [r.memberId, true])))
      setResult(null)
      if (excluded.length > 0) {
        toast.warning(
          `${excluded.length} member(s) already paid for ${period} and were automatically excluded.`
        )
      }
      if (loaded.length === 0) {
        toast.info("No unpaid members found for the selected offices, status, and period.")
      } else {
        toast.success(`Loaded ${loaded.length} unpaid member(s).`)
      }
    } finally {
      setIsLoadingMembers(false)
    }
  }

  React.useEffect(() => {
    function handleRefreshData(event: Event) {
      const task = Promise.all([loadSystemSettings(), listDeductionTypes()]).then(
        async ([systemSettings, types]) => {
          const contributionAmount = systemSettings.settings.contribution.defaultMonthlyContribution
          const pabaon = types.find((type) => type.code.toLowerCase() === "pabaon" && type.isActive)
          setDefaultAmount(contributionAmount)
          setContributionSettings(systemSettings.settings.contribution)
          setHasActiveCashPabaon(Boolean(pabaon))
          setRows((current) =>
            current.map((row) => ({
              ...row,
              amount: contributionAmount,
              originalAmount: contributionAmount,
            }))
          )
          if (offices.length > 0) await handleLoadMembers(contributionAmount)
        }
      )
      ;(event as CustomEvent<{ tasks: Promise<unknown>[] }>).detail.tasks.push(task)
    }

    window.addEventListener("gcgea:refresh-data", handleRefreshData)
    return () => window.removeEventListener("gcgea:refresh-data", handleRefreshData)
  }, [offices, membershipStatus, period, defaultAmount])

  function handleClear() {
    setRows([])
    setRowSelection({})
    setResult(null)
    setExcludedDuplicateNames([])
    setVoidedForPeriodNames([])
  }

  const filteredRows = rows.filter(
    (r) =>
      !search ||
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.memberNumber.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = filteredRows.slice((currentPage - 1) * perPage, currentPage * perPage)
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
  const selectedIdSet = new Set(selectedIds)
  const selectedVisibleCount = filteredRows.filter((row) => selectedIdSet.has(row.memberId)).length
  const allVisibleSelected = filteredRows.length > 0 && selectedVisibleCount === filteredRows.length
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected

  function toggleAllVisible(checked: boolean) {
    setRowSelection((current) => {
      const next = { ...current }
      filteredRows.forEach((row) => {
        if (checked) next[row.memberId] = true
        else delete next[row.memberId]
      })
      return next
    })
  }

  function updateRow(memberId: string, patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((r) => (r.memberId === memberId ? { ...r, ...patch } : r)))
  }

  function applyToSelected(patch: Partial<BulkRow> | ((row: BulkRow) => Partial<BulkRow>)) {
    setRows((prev) =>
      prev.map((r) =>
        selectedIdSet.has(r.memberId)
          ? { ...r, ...(typeof patch === "function" ? patch(r) : patch) }
          : r
      )
    )
  }

  function excludeSelected() {
    setRows((prev) => prev.filter((r) => !selectedIdSet.has(r.memberId)))
    setRowSelection({})
    toast.success(`${selectedIds.length} selected member(s) excluded.`)
  }

  const paidRows = rows.filter((r) => r.status === "Paid")
  const selectedPaidRows = paidRows.filter((row) => selectedIdSet.has(row.memberId))
  const unpaidRows = rows.filter((r) => r.status === "Unpaid")
  const duplicateRows = rows.filter((r) => r.isDuplicate)
  const totalAmount = selectedPaidRows.reduce((sum, r) => sum + (r.amount || 0), 0)

  async function handleSaveAll() {
    if (!user) return
    if (selectedPaidRows.length === 0) {
      toast.warning("Select at least one Paid member before saving.")
      setShowConfirm(false)
      return
    }
    setIsSaving(true)
    try {
      const latestDuplicateIds = new Set(
        await checkDuplicateContributions(
          selectedPaidRows.map((row) => row.memberId),
          period
        )
      )
      if (latestDuplicateIds.size > 0) {
        const newlyExcluded = selectedPaidRows.filter((row) => latestDuplicateIds.has(row.memberId))
        setRows((current) => current.filter((row) => !latestDuplicateIds.has(row.memberId)))
        setExcludedDuplicateNames((current) =>
          Array.from(new Set([...current, ...newlyExcluded.map((row) => row.fullName)]))
        )
        setShowConfirm(false)
        toast.warning(
          `${newlyExcluded.length} member(s) already paid for ${period} and were automatically excluded. Review the remaining entries, then save again.`
        )
        return
      }
      const saveResult = await bulkCreateContributions({
        contributionPeriod: period,
        contributionType: "Monthly Dues",
        paymentDate,
        paymentMethod,
        cashPabaonAmount:
          paymentMethod === "Payroll Deduction" && hasActiveCashPabaon ? cashPabaonAmount : undefined,
        payrollReference: payrollReference || undefined,
        encodedBy: user.fullName,
        skipDuplicates: true,
        rows: selectedPaidRows.map((r) => ({
          memberId: r.memberId,
          memberNumber: r.memberNumber,
          memberName: r.fullName,
          officeName: r.officeName,
          amount: r.amount,
        })),
      })
      setResult(saveResult)
      setRows([])
      setRowSelection({})
      setOffices([])
      setOfficeError(false)
      setExcludedDuplicateNames([])
      setSearch("")
      setShowConfirm(false)
      toast.success(
        `Saved ${saveResult.saved} Monthly Dues and ${saveResult.cashPabaonSaved} Cash Pabaon deduction record(s).`
      )
      if (saveResult.skippedUnresolvedVoided > 0) {
        toast.warning(
          `${saveResult.skippedUnresolvedVoided} member(s) skipped — an earlier voided period has not been re-contributed yet.`
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save contributions.")
    } finally {
      setIsSaving(false)
    }
  }

  const allColumns: ColumnDef<BulkRow, unknown>[] = [
    {
      accessorKey: "memberNumber",
      header: "Member ID",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground/90">
          {row.original.memberNumber}
        </span>
      ),
    },
    {
      accessorKey: "fullName",
      header: "Member Name",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-heading font-semibold text-foreground tracking-tight">
            {row.original.fullName}
          </span>
          {row.original.isDuplicate && (
            <StatusBadge label="Duplicate" tone="warning" />
          )}
        </div>
      ),
    },
    {
      accessorKey: "officeName",
      header: "Office Agency",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.officeName}</span>
      ),
    },
    {
      accessorKey: "position",
      header: "Position",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.position}</span>
      ),
    },
    {
      id: "amount",
      header: "Monthly Dues",
      enableSorting: false,
      cell: ({ row }) => (
        <CurrencyInput
          className="h-8.5 w-32 rounded-lg font-mono text-xs font-semibold shadow-2xs"
          value={row.original.amount}
          onChange={(value) => updateRow(row.original.memberId, { amount: value ?? 0 })}
        />
      ),
    },
    {
      id: "cashPabaon",
      header: "Cash Pabaon",
      enableSorting: false,
      cell: () => (
        <CurrencyInput
          className="h-8.5 w-32 rounded-lg bg-muted/40 font-mono text-xs text-muted-foreground shadow-none"
          value={cashPabaonAmount}
          onChange={() => undefined}
          disabled
        />
      ),
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => (
        <CommandSelect
          size="sm"
          className="w-28 h-8.5 rounded-lg text-xs shadow-2xs"
          value={row.original.status}
          onValueChange={(v) =>
            updateRow(row.original.memberId, { status: (v ?? "Paid") as "Paid" | "Unpaid" })
          }
          options={[
            { value: "Paid", label: "Paid" },
            { value: "Unpaid", label: "Unpaid" },
          ]}
          hideSearch
        />
      ),
    },
    {
      id: "remarks",
      header: "Remarks",
      enableSorting: false,
      cell: ({ row }) => (
        <Input
          className="h-8.5 w-44 rounded-lg text-xs shadow-2xs"
          placeholder="Optional note…"
          value={row.original.remarks}
          onChange={(e) => updateRow(row.original.memberId, { remarks: e.target.value })}
        />
      ),
    },
    {
      id: "rowActions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95"
          onClick={() => setRows((prev) => prev.filter((r) => r.memberId !== row.original.memberId))}
        >
          Exclude
        </Button>
      ),
    },
  ]

  const columns = allColumns.filter((column) => hasActiveCashPabaon || column.id !== "cashPabaon")

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <PageHeader
        title="Bulk Contribution Batch Entry"
        description="Encode and post monthly dues for multiple members simultaneously across one or more agency offices."
      />

      {/* Batch Setup FormSection Card */}
      <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
          <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
            <Layers className="size-4" strokeWidth={2.2} />
          </div>
          <h2 className="font-heading text-sm font-semibold tracking-tight text-foreground">
            Batch Setup & Office Filters
          </h2>
        </div>

        <AlertBanner
          tone="info"
          title="Automated Deductions Synchronization"
          description="Batch entries post as Monthly Dues. With Payroll Deduction selected, configured Cash Pabaon allocations post to deduction ledgers simultaneously."
        />

        {!contributionSettings.allowAdvanceContribution && period > currentPeriod() && (
          <AlertBanner
            tone="warning"
            title="Advance contribution period"
            description="The selected period is ahead of current calendar month. Allow Advance Contribution is disabled in settings."
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Contribution Period <span className="text-destructive font-bold">*</span>
            </Label>
            <Input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-10 font-mono text-xs shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className={cn("text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80", officeError && "text-destructive")}>
              Office Agencies <span className="text-destructive font-bold">*</span>
            </Label>
            <OfficeMultiSelect
              values={offices}
              error={officeError}
              onValuesChange={(values) => {
                setOffices(values)
                handleClear()
                if (values.length > 0) setOfficeError(false)
              }}
              className="h-10 shadow-2xs"
            />
            {officeError && (
              <p className="text-[11px] font-semibold text-destructive">
                Please select at least one office agency.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Membership Status
            </Label>
            <CommandSelect
              className="w-full h-10 text-xs shadow-2xs"
              value={membershipStatus}
              onValueChange={(value) => setMembershipStatus(value ?? "Active")}
              options={[
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
                { value: "All", label: "All Members" },
              ]}
              hideSearch
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Default Rate
            </Label>
            <CurrencyInput
              value={defaultAmount}
              onChange={() => undefined}
              disabled
              className="h-10 bg-muted/40 font-mono text-xs font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Payment Date
            </Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-10 font-mono text-xs shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Payment Method
            </Label>
            <CommandSelect
              className="w-full h-10 text-xs shadow-2xs"
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod((v ?? "Payroll Deduction") as PaymentMethod)}
              options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
              hideSearch
            />
          </div>

          {hasActiveCashPabaon && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                Cash Pabaon Rate
              </Label>
              <CurrencyInput
                value={cashPabaonAmount}
                onChange={() => undefined}
                disabled
                className="h-10 bg-muted/40 font-mono text-xs text-muted-foreground shadow-none"
              />
              <p className="text-[10px] text-muted-foreground">
                Configured rate from system settings.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Payroll Reference
            </Label>
            <Input
              placeholder="e.g. PR-2026-07-001"
              value={payrollReference}
              onChange={(e) => setPayrollReference(e.target.value)}
              className="h-10 font-mono text-xs shadow-2xs"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Batch Remarks / Audit Notes
            </Label>
            <Textarea
              rows={1}
              placeholder="Additional remarks about this payroll batch (optional)"
              value={setupRemarks}
              onChange={(e) => setSetupRemarks(e.target.value)}
              className="bg-background text-xs resize-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => void handleLoadMembers()}
              disabled={isLoadingMembers}
              className="h-9 gap-2 rounded-xl px-5 text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              {isLoadingMembers ? <Loader2 className="size-3.5 animate-spin" /> : <Users className="size-3.5" />}
              <span>{isLoadingMembers ? "Loading member roster…" : "Load Unpaid Members"}</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleClear}
              disabled={rows.length === 0}
              className="h-9 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              Clear Roster
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate("/contributions")}
            className="h-9 rounded-xl px-3.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Roster & Grid Stage */}
      {rows.length === 0 ? (
        result ? null : (
          <>
            {excludedDuplicateNames.length > 0 && (
              <AlreadyPaidAlert names={excludedDuplicateNames} period={period} />
            )}
            {isLoadingMembers ? (
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs">
                <DataTable
                  columns={columns}
                  data={[]}
                  isLoading
                  enableColumnVisibility={false}
                  emptyTitle="Loading member roster…"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-gradient-to-b from-muted/20 via-muted/5 to-transparent p-12 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background text-muted-foreground shadow-2xs">
                  <Users className="size-5 text-primary" />
                </div>
                <h3 className="font-heading text-sm font-semibold text-foreground">
                  No Members Loaded
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select one or more offices and click <strong>Load Unpaid Members</strong> to build the batch table.
                </p>
              </div>
            )}
          </>
        )
      ) : (
        <>
          {excludedDuplicateNames.length > 0 && (
            <AlreadyPaidAlert names={excludedDuplicateNames} period={period} />
          )}

          {voidedForPeriodNames.length > 0 && (
            <AlertBanner
              tone="info"
              title={`${voidedForPeriodNames.length} member(s) with previous voided records for ${period}`}
              description={`${voidedForPeriodNames.join(", ")} had voided records for this period and remain included for re-contribution.`}
            />
          )}

          {/* Statistical Summary Ribbon */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryStat label="Members Loaded" value={String(rows.length)} badge="Roster" />
            <SummaryStat label="Selected Rows" value={String(selectedIds.length)} tone="info" badge="Active" />
            <SummaryStat label="Paid Entries" value={String(paidRows.length)} tone="success" badge="Ready" />
            <SummaryStat label="Unpaid Entries" value={String(unpaidRows.length)} badge="Skipped" />
            <SummaryStat
              label="Duplicate Warnings"
              value={String(duplicateRows.length)}
              tone={duplicateRows.length > 0 ? "warning" : undefined}
              badge="Audit"
            />
            <SummaryStat label="Batch Total" value={formatCurrency(totalAmount)} tone="success" />
          </div>

          {/* Main Batch Data Table Card */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
            {/* Table Bulk Command Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-muted/15 p-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <label className="flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-border/70 bg-background px-3 text-xs font-semibold shadow-2xs hover:bg-muted active:scale-95 transition-all">
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onCheckedChange={(checked) => toggleAllVisible(checked)}
                    aria-label="Select or deselect all displayed members"
                    className="size-4"
                  />
                  <span>Select All</span>
                </label>

                <SearchInput
                  value={search}
                  onChange={(value) => {
                    setSearch(value)
                    setPage(1)
                  }}
                  placeholder="Search loaded members…"
                  className="w-64"
                />
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    applyToSelected({ amount: defaultAmount })
                    toast.success(`Default amount applied to ${selectedIds.length} member(s).`)
                  }}
                  className="h-8.5 rounded-lg text-xs font-semibold active:scale-95 shadow-2xs"
                >
                  Apply Rate
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    applyToSelected({ status: "Paid" })
                    toast.success(`${selectedIds.length} member(s) marked Paid.`)
                  }}
                  className="h-8.5 rounded-lg text-xs font-semibold active:scale-95 shadow-2xs text-emerald-600 dark:text-emerald-400"
                >
                  <Check className="size-3.5 mr-1" /> Mark Paid
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    applyToSelected({ status: "Unpaid" })
                    toast.success(`${selectedIds.length} member(s) marked Unpaid.`)
                  }}
                  className="h-8.5 rounded-lg text-xs font-semibold active:scale-95 shadow-2xs"
                >
                  <X className="size-3.5 mr-1" /> Mark Unpaid
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    applyToSelected((row) => ({ amount: row.originalAmount }))
                    toast.success(`Amounts reset for ${selectedIds.length} member(s).`)
                  }}
                  className="h-8.5 rounded-lg text-xs font-semibold active:scale-95 shadow-2xs"
                >
                  <RotateCcw className="size-3.5 mr-1" /> Reset Rates
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedIds.length === 0}
                  onClick={excludeSelected}
                  className="h-8.5 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 active:scale-95 shadow-2xs"
                >
                  <Trash2 className="size-3.5 mr-1" /> Exclude
                </Button>
              </div>
            </div>

            {/* Data Grid */}
            <DataTable
              columns={columns}
              data={pagedRows}
              enableRowSelection
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              getRowId={(r) => r.memberId}
              enableColumnVisibility={false}
              emptyTitle="No members match your search"
              emptyDescription="Try clearing the search query."
            />

            {/* Pagination footer */}
            <div className="border-t border-border/40 bg-muted/10 p-3">
              <Pagination
                meta={{
                  currentPage,
                  perPage,
                  totalRecords: filteredRows.length,
                  totalPages,
                }}
                onPageChange={setPage}
                onPerPageChange={(value) => {
                  setPerPage(value)
                  setPage(1)
                }}
              />
            </div>
          </div>

          {/* Bottom Floating Commit Trigger */}
          <div className="flex justify-end">
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={selectedPaidRows.length === 0}
              className="h-10 gap-2 rounded-xl px-6 text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              <Save className="size-4" strokeWidth={2.2} />
              <span>Save &amp; Post {selectedPaidRows.length} Contribution Entries</span>
            </Button>
          </div>
        </>
      )}

      {/* Post-Save Result Banner */}
      {result && (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 text-center shadow-xs backdrop-blur-xs sm:p-8">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm">
            <CheckCircle2 className="size-7" />
          </div>

          <h3 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Batch Contributions Posted Successfully
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <strong className="text-foreground">{result.saved}</strong> Monthly Dues recorded,{" "}
            <strong className="text-foreground">{result.cashPabaonSaved}</strong> Cash Pabaon deductions created,{" "}
            <strong className="text-foreground">{result.skippedDuplicates}</strong> duplicates skipped, and{" "}
            <strong className="text-foreground">{result.failed}</strong> failed entries.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Button
              onClick={() => navigate("/contributions")}
              className="h-9 rounded-xl px-5 text-xs font-semibold shadow-xs active:scale-95"
            >
              View Contribution Records
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              className="h-9 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              Process Another Batch
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Commit batch contribution entries?"
        description={
          <span>
            You are about to post contributions for Period <strong>{period}</strong> across{" "}
            <strong>{offices.join(", ")}</strong> for <strong>{selectedPaidRows.length}</strong> selected members{" "}
            amounting to <strong>{formatCurrency(totalAmount)}</strong>.
            {duplicateRows.length > 0 && ` ${duplicateRows.length} duplicate record(s) will be automatically omitted.`}
          </span>
        }
        confirmLabel="Confirm & Post Batch"
        isLoading={isSaving}
        onConfirm={handleSaveAll}
      />
    </div>
  )
}

function SummaryStat({
  label,
  value,
  tone,
  badge,
}: {
  label: string
  value: string
  tone?: "warning" | "success" | "info"
  badge?: string
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/90 p-3.5 shadow-2xs backdrop-blur-xs space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
          {label}
        </span>
        {badge && (
          <span className="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <p
        className={cn(
          "font-heading text-lg font-bold tracking-tight",
          tone === "success"
            ? "text-emerald-600 dark:text-emerald-400 font-mono"
            : tone === "warning"
              ? "text-amber-600 dark:text-amber-400 font-mono"
              : tone === "info"
                ? "text-blue-600 dark:text-blue-400 font-mono"
                : "text-foreground font-mono"
        )}
      >
        {value}
      </p>
    </div>
  )
}
