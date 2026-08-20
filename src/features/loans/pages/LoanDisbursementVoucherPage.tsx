import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Landmark, Printer } from "lucide-react"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { getLoan, getLoanApprovalHistory } from "@/services/loans.service"
import { getSettings } from "@/services/settings.service"
import { listAllUsers } from "@/services/users.service"
import { formatCurrency, formatDateShort, amountInWords } from "@/utils/format"
import { LOAN_STATUS_TONE } from "@/constants/status"

const RELEASED_STATUSES = ["Released", "Active", "Overdue", "Restructured", "Fully Paid"]

/**
 * Printable Disbursement Voucher for a released loan — mirrors the paper DV
 * format (org header, payee/particulars, amount breakdown, signatories) so
 * the Treasurer has an official document to file alongside the release.
 */
export default function LoanDisbursementVoucherPage() {
  const { id = "" } = useParams()
  const { data: loan, isLoading } = useQuery({ queryKey: ["loans", id], queryFn: () => getLoan(id) })
  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["loans", id, "history"],
    queryFn: () => getLoanApprovalHistory(id),
    enabled: !!id,
  })
  const { data: users = [] } = useQuery({ queryKey: ["users", "all"], queryFn: listAllUsers })

  if (isLoading || isLoadingHistory) return <ProfileSkeleton cards={2} />
  if (!loan) {
    return (
      <EmptyState
        icon={Landmark}
        title="Loan application not found"
        description="This loan application may have been removed or deleted."
      />
    )
  }
  if (!RELEASED_STATUSES.includes(loan.status)) {
    return (
      <EmptyState
        icon={Landmark}
        title="Not yet released"
        description="A Disbursement Voucher is only available once this loan has been released. Process the release first."
      />
    )
  }

  const template = getSettings().reportTemplate
  const approvedBy = history.find((h) => h.action.toLowerCase().includes("approve"))?.performedBy
  const releasedByEntry = history.find((h) => h.action.toLowerCase().includes("release"))
  const releasedBy = releasedByEntry?.performedBy ?? users.find((u) => u.roleName === "Treasurer")?.fullName

  const serviceCharge = Math.max(0, loan.principal - loan.processingFee - loan.netProceeds)
  const releasedAmount = loan.actualReleasedAmount ?? loan.netProceeds

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Screen Action Bar (Hidden in Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
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

        <Button
          onClick={() => window.print()}
          className="h-9 gap-2 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 transition-all"
        >
          <Printer className="size-3.5" /> Print Disbursement Voucher
        </Button>
      </div>

      {/* Official Voucher Canvas */}
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
              Disbursement Voucher
            </h2>
            <p className="text-xs font-semibold text-gray-800">{loan.loanTypeName}</p>
          </div>

          {/* DV Metadata Grid */}
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">DV Reference No.:</span>
              <span className="font-mono font-bold text-black text-right">
                {loan.releaseReferenceNumber || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Date of Release:</span>
              <span className="font-mono font-medium text-black text-right">
                {formatDateShort(loan.releaseDate)}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Payee Name:</span>
              <span className="font-bold text-black text-right">{loan.memberName}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Member ID:</span>
              <span className="font-mono font-semibold text-black text-right">{loan.memberNumber}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Office / Agency:</span>
              <span className="font-medium text-black text-right">{loan.officeName}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Loan Application #:</span>
              <span className="font-mono font-semibold text-black text-right">
                {loan.applicationNumber}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Mode of Payment:</span>
              <span className="font-semibold text-black text-right">{loan.releaseMethod || "—"}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 pb-1">
              <span className="font-bold text-gray-700">Check / Ref No.:</span>
              <span className="font-mono font-semibold text-black text-right">
                {loan.releaseReferenceNumber || "—"}
              </span>
            </div>
          </div>

          {/* Particulars Section */}
          <div className="mt-5 text-xs">
            <p className="font-bold text-gray-700 mb-1">Particulars &amp; Purpose:</p>
            <p className="border-b border-dotted border-gray-400 pb-2 leading-relaxed text-black">
              Release of loan proceeds for {loan.loanTypeName} (Application #{loan.applicationNumber}) for the
              account of <strong className="font-bold">{loan.memberName}</strong>.
            </p>
            {loan.releaseRemarks && (
              <p className="mt-1.5 text-[11px] text-gray-600 italic">
                Special Remarks: {loan.releaseRemarks}
              </p>
            )}
          </div>

          {/* Accounting Breakdown Ledger */}
          <div className="mt-6">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="py-2 text-left font-bold uppercase tracking-wider text-[11px]">
                    Accounting Particulars
                  </th>
                  <th className="py-2 text-right font-bold uppercase tracking-wider text-[11px]">
                    Amount (PHP)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                <tr>
                  <td className="py-2 font-sans text-gray-800">Gross Approved Principal Amount</td>
                  <td className="py-2 text-right font-bold text-black">{formatCurrency(loan.principal)}</td>
                </tr>
                <tr>
                  <td className="py-2 font-sans text-gray-700">Less: Administrative Processing Fee</td>
                  <td className="py-2 text-right text-gray-800">− {formatCurrency(loan.processingFee)}</td>
                </tr>
                {serviceCharge > 0 && (
                  <tr>
                    <td className="py-2 font-sans text-gray-700">Less: Association Service Charge</td>
                    <td className="py-2 text-right text-gray-800">− {formatCurrency(serviceCharge)}</td>
                  </tr>
                )}
                {(loan.previousObligationAmount ?? 0) > 0 && (
                  <tr>
                    <td className="py-2 font-sans text-gray-700">
                      Less: Prior Loan Obligation Settle Deduction
                    </td>
                    <td className="py-2 text-right text-gray-800">
                      − {formatCurrency(loan.previousObligationAmount ?? 0)}
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-b-2 border-black font-bold">
                  <td className="py-2.5 font-sans font-bold text-black text-sm">
                    NET DISBURSEMENT PROCEEDS
                  </td>
                  <td className="py-2.5 text-right font-bold text-black text-sm">
                    {formatCurrency(releasedAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="mt-4 rounded-xl border border-gray-300 bg-gray-50/80 p-3 text-xs">
            <span className="font-bold text-gray-700">Amount in Words: </span>
            <span className="font-bold text-black uppercase tracking-wide">
              {amountInWords(releasedAmount)}
            </span>
          </div>

          {/* Signatures Matrix */}
          <div className="mt-12 grid grid-cols-2 gap-x-12 gap-y-10 text-xs">
            <div>
              <p className="mb-8 font-bold text-gray-700">Prepared by:</p>
              <div className="border-t border-black pt-1 font-bold text-black">
                {loan.assignedOfficer || "—"}
              </div>
              <p className="text-[10px] text-gray-600">Loan Officer</p>
            </div>

            <div>
              <p className="mb-8 font-bold text-gray-700">Approved by:</p>
              <div className="border-t border-black pt-1 font-bold text-black">{approvedBy || "—"}</div>
              <p className="text-[10px] text-gray-600">Approving Officer</p>
            </div>

            <div>
              <p className="mb-8 font-bold text-gray-700">Disbursed by:</p>
              <div className="border-t border-black pt-1 font-bold text-black">{releasedBy || "—"}</div>
              <p className="text-[10px] text-gray-600">Association Treasurer</p>
            </div>

            <div>
              <p className="mb-8 font-bold text-gray-700">Received by (Payee):</p>
              <div className="border-t border-black pt-1 font-bold text-black">{loan.memberName}</div>
              <p className="text-[10px] text-gray-600">
                Signature over Printed Name · Date of Receipt
              </p>
            </div>
          </div>

          {/* Footer Metadata */}
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