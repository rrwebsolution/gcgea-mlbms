import * as React from "react"
import { useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Download, RotateCcw } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { ReasonDialog } from "@/components/shared/ReasonDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getPayrollImportBatch, rollbackPayrollImportBatch, downloadPayrollImportReport } from "@/services/payroll-import.service"
import { formatCurrency } from "@/utils/format"

export default function PayrollImportBatchDetailPage() {
  const { token = "" } = useParams()
  const queryClient = useQueryClient()
  const [showRollback, setShowRollback] = React.useState(false)
  const [isRollingBack, setIsRollingBack] = React.useState(false)

  const { data: batch, isLoading } = useQuery({ queryKey: ["payroll-imports", token], queryFn: () => getPayrollImportBatch(token) })

  async function handleRollback(reason: string) {
    setIsRollingBack(true)
    try {
      await rollbackPayrollImportBatch(token, reason)
      await queryClient.invalidateQueries({ queryKey: ["payroll-imports", token] })
      toast.success("Payroll import batch rolled back.")
      setShowRollback(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to roll back this batch.")
    } finally {
      setIsRollingBack(false)
    }
  }

  if (isLoading) return <ProfileSkeleton cards={1} showTabs={false} />
  if (!batch) return <EmptyState title="Payroll import batch not found" description="This batch may have been removed." />

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={`Payroll Import — ${batch.payrollPeriod}`}
        description={batch.payrollReference ? `Reference: ${batch.payrollReference}` : "Batch detail and row-level results."}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadPayrollImportReport(batch.token, `payroll-import-${batch.payrollPeriod}.csv`)}>
              <Download className="size-3.5" /> Download Report
            </Button>
            {batch.status === "Committed" && (
              <PermissionButton permission="payroll.import.rollback" variant="destructive" size="sm" onClick={() => setShowRollback(true)}>
                <RotateCcw className="size-3.5" /> Rollback
              </PermissionButton>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Stat label="Status" value={<StatusBadge label={batch.status} tone={batch.status === "Committed" ? "success" : batch.status === "RolledBack" ? "warning" : "neutral"} />} />
        <Stat label="Total Rows" value={String(batch.totalRows)} />
        <Stat label="Imported Rows" value={String(batch.importedRows)} />
        <Stat label="Loan Payments" value={String(batch.loanPaymentsImported)} />
        <Stat label="Contributions" value={String(batch.contributionsCreated)} />
        <Stat label="Pabaon Records" value={String(batch.deductionsCreated)} />
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
        Total Payroll Deduction: <strong className="text-foreground">{formatCurrency(batch.totalPayrollDeduction)}</strong>
        {batch.committedBy && (
          <span className="ml-3 text-muted-foreground">
            Committed by {batch.committedBy} on {batch.committedAt ? new Date(batch.committedAt).toLocaleString() : ""}
          </span>
        )}
        {batch.status === "RolledBack" && (
          <p className="mt-1 text-warning">
            Rolled back by {batch.rolledBackBy} on {batch.rolledBackAt ? new Date(batch.rolledBackAt).toLocaleString() : ""}
            {batch.rollbackReason ? ` — ${batch.rollbackReason}` : ""}
          </p>
        )}
      </div>

      <div className="overflow-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Row</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Loan Status</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Reasons</TableHead>
              <TableHead>Row Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batch.rows.map((r) => (
              <TableRow key={r.rowNumber}>
                <TableCell>{r.rowNumber + 1}</TableCell>
                <TableCell>{r.memberName || String(r.data.name ?? "—")}</TableCell>
                <TableCell className="text-muted-foreground">{String(r.data.loan_remarks ?? "—")}</TableCell>
                <TableCell>
                  <StatusBadge label={r.category} tone={r.category === "Valid" ? "success" : r.category === "Warning" ? "warning" : "danger"} />
                </TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">{r.reasons.join("; ") || "—"}</TableCell>
                <TableCell>{r.rowStatus ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ReasonDialog
        open={showRollback}
        onOpenChange={setShowRollback}
        title={`Rollback payroll import for ${batch.payrollPeriod}?`}
        description="This reverses every loan payment, contribution, and Pabaon deduction this batch created — but only if none of them have changed since."
        reasonLabel="Rollback Reason"
        confirmLabel="Rollback Import"
        destructive
        isLoading={isRollingBack}
        onConfirm={handleRollback}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
