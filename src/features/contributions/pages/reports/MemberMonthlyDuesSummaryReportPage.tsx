import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft, Download, RotateCcw } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { MemberSearchSelect } from "@/components/shared/MemberSearchSelect"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listAllContributions } from "@/services/contributions.service"
import { getMember } from "@/services/members.service"
import { downloadCsv } from "@/utils/csv"
import { formatCurrency } from "@/utils/format"
import type { Contribution, ContributionFundAllocation } from "@/types"
import { ReportGenerateButton } from "@/features/reports/components/ReportGenerateButton"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

interface SummaryRow {
  key: string
  label: string
  allocations: Record<string, number>
  total: number
}

function allocationMap(contributions: Contribution[]): Record<string, number> {
  return contributions
    .flatMap((contribution) => contribution.fundAllocations ?? [])
    .reduce<Record<string, number>>((totals, allocation) => {
      totals[allocation.fundId] = (totals[allocation.fundId] ?? 0) + allocation.allocatedAmount
      return totals
    }, {})
}

function makeRow(key: string, label: string, contributions: Contribution[]): SummaryRow {
  return {
    key,
    label,
    allocations: allocationMap(contributions),
    total: contributions.reduce((sum, contribution) => sum + contribution.amount, 0),
  }
}

function amountOrDash(value: number): string {
  return value === 0 ? "—" : formatCurrency(value)
}

function isContributionPeriodInYear(period: string, year: number): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(period.trim())
  if (!match) return false
  const periodYear = Number(match[1])
  const periodMonth = Number(match[2])
  return periodYear === year && periodMonth >= 1 && periodMonth <= 12
}

