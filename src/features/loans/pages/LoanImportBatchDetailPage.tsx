import type { ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, FileText, Layers } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getLoanImportBatch } from "@/services/loan-import-history.service"
import { formatCurrency, formatDateTime } from "@/utils/format"

export default function LoanImportBatchDetailPage() {
  const { token = "" } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ["loan-import-history", token],
    queryFn: () => getLoanImportBatch(token),
  })

  if (isLoading) return <ProfileSkeleton cards={1} showTabs={false} />
  if (!data) return <EmptyState title="Loan import batch not found" description="This batch may have been removed." />

  const { batch, rows } = data

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={batch.originalFilename}
        description={`Balance month ${batch.balancePeriod} · Imported by ${batch.uploadedBy ?? "—"} on ${batch.committedAt ? formatDateTime(batch.committedAt) : "—"}`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Total Rows" value={String(batch.totalRows)} icon={Layers} />
        <MetricCard label="Imported" value={String(batch.createdCount)} icon={CheckCircle2} />
        <MetricCard label="Skipped" value={String(batch.skippedCount)} icon={AlertTriangle} />
        <MetricCard label="Balance Month" value={batch.balancePeriod} icon={FileText} />
      </div>

      {batch.errors.length > 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-destructive">Review Warnings</h3>
          <ul className="list-inside list-disc space-y-0.5 text-xs text-destructive/80">
            {batch.errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <FileText className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Import Row Execution Log</h3>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xs">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border/50">
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sheet / Row</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Workbook Name</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">System Member</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Loan</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Principal</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Outstanding</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.sheet} / r{row.rowNumber}</TableCell>
                  <TableCell className="font-medium text-foreground">{row.sourceName}</TableCell>
                  <TableCell className="text-xs text-foreground">
                    {row.loanId ? (
                      <Link to={`/members/${row.memberId}`} className="text-primary hover:underline">{row.memberName ?? "—"}</Link>
                    ) : (row.memberName ?? "—")}
                  </TableCell>
                  <TableCell className="text-xs text-foreground">
                    {row.loanId ? (
                      <Link to={`/loans/${row.loanId}`} className="text-primary hover:underline">{row.loanReferenceNumber ?? "View"}</Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-foreground">{formatCurrency(row.principal)}</TableCell>
                  <TableCell className="text-right text-xs text-foreground">{formatCurrency(row.principalBalance + row.interestBalance)}</TableCell>
                  <TableCell>
                    <StatusBadge label={row.status} tone={row.status === "Imported" ? "success" : "warning"} />
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={row.reason ?? undefined}>
                    {row.reason ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="p-10 text-center text-sm text-muted-foreground">
                    No rows recorded for this batch.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-2xs space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-3.5 text-muted-foreground/70" />}
      </div>
      <div className="font-heading text-xl font-bold tracking-tight text-foreground">{value}</div>
    </div>
  )
}
