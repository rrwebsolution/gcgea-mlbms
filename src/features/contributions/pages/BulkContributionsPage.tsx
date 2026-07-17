import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { CheckCircle2, Loader2, Printer, Save, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { listMembers } from "@/services/members.service"
import { bulkCreateContributions, hasExistingContribution, type BulkCreateResult } from "@/services/contributions.service"
import { paginate } from "@/utils/paginate"
import { formatCurrency } from "@/utils/format"
import { useAuth } from "@/contexts/AuthContext"
import type { MembershipStatus, PaymentMethod } from "@/types"

interface BulkRow {
  memberId: string
  memberNumber: string
  fullName: string
  officeName: string
  position: string
  amount: number
  status: "Paid" | "Unpaid"
  remarks: string
  isDuplicate: boolean
}

const PAYMENT_METHODS: PaymentMethod[] = ["Payroll Deduction", "Cash", "Bank Transfer", "Check"]

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default function BulkContributionsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [period, setPeriod] = React.useState(currentPeriod())
  const [office, setOffice] = React.useState("")
  const [membershipStatus, setMembershipStatus] = React.useState<MembershipStatus>("Active")
  const [defaultAmount, setDefaultAmount] = React.useState<number>(150)
  const [paymentDate, setPaymentDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("Payroll Deduction")
  const [payrollReference, setPayrollReference] = React.useState("")
  const [setupRemarks, setSetupRemarks] = React.useState("")

  const [rows, setRows] = React.useState<BulkRow[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const [showConfirm, setShowConfirm] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [result, setResult] = React.useState<BulkCreateResult | null>(null)

  async function handleLoadMembers() {
    if (!office) {
      toast.error("Select an office before loading members.")
      return
    }
    setIsLoadingMembers(true)
    try {
      const response = await listMembers({ office, membershipStatus, perPage: 500 })
      const loaded: BulkRow[] = response.data.map((m) => ({
        memberId: m.id,
        memberNumber: m.memberNumber,
        fullName: m.fullName,
        officeName: m.officeName,
        position: m.position,
        amount: defaultAmount,
        status: "Paid",
        remarks: "",
        isDuplicate: hasExistingContribution(m.id, period),
      }))
      setRows(loaded)
      setRowSelection(Object.fromEntries(loaded.map((r) => [r.memberId, true])))
      setPage(1)
      setResult(null)
      if (loaded.length === 0) toast.info("No members found for this office and membership status.")
      else toast.success(`Loaded ${loaded.length} member(s).`)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  function handleClear() {
    setRows([])
    setRowSelection({})
    setResult(null)
  }

  const filteredRows = rows.filter(
    (r) => !search || r.fullName.toLowerCase().includes(search.toLowerCase()) || r.memberNumber.toLowerCase().includes(search.toLowerCase())
  )
  const pagedRows = paginate(filteredRows, page, perPage)
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
  const unpaidRows = rows.filter((r) => r.status === "Unpaid")
  const duplicateRows = rows.filter((r) => r.isDuplicate)
  const totalAmount = paidRows.reduce((sum, r) => sum + (r.amount || 0), 0)

  async function handleSaveAll() {
    if (!user) return
    setIsSaving(true)
    try {
      const saveResult = await bulkCreateContributions({
        contributionPeriod: period,
        paymentDate,
        paymentMethod,
        payrollReference: payrollReference || undefined,
        encodedBy: user.fullName,
        skipDuplicates: true,
        rows: paidRows.map((r) => ({ memberId: r.memberId, memberNumber: r.memberNumber, memberName: r.fullName, officeName: r.officeName, amount: r.amount })),
      })
      setResult(saveResult)
      setShowConfirm(false)
      toast.success(`Saved ${saveResult.saved} contribution record(s).`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save contributions.")
    } finally {
      setIsSaving(false)
    }
  }

  const columns: ColumnDef<BulkRow, unknown>[] = [
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
        <CurrencyInput className="h-8 w-32" value={row.original.amount} onChange={(v) => updateRow(row.original.memberId, { amount: v ?? 0 })} />
      ),
    },
    {
      id: "status",
      header: "Payment Status",
      enableSorting: false,
      cell: ({ row }) => (
        <Select value={row.original.status} onValueChange={(v) => updateRow(row.original.memberId, { status: (v ?? "Paid") as "Paid" | "Unpaid" })}>
          <SelectTrigger size="sm" className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
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

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="Bulk Contribution Entry" description="Record contributions for multiple members at once for a given period and office." />

      <FormSection title="Contribution Setup">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Contribution Period <span className="text-destructive">*</span></Label>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Office <span className="text-destructive">*</span></Label>
            <OfficeSelect value={office} onValueChange={setOffice} />
          </div>
          <div className="space-y-1.5">
            <Label>Membership Status</Label>
            <Select value={membershipStatus} onValueChange={(v) => setMembershipStatus((v ?? "Active") as MembershipStatus)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Default Contribution Amount</Label>
            <CurrencyInput value={defaultAmount} onChange={(v) => setDefaultAmount(v ?? 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Date</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
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
            <Label>Payroll Reference</Label>
            <Input placeholder="e.g. PR-2026-07-001" value={payrollReference} onChange={(e) => setPayrollReference(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea rows={1} placeholder="Notes about this batch (optional)" value={setupRemarks} onChange={(e) => setSetupRemarks(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={handleLoadMembers} disabled={isLoadingMembers}>
            {isLoadingMembers ? <Loader2 className="animate-spin" /> : <Users />}
            Load Members
          </Button>
          <Button variant="outline" onClick={handleClear} disabled={rows.length === 0}>Clear</Button>
        </div>
      </FormSection>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="No members loaded" description="Select an office and click Load Members to begin." />
      ) : (
        <>
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
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search loaded members…" className="max-w-sm" />
              <div className="ml-auto flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={() => applyToSelected({ amount: defaultAmount })}>Apply Default Amount</Button>
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={() => applyToSelected({ status: "Paid" })}>Mark Selected Paid</Button>
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={() => applyToSelected({ status: "Unpaid" })}>Mark Selected Unpaid</Button>
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={() => applyToSelected({ remarks: "" })}>Clear Remarks</Button>
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0} onClick={excludeSelected}>Exclude Selected</Button>
              </div>
            </div>
            <DataTable
              columns={columns}
              data={pagedRows.data}
              enableRowSelection
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              getRowId={(r) => r.memberId}
              enableColumnVisibility={false}
              emptyTitle="No members match your search"
            />
            <Pagination meta={pagedRows.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setShowConfirm(true)} disabled={paidRows.length === 0}>
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
            {result.saved} saved · {result.skippedDuplicates} skipped as duplicate · {result.failed} failed
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/contributions")}>View Contribution Records</Button>
            <Button variant="outline" onClick={handleClear}>Create Another Batch</Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Print Batch Summary
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Confirm batch save"
        description={
          <span>
            Period <strong>{period}</strong> · Office <strong>{office}</strong> · {paidRows.length} record(s) ·{" "}
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
