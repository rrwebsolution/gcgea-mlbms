import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Printer, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CheckSheet } from "@/components/shared/CheckSheet"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { getDisbursement } from "@/services/disbursements.service"
import { getSettings } from "@/services/settings.service"
import { amountInWords } from "@/utils/format"

export default function DisbursementCheckPrintPage() {
  const { id = "" } = useParams()
  const { data: disbursement, isLoading } = useQuery({ queryKey: ["disbursements", id], queryFn: () => getDisbursement(id) })

  if (isLoading) return <ProfileSkeleton cards={1} />
  if (!disbursement) return <EmptyState icon={WalletCards} title="Disbursement not found" description="The check source record is unavailable." />

  const template = getSettings().reportTemplate.checkTemplate
  const checkDate = disbursement.disbursementDate ? new Date(disbursement.disbursementDate) : new Date()
  const formattedDate = checkDate.toLocaleDateString("en-PH", { month: "2-digit", day: "2-digit", year: "numeric" })
  const printCheck = () => {
    const previousTitle = document.title
    document.title = `GCGEA Disbursement Check ${disbursement.referenceNumber}`
    window.print()
    window.setTimeout(() => {
      document.title = previousTitle
    }, 1000)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 py-6 print:max-w-none print:space-y-0 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" render={<Link to={`/financial/disbursements/${disbursement.id}`} />}><ArrowLeft /> Back</Button>
        <Button onClick={printCheck}><Printer /> Print Check</Button>
      </div>

      <CheckSheet
        className="mx-auto"
        template={template}
        payeeName={disbursement.payee}
        amount={disbursement.amount}
        amountInWords={amountInWords(disbursement.amount)}
        checkDate={formattedDate}
        checkNo={disbursement.paymentReference}
        memoLine={`${template.memoPrefix} ${disbursement.referenceNumber} · ${disbursement.accountTitle}`}
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
            left: 0;
            top: 0;
            width: 8.5in;
            height: 3.5in;
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
