import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Landmark, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { getLoan } from "@/services/loans.service"
import { getMember } from "@/services/members.service"
import { getSettings } from "@/services/settings.service"
import { formatCurrency, formatDateShort } from "@/utils/format"

const EXCLUDED_STATUSES = ["Draft"]

const REQUIREMENTS = [
  "Latest Net Take Home Pay.",
  "GCGEA Statement of Accounts",
  "Photocopy of Two Valid IDs of both applicant and co-maker.",
]

/**
 * Printable Loan Application Form — an exact reproduction of page 1 of the
 * paper "Solidarity Cash Assistance Application Form" (every field, nothing
 * added or removed), populated from the loan/member record. Available once a
 * loan has left Draft, matching the paper workflow, and can be turned off
 * entirely via Settings > Report Template.
 */
export default function LoanApplicationFormPrintPage() {
  const { id = "" } = useParams()
  const { data: loan, isLoading: isLoadingLoan } = useQuery({ queryKey: ["loans", id], queryFn: () => getLoan(id) })
  const { data: member, isLoading: isLoadingMember } = useQuery({
    queryKey: ["members", loan?.memberId],
    queryFn: () => getMember(loan!.memberId),
    enabled: !!loan?.memberId,
  })

  if (isLoadingLoan || isLoadingMember) return <ProfileSkeleton cards={2} />
  if (!loan) {
    return <EmptyState icon={Landmark} title="Loan application not found" description="This loan application may have been removed or deleted." />
  }
  if (EXCLUDED_STATUSES.includes(loan.status)) {
    return (
      <EmptyState
        icon={Landmark}
        title="Not yet submitted"
        description="The Loan Application Form is only available once this application has been submitted."
      />
    )
  }
  const template = getSettings().reportTemplate
  if (!template.loanApplicationForm.enabled) {
    return (
      <EmptyState
        icon={Landmark}
        title="Loan Application Form disabled"
        description="An administrator has turned this off in Settings > Report Template."
      />
    )
  }

  const org = getSettings().organization
  const isRenewal = loan.applicationType === "reloan"

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs backdrop-blur-xs print:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-95"
          render={<Link to={`/loans/${loan.id}`} />}
        >
          <ArrowLeft className="size-3.5" /> Back to Loan Application
        </Button>
        <Button
          onClick={() => window.print()}
          className="h-9 gap-2 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 transition-all"
        >
          <Printer className="size-3.5" /> Print Form
        </Button>
      </div>

      <div className="loan-application-form overflow-hidden rounded-3xl border border-border/80 bg-white p-8 text-[11px] text-black shadow-xl ring-1 ring-black/5 print:max-w-none print:rounded-none print:border-none print:p-0 print:text-[10px] print:leading-snug print:shadow-none print:ring-0">
        {/* Top badges */}
        <div className="flex items-center justify-between">
          <span className="border border-black px-2 py-0.5 text-[10px] font-semibold">GCGEA Form: 2026-1</span>
          <span className="border border-black px-2 py-0.5 text-[10px] font-semibold">Control No.: __________</span>
        </div>

        {/* Header */}
        <div className="mt-2 grid grid-cols-[80px_1fr_80px] items-center gap-4 text-center">
          <img src={template.leftLogo} alt="" className="mx-auto size-16 object-contain" />
          <div className="leading-tight">
            <p className="text-sm font-bold uppercase">{org.organizationName}</p>
            <p className="text-[10px]">Tel. Nos. {org.contactNumber}</p>
            <p className="text-[10px]">e-mail address: {org.email}</p>
          </div>
          <img src={template.rightLogo} alt="" className="mx-auto size-16 object-contain" />
        </div>

        {/* Title / Photo box */}
        <div className="relative mt-3">
          <div className="text-center">
            <h2 className="text-lg font-bold uppercase underline">{loan.loanTypeName}</h2>
            <h3 className="text-lg font-bold uppercase">Application Form</h3>
          </div>
          <div className="absolute top-0 right-0 flex h-20 w-20 shrink-0 flex-col items-center justify-center border border-dashed border-gray-500 text-center text-[9px] italic text-gray-500">
            Latest 1&quot;x1&quot; Photo Applicant
          </div>
        </div>

        {/* New / Renewal */}
        <div className="mt-2 flex gap-6">
          <span className="flex items-center gap-1.5">
            <span className={`inline-block size-3 border border-black ${!isRenewal ? "bg-black" : ""}`} /> New
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`inline-block size-3 border border-black ${isRenewal ? "bg-black" : ""}`} /> Renewal
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="italic font-semibold">Applicant</span>
          <span>Date: {formatDateShort(loan.applicationDate)}</span>
        </div>

        {/* Name */}
        <div className="mt-2 grid grid-cols-3 gap-4 border-t border-black pt-2">
          <div className="border-b border-black pb-0.5">{member?.surname ?? ""}</div>
          <div className="border-b border-black pb-0.5">{member?.firstName ?? ""}</div>
          <div className="border-b border-black pb-0.5">{member?.middleName ?? ""}</div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-[9px] italic text-gray-600">
          <span>(Last Name)</span>
          <span>(First Name)</span>
          <span>(Middle Name)</span>
        </div>

        {/* Office / Empl No */}
        <div className="mt-2 flex items-end gap-2">
          <span className="font-semibold">Office/Dept.</span>
          <span className="flex-1 border-b border-black px-2">{loan.officeName}</span>
          <span className="font-semibold">Empl. No.</span>
          <span className="w-32 border-b border-black px-2">{member?.employeeNumber ?? ""}</span>
        </div>

        {/* DOB / Civil Status / Sex */}
        <div className="mt-2 flex items-end gap-2">
          <span className="font-semibold">Date of Birth:</span>
          <span className="flex-1 border-b border-black px-2">{member ? formatDateShort(member.birthdate) : ""}</span>
          <span className="font-semibold">Civil Status:</span>
          <span className="w-28 border-b border-black px-2">{member?.civilStatus ?? ""}</span>
          <span className="font-semibold">Sex:</span>
          <span className="w-20 border-b border-black px-2">{member?.sex ?? ""}</span>
        </div>

        {/* Mailing Address */}
        <div className="mt-2 flex items-end gap-2">
          <span className="font-semibold whitespace-nowrap">Mailing Address:</span>
          <span className="flex-1 border-b border-black px-2">{member?.permanentAddress ?? ""}</span>
        </div>
        <div className="mt-1 flex items-end justify-end gap-2">
          <span className="font-semibold">ZipCode:</span>
          <span className="w-28 border-b border-black px-2">&nbsp;</span>
        </div>

        {/* Permanent Address */}
        <div className="mt-2 flex items-end gap-2">
          <span className="font-semibold whitespace-nowrap">Permanent Address:</span>
          <span className="flex-1 border-b border-black px-2">{member?.permanentAddress ?? ""}</span>
        </div>
        <div className="mt-1 flex items-end justify-end gap-2">
          <span className="font-semibold">ZipCode:</span>
          <span className="w-28 border-b border-black px-2">&nbsp;</span>
        </div>

        {/* Mobile / Contact */}
        <div className="mt-3 flex items-end gap-2">
          <span className="font-semibold">Mobile No.:</span>
          <span className="flex-1 border-b border-black px-2">{member?.cellphoneNumber ?? ""}</span>
          <span className="font-semibold">Contact No.:</span>
          <span className="w-32 border-b border-black px-2">&nbsp;</span>
        </div>

        {/* Send Proceeds Thru */}
        <div className="mt-2">
          <span className="font-semibold">Please Send Loan Proceeds Thru:</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-block size-3 border border-black bg-black" />
            <span>{loan.paymentMethod}</span>
          </div>
          <p className="mt-1 text-[9px] italic text-gray-600">(For Loan by Remittance, Reference No. will be sent to the mobile no. stated above)</p>
        </div>

        {/* Applicant signature */}
        <div className="mt-3 flex flex-col items-center">
          <span className="text-sm">(✓)</span>
          <div className="mt-3 w-64 border-t border-black pt-1 text-center text-[10px]">Signature of Applicant</div>
        </div>

        {/* Certification */}
        <div className="mt-3 border border-black">
          <p className="border-b border-black bg-gray-100 py-1 text-center text-[11px] font-bold uppercase">Certification</p>
          <div className="grid grid-cols-3 divide-x divide-black">
            <div className="p-2">
              <p className="mb-1 text-center text-[10px] font-bold underline">By the Immediate BOD/Representative:</p>
              <p className="text-justify text-[9.5px] leading-snug">
                I hereby certify to the authenticity of the signatures of both the applicant appearing in this
                application and that both are not on leave of absence without pay, have no pending
                administrative/criminal charges against them and are not among those to be laid off, retired or
                separated from the service within ____ years.
              </p>
              <p className="mt-1.5 text-center">(✓)</p>
              <div className="mt-1.5 border-t border-black pt-1 text-center text-[9px]">Signature above Printed Name</div>
              <div className="mt-2 flex items-end gap-1 text-[9px]">
                <span className="font-semibold whitespace-nowrap">Designation/Position:</span>
                <span className="flex-1 border-b border-black">&nbsp;</span>
              </div>
              <div className="mt-1 flex items-end gap-1 text-[9px]">
                <span className="font-semibold">Office:</span>
                <span className="flex-1 border-b border-black">&nbsp;</span>
              </div>
              <div className="mt-1 flex items-end gap-1 text-[9px]">
                <span className="font-semibold whitespace-nowrap">Mobile No.:</span>
                <span className="flex-1 border-b border-black">&nbsp;</span>
              </div>
            </div>
            <div className="p-2">
              <p className="mb-1 text-center text-[10px] font-bold underline">Recommendation:</p>
              <p className="text-justify text-[9.5px] leading-snug">
                I hereby undertake the deduction of the monthly amortization, one month after release of the{" "}
                {loan.loanTypeName}, if the applicant is a direct paying member. Approval of the loan is
                recommended.
              </p>
              <p className="mt-1.5 text-center">(✓)</p>
              <div className="mt-1.5 border-t border-black pt-1 text-center text-[9px]">Signature above Printed Name</div>
              <p className="mt-1 text-center text-[10px] font-bold">GCGEA BOD - TREASURER</p>
            </div>
            <div className="p-2">
              <p className="mb-1 text-center text-[10px] font-bold underline">By the GCGEA President:</p>
              <p className="text-justify text-[9.5px] leading-snug">
                I hereby certify that the applicant and co-maker are both active members of the chapter and
                promise to notify GCGEA any changes in their status and address. Approval of the loan is
                recommended.
              </p>
              <p className="mt-1.5 text-center">(✓)</p>
              <div className="mt-1.5 border-t border-black pt-1 text-center text-[9px]">Signature above Printed Name</div>
              <p className="mt-1 text-center text-[10px] font-bold">GCGEA BOD - PRESIDENT</p>
            </div>
          </div>
        </div>

        {/* Bookkeeper action */}
        <div className="mt-3 border border-black">
          <p className="border-b border-black bg-gray-100 py-1 text-center text-[11px] font-bold uppercase">For Bookkeeper Action</p>
          <div className="grid grid-cols-2 gap-4 p-2">
            <div className="space-y-1">
              <div className="flex items-end gap-1">
                <span className="font-semibold whitespace-nowrap">Loan Granted:</span>
                <span className="flex-1 border-b border-black px-1">{formatCurrency(loan.approvedAmount ?? loan.requestedAmount)}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="font-semibold whitespace-nowrap">Terms of Payment:</span>
                <span className="flex-1 border-b border-black px-1">{loan.termMonths} month(s)</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="font-semibold whitespace-nowrap">Net Proceeds:</span>
                <span className="flex-1 border-b border-black px-1">{formatCurrency(loan.netProceeds)}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="font-semibold whitespace-nowrap">Interest Rate:</span>
                <span className="flex-1 border-b border-black px-1">{loan.interestRate}%</span>
                <span>p.a.</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="font-semibold whitespace-nowrap">Monthly Amortization:</span>
                <span className="flex-1 border-b border-black px-1">{formatCurrency(loan.monthlyAmortization)}</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 border-l border-dotted border-gray-400">
              <span className="text-[10px] font-semibold">Loan No.</span>
              <span className="border border-black px-3 py-1.5 font-mono text-[11px] tracking-wide">{loan.applicationNumber}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-black p-2">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase">Submit the Following Requirements:</p>
              <ul className="space-y-0.5 text-[10px]">
                {REQUIREMENTS.map((label) => (
                  <li key={label}>• {label}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 text-[10px]">
              <div>
                <div className="flex items-end gap-1">
                  <span className="font-semibold whitespace-nowrap">Processed by:</span>
                  <span className="flex-1 border-b border-black">&nbsp;</span>
                </div>
                <p className="mt-0.5 text-[9px] text-gray-600 text-center">Signature above Printed Name</p>
                <div className="mt-1 flex items-end gap-1">
                  <span className="flex-1 border-b border-black">&nbsp;</span>
                </div>
                <p className="mt-0.5 text-[9px] text-gray-600 text-center">Date</p>
              </div>
              <div>
                <div className="flex items-end gap-1">
                  <span className="font-semibold whitespace-nowrap">Approved by:</span>
                  <span className="flex-1 border-b border-black">&nbsp;</span>
                </div>
                <p className="mt-0.5 text-[9px] text-gray-600 text-center">Signature above Printed Name</p>
                <div className="mt-1 flex items-end gap-1">
                  <span className="flex-1 border-b border-black">&nbsp;</span>
                </div>
                <p className="mt-0.5 text-[9px] text-gray-600 text-center">Date</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @page { size: Letter; margin: 0.35in; }
        @media print {
          .loan-application-form, .loan-application-form * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
