import * as React from "react"
import { format, parseISO } from "date-fns"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, CalendarDays, Download, Landmark, Loader2, ReceiptText } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { StatCard } from "@/components/shared/StatCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getRemittanceBreakdown,
  type RemittanceBreakdownRow,
  type RemittanceBreakdownTotals,
} from "@/services/remittance-reports.service"
import { downloadCsv } from "@/utils/csv"
import { formatCurrency } from "@/utils/format"

const currentYear = new Date().getFullYear()

function periodLabel(row: RemittanceBreakdownRow): string {
  if (row.kind === "otc") return "OTC"
  try {
    return format(parseISO(`${row.period}-01`), "MMM-yy")
  } catch {
    return row.period
  }
}

function amount(value: number) {
  return (
    <span className={value === 0 ? "text-muted-foreground/60" : "font-medium tabular-nums"}>
      {formatCurrency(value)}
    </span>
  )
}

const totalFields: Array<keyof RemittanceBreakdownTotals> = [
  "principal",
  "interest",
  "serviceIncome",
  "monthlyDues",
  "cashPabaon",
  "total",
]

export default function RemittanceBreakdownReportPage() {
  const [draftYear, setDraftYear] = React.useState(currentYear)
  const [year, setYear] = React.useState(currentYear)
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["reports", "remittance-breakdown", year],
    queryFn: () => getRemittanceBreakdown(year),
  })

  const visibleRows = React.useMemo(
    () => data?.rows.filter((row) => row.kind === "otc" || row.total > 0) ?? [],
    [data]
  )

  function generate() {
    const normalized = Math.min(2100, Math.max(2000, Math.trunc(draftYear)))
    setDraftYear(normalized)
    setYear(normalized)
  }

  function exportCsv() {
    if (!data) return
    downloadCsv(
      `remittance-breakdown-${data.year}.csv`,
      ["Month", "Principal", "Interest", "Service Income", "Monthly Dues", "Cash Pabaon", "Total"],
      [
        ...visibleRows.map((row) => [
          periodLabel(row),
          row.principal.toFixed(2),
          row.interest.toFixed(2),
          row.serviceIncome.toFixed(2),
          row.monthlyDues.toFixed(2),
          row.cashPabaon.toFixed(2),
          row.total.toFixed(2),
        ]),
        ["TOTAL", ...totalFields.map((field) => data.totals[field].toFixed(2))],
      ]
    )
    toast.success("Remittance breakdown exported to CSV.")
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader
        title="Remittance Breakdown"
        description="Monthly GCGEA remittances split into loan principal, interest, service income, Monthly Dues, Cash Pabaon, and OTC collections."
      />

      <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs backdrop-blur-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full space-y-1.5 sm:max-w-52">
            <Label htmlFor="remittance-year">Reporting Year</Label>
            <Input
              id="remittance-year"
              type="number"
              min={2000}
              max={2100}
              value={draftYear}
              onChange={(event) => setDraftYear(Number(event.target.value))}
              onKeyDown={(event) => {
                if (event.key === "Enter") generate()
              }}
            />
          </div>
          <Button size="sm" onClick={generate} disabled={isFetching}>
            {isFetching ? <Loader2 className="animate-spin" /> : <CalendarDays />} {isFetching ? "Generating…" : "Generate"}
          </Button>
          <PermissionButton permission="reports.export" size="sm" variant="outline" disabled={!data || isFetching} onClick={exportCsv}>
            <Download /> Export CSV
          </PermissionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Remittances" value={formatCurrency(data?.totals.total ?? 0)} icon={ReceiptText} tone="success" isLoading={isLoading} />
        <StatCard label="Loan Collections" value={formatCurrency((data?.totals.principal ?? 0) + (data?.totals.interest ?? 0))} icon={Landmark} tone="primary" isLoading={isLoading} />
        <StatCard label="Current Loan Receivables" value={formatCurrency(data?.loanReceivables ?? 0)} icon={Landmark} tone="gold" isLoading={isLoading} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
        <div className="border-b border-border bg-primary/5 px-4 py-3">
          <h2 className="font-heading text-sm font-bold text-foreground">GCGEA Summary {year}</h2>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-primary">Remittances Breakdown</p>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-semibold">Month</th>
                  <th className="px-4 py-3 text-right font-semibold">Principal</th>
                  <th className="px-4 py-3 text-right font-semibold">Interest</th>
                  <th className="px-4 py-3 text-right font-semibold">Service Income</th>
                  <th className="px-4 py-3 text-right font-semibold">Monthly Dues</th>
                  <th className="px-4 py-3 text-right font-semibold">Cash Pabaon</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.period} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-semibold">{periodLabel(row)}</td>
                    <td className="px-4 py-3 text-right">{amount(row.principal)}</td>
                    <td className="px-4 py-3 text-right">{amount(row.interest)}</td>
                    <td className="px-4 py-3 text-right">{amount(row.serviceIncome)}</td>
                    <td className="px-4 py-3 text-right">{amount(row.monthlyDues)}</td>
                    <td className="px-4 py-3 text-right">{amount(row.cashPabaon)}</td>
                    <td className="px-4 py-3 text-right">{amount(row.total)}</td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No posted remittances found for {year}.
                    </td>
                  </tr>
                )}
              </tbody>
              {data && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/50 font-bold">
                    <td className="px-4 py-3">TOTAL</td>
                    {totalFields.map((field) => (
                      <td key={field} className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.totals[field])}</td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {data && (
        <p className="text-xs text-muted-foreground">
          Loan receivables are the current outstanding balances as of {format(parseISO(data.asOfDate), "MMMM d, yyyy")}. Service income reflects posted loan-payment penalties.
        </p>
      )}
    </div>
  )
}
