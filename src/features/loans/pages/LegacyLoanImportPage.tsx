import { useMemo, useState, useRef } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, FileSpreadsheet, History, Loader2, UploadCloud, Calendar, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { commitLegacyLoans, previewLegacyLoans, type LegacyLoanPreview } from "@/services/legacy-loan-import.service"

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })

function errorMessage(error: any, fallback: string) {
  const validationErrors = error?.response?.data?.errors
  const firstValidationError = validationErrors
    ? Object.values(validationErrors).flat().find((message) => typeof message === "string")
    : null
  return String(firstValidationError ?? error?.response?.data?.message ?? error?.message ?? fallback)
}

export default function LegacyLoanImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [period, setPeriod] = useState("2026-01")
  const [preview, setPreview] = useState<LegacyLoanPreview | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [resolvedMatches, setResolvedMatches] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[]; batchToken?: string } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedCount = useMemo(
    () => preview?.rows.filter((row) => (row.category === "Ready" || resolvedMatches[row.key]) && !excluded.has(row.key)).length ?? 0,
    [preview, excluded, resolvedMatches],
  )
  const unresolvedRows = useMemo(
    () => preview?.rows.filter((row) => row.category !== "Ready" && !resolvedMatches[row.key]) ?? [],
    [preview, resolvedMatches],
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Import Existing Member Loans</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-3xl">
            Import loan principal, total interest, payment history, and current balances into live ledger balances using a monthly deduction spreadsheet.
          </p>
        </div>
        <PermissionButton permission="loan_payments.import" variant="outline" className="h-9 gap-1.5 text-xs shadow-sm" render={<Link to="/loans/import-history" />}>
          <History className="size-4" /> View Import History
        </PermissionButton>
      </div>

      {/* Select Workbook Step */}
      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-base">Select monthly deduction workbook</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Past installments will be marked paid up to the current balance month. Remaining balances will become active on the ledger.
        </p>
        
        <div className="mt-5 grid gap-5 md:grid-cols-12 items-stretch">
          {/* File Upload Area */}
          <div className="md:col-span-7">
            <div 
              onClick={triggerFileSelect}
              className="group/drop relative border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-5 cursor-pointer transition-all duration-200 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/40 min-h-36"
            >
              {file ? (
                <div className="flex items-center gap-4 text-left">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    <FileSpreadsheet className="size-7" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold truncate max-w-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <UploadCloud className="mx-auto size-7 text-muted-foreground/80 group-hover/drop:text-primary transition-colors duration-200 mb-2.5" />
                  <p className="text-sm font-semibold">Click to select workbook</p>
                  <p className="text-xs text-muted-foreground mt-0.5">XLS, XLSX, or CSV file formats accepted</p>
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
              <label className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" /> Month of Balance
              </label>
              <Input 
                type="month" 
                value={period} 
                onChange={(event) => setPeriod(event.target.value)} 
                className="rounded-lg"
              />
            </div>
            
            <Button 
              onClick={upload} 
              disabled={!file || !period || busy}
              className="w-full rounded-lg py-5 font-medium flex items-center justify-center gap-2"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UploadCloud className="size-4" />
              )} 
              Generate Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {preview && !result && (
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border/50">
            <div>
              <h2 className="font-semibold text-base">Review Matched Loans</h2>
              <div className="flex flex-wrap gap-2 items-center mt-1 text-xs font-medium text-muted-foreground">
                <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">{selectedCount} ready for import</span>
                <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">{unresolvedRows.length} unresolved shown</span>
                <span className="bg-muted px-2 py-0.5 rounded-full">{preview.summary.alreadyImported} already imported</span>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selectedCount} selected for import</span>
              </div>
            </div>
            
            <Button 
              onClick={commit} 
              disabled={selectedCount === 0 || busy}
              className="rounded-lg shadow-sm flex items-center gap-2"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />} 
              Commit {selectedCount} Loan(s)
            </Button>
          </div>

          {preview.summary.alreadyImported > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p className="text-sm">
                <strong>{preview.summary.alreadyImported} duplicate loan row(s) were not recorded.</strong>{" "}
                The same loans and balance months already exist in the system and are hidden from the resolution table.
              </p>
            </div>
          )}

          <div className="max-h-[34rem] overflow-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[1050px] text-sm text-left border-collapse">
              <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10 border-b border-border/60">
                <tr>
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-12 text-center">Import</th>
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sheet / Row</th>
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Workbook Name</th>
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-64">System Member</th>
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Principal</th>
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Interest</th>
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Paid Before</th>
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Recent Payment</th>
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Prin. Balance</th>
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Int. Balance</th>
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Outstanding</th>
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {unresolvedRows.map((row) => {
                  const isResolved = Boolean(resolvedMatches[row.key])
                  const isReady = row.category === "Ready" || isResolved
                  const isExcluded = excluded.has(row.key)

                  return (
                    <tr 
                      key={row.key} 
                      className={`hover:bg-muted/10 transition-colors duration-150 ${isExcluded ? "opacity-55" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isReady && !isExcluded}
                          disabled={!isReady}
                          onChange={(event) => setExcluded((old) => {
                            const next = new Set(old)
                            event.target.checked ? next.delete(row.key) : next.add(row.key)
                            return next
                          })}
                          className="size-4 rounded border-border text-primary focus:ring-primary/40 focus:ring-2 accent-primary cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Info columns */}
                      <td className="p-3 font-mono text-xs text-muted-foreground align-middle">{row.sheet} / r{row.rowNumber}</td>
                      <td className="p-3 font-medium align-middle">{row.name}</td>
                      
                      {/* Member Selection */}
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
                            placeholder="Select matching member"
                            searchPlaceholder="Search name or member number…"
                            emptyText="No suggested registered member."
                            className="min-w-60"
                            size="sm"
                          />
                        )}
                      </td>

                      {/* Money fields */}
                      <td className="p-3 text-right font-medium align-middle">{peso.format(row.principal)}</td>
                      <td className="p-3 text-right text-muted-foreground align-middle">{peso.format(row.interest)}</td>
                      <td className="p-3 text-right text-muted-foreground align-middle">
                        {peso.format(row.principal + row.interest - row.principalBalance - row.interestBalance - row.currentPayment)}
                      </td>
                      <td className="p-3 text-right text-muted-foreground align-middle">{peso.format(row.currentPayment)}</td>
                      <td className="p-3 text-right font-semibold align-middle">{peso.format(row.principalBalance)}</td>
                      <td className="p-3 text-right text-muted-foreground align-middle">{peso.format(row.interestBalance)}</td>
                      
                      <td className="p-3 text-right align-middle">
                        <span className="font-semibold text-primary">{peso.format(row.principalBalance + row.interestBalance)}</span>
                        <div className="text-[10px] text-muted-foreground font-mono leading-none mt-0.5">{row.lastPaymentMonth}</div>
                      </td>

                      {/* Status Badging */}
                      <td className="p-3 align-middle">
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Resolved
                          </span>
                        ) : row.category === "Ready" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                            Ready
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 cursor-help"
                            title={row.reasons.join(" ")}
                          >
                            <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
                            {row.category}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {unresolvedRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-10 text-center text-sm text-muted-foreground">
                      No unresolved member matches. All importable rows are ready.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completion Screen */}
      {result && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-950/5 p-8 text-center max-w-xl mx-auto shadow-sm">
          <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
          <h2 className="mt-4 font-heading text-xl font-bold tracking-tight">Loan import complete</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Processed <span className="font-semibold text-foreground">{result.created}</span> legacy loans. Skipped <span className="font-semibold text-foreground">{result.skipped}</span> rows.
          </p>
          {result.errors.length > 0 && (
            <div className="mt-4 p-3 bg-destructive/5 rounded-lg border border-destructive/10 text-left">
              <p className="text-xs font-semibold text-destructive uppercase tracking-wider">Review Warnings</p>
              <ul className="mt-1 text-xs text-destructive/80 list-disc list-inside space-y-0.5">
                {result.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
          {result.batchToken && (
            <Button variant="outline" className="mt-5 gap-1.5" render={<Link to={`/loans/import-history/${result.batchToken}`} />}>
              <History className="size-4" /> View Batch Details
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
