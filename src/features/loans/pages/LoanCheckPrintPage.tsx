import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Info, Landmark, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CheckSheet } from "@/components/shared/CheckSheet"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { getLoan } from "@/services/loans.service"
import { getSettings } from "@/services/settings.service"
import { amountInWords, formatCurrency } from "@/utils/format"
import { LOAN_STATUS_TONE } from "@/constants/status"

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
    <div className="mx-auto max-w-5xl space-y-6 py-6 print:max-w-none print:space-y-0 print:p-0">
      {/* Screen Toolbar (Hidden in Print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs backdrop-blur-xs print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-95"
            render={<Link to={`/loans/${loan.id}`} />}
          >
            <ArrowLeft className="size-3.5" /> Back to Loan Application
          </Button>

          <div className="h-4 w-px bg-border/60" />

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-foreground">
              {loan.applicationNumber}
            </span>
            <StatusBadge label={loan.status} tone={LOAN_STATUS_TONE[loan.status]} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Check Total
            </span>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(amount)}
            </span>
          </div>

          <Button
            onClick={printCheck}
            className="h-9 gap-2 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 transition-all"
          >
            <Printer className="size-3.5" /> Print Check
          </Button>
        </div>
      </div>

      {/* Check Sheet Card Frame */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-muted/20 p-6 shadow-lg backdrop-blur-xs print:border-none print:bg-transparent print:p-0 print:shadow-none">
        <div className="overflow-x-auto pb-2 flex justify-center print:overflow-visible">
          <div className="shadow-2xl ring-1 ring-black/10 rounded-lg overflow-hidden bg-white print:shadow-none print:ring-0">
            <CheckSheet
              className="check-sheet"
              template={template}
              payeeName={loan.memberName}
              amount={amount}
              amountInWords={amountInWords(amount)}
              checkDate={formattedDate}
              checkNo={loan.releaseReferenceNumber}
              memoLine={`${template.memoPrefix} ${loan.applicationNumber} · ${loan.loanTypeName}`}
            />
          </div>
        </div>
      </div>

      {/* Printer Calibration Notice */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground shadow-2xs print:hidden flex items-start gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs mt-0.5">
          <Info className="size-3.5" strokeWidth={2.2} />
        </div>
        <div className="space-y-0.5">
          <p className="font-heading text-xs font-semibold text-foreground">
            Print Calibration Instructions
          </p>
          <p className="leading-relaxed text-[11px]">
            Ensure your printer scale is set to <strong className="text-foreground font-semibold">100% / Actual Size</strong>.
            This template is formatted for standard <strong className="text-foreground font-semibold">8.5 × 3.5 inch</strong> continuous/cut bank check paper.
          </p>
        </div>
      </div>

      {/* Print Overrides */}
      <style>{`
        .check-sheet { width: 8.5in; height: 3.5in; }
        @page { size: Letter; margin: 0; }
        @media print {
          html, body {
            width: 8.5in !important;
            min-width: 8.5in !important;
            height: 11in !important;
            min-height: 11in !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }
          .check-sheet {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden !important;
          }
          .check-sheet, .check-sheet * {
            visibility: visible !important;
          }
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
