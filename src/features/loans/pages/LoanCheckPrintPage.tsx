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

  return (
    <div className="mx-auto max-w-5xl space-y-4 py-6 print:max-w-none print:space-y-0 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" render={<Link to={`/loans/${loan.id}`} />}><ArrowLeft /> Back</Button>
        <Button onClick={() => window.print()}><Printer /> Print Check</Button>
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
        @page { size: 8.5in 3.5in; margin: 0; }
        @media print {
          html, body { width: 8.5in; height: 3.5in; margin: 0; background: white !important; overflow: hidden; }
          .check-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          .check-sheet, .check-sheet * { visibility: visible; }
          .check-sheet {
            position: fixed;
            left: 0.12in;
            top: 0.1in;
            width: 8.5in;
            height: 3.5in;
            transform: scale(0.94);
            transform-origin: top left;
            break-inside: avoid;
            page-break-inside: avoid;
            overflow: hidden;
          }
        }
      `}</style>
    </div>
  )
}
