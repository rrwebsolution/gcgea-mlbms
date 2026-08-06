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
  /** Renders a faint "VOID" watermark — useful for previews/settings. */
  isVoid?: boolean
}

/**
 * Premium 8.5in × 3.5in check face.
 * Pure Tailwind CSS + shadcn/ui aesthetic. SVG guilloche security pattern,
 * double security frame, microprint borders, holographic stripe, and
 * professional banking typography.
 */
export function CheckSheet({
  template,
  payeeName,
  amount,
  amountInWords,
  checkDate,
  checkNo,
  memoLine,
  className,
  isVoid = false,
}: CheckSheetProps) {
  const hMargin = template.horizontalMargin ?? 0.5
  const headerTop = template.headerTop ?? 0.35
  const payeeTop = template.payeeTop ?? 1.15
  const wordsTop = template.wordsTop ?? 1.6
  const footerBottom = template.footerBottom ?? 0.45
  const signatoryBottom = Math.max(footerBottom, 0.62)
  const memoBottom = signatoryBottom + 0.36

  return (
    <div
      className={cn(
        "check-sheet relative overflow-hidden select-none",
        "bg-slate-50 rounded-sm border border-slate-300/80 shadow-sm",
        "print:border-0 print:shadow-none",
        className
      )}
      style={{ width: "8.5in", height: "3.5in" }}
    >
      {/* ── SVG Guilloche Security Pattern ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
        viewBox="0 0 816 336"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="guilloche"
            x="0"
            y="0"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0,24 Q12,0 24,24 T48,24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="0.4"
              opacity="0.5"
            />
            <path
              d="M0,24 Q12,48 24,24 T48,24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="0.4"
              opacity="0.5"
            />
            <path
              d="M24,0 Q48,12 24,24 T24,48"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="0.3"
              opacity="0.4"
            />
            <path
              d="M24,0 Q0,12 24,24 T24,48"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="0.3"
              opacity="0.4"
            />
          </pattern>
          <pattern
            id="fine-lines"
            x="0"
            y="0"
            width="100%"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="6"
              x2="816"
              y2="6"
              stroke="#cbd5e1"
              strokeWidth="0.2"
              opacity="0.4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#guilloche)" />
        <rect width="100%" height="100%" fill="url(#fine-lines)" opacity="0.5" />
      </svg>

      {/* ── Soft Radial Gradient Overlay ── */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.7)_0%,transparent_60%),radial-gradient(ellipse_at_70%_80%,rgba(255,255,255,0.5)_0%,transparent_50%)]" />

      {/* ── VOID Watermark ── */}
      {isVoid && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[30deg] text-[80px] font-black text-slate-400/5 uppercase tracking-[0.15em] whitespace-nowrap pointer-events-none select-none">
          VOID
        </div>
      )}

      {/* ── Outer Security Frame ── */}
      <div className="absolute inset-[10px] rounded-[3px] border-[1.5px] border-slate-400/30 pointer-events-none print:border-slate-300" />
      <div className="absolute inset-[14px] rounded-[2px] border border-dashed border-slate-400/25 pointer-events-none" />

      {/* ── Microprint Borders ── */}
      <div className="absolute top-4 left-0 right-0 text-center text-[5px] font-bold tracking-[0.15em] text-slate-400 uppercase pointer-events-none">
        ORIGINAL DOCUMENT • SECURITY FEATURES INCLUDED • UNAUTHORIZED REPRODUCTION PROHIBITED
      </div>
      <div className="absolute bottom-[0.08in] left-0 right-0 text-center text-[5px] font-bold tracking-[0.15em] text-slate-400 uppercase pointer-events-none">
        THIS CHECK CONTAINS ADVANCED SECURITY FEATURES • VERIFY AUTHENTICITY BEFORE PROCESSING
      </div>

      {/* ── Vertical Security Badge ── */}
      <div className="absolute left-[18px] top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[5px] font-extrabold tracking-[0.2em] text-slate-400 uppercase whitespace-nowrap pointer-events-none hidden sm:block">
        MP • SECURITY FEATURES INCLUDED
      </div>

      {/* ── Holographic Stripe ── */}
      <div className="absolute right-[42px] top-[104px] w-1 h-[82px] rounded-sm pointer-events-none bg-[repeating-linear-gradient(180deg,rgba(148,163,184,0.25)_0px,rgba(203,213,225,0.4)_8px,rgba(148,163,184,0.25)_16px)]" />

      {/* ── HEADER LEFT: Company Branding ── */}
      {(template.heading || template.subheading) && (
        <div
          className="absolute z-10"
          style={{ left: `${hMargin}in`, top: `${headerTop}in` }}
        >
          {template.heading && (
            <h2 className="text-[15px] font-black uppercase tracking-[0.2em] text-slate-900 leading-none mb-[3px] drop-shadow-sm">
              {template.heading}
            </h2>
          )}
          {template.subheading && (
            <p className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide leading-relaxed">
              {template.subheading}
            </p>
          )}
        </div>
      )}

      {/* ── HEADER RIGHT: Check No, Date, Amount Box ── */}
      <div
        className="absolute z-10 flex flex-col items-end"
        style={{ right: `${hMargin}in`, top: `${headerTop}in` }}
      >
        {/* Check Number */}
        {checkNo && (
          <div className="text-[10px] font-bold text-slate-500 tracking-wide mb-1.5">
            NO.{" "}
            <span className="text-sm font-black text-slate-900 tabular-nums">
              {checkNo}
            </span>
          </div>
        )}

        {/* Date Field */}
        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          <span>Date</span>
          <span className="min-w-[1.3in] text-center border-b-2 border-slate-900 px-2 py-0.5 text-[11px] font-extrabold text-slate-900 tabular-nums bg-white/50">
            {checkDate}
          </span>
        </div>

        {/* Amount Box */}
        <div className="mt-2.5 inline-flex items-center gap-1.5 border-2 border-slate-900 bg-white/95 px-3.5 py-1 rounded-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
          <span className="text-[10px] font-extrabold text-slate-500 tracking-wider">
            {template.currencyLabel || "PHP"}
          </span>
          <span className="text-lg font-black text-slate-950 tabular-nums tracking-tight">
            {formatCurrency(amount)}
          </span>
        </div>
      </div>

      {/* ── PAYEE ROW ── */}
      <div
        className="absolute z-10 flex items-end gap-2.5"
        style={{
          left: `${hMargin}in`,
          right: `${hMargin}in`,
          top: `${payeeTop}in`,
        }}
      >
        <span className="shrink-0 text-[8px] font-extrabold text-slate-500 uppercase tracking-[0.15em] pb-1">
          {template.payeeLabel || "Pay To The Order Of"}
        </span>
        <div className="min-w-0 flex-1 border-b-2 border-slate-900 px-2 pb-0.5 text-sm font-black uppercase tracking-wide text-slate-900 bg-white/30 leading-tight">
          {payeeName}
        </div>
      </div>

      {/* ── AMOUNT IN WORDS ROW ── */}
      <div
        className="absolute z-10 flex items-end gap-3"
        style={{
          left: `${hMargin}in`,
          right: `${hMargin}in`,
          top: `${wordsTop}in`,
        }}
      >
        <div className="min-w-0 flex-1 border-b-2 border-slate-900 px-2 pb-0.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-900 bg-white/30 italic leading-tight">
          {amountInWords}
        </div>
        <span className="shrink-0 text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] pb-1">
          {template.currencyLabel || "PESOS"}
        </span>
      </div>

      {/* ── MEMO LINE ── */}
      {memoLine && (
        <div
          className="absolute z-10 flex items-center gap-1.5"
          style={{
            bottom: `${memoBottom}in`,
            left: `${hMargin}in`,
          }}
        >
          <span className="text-[7px] font-extrabold text-slate-500 uppercase tracking-[0.15em]">
            MEMO:
          </span>
          <span className="border-b border-slate-500 px-1 text-[9px] font-bold text-slate-900 min-w-[2.5in]">
            {memoLine}
          </span>
        </div>
      )}

      {/* ── SIGNATORIES ROW ── */}
      <div
        className="absolute z-10 flex justify-between"
        style={{
          bottom: `${signatoryBottom}in`,
          left: `${hMargin}in`,
          right: `${hMargin}in`,
        }}
      >
        {/* Primary Signatory */}
        <div className="w-[2.15in] text-center">
          <div className="border-t-2 border-slate-900 pt-0.5 mb-0.5" />
          <p className="text-[8px] font-black text-slate-900 uppercase tracking-wide">
            {template.primarySignatoryName}
          </p>
          <p className="text-[7px] font-semibold text-slate-500 uppercase tracking-wide">
            {template.primarySignatoryTitle}
          </p>
        </div>

        {/* Secondary Signatory */}
        <div className="w-[2.15in] text-center">
          <div className="border-t-2 border-slate-900 pt-0.5 mb-0.5" />
          <p className="text-[8px] font-black text-slate-900 uppercase tracking-wide">
            {template.secondarySignatoryName}
          </p>
          <p className="text-[7px] font-semibold text-slate-500 uppercase tracking-wide">
            {template.secondarySignatoryTitle}
          </p>
        </div>
      </div>

      {/* ── MICR LINE ── */}
      <div className="absolute left-0 right-0 bottom-[0.02in] text-center font-mono text-[9px] tracking-[0.18em] text-slate-500/65 pointer-events-none select-none">
        ⑈{checkNo ? checkNo.padStart(6, "0") : "000000"}⑈ ⑆012345678⑆ 1234567890⑈
      </div>
    </div>
  )
}
