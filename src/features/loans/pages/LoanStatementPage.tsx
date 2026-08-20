import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Landmark, Printer } from "lucide-react"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { getLoan, getLoanSchedule } from "@/services/loans.service"
import { getSettings } from "@/services/settings.service"
import { listAllUsers } from "@/services/users.service"
import { formatCurrency, formatDateShort, formatMonthYear } from "@/utils/format"
import { LOAN_STATUS_TONE } from "@/constants/status"

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
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Screen Toolbar (Hidden in Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs backdrop-blur-xs print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-95"
            render={<Link to={`/loans/${loan.id}`} />}
          >
            <ArrowLeft className="size-3.5" /> Back to Loan Application
          </Button>
          <StatusBadge label={loan.status} tone={LOAN_STATUS_TONE[loan.status]} />
        </div>
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
          <Button
            onClick={() => window.print()}
            className="h-9 gap-2 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 transition-all"
          >
            <Printer className="size-3.5" /> Print Statement
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

      {/* Official Statement Canvas */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-white text-black shadow-xl ring-1 ring-black/5 print:max-w-none print:rounded-none print:border-none print:shadow-none print:ring-0">
        <div className="p-8 sm:p-10 print:p-0">
          {/* Header */}
          <div className="grid grid-cols-[80px_1fr_80px] items-center gap-4 text-center">
            <img src={template.leftLogo} alt="" className="mx-auto size-16 object-contain" />
            <div className="leading-tight space-y-0.5">
              <p className="text-[11px] font-medium tracking-wide text-gray-700">{template.countryLine}</p>
              <p className="font-heading text-sm font-bold uppercase tracking-wider text-black">
                {template.organizationLine}
              </p>
              <p className="font-heading text-sm font-bold text-black">{template.acronymLine}</p>
              <p className="text-[11px] text-gray-600">{template.addressLine}</p>
            </div>
            <img src={template.rightLogo} alt="" className="mx-auto size-16 object-contain" />
          </div>

          {/* Title Ribbon */}
          <div className="mt-5 border-t-2 border-b border-black py-2 text-center">
            <h2 className="font-heading text-base font-bold uppercase tracking-widest text-black">
              Statement of Loan
            </h2>
            <p className="text-xs font-semibold text-gray-800">{loan.loanTypeName}</p>
          </div>

          {/* Member / loan particulars */}
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Name:</span>
              <span className="font-bold text-black text-right">{loan.memberName}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Date Granted:</span>
              <span className="font-mono font-medium text-black text-right">{formatDateShort(loan.releaseDate)}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Office Address:</span>
              <span className="font-medium text-black text-right">{loan.officeName}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Due Date:</span>
              <span className="font-mono font-medium text-black text-right">{formatDateShort(loan.maturityDate)}</span>
            </div>
            <div />
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Check #:</span>
              <span className="font-mono font-semibold text-black text-right">{loan.releaseReferenceNumber || "—"}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Loan Amount:</span>
              <span className="font-mono font-bold text-black text-right">{formatCurrency(loan.principal)}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Contractual Rate (Monthly interest):</span>
              <span className="font-mono font-semibold text-black text-right">{loan.interestRate}%</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Monthly Installment:</span>
              <span className="font-mono font-semibold text-black text-right">{formatCurrency(loan.monthlyAmortization)}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">No. of Monthly Installments:</span>
              <span className="font-mono font-semibold text-black text-right">{loan.termMonths}</span>
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
          <div className="mt-12 grid grid-cols-2 gap-x-12 gap-y-10 text-xs">
            <div>
              <p className="mb-8 font-bold text-gray-700">Verified by:</p>
              <div className="border-t border-black pt-1 font-bold text-black">{loan.assignedOfficer || "—"}</div>
              <p className="text-[10px] text-gray-600">GCGEA Bookkeeper</p>
            </div>
            <div>
              <p className="mb-8 font-bold text-gray-700">Reviewed and checked by:</p>
              <div className="border-t border-black pt-1 font-bold text-black">{treasurer?.fullName || "—"}</div>
              <p className="text-[10px] text-gray-600">Treasurer</p>
            </div>
          </div>

          {template.showGeneratedDate && (
            <div className="mt-10 border-t border-gray-200 pt-3 text-[10px] text-gray-500 flex justify-between">
              <span>GCGEA Automated Financial Management System</span>
              <span>Generated on {formatDateShort(new Date().toISOString())}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
