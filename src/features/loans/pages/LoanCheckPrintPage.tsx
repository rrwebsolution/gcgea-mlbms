import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Landmark, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/EmptyState"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { getLoan } from "@/services/loans.service"
import { getSettings } from "@/services/settings.service"
import { formatCurrency } from "@/utils/format"

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function underThousand(value: number): string {
  if (value < 20) return ONES[value]
  if (value < 100) return `${TENS[Math.floor(value / 10)]}${value % 10 ? `-${ONES[value % 10]}` : ""}`
  return `${ONES[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${underThousand(value % 100)}` : ""}`
}

function amountInWords(amount: number): string {
  const pesos = Math.floor(amount)
  const centavos = Math.round((amount - pesos) * 100)
  const groups = [
    { divisor: 1_000_000_000, name: "Billion" },
    { divisor: 1_000_000, name: "Million" },
    { divisor: 1_000, name: "Thousand" },
  ]
  let remainder = pesos
  const parts: string[] = []
  for (const group of groups) {
    const count = Math.floor(remainder / group.divisor)
    if (count) parts.push(`${underThousand(count)} ${group.name}`)
    remainder %= group.divisor
  }
  if (remainder || parts.length === 0) parts.push(underThousand(remainder) || "Zero")
  return `${parts.join(" ")} Pesos and ${String(centavos).padStart(2, "0")}/100 Only`
}

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
    <div className="mx-auto max-w-5xl space-y-4 py-6 print:max-w-none print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" render={<Link to={`/loans/${loan.id}`} />}><ArrowLeft /> Back</Button>
        <Button onClick={() => window.print()}><Printer /> Print Check</Button>
      </div>

      <div
        className="check-sheet relative mx-auto overflow-hidden border text-black shadow-sm print:border-0 print:shadow-none"
        style={{
          backgroundColor: template.backgroundColor,
          backgroundImage: "repeating-linear-gradient(135deg, transparent 0, transparent 9px, rgba(22,101,52,.045) 10px, transparent 11px), repeating-linear-gradient(45deg, transparent 0, transparent 17px, rgba(30,64,175,.035) 18px, transparent 19px)",
        }}
      >
        <div className="absolute" style={{ left: `${template.horizontalMargin}in`, top: `${template.headerTop}in` }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em]">{template.heading}</p>
          <p className="text-[8px]">{template.subheading}</p>
        </div>
        <div className="absolute text-right text-[11px]" style={{ right: `${template.horizontalMargin}in`, top: `${template.headerTop + 0.05}in` }}>
          <p><span className="text-[8px] uppercase">Date</span> <span className="ml-3 border-b border-black px-3 font-semibold">{formattedDate}</span></p>
          <p className="mt-2 text-[8px]">CHECK NO. {loan.releaseReferenceNumber || "________________"}</p>
        </div>

        <div className="absolute flex items-end gap-3" style={{ left: `${template.horizontalMargin}in`, right: `${template.horizontalMargin}in`, top: `${template.payeeTop}in` }}>
          <span className="whitespace-nowrap text-[9px] uppercase">{template.payeeLabel}</span>
          <span className="min-w-0 flex-1 border-b border-black px-2 pb-1 text-sm font-bold uppercase">{loan.memberName}</span>
          <span className="border border-black px-3 py-1.5 text-sm font-bold">{formatCurrency(amount)}</span>
        </div>

        <div className="absolute flex items-end gap-3" style={{ left: `${template.horizontalMargin}in`, right: `${template.horizontalMargin}in`, top: `${template.wordsTop}in` }}>
          <span className="flex-1 border-b border-black px-2 pb-1 text-[11px] font-semibold uppercase">{amountInWords(amount)}</span>
          <span className="text-[9px] uppercase">{template.currencyLabel}</span>
        </div>

        <div className="absolute text-[9px]" style={{ bottom: `${template.footerBottom + 0.03}in`, left: `${template.horizontalMargin}in` }}>
          <p>{template.memoPrefix} {loan.applicationNumber} · {loan.loanTypeName}</p>
        </div>
        <div className="absolute w-[2.15in] border-t border-black pt-1 text-center text-[8px] uppercase" style={{ bottom: `${template.footerBottom}in`, right: `${template.horizontalMargin}in` }}>
          {template.signatoryLabel}
        </div>
      </div>

      <p className="mx-auto max-w-[8.5in] text-xs text-muted-foreground print:hidden">
        Print at 100% / Actual Size. The layout uses a standard 8.5 × 3.5 inch check; use your printer margin controls for final bank-form alignment.
      </p>
      <style>{`
        .check-sheet { width: 8.5in; height: 3.5in; }
        @page { size: 8.5in 3.5in; margin: 0; }
        @media print {
          html, body { width: 8.5in; height: 3.5in; background: white !important; }
          .check-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          .check-sheet, .check-sheet * { visibility: visible; }
          .check-sheet { position: fixed; inset: 0; }
        }
      `}</style>
    </div>
  )
}
