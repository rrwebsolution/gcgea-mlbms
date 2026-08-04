import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { getMonthlyDisbursementReport } from "@/services/disbursements.service"
import { formatCurrency } from "@/utils/format"
import { ReportGenerateButton } from "@/features/reports/components/ReportGenerateButton"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const currentYear = new Date().getFullYear()

function total(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0)
}

export default function MonthlyDisbursementsReportPage() {
  const [draftYear, setDraftYear] = React.useState(currentYear)
  const [year, setYear] = React.useState(currentYear)
  const query = useQuery({
    queryKey: ["reports", "monthly-disbursements", year],
    queryFn: () => getMonthlyDisbursementReport(year),
  })
  const summary = query.data?.incomeSummary
  const revenue = summary ? summary.interestIncome.map((value, index) => value + summary.serviceIncome[index]) : []
  const netIncome = summary ? revenue.map((value, index) => value - summary.expenses[index]) : []

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 print:hidden" render={<Link to="/reports" />}><ArrowLeft /> Back to Report Center</Button>
      <PageHeader title={`Monthly Disbursements ${year}`} description="Paid expenses by annual-budget account with monthly income and net-income summary." />
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm print:hidden">
        <div className="flex items-end gap-3">
          <div className="space-y-1.5"><Label>Reporting Year</Label><Input className="w-44" type="number" min={2000} max={2100} value={draftYear} onChange={(event) => setDraftYear(Number(event.target.value))} /></div>
          <ReportGenerateButton onGenerate={() => setYear(Math.min(2100, Math.max(2000, Math.trunc(draftYear))))} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Disbursements" value={formatCurrency(query.data?.grandTotal ?? 0)} icon={CalendarDays} tone="danger" isLoading={query.isLoading} />
        <StatCard label="Total Revenue" value={formatCurrency(total(revenue))} icon={CalendarDays} tone="success" isLoading={query.isLoading} />
        <StatCard label="Net Income" value={formatCurrency(total(netIncome))} icon={CalendarDays} tone={total(netIncome) >= 0 ? "primary" : "danger"} isLoading={query.isLoading} />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {query.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-9 w-full" />)}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-xs">
              <thead><tr className="border-b bg-muted/40"><th className="sticky left-0 bg-muted px-3 py-3 text-left">Particulars</th>{MONTHS.map((month) => <th key={month} className="px-3 py-3 text-right">{month} {year}</th>)}<th className="px-3 py-3 text-right">Grand Total</th></tr></thead>
              <tbody>
                {(query.data?.rows ?? []).map((row) => <tr key={row.particular} className="border-b"><td className="sticky left-0 bg-card px-3 py-2.5 font-medium">{row.particular}</td>{row.months.map((value, index) => <td key={index} className="px-3 py-2.5 text-right tabular-nums">{value ? formatCurrency(value) : "—"}</td>)}<td className="px-3 py-2.5 text-right font-semibold">{formatCurrency(row.total)}</td></tr>)}
                {(query.data?.rows.length ?? 0) === 0 && <tr><td colSpan={14} className="px-3 py-10 text-center text-muted-foreground">No paid disbursements for {year}.</td></tr>}
              </tbody>
              {query.data && <tfoot><tr className="border-t-2 bg-muted/50 font-bold"><td className="sticky left-0 bg-muted px-3 py-3">Grand Total</td>{query.data.monthlyTotals.map((value, index) => <td key={index} className="px-3 py-3 text-right">{formatCurrency(value)}</td>)}<td className="px-3 py-3 text-right">{formatCurrency(query.data.grandTotal)}</td></tr></tfoot>}
            </table>
          </div>
        )}
      </div>
      {summary && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b bg-primary/5 px-4 py-3 text-sm font-bold">Income Summary</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-xs">
              <thead><tr className="border-b bg-muted/40"><th className="px-3 py-3 text-left">Income / Expense</th>{MONTHS.map((month) => <th key={month} className="px-3 py-3 text-right">{month} {year}</th>)}<th className="px-3 py-3 text-right">Grand Total</th></tr></thead>
              <tbody>
                {[
                  ["Interest Income", summary.interestIncome],
                  ["Service Income", summary.serviceIncome],
                  ["Total Revenue", revenue],
                  ["Less: Expenses", summary.expenses],
                  ["Net Income", netIncome],
                ].map(([label, values]) => <tr key={label as string} className="border-b last:border-0"><td className="px-3 py-2.5 font-semibold">{label as string}</td>{(values as number[]).map((value, index) => <td key={index} className="px-3 py-2.5 text-right">{formatCurrency(value)}</td>)}<td className="px-3 py-2.5 text-right font-bold">{formatCurrency(total(values as number[]))}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Service Income currently reflects posted loan-payment penalties until a separate service-charge income ledger is introduced.</p>
    </div>
  )
}
