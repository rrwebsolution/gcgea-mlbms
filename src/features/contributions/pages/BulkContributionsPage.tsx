import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { CheckCircle2, Loader2, Save, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { OfficeMultiSelect } from "@/components/shared/OfficeMultiSelect"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { listMembers } from "@/services/members.service"
import { bulkCreateContributions, checkDuplicateContributions, defaultContributionAmountForType, getAllContributions, type BulkCreateResult } from "@/services/contributions.service"
import { formatCurrency } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import { getSettings, loadSystemSettings } from "@/services/settings.service"
import { listDeductionTypes } from "@/services/deduction-types.service"
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

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function defaultPostingDate(): string {
  const now = new Date()
  const day = Math.min(getSettings().contribution.contributionDueDay, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
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
  const [defaultAmount, setDefaultAmount] = React.useState<number>(() => defaultContributionAmountForType("Monthly Dues") ?? 0)
  const [hasActiveCashPabaon, setHasActiveCashPabaon] = React.useState(false)

  /** Re-suggests the configured default amount whenever the type changes — same "never hardcoded" rule as the Add Contribution page. */
  const [paymentDate, setPaymentDate] = React.useState(defaultPostingDate)
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(defaultPaymentMethodSetting)
  const [payrollReference, setPayrollReference] = React.useState("")
  const [setupRemarks, setSetupRemarks] = React.useState("")

  // Contribution Settings, kept live — same pattern as the Add Contribution page.
  const [contributionSettings, setContributionSettings] = React.useState<ContributionSettings>(() => getSettings().contribution)
  // The posted Cash Pabaon amount depends on Contribution Settings, not the Deduction
  // Type's own default_amount — hasActiveCashPabaon (below) still gates whether the
  // Pabaon feature is enabled at all, which is a Deduction Types concern.
  const cashPabaonAmount = contributionSettings.defaultCashPabaonContribution

  const [rows, setRows] = React.useState<BulkRow[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false)
  const [search, setSearch] = React.useState("")
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
      .catch(() => {
        // The batch can still be entered; the server validates the configured type.
      })

    function handleSettingsChanged(event: Event) {
      const detail = (event as CustomEvent<{ section: string; value: unknown }>).detail
      if (detail.section !== "contribution") return
      const value = detail.value as ContributionSettings
      setContributionSettings(value)
      setDefaultAmount(value.defaultMonthlyContribution)
      setRows((current) => current.map((row) => ({ ...row, amount: value.defaultMonthlyContribution, originalAmount: value.defaultMonthlyContribution })))
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
      const listParams = { offices, membershipStatus: membershipStatus === "All" ? undefined : membershipStatus, perPage: 500 }
      const firstPage = await listMembers(listParams)
      // A bulk entry batch needs every matching member, not just one page —
      // fetch the rest in parallel instead of silently truncating at perPage
      // when the selected offices have more members than that (bug: was
      // hardcoded to a single 500-row page, dropping anyone past it).
      const remainingPages = firstPage.meta.totalPages > 1
        ? await Promise.all(
            Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) =>
              listMembers({ ...listParams, page: index + 2 })
            )
          )
        : []
      const allMembers = [firstPage.data, ...remainingPages.map((p) => p.data)].flat()

      const duplicateIds = new Set(await checkDuplicateContributions(allMembers.map((member) => member.id), period))
      const excluded = allMembers.filter((member) => duplicateIds.has(member.id)).map((member) => member.fullName)
      const loaded: BulkRow[] = allMembers.filter((member) => !duplicateIds.has(member.id)).map((m) => ({
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
        .filter((row) => getAllContributions().some(
          (c) => c.memberId === row.memberId && c.contributionPeriod === period && c.contributionType === "Monthly Dues" && c.status === "Voided"
        ))
        .map((row) => row.fullName)

      setExcludedDuplicateNames(excluded)
      setVoidedForPeriodNames(voidedForPeriod)
      setRows(loaded)
      setRowSelection(Object.fromEntries(loaded.map((r) => [r.memberId, true])))
      setResult(null)
      if (excluded.length > 0) toast.warning(`${excluded.length} member(s) already paid for ${period} and were automatically excluded.`)
      if (loaded.length === 0) toast.info("No unpaid members found for the selected offices, status, and period.")
      else toast.success(`Loaded ${loaded.length} unpaid member(s).`)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  React.useEffect(() => {
    function handleRefreshData(event: Event) {
      const task = Promise.all([loadSystemSettings(), listDeductionTypes()])
        .then(async ([systemSettings, types]) => {
          const contributionAmount = systemSettings.settings.contribution.defaultMonthlyContribution
          const pabaon = types.find((type) => type.code.toLowerCase() === "pabaon" && type.isActive)
          setDefaultAmount(contributionAmount)
          setContributionSettings(systemSettings.settings.contribution)
          setHasActiveCashPabaon(Boolean(pabaon))
          setRows((current) => current.map((row) => ({
            ...row,
            amount: contributionAmount,
            originalAmount: contributionAmount,
          })))
          if (offices.length > 0) await handleLoadMembers(contributionAmount)
        })
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
    (r) => !search || r.fullName.toLowerCase().includes(search.toLowerCase()) || r.memberNumber.toLowerCase().includes(search.toLowerCase())
  )
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])

  function updateRow(memberId: string, patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((r) => (r.memberId === memberId ? { ...r, ...patch } : r)))
  }

  function applyToSelected(patch: Partial<BulkRow> | ((row: BulkRow) => Partial<BulkRow>)) {
    setRows((prev) =>
      prev.map((r) => (selectedIds.includes(r.memberId) ? { ...r, ...(typeof patch === "function" ? patch(r) : patch) } : r))
    )
  }

  function excludeSelected() {
    setRows((prev) => prev.filter((r) => !selectedIds.includes(r.memberId)))
    setRowSelection({})
  }

  const paidRows = rows.filter((r) => r.status === "Paid")
  const selectedPaidRows = paidRows.filter((row) => selectedIds.includes(row.memberId))
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
      const latestDuplicateIds = new Set(await checkDuplicateContributions(selectedPaidRows.map((row) => row.memberId), period))
      if (latestDuplicateIds.size > 0) {
        const newlyExcluded = selectedPaidRows.filter((row) => latestDuplicateIds.has(row.memberId))
        setRows((current) => current.filter((row) => !latestDuplicateIds.has(row.memberId)))
        setExcludedDuplicateNames((current) => Array.from(new Set([...current, ...newlyExcluded.map((row) => row.fullName)])))
        setShowConfirm(false)
        toast.warning(`${newlyExcluded.length} member(s) already paid for ${period} and were automatically excluded. Review the remaining entries, then save again.`)
        return
      }
      const saveResult = await bulkCreateContributions({
        contributionPeriod: period,
        contributionType: "Monthly Dues",
        paymentDate,
        paymentMethod,
        cashPabaonAmount: paymentMethod === "Payroll Deduction" && hasActiveCashPabaon ? cashPabaonAmount : undefined,
        payrollReference: payrollReference || undefined,
        encodedBy: user.fullName,
        skipDuplicates: true,
        rows: selectedPaidRows.map((r) => ({ memberId: r.memberId, memberNumber: r.memberNumber, memberName: r.fullName, officeName: r.officeName, amount: r.amount })),
      })
      setResult(saveResult)
      setRows([])
      setRowSelection({})
      setOffices([])
      setOfficeError(false)
      setExcludedDuplicateNames([])
      setSearch("")
      setShowConfirm(false)
      toast.success(`Saved ${saveResult.saved} Monthly Dues and ${saveResult.cashPabaonSaved} Cash Pabaon deduction record(s).`)
      if (saveResult.skippedUnresolvedVoided > 0) {
        toast.warning(`${saveResult.skippedUnresolvedVoided} member(s) skipped — an earlier voided period has not been re-contributed yet.`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save contributions.")
    } finally {
      setIsSaving(false)
    }
  }

  const allColumns: ColumnDef<BulkRow, unknown>[] = [
    { accessorKey: "memberNumber", header: "Member Number", enableSorting: false, cell: ({ row }) => <span className="font-medium text-foreground">{row.original.memberNumber}</span> },
    {
      accessorKey: "fullName",
      header: "Full Name",
      enableSorting: false,
      cell: ({ row }) => (
        <span>
          {row.original.fullName}
          {row.original.isDuplicate && <StatusBadge label="Duplicate" tone="warning" className="ml-2" />}
        </span>
      ),
    },
    { accessorKey: "officeName", header: "Office", enableSorting: false },
    { accessorKey: "position", header: "Position", enableSorting: false },
    {
      id: "amount",
      header: "Contribution Amount",
      enableSorting: false,
      cell: ({ row }) => (
        <CurrencyInput className="h-8 w-32" value={row.original.amount} onChange={() => undefined} disabled />
      ),
    },
    {
      id: "cashPabaon",
      header: "Cash Pabaon",
      enableSorting: false,
      cell: () => (
        <CurrencyInput className="h-8 w-32" value={cashPabaonAmount} onChange={() => undefined} disabled />
      ),
    },
    {
      id: "status",
      header: "Payment Status",
      enableSorting: false,
      cell: ({ row }) => (
        <CommandSelect
          size="sm"
          className="w-28"
          value={row.original.status}
          onValueChange={(v) => updateRow(row.original.memberId, { status: (v ?? "Paid") as "Paid" | "Unpaid" })}
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
        <Input className="h-8 w-40" placeholder="Optional note" value={row.original.remarks} onChange={(e) => updateRow(row.original.memberId, { remarks: e.target.value })} />
      ),
    },
    {
      id: "rowActions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setRows((prev) => prev.filter((r) => r.memberId !== row.original.memberId))}>
          Exclude
        </Button>
      ),
    },
  ]
  const columns = allColumns.filter((column) => hasActiveCashPabaon || column.id !== "cashPabaon")

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="Bulk Contribution Entry" description="Record contributions for multiple members at once for a given period and one or more offices." />

      <FormSection title="Contribution Setup">
        <AlertBanner
          tone="info"
          title="Monthly Dues"
          description="Bulk entries are always recorded as Monthly Dues. With Payroll Deduction, the Cash Pabaon amount below is posted to Deduction Records for the same members and period."
          className="mb-4"
        />
        {!contributionSettings.allowAdvanceContribution && period > currentPeriod() && (
          <AlertBanner
            tone="warning"
            title="Advance contribution"
            description="This period is ahead of the current month. Allow Advance Contribution is off in Contribution Settings."
            className="mb-4"
          />
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Contribution Period <span className="text-destructive">*</span></Label>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className={officeError ? "text-destructive" : undefined}>Office <span className="text-destructive">*</span></Label>
            <OfficeMultiSelect
              values={offices}
              error={officeError}
              onValuesChange={(values) => {
                setOffices(values)
                if (values.length > 0) setOfficeError(false)
              }}
            />
            {officeError && <p className="text-xs font-medium text-destructive">Select at least one office.</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Membership Status</Label>
            <CommandSelect
              className="w-full"
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
            <Label>Contribution Amount</Label>
            <CurrencyInput value={defaultAmount} onChange={() => undefined} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Date</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <CommandSelect
              className="w-full"
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod((v ?? "Payroll Deduction") as PaymentMethod)}
              options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
              hideSearch
            />
          </div>
          {hasActiveCashPabaon && <div className="space-y-1.5">
            <Label>Cash Pabaon Amount</Label>
            <CurrencyInput
              value={cashPabaonAmount}
              onChange={() => undefined}
              disabled
            />
            <p className="text-[11px] text-muted-foreground">From Contribution Settings → Default Cash Pabaon Contribution.</p>
          </div>}
          <div className="space-y-1.5">
            <Label>Payroll Reference</Label>
            <Input placeholder="e.g. PR-2026-07-001" value={payrollReference} onChange={(e) => setPayrollReference(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea rows={1} placeholder="Notes about this batch (optional)" value={setupRemarks} onChange={(e) => setSetupRemarks(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => void handleLoadMembers()} disabled={isLoadingMembers}>
            {isLoadingMembers ? <Loader2 className="animate-spin" /> : <Users />}
            Load Members
          </Button>
          <Button variant="outline" onClick={handleClear} disabled={rows.length === 0}>Clear</Button>
          <Button variant="ghost" onClick={() => navigate("/contributions")}>Cancel</Button>
        </div>
      </FormSection>

      {rows.length === 0 ? (
        result ? null : <>
          {excludedDuplicateNames.length > 0 && (
            <AlertBanner
              tone="warning"
              title={`Already paid for ${period}`}
              description={`${excludedDuplicateNames.join(", ")} ${excludedDuplicateNames.length === 1 ? "has" : "have"} already paid Monthly Dues for this month and ${excludedDuplicateNames.length === 1 ? "was" : "were"} automatically excluded.`}
              className="mb-4"
            />
          )}
          {isLoadingMembers ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <DataTable
                columns={columns}
                data={[]}
                isLoading
                enableColumnVisibility={false}
                emptyTitle="No members loaded"
              />
            </div>
          ) : (
            <EmptyState icon={Users} title="No members loaded" description="Select one or more offices and click Load Members to begin." />
          )}
        </>
      ) : (
        <>
          {excludedDuplicateNames.length > 0 && (
            <AlertBanner
              tone="warning"
              title={`${excludedDuplicateNames.length} already-paid member(s) excluded`}
              description={`${excludedDuplicateNames.join(", ")} already paid Monthly Dues for ${period} and will not be included in Save All.`}
            />
          )}
          {voidedForPeriodNames.length > 0 && (
            <AlertBanner
              tone="info"
              title={`${voidedForPeriodNames.length} member(s) had a voided Monthly Dues for ${period}`}
              description={`${voidedForPeriodNames.join(", ")} ${voidedForPeriodNames.length === 1 ? "has" : "have"} a voided record for this period. They remain included below — saving this batch will record a new (re-contributed) entry for them.`}
            />
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryStat label="Members Loaded" value={String(rows.length)} />
            <SummaryStat label="Selected" value={String(selectedIds.length)} />
            <SummaryStat label="Paid Entries" value={String(paidRows.length)} />
            <SummaryStat label="Unpaid Entries" value={String(unpaidRows.length)} />
            <SummaryStat label="Duplicate Warnings" value={String(duplicateRows.length)} tone={duplicateRows.length > 0 ? "warning" : undefined} />
            <SummaryStat label="Total Amount" value={formatCurrency(totalAmount)} />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
              <SearchInput value={search} onChange={setSearch} placeholder="Search loaded members…" className="max-w-sm" />
              <div className="ml-auto flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={() => applyToSelected({ amount: defaultAmount })}>Apply Default Amount</Button>
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={() => applyToSelected({ status: "Paid" })}>Mark Selected Paid</Button>
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={() => applyToSelected({ status: "Unpaid" })}>Mark Selected Unpaid</Button>
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={() => applyToSelected({ remarks: "" })}>Clear Remarks</Button>
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={() => applyToSelected((row) => ({ amount: row.originalAmount }))}>Reset Amount</Button>
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={excludeSelected}>Exclude Selected</Button>
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredRows}
              enableRowSelection
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              getRowId={(r) => r.memberId}
              enableColumnVisibility={false}
              emptyTitle="No members match your search"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setShowConfirm(true)} disabled={selectedPaidRows.length === 0}>
              <Save /> Save All
            </Button>
          </div>
        </>
      )}

      {result && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-5 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-6" />
          </div>
          <p className="font-heading text-base font-semibold text-foreground">Batch Saved</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.saved} Monthly Dues saved · {result.cashPabaonSaved} Cash Pabaon deductions saved · {result.skippedDuplicates} contribution duplicates skipped · {result.cashPabaonSkipped} deduction duplicates skipped · {result.skippedUnresolvedVoided} skipped for an unresolved voided month · {result.failed} failed
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/contributions")}>View Contribution Records</Button>
            <Button variant="outline" onClick={handleClear}>Create Another Batch</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Confirm batch save"
        description={
          <span>
            Period <strong>{period}</strong> · Offices <strong>{offices.join(", ")}</strong> · {selectedPaidRows.length} selected record(s) ·{" "}
            {formatCurrency(totalAmount)} total.
            {duplicateRows.length > 0 && ` ${duplicateRows.length} duplicate record(s) will be skipped.`}
          </span>
        }
        confirmLabel="Save All"
        isLoading={isSaving}
        onConfirm={handleSaveAll}
      />
    </div>
  )
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-heading text-lg font-semibold ${tone === "warning" ? "text-warning" : "text-foreground"}`}>{value}</p>
    </div>
  )
}
