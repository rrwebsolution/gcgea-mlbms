import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Download } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getMemberImportBatch, downloadMemberImportReport } from "@/services/member-import.service"
import type { ReactNode } from "react"

export default function MemberImportBatchDetailPage() {
  const { token = "" } = useParams()

  const { data: batch, isLoading } = useQuery({ queryKey: ["member-imports", token], queryFn: () => getMemberImportBatch(token) })

  if (isLoading) return <ProfileSkeleton cards={1} showTabs={false} />
  if (!batch) return <EmptyState title="Member import batch not found" description="This batch may have been removed." />

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={batch.originalFilename}
        description={batch.selectedSheetName ? `Worksheet: ${batch.selectedSheetName}` : "Batch detail and row-level results."}
        actions={
          <Button variant="outline" size="sm" onClick={() => downloadMemberImportReport(batch.token, `member-import-${batch.token}.csv`)}>
            <Download className="size-3.5" /> Download Report
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Stat label="Status" value={<StatusBadge label={batch.status} tone={batch.status === "Committed" ? "success" : "neutral"} />} />
        <Stat label="Total Rows" value={String(batch.totalRows)} />
        <Stat label="Imported" value={String(batch.importedRows)} />
        <Stat label="Pending Review" value={String(batch.pendingReviewRows)} />
        <Stat label="Skipped" value={String(batch.skippedRows)} />
        <Stat label="Legacy Loan Drafts" value={String(batch.legacyLoanFlaggedRows)} />
      </div>

      {batch.legacyLoans.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Legacy Loan Drafts — Review Separately</h3>
          <div className="overflow-auto rounded-xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cash Pabaon</TableHead>
                  <TableHead>Loan Start</TableHead>
                  <TableHead>Solidarity Loan</TableHead>
                  <TableHead>No. of Months</TableHead>
                  <TableHead>Monthly Amort</TableHead>
                  <TableHead>Review Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batch.legacyLoans.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.cashPabaon ?? "—"}</TableCell>
                    <TableCell>{l.loanStart ?? "—"}</TableCell>
                    <TableCell>{l.solidarityAssistanceLoan ?? "—"}</TableCell>
                    <TableCell>{l.noOfMonths ?? "—"}</TableCell>
                    <TableCell>{l.monthlyAmort ?? "—"}</TableCell>
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

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Rows</h3>
        <div className="overflow-auto rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Reasons</TableHead>
                <TableHead>Row Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.rows.map((r) => (
                <TableRow key={r.rowNumber}>
                  <TableCell>{r.rowNumber + 1}</TableCell>
                  <TableCell>
                    {r.data.first_name} {r.data.last_name}
                  </TableCell>
                  <TableCell>
                    <StatusBadge label={r.category} tone={r.category === "New" ? "success" : r.category === "Invalid" ? "danger" : "warning"} />
                  </TableCell>
                  <TableCell className="max-w-xs text-xs text-muted-foreground">{r.reasons.join("; ") || "—"}</TableCell>
                  <TableCell>{r.rowStatus ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
