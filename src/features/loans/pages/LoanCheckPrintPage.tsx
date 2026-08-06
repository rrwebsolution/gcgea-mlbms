import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Landmark, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CheckSheet } from "@/components/shared/CheckSheet"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { getLoan } from "@/services/loans.service"
import { getSettings } from "@/services/settings.service"
import { amountInWords } from "@/utils/format"

export default function LoanCheckPrintPage() {
  const { id = "" } = useParams()
  const { data: loan, isLoading } = useQuery({ queryKey: ["loans", id], queryFn: () => getLoan(id) })

  if (isLoading) return <ProfileSkeleton cards={1} />
  if (!loan) return <EmptyState icon={Landmark} title="Loan not found" description="The check source record is unavailable." />

  const amount = loan.actualReleasedAmount ?? loan.netProceeds
  const template = getSettings().reportTemplate.checkTemplate
  const checkDate = loan.releaseDate ? new Date(loan.releaseDate) : new Date()
  const formattedDate = checkDate.toLocaleDateString("en-PH", { month: "2-digit", day: "2-digit", year: "numeric" })
  const printCheck = () => {
    const previousTitle = document.title
    document.title = `GCGEA Loan Check ${loan.applicationNumber}`
    window.print()
    window.setTimeout(() => {
      document.title = previousTitle
    }, 1000)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 py-6 print:max-w-none print:space-y-0 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" render={<Link to={`/loans/${loan.id}`} />}><ArrowLeft /> Back</Button>
        <Button onClick={printCheck}><Printer /> Print Check</Button>
      </div>

      <CheckSheet
        className="mx-auto"
        template={template}
        payeeName={loan.memberName}
        amount={amount}
        amountInWords={amountInWords(amount)}
        checkDate={formattedDate}
        checkNo={loan.releaseReferenceNumber}
        memoLine={`${template.memoPrefix} ${loan.applicationNumber} · ${loan.loanTypeName}`}
      />

      <p className="mx-auto max-w-[8.5in] text-xs text-muted-foreground print:hidden">
        Print at 100% / Actual Size. The layout uses a standard 8.5 × 3.5 inch check; use your printer margin controls for final bank-form alignment.
      </p>
      <style>{`
        .check-sheet { width: 8.5in; height: 3.5in; }
        @page { size: Letter; margin: 0; }
        @media print {
          html, body { width: 8.5in !important; min-width: 8.5in !important; height: 11in !important; min-height: 11in !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: white !important; }
          .check-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          .check-sheet, .check-sheet * { visibility: visible !important; }
          .check-sheet {
            position: absolute;
            left: 0 !important;
            top: 0 !important;
            width: 8.5in !important;
            height: 3.5in !important;
            box-sizing: border-box;
            transform: none;
            break-inside: avoid;
            page-break-inside: avoid;
            overflow: hidden;
          }
        }
      `}</style>
    </div>
  )
}
