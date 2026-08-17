import type { ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Download,
  FileSpreadsheet,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ArrowLeft,
  User,
} from "lucide-react"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getMemberImportBatch, downloadMemberImportReport } from "@/services/member-import.service"
import { cn } from "@/lib/utils"

export default function MemberImportBatchDetailPage() {
  const { token = "" } = useParams()

  const { data: batch, isLoading } = useQuery({
    queryKey: ["member-imports", token],
    queryFn: () => getMemberImportBatch(token),
  })

  if (isLoading) return <ProfileSkeleton cards={1} showTabs={false} />
  if (!batch) {
    return (
      <EmptyState
        title="Member import batch not found"
        description="This batch may have been removed, undone, or expired."
      />
    )
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Back navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground active:scale-95"
          render={<Link to="/members/import-history" />}
        >
          <ArrowLeft className="size-3.5" /> Back to Import History
        </Button>
      </div>

      {/* Page Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 shadow-xs backdrop-blur-xs">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <FileSpreadsheet className="size-7" strokeWidth={2.2} />
            </div>
            <div className="space-y-1">
              <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {batch.originalFilename}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono text-[11px] rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground/80">
                  Sheet: {batch.selectedSheetName || "Default"}
                </span>
                <span>·</span>
                <span className="font-mono text-[11px]">Token: {batch.token.slice(0, 12)}…</span>
                {batch.uploadedBy && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <User className="size-3" /> {batch.uploadedBy}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() =>
              downloadMemberImportReport(batch.token, `member-import-${batch.token}.csv`)
            }
            className="h-9 gap-2 rounded-xl px-4 text-xs font-semibold shadow-2xs hover:bg-muted active:scale-95 transition-all"
          >
            <Download className="size-3.5" /> Download Execution Report
          </Button>
        </div>

        {/* KPI Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 border-t border-border/50 pt-6">
          <MetricCard
            label="Batch Status"
            value={
              <StatusBadge
                label={batch.status}
                tone={batch.status === "Committed" ? "success" : "neutral"}
              />
            }
            icon={CheckCircle2}
          />
          <MetricCard label="Total Rows" value={String(batch.totalRows)} icon={Layers} />
          <MetricCard
            label="Imported"
            value={String(batch.importedRows)}
            icon={CheckCircle2}
            tone="success"
          />
          <MetricCard
            label="Pending Review"
            value={String(batch.pendingReviewRows)}
            icon={Clock}
            tone={batch.pendingReviewRows > 0 ? "warning" : undefined}
          />
          <MetricCard
            label="Skipped"
            value={String(batch.skippedRows)}
            icon={AlertTriangle}
            tone={batch.skippedRows > 0 ? "danger" : undefined}
          />
          <MetricCard
            label="Legacy Drafts"
            value={String(batch.legacyLoanFlaggedRows)}
            icon={FileSpreadsheet}
          />
        </div>
      </div>

      {/* Legacy Loan Drafts Table */}
      {batch.legacyLoans.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">
                Legacy Loan Drafts Staged for Review
              </h3>
            </div>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
              {batch.legacyLoans.length} draft(s)
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
            <Table>
              <TableHeader className="border-b border-border/50 bg-muted/20">
                <TableRow>
                  <TableHead className="pl-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Cash Pabaon
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Loan Start
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Solidarity Loan
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Term (Months)
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Monthly Amort.
                  </TableHead>
                  <TableHead className="pr-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Review Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/30">
                {batch.legacyLoans.map((l) => (
                  <TableRow key={l.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="pl-5 font-mono text-xs font-semibold text-foreground">
                      {l.cashPabaon ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.loanStart ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {l.solidarityAssistanceLoan ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{l.noOfMonths ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {l.monthlyAmort ?? "—"}
                    </TableCell>
                    <TableCell className="pr-5">
                      <StatusBadge
                        label={l.reviewStatus}
                        tone={l.reviewStatus === "Reviewed" ? "success" : "warning"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Row-Level Import Log Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">
              Row Execution Audit Log
            </h3>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
            {batch.rows.length} total entries
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
          <Table>
            <TableHeader className="border-b border-border/50 bg-muted/20">
              <TableRow>
                <TableHead className="w-16 pl-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Row
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Member Name
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Validation Category
                </TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Audit Notes / Reasons
                </TableHead>
                <TableHead className="pr-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Execution Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/30">
              {batch.rows.map((r) => (
                <TableRow key={r.rowNumber} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="pl-5 font-mono text-xs font-semibold text-muted-foreground">
                    #{r.rowNumber + 1}
                  </TableCell>
                  <TableCell className="font-heading font-semibold text-foreground text-xs">
                    {r.data.first_name} {r.data.last_name}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={r.category}
                      tone={
                        r.category === "New"
                          ? "success"
                          : r.category === "Invalid"
                            ? "danger"
                            : "warning"
                      }
                    />
                  </TableCell>
                  <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                    {r.reasons.join("; ") || "—"}
                  </TableCell>
                  <TableCell className="pr-5 font-mono text-xs font-medium text-foreground">
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
  icon: Icon,
  tone,
}: {
  label: string
  value: ReactNode
  icon?: React.ComponentType<{ className?: string }>
  tone?: "success" | "warning" | "danger"
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/90 p-3.5 shadow-2xs backdrop-blur-xs space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</p>
        {Icon && <Icon className="size-3.5 text-muted-foreground/60" />}
      </div>
      <div
        className={cn(
          "font-heading text-lg font-bold tracking-tight",
          tone === "success"
            ? "text-emerald-600 dark:text-emerald-400 font-mono"
            : tone === "warning"
              ? "text-amber-600 dark:text-amber-400 font-mono"
              : tone === "danger"
                ? "text-destructive font-mono"
                : "text-foreground font-mono"
        )}
      >
        {value}
      </div>
    </div>
  )
}