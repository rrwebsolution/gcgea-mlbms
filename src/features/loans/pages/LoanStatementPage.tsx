import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Landmark, Printer } from "lucide-react"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { getLoan, getLoanSchedule } from "@/services/loans.service"
import { getSettings } from "@/services/settings.service"
import { listAllUsers } from "@/services/users.service"
import { formatCurrency, formatDateShort, formatMonthYear } from "@/utils/format"

const PAYMENT_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
]

/**
 * Printable "Statement of Loan" for a released loan — mirrors the paper
 * template GCGEA has historically used (org header with logos, granted/due
 * dates, an installment-by-installment breakdown, then a principal/interest
 * balance summary and verification signature lines).
 */
export default function LoanStatementPage() {
  const { id = "" } = useParams()
  const { data: loan, isLoading } = useQuery({ queryKey: ["loans", id], queryFn: () => getLoan(id) })
  const { data: schedule = [], isLoading: isLoadingSchedule } = useQuery({
    queryKey: ["loans", id, "schedule"],
    queryFn: () => getLoanSchedule(id),
    enabled: !!id,
  })
  const { data: users = [] } = useQuery({ queryKey: ["users", "all"], queryFn: listAllUsers })
  const [fromMonth, setFromMonth] = React.useState<string>("")
  const [toMonth, setToMonth] = React.useState<string>("")
  const [paymentStatus, setPaymentStatus] = React.useState<string>("all")

  if (isLoading || isLoadingSchedule) return <ProfileSkeleton cards={2} />
  if (!loan) return <EmptyState icon={Landmark} title="Loan application not found" description="This loan application may have been removed or deleted." />

  const template = getSettings().reportTemplate
  const treasurer = users.find((u) => u.roleName === "Treasurer")

  const monthOptions = schedule.map((entry) => ({ value: String(entry.installmentNumber), label: `${entry.installmentNumber} — ${formatMonthYear(entry.dueDate)}` }))
  const fromNumber = fromMonth ? Number(fromMonth) : -Infinity
  const toNumber = toMonth ? Number(toMonth) : Infinity
  const hasInvalidRange = fromMonth !== "" && toMonth !== "" && fromNumber > toNumber

  // Table filters (range + paid/unpaid) only narrow what's *displayed* in the
  // breakdown below — the balance summary always reflects the loan's true,
  // unfiltered state so it can't be skewed by whatever the user is viewing.
  const visibleSchedule = hasInvalidRange ? [] : schedule.filter((entry) => {
    if (entry.installmentNumber < fromNumber || entry.installmentNumber > toNumber) return false
    if (paymentStatus === "paid") return entry.status === "Paid"
    if (paymentStatus === "unpaid") return entry.status !== "Paid"
    return true
  })

  const paidPrincipal = schedule.filter((entry) => entry.status === "Paid").reduce((sum, entry) => sum + entry.principal, 0)
  const paidInterest = schedule.filter((entry) => entry.status === "Paid").reduce((sum, entry) => sum + entry.interest, 0)
  const principalBalance = loan.outstandingBalance
  const interestBalance = Math.max(0, loan.totalInterest - paidInterest)

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to={`/loans/${loan.id}`} />}>
          <ArrowLeft /> Back to Loan Application
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
          <CommandSelect
            value={fromMonth}
            onValueChange={setFromMonth}
            options={[{ value: "", label: "Start" }, ...monthOptions]}
            className="w-44"
            hideSearch={monthOptions.length <= 6}
          />
          <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
          <CommandSelect
            value={toMonth}
            onValueChange={setToMonth}
            options={[{ value: "", label: "End" }, ...monthOptions]}
            className="w-44"
            hideSearch={monthOptions.length <= 6}
          />
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Status</Label>
          <CommandSelect
            value={paymentStatus}
            onValueChange={setPaymentStatus}
            options={PAYMENT_STATUS_OPTIONS}
            className="w-32"
            hideSearch
          />
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer /> Print Statement
          </Button>
        </div>
      </div>

      {hasInvalidRange && (
        <div className="print:hidden">
          <AlertBanner
            tone="danger"
            title="Invalid month range"
            description="The 'From' month must come before (or be the same as) the 'To' month. Please fix the selection to view the schedule."
          />
        </div>
      )}

      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-white text-black shadow-sm print:max-w-none print:rounded-none print:border-none print:shadow-none">
        <div className="p-8 print:p-0">
          {/* Header — same logos/org lines as every other GCGEA report */}
          <div className="grid grid-cols-[80px_1fr_80px] items-center gap-4 text-center">
            <img src={template.leftLogo} alt="" className="mx-auto size-16 object-contain" />
            <div className="leading-tight">
              <p className="text-xs">{template.countryLine}</p>
              <p className="text-base font-bold uppercase">{template.organizationLine}</p>
              <p className="text-base font-bold">{template.acronymLine}</p>
              <p className="text-xs">{template.addressLine}</p>
            </div>
            <img src={template.rightLogo} alt="" className="mx-auto size-16 object-contain" />
          </div>

          <div className="mt-4 border-t-2 border-black pt-2 text-center">
            <h2 className="text-sm font-bold uppercase tracking-wide">Statement of Loan</h2>
            <p className="text-xs font-semibold">{loan.loanTypeName}</p>
          </div>

          {/* Member / loan particulars */}
          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Name:</span>
              <span className="text-right">{loan.memberName}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Date Granted:</span>
              <span className="text-right">{formatDateShort(loan.releaseDate)}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Office Address:</span>
              <span className="text-right">{loan.officeName}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Due Date:</span>
              <span className="text-right">{formatDateShort(loan.maturityDate)}</span>
            </div>
            <div />
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Check #:</span>
              <span className="text-right">{loan.releaseReferenceNumber || "—"}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Loan Amount:</span>
              <span className="text-right">{formatCurrency(loan.principal)}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Contractual Rate (Monthly interest):</span>
              <span className="text-right">{loan.interestRate}%</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Monthly Installment:</span>
              <span className="text-right">{formatCurrency(loan.monthlyAmortization)}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">No. of Monthly Installments:</span>
              <span className="text-right">{loan.termMonths}</span>
            </div>
          </div>

          {/* Installment breakdown */}
          <table className="mt-6 w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-1.5 text-left font-bold">Period</th>
                <th className="py-1.5 text-right font-bold">Principal</th>
                <th className="py-1.5 text-right font-bold">Interest</th>
                <th className="py-1.5 text-right font-bold">Cash Flows</th>
                <th className="py-1.5 text-right font-bold">Balance</th>
                <th className="py-1.5 text-left font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300 font-semibold">
                <td className="py-1">Start of Payments</td>
                <td className="py-1 text-right">{formatCurrency(loan.principal)}</td>
                <td className="py-1 text-right">{formatCurrency(loan.totalInterest)}</td>
                <td className="py-1 text-right">—</td>
                <td className="py-1 text-right">{formatCurrency(loan.principal)}</td>
                <td className="py-1">—</td>
              </tr>
              {visibleSchedule.map((entry) => (
                <tr key={entry.installmentNumber} className="border-b border-gray-200">
                  <td className="py-1">{entry.installmentNumber}&nbsp;&nbsp;{formatMonthYear(entry.dueDate)}</td>
                  <td className="py-1 text-right">{formatCurrency(entry.principal)}</td>
                  <td className="py-1 text-right">{formatCurrency(entry.interest)}</td>
                  <td className="py-1 text-right">{formatCurrency(entry.amountDue)}</td>
                  <td className="py-1 text-right">{formatCurrency(entry.remainingBalance)}</td>
                  <td className={entry.status === "Partially Paid" || entry.status === "Overdue" ? "py-1 font-semibold text-red-700" : "py-1"}>
                    {entry.status}
                    {entry.status === "Partially Paid" && ` (${formatCurrency(entry.amountDue - entry.amountPaid)} short)`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Balance summary */}
          <table className="mt-4 w-full border-collapse text-[11px]">
            <tbody>
              <tr className="border-t-2 border-black">
                <td className="py-1 font-semibold">Principal</td>
                <td className="py-1 text-right">{formatCurrency(loan.principal)}</td>
                <td className="py-1 text-right">{formatCurrency(loan.totalInterest)}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Less: Payments</td>
                <td className="py-1 text-right">{formatCurrency(paidPrincipal)}</td>
                <td className="py-1 text-right">{formatCurrency(paidInterest)}</td>
              </tr>
              <tr className="border-t border-black font-semibold">
                <td className="py-1">Principal Balance to date</td>
                <td className="py-1 text-right">{formatCurrency(principalBalance)}</td>
                <td className="py-1 text-right">{formatCurrency(interestBalance)}</td>
              </tr>
              <tr className="font-bold">
                <td className="py-1">Loan Balance as of {formatDateShort(new Date().toISOString())}</td>
                <td className="py-1 text-right">{formatCurrency(principalBalance)}</td>
                <td className="py-1 text-right">{formatCurrency(interestBalance)}</td>
              </tr>
            </tbody>
          </table>

          {/* Signatures */}
          <div className="mt-12 grid grid-cols-2 gap-8 text-xs">
            <div>
              <p className="mb-8 font-semibold">Verified by:</p>
              <div className="w-48 border-t border-black pt-1">{loan.assignedOfficer || " "}</div>
              <p className="mt-0.5 text-[10px] text-gray-600">GCGEA Bookkeeper</p>
            </div>
            <div>
              <p className="mb-8 font-semibold">Reviewed and checked by:</p>
              <div className="w-48 border-t border-black pt-1">{treasurer?.fullName || " "}</div>
              <p className="mt-0.5 text-[10px] text-gray-600">Treasurer</p>
            </div>
          </div>

          {template.showGeneratedDate && (
            <p className="mt-6 text-[10px] text-gray-600">Generated on {formatDateShort(new Date().toISOString())}</p>
          )}
        </div>
      </div>
    </div>
  )
}
