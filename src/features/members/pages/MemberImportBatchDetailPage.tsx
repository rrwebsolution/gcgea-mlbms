import type { ReactNode } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { 
  Download, 
  FileSpreadsheet, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getMemberImportBatch, downloadMemberImportReport } from "@/services/member-import.service"

export default function MemberImportBatchDetailPage() {
  const { token = "" } = useParams()

  const { data: batch, isLoading } = useQuery({ 
    queryKey: ["member-imports", token], 
    queryFn: () => getMemberImportBatch(token) 
  })

  if (isLoading) return <ProfileSkeleton cards={1} showTabs={false} />
  if (!batch) return <EmptyState title="Member import batch not found" description="This batch may have been removed or expired." />

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title={batch.originalFilename}
        description={batch.selectedSheetName ? `Worksheet: ${batch.selectedSheetName}` : "Batch details and row-level processing results."}
        actions={
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => downloadMemberImportReport(batch.token, `member-import-${batch.token}.csv`)}
            className="rounded-xl h-9 text-xs gap-1.5 shadow-2xs hover:bg-accent"
          >
            <Download className="size-3.5" /> Download Import Report
          </Button>
        }
      />

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard 
          label="Batch Status" 
          value={<StatusBadge label={batch.status} tone={batch.status === "Committed" ? "success" : "neutral"} className="px-2.5 text-xs font-semibold" />} 
          icon={CheckCircle2} 
        />
        <MetricCard label="Total Rows" value={String(batch.totalRows)} icon={Layers} />
        <MetricCard label="Imported" value={String(batch.importedRows)} icon={CheckCircle2} />
        <MetricCard label="Pending Review" value={String(batch.pendingReviewRows)} icon={Clock} />
        <MetricCard label="Skipped" value={String(batch.skippedRows)} icon={AlertTriangle} />
        <MetricCard label="Legacy Drafts" value={String(batch.legacyLoanFlaggedRows)} icon={FileSpreadsheet} />
      </div>

      {/* Legacy Loan Drafts Table Section */}
      {batch.legacyLoans.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="size-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Legacy Loan Drafts — Separate Review Required</h3>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xs">
            <Table>
              <TableHeader className="bg-muted/40 border-b border-border/50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cash Pabaon</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Loan Start</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Solidarity Loan</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Term (Months)</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Monthly Amort.</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Review Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40">
                {batch.legacyLoans.map((l) => (
                  <TableRow key={l.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold text-foreground">{l.cashPabaon ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.loanStart ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">{l.solidarityAssistanceLoan ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.noOfMonths ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">{l.monthlyAmort ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge label={l.reviewStatus} tone={l.reviewStatus === "Reviewed" ? "success" : "warning"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Row-Level Import Table Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <FileText className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Import Row Execution Log</h3>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xs">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border/50">
              <TableRow>
                <TableHead className="w-16 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">#</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Member Name</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Audit Reasons / Notes</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Row Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {batch.rows.map((r) => (
                <TableRow key={r.rowNumber} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="text-center font-mono text-xs font-medium text-muted-foreground">
                    {r.rowNumber + 1}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {r.data.first_name} {r.data.last_name}
                  </TableCell>
                  <TableCell>
                    <StatusBadge label={r.category} tone={r.category === "New" ? "success" : r.category === "Invalid" ? "danger" : "warning"} />
                  </TableCell>
                  <TableCell className="max-w-md text-xs text-muted-foreground truncate">
                    {r.reasons.join("; ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    {r.rowStatus ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ 
  label, 
  value, 
  icon: Icon 
}: { 
  label: string; 
  value: ReactNode; 
  icon?: React.ComponentType<{ className?: string }> 
}) {
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