import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { CheckCircle2, Loader2, Send, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FormSection } from "@/components/shared/FormSection"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { CurrencyInput } from "@/components/shared/CurrencyInput"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/shared/loaders/LoadingButton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePermission } from "@/hooks/usePermission"
import { listMembers } from "@/services/members.service"
import {
  getBulkPayrollMemberContexts,
  getNextBulkPayrollReference,
  postBulkPayrollBatch,
  saveBulkPayrollDraft,
} from "@/services/bulk-payroll.service"
import { paginate } from "@/utils/paginate"
import { formatCurrency } from "@/utils/format"
import { listDeductionTypes } from "@/services/deduction-types.service"
import type { BulkPayrollBatch } from "@/types/bulk-payroll"

interface BulkRow {
  memberId: string
  memberNumber: string
  fullName: string
  officeName: string
  position: string
  monthlyDues: number
  cashPabaon: number
  loanDeduction: number
  hasActiveLoan: boolean
}

const today = new Date().toISOString().slice(0, 10)

export default function BulkPayrollEntryPage() {
  const navigate = useNavigate()
  const { hasPermission } = usePermission()
  const canOverride = hasPermission("payroll.bulk.override")
  const { data: deductionTypes = [] } = useQuery({ queryKey: ["deduction-types"], queryFn: listDeductionTypes })

  const [reference, setReference] = React.useState("")
  const [period, setPeriod] = React.useState("")
  const [office, setOffice] = React.useState("")
  const [payrollDate, setPayrollDate] = React.useState(today)
  const [defaultMonthlyDues, setDefaultMonthlyDues] = React.useState(100)
  const [defaultCashPabaon, setDefaultCashPabaon] = React.useState(200)
  const [remarks, setRemarks] = React.useState("")

  const [rows, setRows] = React.useState<BulkRow[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const [batch, setBatch] = React.useState<BulkPayrollBatch | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  React.useEffect(() => {
    const configuredPabaon = deductionTypes.find((type) => type.code === "pabaon" && type.isActive)
    setDefaultCashPabaon(configuredPabaon?.defaultAmount ?? 0)
  }, [deductionTypes])

  React.useEffect(() => {
    getNextBulkPayrollReference().then(setReference).catch(() => toast.error("Could not generate a payroll reference."))
  }, [])

  async function handleLoadMembers() {
    if (!office) {
      toast.error("Select an office before loading members.")
      return
    }
    setIsLoadingMembers(true)
    try {
      const response = await listMembers({ office, membershipStatus: "Active", perPage: 500 })
      const contexts = await getBulkPayrollMemberContexts(response.data.map((m) => m.id))
      const loaded: BulkRow[] = response.data.map((m) => {
        const ctx = contexts[m.id]
        return {
          memberId: m.id,
          memberNumber: m.memberNumber,
          fullName: m.fullName,
          officeName: m.officeName,
          position: m.position,
          monthlyDues: defaultMonthlyDues,
          cashPabaon: defaultCashPabaon,
          loanDeduction: ctx?.loanDeduction ?? 0,
          hasActiveLoan: ctx?.hasActiveLoan ?? false,
        }
      })
      setRows(loaded)
      setRowSelection(Object.fromEntries(loaded.map((r) => [r.memberId, true])))
      setPage(1)
      setBatch(null)
      if (loaded.length === 0) toast.info("No approved and active members found for this office.")
      else toast.success(`Loaded ${loaded.length} member(s).`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load members.")
    } finally {
      setIsLoadingMembers(false)
    }
  }

  function handleClear() {
    setRows([])
    setRowSelection({})
    setBatch(null)
  }

  const filteredRows = rows.filter(
    (r) => !search || r.fullName.toLowerCase().includes(search.toLowerCase()) || r.memberNumber.toLowerCase().includes(search.toLowerCase())
  )
  const pagedRows = paginate(filteredRows, page, perPage)
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])

  function updateRow(memberId: string, patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((r) => (r.memberId === memberId ? { ...r, ...patch } : r)))
  }

  function applyToSelected(patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((r) => (selectedIds.includes(r.memberId) ? { ...r, ...patch } : r)))
  }

  function excludeSelected() {
    setRows((prev) => prev.filter((r) => !selectedIds.includes(r.memberId)))
    setRowSelection({})
  }

  const totalMonthlyDues = rows.reduce((sum, r) => sum + (r.monthlyDues || 0), 0)
  const totalCashPabaon = rows.reduce((sum, r) => sum + (r.cashPabaon || 0), 0)
  const totalLoanDeduction = rows.reduce((sum, r) => sum + (r.loanDeduction || 0), 0)
  const totalAmount = totalMonthlyDues + totalCashPabaon + totalLoanDeduction

  const validSetup = Boolean(reference && period && office && payrollDate)

  async function saveDraft(): Promise<BulkPayrollBatch | null> {
    setIsSaving(true)
    try {
      const saved = await saveBulkPayrollDraft({
        payrollReference: reference,
        payrollPeriod: period,
        payrollDate,
        officeId: office,
        remarks: remarks || undefined,
        rows: rows.map((r) => ({ memberId: r.memberId, monthlyDues: r.monthlyDues, cashPabaon: r.cashPabaon, loanDeduction: r.loanDeduction })),
      })
      setBatch(saved)
      toast.success("Bulk payroll deduction saved as draft. No ledger records were created.")
      return saved
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Draft could not be saved.")
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function postBatch() {
    if (!batch) return
    setIsSaving(true)
    try {
      const posted = await postBulkPayrollBatch(batch.id)
      setBatch(posted)
      setShowConfirm(false)
      toast.success("Bulk payroll deductions posted and ledgers updated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Posting failed. No records were changed.")
    } finally {
      setIsSaving(false)
    }
  }

  const columns: ColumnDef<BulkRow, unknown>[] = [
    { accessorKey: "memberNumber", header: "Member Number", enableSorting: false, cell: ({ row }) => <span className="font-medium text-foreground">{row.original.memberNumber}</span> },
    { accessorKey: "fullName", header: "Full Name", enableSorting: false },
    { accessorKey: "officeName", header: "Office", enableSorting: false },
    { accessorKey: "position", header: "Position", enableSorting: false },
    {
      id: "monthlyDues",
      header: "Monthly Dues",
      enableSorting: false,
      cell: ({ row }) => (
        <CurrencyInput className="h-8 w-28" disabled={!canOverride} value={row.original.monthlyDues} onChange={(v) => updateRow(row.original.memberId, { monthlyDues: v ?? 0 })} />
      ),
    },
    {
      id: "cashPabaon",
      header: "Cash Pabaon",
      enableSorting: false,
      cell: ({ row }) => (
        <CurrencyInput className="h-8 w-28" disabled={!canOverride} value={row.original.cashPabaon} onChange={(v) => updateRow(row.original.memberId, { cashPabaon: v ?? 0 })} />
      ),
    },
    {
      id: "loanDeduction",
      header: "Loan Deduction",
      enableSorting: false,
      cell: ({ row }) => (
        <CurrencyInput
          className="h-8 w-28"
          disabled={!row.original.hasActiveLoan}
          value={row.original.loanDeduction}
          onChange={(v) => updateRow(row.original.memberId, { loanDeduction: v ?? 0 })}
        />
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
      <PageHeader
        title="Bulk Payroll Deduction Entry"
        description="Encode payroll deductions for multiple approved members in one screen."
        actions={
          <>
            <LoadingButton variant="outline" disabled={rows.length === 0 || batch?.status === "Posted"} isLoading={isSaving} loadingText="Saving…" onClick={saveDraft}>
              Save Draft
            </LoadingButton>
            <LoadingButton
              disabled={rows.length === 0 || batch?.status === "Posted"}
              isLoading={isSaving}
              loadingText="Posting…"
              onClick={async () => {
                if (!batch) {
                  const saved = await saveDraft()
                  if (saved) setShowConfirm(true)
                } else {
                  setShowConfirm(true)
                }
              }}
            >
              <Send /> Post Payroll Deductions
            </LoadingButton>
            <Button variant="ghost" onClick={() => navigate("/payroll-deductions/history")}>
              Cancel
            </Button>
          </>
        }
      />

      <FormSection title="Payroll Setup">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5"><Label>Payroll Reference</Label><Input value={reference} readOnly /></div>
          <div className="space-y-1.5"><Label>Payroll Period <span className="text-destructive">*</span></Label><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Office <span className="text-destructive">*</span></Label><OfficeSelect value={office} onValueChange={setOffice} /></div>
          <div className="space-y-1.5"><Label>Payroll Date</Label><Input type="date" value={payrollDate} onChange={(e) => setPayrollDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Default Monthly Dues</Label><CurrencyInput value={defaultMonthlyDues} onChange={(v) => setDefaultMonthlyDues(v ?? 0)} /></div>
          <div className="space-y-1.5"><Label>Default Cash Pabaon</Label><CurrencyInput value={defaultCashPabaon} onChange={(v) => setDefaultCashPabaon(v ?? 0)} /></div>
          <div className="space-y-1.5 lg:col-span-2"><Label>Remarks</Label><Textarea rows={1} placeholder="Optional posting notes for this batch" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={handleLoadMembers} disabled={!validSetup || isLoadingMembers}>
            {isLoadingMembers ? <Loader2 className="animate-spin" /> : <Users />}
            Load Members
          </Button>
          <Button variant="outline" onClick={handleClear} disabled={rows.length === 0}>Clear</Button>
        </div>
      </FormSection>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="No members loaded" description="Fill in the payroll setup and click Load Members to begin." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <SummaryStat label="Members Loaded" value={String(rows.length)} />
            <SummaryStat label="Selected" value={String(selectedIds.length)} />
            <SummaryStat label="Total Monthly Dues" value={formatCurrency(totalMonthlyDues)} />
            <SummaryStat label="Total Cash Pabaon" value={formatCurrency(totalCashPabaon)} />
            <SummaryStat label="Total Amount" value={formatCurrency(totalAmount)} />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search loaded members…" className="max-w-sm" />
              <div className="ml-auto flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0 || !canOverride} onClick={() => applyToSelected({ monthlyDues: defaultMonthlyDues })}>Apply Default Dues</Button>
                <Button variant="outline" size="sm" disabled={selectedIds.length === 0 || !canOverride} onClick={() => applyToSelected({ cashPabaon: defaultCashPabaon })}>Apply Default Pabaon</Button>
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
        </>
      )}

      {batch?.status === "Posted" && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-5 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-6" />
          </div>
          <p className="font-heading text-base font-semibold text-foreground">Batch Posted</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {batch.memberCount} member(s) posted — {formatCurrency(batch.totalDeduction)} total.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/payroll-deductions/history")}>View Payroll History</Button>
            <Button variant="outline" onClick={handleClear}>Create Another Batch</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Confirm Bulk Payroll Posting"
        confirmLabel="Confirm Posting"
        confirmingLabel="Posting…"
        isLoading={isSaving}
        onConfirm={postBatch}
      >
        <div className="space-y-2 rounded-lg border p-4 text-sm">
          <p><strong>Payroll Period:</strong> {period}</p>
          <p><strong>Members:</strong> {rows.length}</p>
          <div className="border-t pt-2">
            <div className="flex justify-between"><span>Total Monthly Dues</span><span>{formatCurrency(totalMonthlyDues)}</span></div>
            <div className="flex justify-between"><span>Total Cash Pabaon</span><span>{formatCurrency(totalCashPabaon)}</span></div>
            <div className="flex justify-between"><span>Total Loan Deduction</span><span>{formatCurrency(totalLoanDeduction)}</span></div>
            <div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>TOTAL</span><span>{formatCurrency(totalAmount)}</span></div>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
