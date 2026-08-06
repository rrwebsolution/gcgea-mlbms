import { cn } from "@/lib/utils"
import { formatCurrency } from "@/utils/format"
import type { CheckTemplateSettings } from "@/types/settings"

interface CheckSheetProps {
  template: CheckTemplateSettings
  payeeName: string
  amount: number
  amountInWords: string
  checkDate: string
  checkNo?: string
  memoLine?: string
  className?: string
}

/**
 * Renders one 8.5in x 3.5in check face from a CheckTemplateSettings — shared by every
 * check-print page (Loans, Benefits, Disbursements) and the Settings preview, so the
 * layout only needs to be tuned for the client's actual pre-printed check stock in one place.
 */
export function CheckSheet({ template, payeeName, amount, amountInWords, checkDate, checkNo, memoLine, className }: CheckSheetProps) {
  return (
    <div
      className={cn("check-sheet relative overflow-hidden border text-black shadow-sm print:border-0 print:shadow-none", className)}
      style={{
        backgroundColor: template.backgroundColor,
        backgroundImage: "repeating-linear-gradient(135deg, transparent 0, transparent 9px, rgba(22,101,52,.045) 10px, transparent 11px), repeating-linear-gradient(45deg, transparent 0, transparent 17px, rgba(30,64,175,.035) 18px, transparent 19px)",
      }}
    >
      <div className="absolute" style={{ left: `${template.horizontalMargin}in`, top: `${template.headerTop}in` }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em]">{template.heading}</p>
        <p className="text-[8px]">{template.subheading}</p>
      </div>

      <div className="absolute text-right" style={{ right: `${template.horizontalMargin}in`, top: `${template.headerTop}in` }}>
        <p className="text-[11px]"><span className="text-[8px] uppercase">Date</span> <span className="ml-3 border-b border-black px-3 font-semibold">{checkDate}</span></p>
        <p className="mt-1.5 border border-black px-3 py-1 text-sm font-bold">{formatCurrency(amount)}</p>
        {checkNo && <p className="mt-1 text-[8px]">CHECK NO. {checkNo}</p>}
      </div>

      <div className="absolute flex items-end gap-2" style={{ left: `${template.horizontalMargin}in`, right: `${template.horizontalMargin}in`, top: `${template.payeeTop}in` }}>
        <span className="whitespace-nowrap text-[9px] uppercase">{template.payeeLabel}</span>
        <span className="min-w-0 flex-1 border-b border-black px-2 pb-1 text-sm font-bold uppercase">{payeeName}</span>
      </div>

      <div className="absolute flex items-end gap-3" style={{ left: `${template.horizontalMargin}in`, right: `${template.horizontalMargin}in`, top: `${template.wordsTop}in` }}>
        <span className="flex-1 border-b border-black px-2 pb-1 text-[11px] font-semibold uppercase">{amountInWords}</span>
        <span className="text-[9px] uppercase">{template.currencyLabel}</span>
      </div>

      {memoLine && (
        <div className="absolute text-[9px]" style={{ bottom: `${template.footerBottom + 0.45}in`, left: `${template.horizontalMargin}in` }}>
          {memoLine}
        </div>
      )}

      <div className="absolute flex justify-between" style={{ bottom: `${template.footerBottom}in`, left: `${template.horizontalMargin}in`, right: `${template.horizontalMargin}in` }}>
        <div className="w-[2.15in] border-t border-black pt-1 text-center text-[8px] uppercase">
          <p className="font-bold">{template.primarySignatoryName}</p>
          <p>{template.primarySignatoryTitle}</p>
        </div>
        <div className="w-[2.15in] border-t border-black pt-1 text-center text-[8px] uppercase">
          <p className="font-bold">{template.secondarySignatoryName}</p>
          <p>{template.secondarySignatoryTitle}</p>
        </div>
      </div>
    </div>
  )
}
