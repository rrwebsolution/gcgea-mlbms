import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Landmark, Printer } from "lucide-react"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { getLoan, getLoanApprovalHistory } from "@/services/loans.service"
import { getSettings } from "@/services/settings.service"
import { listAllUsers } from "@/services/users.service"
import { formatCurrency, formatDateShort, amountInWords } from "@/utils/format"

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
    return <EmptyState icon={Landmark} title="Loan application not found" description="This loan application may have been removed or deleted." />
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
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to={`/loans/${loan.id}`} />}>
          <ArrowLeft /> Back to Loan Application
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer /> Print Voucher
        </Button>
      </div>

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
            <h2 className="text-sm font-bold uppercase tracking-wide">Disbursement Voucher</h2>
            <p className="text-xs font-semibold">{loan.loanTypeName}</p>
          </div>

          {/* DV No. / Date */}
          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">DV No.:</span>
              <span className="text-right">{loan.releaseReferenceNumber || "—"}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Date:</span>
              <span className="text-right">{formatDateShort(loan.releaseDate)}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Payee:</span>
              <span className="text-right">{loan.memberName}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Member No.:</span>
              <span className="text-right">{loan.memberNumber}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Office:</span>
              <span className="text-right">{loan.officeName}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Loan Application #:</span>
              <span className="text-right">{loan.applicationNumber}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Mode of Payment:</span>
              <span className="text-right">{loan.releaseMethod || "—"}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-dotted border-gray-400 py-1">
              <span className="font-semibold">Reference/Check #:</span>
              <span className="text-right">{loan.releaseReferenceNumber || "—"}</span>
            </div>
          </div>

          {/* Particulars */}
          <div className="mt-4 text-xs">
            <p className="font-semibold">Particulars:</p>
            <p className="border-b border-dotted border-gray-400 py-1.5">
              Release of loan proceeds — {loan.loanTypeName}, Application #{loan.applicationNumber}, for the account of {loan.memberName}.
            </p>
            {loan.releaseRemarks && <p className="mt-1 text-gray-600">Remarks: {loan.releaseRemarks}</p>}
          </div>

          {/* Amount breakdown */}
          <table className="mt-4 w-full border-collapse text-[11px]">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-1">Gross Loan Amount</td>
                <td className="py-1 text-right">{formatCurrency(loan.principal)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="py-1">Less: Processing Fee</td>
                <td className="py-1 text-right">− {formatCurrency(loan.processingFee)}</td>
              </tr>
              {serviceCharge > 0 && (
                <tr className="border-b border-gray-300">
                  <td className="py-1">Less: Service Charge</td>
                  <td className="py-1 text-right">− {formatCurrency(serviceCharge)}</td>
                </tr>
              )}
              {(loan.previousObligationAmount ?? 0) > 0 && (
                <tr className="border-b border-gray-300">
                  <td className="py-1">Less: Previous Obligation Deducted</td>
                  <td className="py-1 text-right">− {formatCurrency(loan.previousObligationAmount ?? 0)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-black font-bold">
                <td className="py-1.5">Total Amount Released</td>
                <td className="py-1.5 text-right">{formatCurrency(releasedAmount)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3 border-b border-dotted border-gray-400 py-1.5 text-xs">
            <span className="font-semibold">Amount in Words: </span>
            {amountInWords(releasedAmount)}
          </div>

          {/* Signatures */}
          <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 text-xs">
            <div>
              <p className="mb-8 font-semibold">Prepared by:</p>
              <div className="w-48 border-t border-black pt-1">{loan.assignedOfficer || " "}</div>
              <p className="mt-0.5 text-[10px] text-gray-600">Loan Officer</p>
            </div>
            <div>
              <p className="mb-8 font-semibold">Approved by:</p>
              <div className="w-48 border-t border-black pt-1">{approvedBy || " "}</div>
              <p className="mt-0.5 text-[10px] text-gray-600">Approving Officer</p>
            </div>
            <div>
              <p className="mb-8 font-semibold">Released by:</p>
              <div className="w-48 border-t border-black pt-1">{releasedBy || " "}</div>
              <p className="mt-0.5 text-[10px] text-gray-600">Treasurer</p>
            </div>
            <div>
              <p className="mb-8 font-semibold">Received by:</p>
              <div className="w-48 border-t border-black pt-1">{loan.memberName}</div>
              <p className="mt-0.5 text-[10px] text-gray-600">Payee / Member Signature over Printed Name · Date</p>
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
