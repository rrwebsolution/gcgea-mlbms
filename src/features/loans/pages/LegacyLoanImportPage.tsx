import { useMemo, useState, useRef } from "react"
import { Link } from "react-router-dom"
import {
  CheckCircle2,
  FileSpreadsheet,
  History,
  Loader2,
  UploadCloud,
  Calendar,
  AlertTriangle,
  FileCheck,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { PageHeader } from "@/components/shared/PageHeader"
import { AlertBanner } from "@/components/shared/AlertBanner"
import {
  commitLegacyLoans,
  previewLegacyLoans,
  type LegacyLoanPreview,
} from "@/services/legacy-loan-import.service"
import { cn } from "@/lib/utils"

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function errorMessage(error: any, fallback: string) {
  const validationErrors = error?.response?.data?.errors
  const firstValidationError = validationErrors
    ? Object.values(validationErrors).flat().find((message) => typeof message === "string")
    : null
  return String(firstValidationError ?? error?.response?.data?.message ?? error?.message ?? fallback)
}

export default function LegacyLoanImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [period, setPeriod] = useState(currentMonth)
  const [preview, setPreview] = useState<LegacyLoanPreview | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [resolvedMatches, setResolvedMatches] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{
    created: number
    skipped: number
    errors: string[]
    batchToken?: string
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedCount = useMemo(
    () =>
      preview?.rows.filter(
        (row) => (row.category === "Ready" || resolvedMatches[row.key]) && !excluded.has(row.key)
      ).length ?? 0,
    [preview, excluded, resolvedMatches]
  )

  const unresolvedRows = useMemo(
    () => preview?.rows.filter((row) => row.category !== "Ready" && !resolvedMatches[row.key]) ?? [],
    [preview, resolvedMatches]
  )

  async function upload() {
    if (!file) return
    setBusy(true)
    try {
      setPreview(await previewLegacyLoans(file, period))
      setExcluded(new Set())
      setResolvedMatches({})
      setResult(null)
    } catch (error: any) {
      toast.error(errorMessage(error, "The CSV/workbook could not be read."))
    } finally {
      setBusy(false)
    }
  }

  async function commit() {
    if (!preview) return
    setBusy(true)
    try {
      const response = await commitLegacyLoans(preview.token, Array.from(excluded), resolvedMatches)
      setResult(response)
      toast.success(`${response.created} legacy loan(s) imported.`)
    } catch (error: any) {
      toast.error(errorMessage(error, "The import could not be completed."))
    } finally {
      setBusy(false)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <PageHeader
        title="Import Existing Member Loans"
        description="Migrate historical loan principal, total interest, amortized payment records, and active ledger balances from spreadsheet deductions."
        actions={
          <PermissionButton
            permission="loan_payments.import"
            variant="outline"
            className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 transition-all"
            render={<Link to="/loans/import-history" />}
          >
            <History className="size-4" /> Import History
          </PermissionButton>
        }
      />

      {/* Select Workbook Step Card */}
      <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-border/40 pb-3">
          <div className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-2xs">
            <FileSpreadsheet className="size-4" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="font-heading text-sm font-semibold tracking-tight text-foreground">
              Select Monthly Deduction Workbook
            </h2>
            <p className="text-xs text-muted-foreground">
              Past installments are marked paid up to the current balance month. Unpaid portions will be staged to active ledgers.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-12 items-stretch">
          {/* File Upload Dropzone */}
          <div className="md:col-span-7">
            <div
              onClick={triggerFileSelect}
              className={cn(
                "group/drop relative flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200",
                file
                  ? "border-primary/50 bg-primary/[0.02]"
                  : "border-border/80 bg-muted/15 hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              {file ? (
                <div className="flex items-center gap-3.5 text-left">
                  <div className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                    <FileSpreadsheet className="size-6" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-sm">
                      {file.name}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB · Ready to parse
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background text-muted-foreground shadow-2xs group-hover/drop:text-primary group-hover/drop:border-primary/40 transition-colors">
                    <UploadCloud className="size-5" />
                  </div>
                  <p className="font-heading text-xs font-semibold text-foreground">
                    Click to select loan deductions spreadsheet
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Accepts .xlsx, .xls, and .csv workbook formats
                  </p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {/* Configuration & Action Area */}
          <div className="md:col-span-5 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                <Calendar className="size-3.5" /> Month of Balance
              </Label>
              <Input
                type="month"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="h-10 font-mono text-xs shadow-2xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Amortized repayment records will commence from this period.
              </p>
            </div>

            <Button
              onClick={upload}
              disabled={!file || !period || busy}
              className="h-10 w-full gap-2 rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              <span>{busy ? "Parsing Workbook…" : "Generate Loan Preview"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {preview && !result && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <h2 className="font-heading text-sm font-semibold tracking-tight text-foreground">
                Review Candidate Matches &amp; Balances
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedCount} ready for import
                </span>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  {unresolvedRows.length} unresolved matches
                </span>
                <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                  {preview.summary.alreadyImported} already imported
                </span>
              </div>
            </div>

            <Button
              onClick={commit}
              disabled={selectedCount === 0 || busy}
              className="h-9 gap-2 rounded-xl px-5 text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileCheck className="size-3.5" />}
              <span>Commit {selectedCount} Loan(s)</span>
            </Button>
          </div>

          {preview.summary.alreadyImported > 0 && (
            <AlertBanner
              tone="warning"
              title={`${preview.summary.alreadyImported} existing loan record(s) omitted`}
              description="Loans with identical balance months already exist in the database and have been excluded automatically."
            />
          )}

          {/* Candidates Resolution Grid */}
          <div className="overflow-hidden rounded-2xl border border-border/60 shadow-2xs">
            <div className="max-h-[34rem] overflow-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur-md">
                  <tr>
                    <th className="w-12 p-3 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Import
                    </th>
                    <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Sheet / Row
                    </th>
                    <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Workbook Name
                    </th>
                    <th className="w-64 p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      System Member Candidate
                    </th>
                    <th className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Principal
                    </th>
                    <th className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Interest
                    </th>
                    <th className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Paid Prior
                    </th>
                    <th className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Recent Paid
                    </th>
                    <th className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Prin. Bal.
                    </th>
                    <th className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Int. Bal.
                    </th>
                    <th className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Outstanding
                    </th>
                    <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {unresolvedRows.map((row) => {
                    const isResolved = Boolean(resolvedMatches[row.key])
                    const isReady = row.category === "Ready" || isResolved
                    const isExcluded = excluded.has(row.key)

                    return (
                      <tr
                        key={row.key}
                        className={cn(
                          "transition-colors hover:bg-muted/20",
                          isExcluded && "opacity-50 bg-muted/10"
                        )}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isReady && !isExcluded}
                            disabled={!isReady}
                            onChange={(event) =>
                              setExcluded((old) => {
                                const next = new Set(old)
                                event.target.checked ? next.delete(row.key) : next.add(row.key)
                                return next
                              })
                            }
                            className="size-4 rounded border-border text-primary focus:ring-primary/40 focus:ring-2 accent-primary cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* Sheet & Location */}
                        <td className="p-3 font-mono text-[11px] text-muted-foreground align-middle">
                          {row.sheet} / r{row.rowNumber}
                        </td>
                        <td className="p-3 font-heading font-semibold text-foreground align-middle">
                          {row.name}
                        </td>

                        {/* Member Candidate Select */}
                        <td className="p-3 align-middle">
                          {row.memberName ?? (
                            <CommandSelect
                              value={resolvedMatches[row.key]}
                              onValueChange={(memberId) => {
                                setResolvedMatches((old) => ({ ...old, [row.key]: memberId }))
                                setExcluded((old) => {
                                  const next = new Set(old)
                                  next.delete(row.key)
                                  return next
                                })
                              }}
                              options={row.candidates.map((candidate) => ({
                                value: candidate.id,
                                label: candidate.name,
                                description: `${candidate.memberNumber} · ${candidate.score}% match`,
                              }))}
                              placeholder="Match registered member"
                              searchPlaceholder="Search member name or number…"
                              emptyText="No suggested registered member."
                              className="min-w-60 h-8 rounded-lg text-xs"
                              size="sm"
                            />
                          )}
                        </td>

                        {/* Currency Fields */}
                        <td className="p-3 text-right font-mono font-medium align-middle">
                          {peso.format(row.principal)}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground align-middle">
                          {peso.format(row.interest)}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground align-middle">
                          {peso.format(
                            row.principal +
                              row.interest -
                              row.principalBalance -
                              row.interestBalance -
                              row.currentPayment
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground align-middle">
                          {peso.format(row.currentPayment)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-foreground align-middle">
                          {peso.format(row.principalBalance)}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground align-middle">
                          {peso.format(row.interestBalance)}
                        </td>

                        <td className="p-3 text-right align-middle">
                          <span className="font-mono font-bold text-primary">
                            {peso.format(row.principalBalance + row.interestBalance)}
                          </span>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {row.lastPaymentMonth}
                          </div>
                        </td>

                        {/* Status Badging */}
                        <td className="p-3 align-middle">
                          {isResolved ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Resolved
                            </span>
                          ) : row.category === "Ready" ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              Ready
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 cursor-help"
                              title={row.reasons.join(" ")}
                            >
                              <AlertTriangle className="size-3" />
                              {row.category}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}

                  {unresolvedRows.length === 0 && (
                    <tr>
                      <td colSpan={12} className="p-12 text-center text-xs text-muted-foreground">
                        All workbook candidate rows are matched and ready for commitment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Completion Dashboard */}
      {result && (
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-8 text-center shadow-xs backdrop-blur-xs max-w-xl mx-auto sm:p-10">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm">
            <CheckCircle2 className="size-8" />
          </div>

          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Legacy Loans Imported Successfully
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Successfully committed <strong className="text-foreground">{result.created}</strong> legacy loan
            ledgers. Skipped <strong className="text-foreground">{result.skipped}</strong> rows.
          </p>

          {result.errors.length > 0 && (
            <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-destructive">
                Execution Warnings
              </p>
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs text-destructive/80">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {result.batchToken && (
              <Button
                variant="outline"
                className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
                render={<Link to={`/loans/import-history/${result.batchToken}`} />}
              >
                <History className="size-3.5" /> View Batch Details
              </Button>
            )}
            <Button
              className="h-9 rounded-xl px-5 text-xs font-semibold shadow-xs active:scale-95"
              render={<Link to="/loans" />}
            >
              Go to Loan Applications
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}