export default function MemberMonthlyDuesSummaryReportPage() {
  const currentYear = new Date().getFullYear()
  const [draftScope, setDraftScope] = React.useState<"member" | "overall">("overall")
  const [draftMemberId, setDraftMemberId] = React.useState("")
  const [draftYear, setDraftYear] = React.useState(currentYear)
  const [applied, setApplied] = React.useState<{ scope: "member" | "overall"; memberId?: string; year: number } | null>({ scope: "overall", year: currentYear })

  const { data: allContributions = [], isLoading } = useQuery({
    queryKey: ["contributions", "all"],
    queryFn: listAllContributions,
  })
  const { data: member } = useQuery({
    queryKey: ["members", applied?.memberId],
    queryFn: () => getMember(applied!.memberId!),
    enabled: applied?.scope === "member" && !!applied.memberId,
  })

  const yearContributions = React.useMemo(() => {
    if (!applied) return []
    return allContributions.filter((contribution) =>
      (applied.scope === "overall" || contribution.memberId === applied.memberId)
      && contribution.contributionType === "Monthly Dues"
      && contribution.status === "Posted"
      && isContributionPeriodInYear(contribution.contributionPeriod, applied.year)
    )
  }, [allContributions, applied])

  const funds = React.useMemo(() => {
    const allocations = yearContributions.flatMap((contribution) => contribution.fundAllocations ?? [])
    return Array.from(
      new Map(allocations.map((allocation) => [allocation.fundId, allocation])).values()
    )
  }, [yearContributions])

  const monthlyRows = React.useMemo(() => MONTHS.map((month, index) => {
    const period = `${applied?.year}-${String(index + 1).padStart(2, "0")}`
    return makeRow(
      period,
      `${month}-${String(applied?.year ?? currentYear).slice(-2)}`,
      yearContributions.filter((contribution) =>
        contribution.contributionPeriod === period
        && contribution.paymentMethod === "Payroll Deduction"
      )
    )
  }), [applied?.year, currentYear, yearContributions])

  const otcRow = React.useMemo(() => makeRow(
    "otc",
    "OTC",
    yearContributions.filter((contribution) => contribution.paymentMethod !== "Payroll Deduction")
  ), [yearContributions])
  const rows = [...monthlyRows, otcRow]
  const fundTotals = allocationMap(yearContributions)
  const grandTotal = yearContributions.reduce((sum, contribution) => sum + contribution.amount, 0)
  const allocationRates = React.useMemo(() => {
    const first = yearContributions.find((contribution) => contribution.fundAllocations?.length)
    return new Map((first?.fundAllocations ?? []).map((allocation) => [allocation.fundId, allocation.allocatedAmount]))
  }, [yearContributions])

  function handleGenerate() {
    if (draftScope === "member" && !draftMemberId) return
    setApplied({
      scope: draftScope,
      memberId: draftScope === "member" ? draftMemberId : undefined,
      year: draftYear,
    })
  }

  function handleReset() {
    setDraftScope("overall")
    setDraftMemberId("")
    setDraftYear(currentYear)
    setApplied({ scope: "overall", year: currentYear })
  }

  function handleExportCsv() {
    if (!applied) return
    downloadCsv(
      `monthly-dues-summary-${applied.scope === "overall" ? "overall" : member?.memberNumber ?? applied.memberId}-${applied.year}.csv`,
      ["Period / Months", ...funds.map((fund) => fund.fundName), "Total"],
      [
        ...rows.map((row) => [
          row.label,
          ...funds.map((fund) => (row.allocations[fund.fundId] ?? 0).toFixed(2)),
          row.total.toFixed(2),
        ]),
        ["TOTAL", ...funds.map((fund) => (fundTotals[fund.fundId] ?? 0).toFixed(2)), grandTotal.toFixed(2)],
      ]
    )
    toast.success("Member Monthly Dues Summary exported to CSV.")
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>
      <PageHeader
        title="Summary of GCGEA Monthly Dues Deduction"
        description="Generate a per-member or overall annual breakdown of Monthly Dues across all configured funds."
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm print:hidden">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[12rem_1fr_10rem]">
          <div className="space-y-1.5">
            <Label>Report Scope</Label>
            <CommandSelect
              value={draftScope}
              onValueChange={(value) => setDraftScope(value as "member" | "overall")}
              options={[
                { value: "member", label: "Per Member" },
                { value: "overall", label: "Overall" },
              ]}
              hideSearch
            />
          </div>
          {draftScope === "member" ? (
            <div className="space-y-1.5">
              <Label>Member</Label>
              <MemberSearchSelect value={draftMemberId || undefined} onSelect={setDraftMemberId} placeholder="Search by name or member number…" />
            </div>
          ) : (
            <div className="flex items-end">
              <div className="flex h-10 w-full items-center rounded-md border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
                Includes all members with posted Monthly Dues.
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="dues-summary-year">Year</Label>
            <Input id="dues-summary-year" type="number" min={2000} max={2100} value={draftYear} onChange={(event) => setDraftYear(Number(event.target.value))} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ReportGenerateButton onGenerate={handleGenerate} disabled={draftScope === "member" && !draftMemberId} />
          <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw /> Reset</Button>
          <PermissionButton permission="contributions.export" size="sm" variant="outline" disabled={!applied} onClick={handleExportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      {!applied ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">Select a member and year, then click <strong className="text-foreground">Generate</strong>.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-heading text-base font-bold uppercase">Summary of GCGEA Monthly Dues Deduction</h2>
            <p className="mt-1 text-sm font-semibold">
              {applied.scope === "overall" ? "Overall Member Summary" : member?.fullName ?? "Loading member…"}
            </p>
            <p className="text-xs text-muted-foreground">
              {applied.scope === "overall"
                ? `All members · Calendar Year ${applied.year}`
                : `${member?.memberNumber ?? ""} · ${member?.officeName ?? ""} · Calendar Year ${applied.year}`}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-32 font-bold">Period / Months</TableHead>
                {funds.map((fund) => <TableHead key={fund.fundId} className="min-w-32 text-right font-bold">{fund.fundName}</TableHead>)}
                <TableHead className="min-w-32 text-right font-bold">Total</TableHead>
              </TableRow>
              {funds.length > 0 && (
                <TableRow className="bg-muted/20">
                  <TableHead>Allocation / Month</TableHead>
                  {funds.map((fund) => <TableHead key={fund.fundId} className="text-right">{formatCurrency(allocationRates.get(fund.fundId) ?? 0)}</TableHead>)}
                  <TableHead className="text-right">{formatCurrency(Array.from(allocationRates.values()).reduce((sum, amount) => sum + amount, 0))}</TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key} className={row.key === "otc" ? "bg-muted/20 font-semibold" : undefined}>
                  <TableCell className="font-semibold">{row.label}</TableCell>
                  {funds.map((fund) => <TableCell key={fund.fundId} className="text-right tabular-nums">{amountOrDash(row.allocations[fund.fundId] ?? 0)}</TableCell>)}
                  <TableCell className="text-right font-semibold tabular-nums">{amountOrDash(row.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">TOTAL</TableCell>
                {funds.map((fund) => <TableCell key={fund.fundId} className="text-right font-bold tabular-nums">{formatCurrency(fundTotals[fund.fundId] ?? 0)}</TableCell>)}
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(grandTotal)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          {!isLoading && yearContributions.length === 0 && (
            <p className="border-t border-border p-5 text-center text-sm text-muted-foreground">
              No posted Monthly Dues found for the selected {applied.scope === "overall" ? "year" : "member and year"}.
            </p>
          )}
          {funds.length > 0 && (
            <div className="grid gap-2 border-t border-border bg-muted/10 p-5 sm:grid-cols-2">
              {funds.map((fund: ContributionFundAllocation) => (
                <div key={fund.fundId} className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{fund.fundName}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(fundTotals[fund.fundId] ?? 0)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 border-t border-border pt-2 text-sm font-bold sm:col-span-2">
                <span>GRAND TOTAL</span>
                <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
