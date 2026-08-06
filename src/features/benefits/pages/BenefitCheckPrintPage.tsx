import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, HeartHandshake, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CheckSheet } from "@/components/shared/CheckSheet"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { getBenefit } from "@/services/benefits.service"
import { getSettings } from "@/services/settings.service"
import { amountInWords } from "@/utils/format"

export default function BenefitCheckPrintPage() {
  const { id = "" } = useParams()
  const { data: benefit, isLoading } = useQuery({ queryKey: ["benefits", id], queryFn: () => getBenefit(id) })

  if (isLoading) return <ProfileSkeleton cards={1} />
  if (!benefit) return <EmptyState icon={HeartHandshake} title="Benefit application not found" description="The check source record is unavailable." />

  const amount = benefit.actualReleasedAmount ?? benefit.approvedAmount ?? benefit.requestedAmount
  const template = getSettings().reportTemplate.checkTemplate
  const checkDate = benefit.releaseDate ? new Date(benefit.releaseDate) : new Date()
  const formattedDate = checkDate.toLocaleDateString("en-PH", { month: "2-digit", day: "2-digit", year: "numeric" })
  const printCheck = () => {
    const previousTitle = document.title
    document.title = `GCGEA Benefit Check ${benefit.applicationNumber}`
    window.print()
    window.setTimeout(() => {
      document.title = previousTitle
    }, 1000)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 py-6 print:max-w-none print:space-y-0 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" render={<Link to={`/benefits/${benefit.id}`} />}><ArrowLeft /> Back</Button>
        <Button onClick={printCheck}><Printer /> Print Check</Button>
      </div>

      <CheckSheet
        className="mx-auto"
        template={template}
        payeeName={benefit.memberName}
        amount={amount}
        amountInWords={amountInWords(amount)}
        checkDate={formattedDate}
        checkNo={benefit.releaseReferenceNumber}
        memoLine={`${template.memoPrefix} ${benefit.applicationNumber} · ${benefit.benefitTypeName}`}
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
            zoom: 0.9;
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
