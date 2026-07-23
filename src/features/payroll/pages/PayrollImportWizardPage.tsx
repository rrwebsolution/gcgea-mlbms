import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { CheckCircle2, Download, FileSpreadsheet, Info, Loader2, XCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FileUploader } from "@/components/shared/FileUploader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { WizardStepIndicator } from "@/components/shared/WizardStepIndicator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { SPREADSHEET_EXTENSIONS, SPREADSHEET_MIME_TYPES } from "@/lib/upload-validation"
import {
  uploadPayrollFile,
  selectPayrollSheet,
  previewPayrollImport,
  commitPayrollImport,
  downloadPayrollImportReport,
} from "@/services/payroll-import.service"
import { ConflictResolutionDialog } from "@/features/payroll/components/ConflictResolutionDialog"
import { useAuth } from "@/contexts/AuthContext"
import { formatCurrency } from "@/utils/format"
import { cn } from "@/lib/utils"
import type { PayrollColumnMapping, PayrollCommitResponse, PayrollImportRowResult, PayrollTargetField, PayrollUploadResponse } from "@/types"

const STEPS = ["Upload File", "Select Worksheet", "Map Columns", "Preview & Validate", "Resolve Conflicts", "Confirm Import", "Summary"]

type Category = "Valid" | "Warning" | "Invalid"
const CATEGORY_TONE: Record<Category, "success" | "warning" | "danger"> = { Valid: "success", Warning: "warning", Invalid: "danger" }

const COMMIT_STAGES = [
  { label: "Reading Rows", pct: 10 },
  { label: "Creating Contributions", pct: 45 },
  { label: "Creating Loan Payments", pct: 70 },
  { label: "Updating Balances", pct: 90 },
]

function num(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export default function PayrollImportWizardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [step, setStep] = React.useState(1)
  const [payrollPeriod, setPayrollPeriod] = React.useState("")
  const [payrollReference, setPayrollReference] = React.useState("")
  const [file, setFile] = React.useState<File | null>(null)
  // FileUploader keeps its own internal "localFile" state that doesn't clear
  // just because `file` goes back to null — bump this to force it to remount,
  // same pattern used by MemberRegistrationPage's document uploaders.
  const [fileResetKey, setFileResetKey] = React.useState(0)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [uploadResult, setUploadResult] = React.useState<PayrollUploadResponse | null>(null)
  const [isSwitchingSheet, setIsSwitchingSheet] = React.useState(false)
  const [mapping, setMapping] = React.useState<PayrollColumnMapping>({})
  const [isPreviewing, setIsPreviewing] = React.useState(false)
  const [rows, setRows] = React.useState<PayrollImportRowResult[]>([])
  const [batchWarnings, setBatchWarnings] = React.useState<string[]>([])
  const [filterCategory, setFilterCategory] = React.useState<Category | "All">("All")
  const [excludedRows, setExcludedRows] = React.useState<Set<number>>(new Set())
  const [resolvedMatches, setResolvedMatches] = React.useState<Record<number, string>>({})
  const [conflictRow, setConflictRow] = React.useState<PayrollImportRowResult | null>(null)
  const [includeWarnings, setIncludeWarnings] = React.useState(true)
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false)
  const [isCommitting, setIsCommitting] = React.useState(false)
  const [commitStageIndex, setCommitStageIndex] = React.useState(0)
  const [commitResult, setCommitResult] = React.useState<PayrollCommitResponse | null>(null)

  async function handleUpload() {
    if (!file || !payrollPeriod) return
    setIsUploading(true)
    setUploadProgress(0)
    try {
      const result = await uploadPayrollFile(file, payrollPeriod, payrollReference || undefined, setUploadProgress)
      setUploadResult(result)
      setMapping(result.detectedMapping)
      // Skip the worksheet picker entirely for single-sheet files — go
      // straight to Map Columns.
      setStep(result.sheetNames.length > 1 ? 2 : 3)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSelectSheet(sheet: string) {
    if (!uploadResult || sheet === uploadResult.selectedSheet) return
    setIsSwitchingSheet(true)
    try {
      const result = await selectPayrollSheet(uploadResult.token, sheet)
      setUploadResult(result)
      setMapping(result.detectedMapping)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch worksheet.")
    } finally {
      setIsSwitchingSheet(false)
    }
  }

  async function handlePreview() {
    if (!uploadResult) return
    setIsPreviewing(true)
    try {
      const result = await previewPayrollImport(uploadResult.token, mapping)
      setRows(result.rows)
      setBatchWarnings(result.batchWarnings)
      setExcludedRows(new Set())
      setResolvedMatches({})
      setStep(4)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed.")
    } finally {
      setIsPreviewing(false)
    }
  }

  const summaryCounts = React.useMemo(() => {
    const counts: Record<Category, number> = { Valid: 0, Warning: 0, Invalid: 0 }
    for (const r of rows) counts[r.category]++
    return counts
  }, [rows])

  const visibleRows = filterCategory === "All" ? rows : rows.filter((r) => r.category === filterCategory)
  // No Invalid row blocks Confirm Import — whatever the reason (unknown
  // member, duplicate name match, missing loan, rejected registration,
  // etc.), an unresolved/unexcluded Invalid row is simply skipped at commit
  // time: no contribution/loan payment record gets created for it, and it's
  // labeled "No System Record" so office staff can see it wasn't recorded.
  // Step 4 still lets the user resolve (match to a member) or exclude a row,
  // but neither is required to proceed.

  // Step 4 display lists: every still-unresolved Invalid row, whether excluded
  // or not, so an excluded row stays visible with a "Restore" toggle instead
  // of disappearing. Split purely for on-screen grouping — both resolve the
  // same way (search + pick a member) or can be excluded.
  const ambiguousRows = rows.filter((r) => r.matchCandidates.length > 0 && !resolvedMatches[r.rowNumber])
  const otherInvalidRows = rows.filter((r) => r.category === "Invalid" && r.matchCandidates.length === 0 && !resolvedMatches[r.rowNumber])
  const unresolvedInvalidRows = rows.filter(
    (r) => r.category === "Invalid" && !resolvedMatches[r.rowNumber] && !excludedRows.has(r.rowNumber)
  )

  const importableRows = rows.filter((r) => {
    if (excludedRows.has(r.rowNumber)) return false
    const resolved = Boolean(resolvedMatches[r.rowNumber])
    if (!resolved) {
      if (r.category === "Invalid") return false
      if (r.category === "Warning" && !includeWarnings) return false
    }
    return true
  })
  const totalImportAmount = importableRows.reduce((sum, r) => {
    return sum + (num(r.data.principal) ?? 0) + (num(r.data.interest) ?? 0) + (num(r.data.monthly_dues) ?? 0) + (num(r.data.pabaon) ?? 0)
  }, 0)
  const loanPaymentRowCount = importableRows.filter((r) => (num(r.data.principal) ?? 0) > 0 || (num(r.data.interest) ?? 0) > 0).length
  const contributionRowCount = importableRows.filter((r) => (num(r.data.monthly_dues) ?? 0) > 0).length
  const pabaonRowCount = importableRows.filter((r) => (num(r.data.pabaon) ?? 0) > 0).length

  // Invalid rows never block — they're just skipped at commit time. The only
  // requirement is that there's at least one row actually worth importing.
  const canConfirmImport = importableRows.length > 0

  async function handleConfirmImport() {
    if (!uploadResult || !user) return
    setIsCommitting(true)
    setCommitStageIndex(0)
    const stageTimer = window.setInterval(() => {
      setCommitStageIndex((i) => (i < COMMIT_STAGES.length - 1 ? i + 1 : i))
    }, 700)
    try {
      const result = await commitPayrollImport(uploadResult.token, {
        resolvedMatches,
        excludedRows: Array.from(excludedRows),
        includeWarnings,
      })
      window.clearInterval(stageTimer)
      setCommitStageIndex(COMMIT_STAGES.length)
      setCommitResult(result)
      setShowConfirmDialog(false)
      setStep(7)
      toast.success(`Payroll import committed — ${result.summary.importedMembers} member(s) processed.`)
    } catch (err) {
      window.clearInterval(stageTimer)
      toast.error(err instanceof Error ? err.message : "Import failed.")
    } finally {
      setIsCommitting(false)
    }
  }

  function resetWizard() {
    setStep(1)
    setPayrollPeriod("")
    setPayrollReference("")
    setFile(null)
    setFileResetKey((k) => k + 1)
    setUploadResult(null)
    setMapping({})
    setRows([])
    setBatchWarnings([])
    setExcludedRows(new Set())
    setResolvedMatches({})
    setIncludeWarnings(true)
    setShowConfirmDialog(false)
    setCommitResult(null)
  }

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="Payroll Deduction Import" description="Import payroll deductions using the official GCGEA Excel or CSV template." />
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <WizardStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {step === 1 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 1 · Upload File</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="payroll-period">
                Payroll Period <span className="text-destructive">*</span>
              </Label>
              <Input id="payroll-period" type="month" value={payrollPeriod} onChange={(e) => setPayrollPeriod(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payroll-reference">Payroll Reference</Label>
              <Input
                id="payroll-reference"
                placeholder="Optional — e.g. PR-2026-07"
                value={payrollReference}
                onChange={(e) => setPayrollReference(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <FileUploader
              key={fileResetKey}
              label="Payroll Deduction File"
              description="Upload the payroll office's existing Excel file — no changes to its layout are required."
              accept={SPREADSHEET_MIME_TYPES}
              acceptExtensions={SPREADSHEET_EXTENSIONS}
              fileName={file?.name}
              status={isUploading ? "uploading" : "idle"}
              progress={uploadProgress}
              onUpload={setFile}
              onRemove={() => {
                setFile(null)
                setFileResetKey((k) => k + 1)
              }}
              onReplace={setFile}
              required
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={!file || !payrollPeriod || isUploading} onClick={handleUpload}>
              {isUploading ? <Loader2 className="animate-spin" /> : null}
              {isUploading ? "Uploading…" : "Continue"}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && uploadResult && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Step 2 · Select Worksheet</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            This file has {uploadResult.sheetNames.length} worksheets. Pick the one with the payroll data you want to import — office/department
            tabs, summary sheets, etc. all show up here.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {uploadResult.sheetNames.map((name) => {
              const isSelected = name === uploadResult.selectedSheet
              const nameHeader = uploadResult.detectedMapping.name
              const previewValue = nameHeader ? uploadResult.sampleRows[0]?.[nameHeader] : undefined
              return (
                <button
                  key={name}
                  type="button"
                  disabled={isSwitchingSheet}
                  onClick={() => handleSelectSheet(name)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors disabled:opacity-60",
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  )}
                >
                  <p className="font-medium text-foreground">{name}</p>
                  {isSelected && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isSwitchingSheet ? (
                        "Loading…"
                      ) : (
                        <>
                          {uploadResult.totalRows} row(s) found
                          {previewValue != null && <> · e.g. &quot;{String(previewValue)}&quot;</>}
                        </>
                      )}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={isSwitchingSheet}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && uploadResult && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Step 3 · Map Columns</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Columns were auto-detected from the uploaded file ({uploadResult.totalRows} row(s) found). Adjust any mapping below if needed.
          </p>
          {uploadResult.unmatchedHeaders.length > 0 && (
            <p className="mb-3 text-xs text-muted-foreground">
              Ignored columns (not used): {uploadResult.unmatchedHeaders.join(", ")}
            </p>
          )}
          <div className="overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>System Field</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Spreadsheet Column</TableHead>
                  <TableHead>Sample Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(uploadResult.targetFields) as PayrollTargetField[]).map((field) => {
                  const mappedHeader = mapping[field]
                  const sample = mappedHeader ? uploadResult.sampleRows[0]?.[mappedHeader] : undefined
                  const required = uploadResult.requiredFields.includes(field)
                  return (
                    <TableRow key={field}>
                      <TableCell className="font-medium text-foreground">{uploadResult.targetFields[field]}</TableCell>
                      <TableCell>{required ? <StatusBadge label="Required" tone="danger" /> : <StatusBadge label="Optional" tone="neutral" />}</TableCell>
                      <TableCell>
                        <CommandSelect
                          size="sm"
                          className="w-56"
                          value={mapping[field] ?? "__none__"}
                          onValueChange={(v) => setMapping((prev) => ({ ...prev, [field]: v === "__none__" ? null : v }))}
                          options={[{ value: "__none__", label: "Do not import" }, ...uploadResult.headers.map((h) => ({ value: h, label: h }))]}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{sample != null ? String(sample) : "—"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(uploadResult.sheetNames.length > 1 ? 2 : 1)}>
              Back
            </Button>
            <Button onClick={handlePreview} disabled={isPreviewing || isSwitchingSheet}>
              {isPreviewing ? <Loader2 className="animate-spin" /> : null}
              {isPreviewing ? "Validating…" : "Preview & Validate"}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 4 · Preview & Validate</h2>
          {batchWarnings.length > 0 && (
            <div className="mb-3 space-y-1 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
              {batchWarnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(summaryCounts) as Category[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`rounded-lg border p-3 text-left transition-colors ${filterCategory === cat ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
              >
                <p className="text-xs text-muted-foreground">{cat}</p>
                <p className="font-heading text-lg font-semibold text-foreground">{summaryCounts[cat]}</p>
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setFilterCategory("All")} className="mb-3">
            Show All ({rows.length})
          </Button>
          <div className="max-h-[28rem] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="bg-card">Member</TableHead>
                  <TableHead className="bg-card">Loan Status</TableHead>
                  <TableHead className="bg-card">Principal</TableHead>
                  <TableHead className="bg-card">Interest</TableHead>
                  <TableHead className="bg-card">Monthly Dues</TableHead>
                  <TableHead className="bg-card">Pabaon</TableHead>
                  <TableHead className="bg-card">Total Remit</TableHead>
                  <TableHead className="bg-card">Loan Balance</TableHead>
                  <TableHead className="bg-card">Validation Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((r) => (
                  <TableRow key={r.rowNumber}>
                    <TableCell>{r.memberName || String(r.data.name ?? "—")}</TableCell>
                    <TableCell className="text-muted-foreground">{String(r.data.loan_remarks ?? "—")}</TableCell>
                    <TableCell>{num(r.data.principal) != null ? formatCurrency(num(r.data.principal)!) : "—"}</TableCell>
                    <TableCell>{num(r.data.interest) != null ? formatCurrency(num(r.data.interest)!) : "—"}</TableCell>
                    <TableCell>{num(r.data.monthly_dues) != null ? formatCurrency(num(r.data.monthly_dues)!) : "—"}</TableCell>
                    <TableCell>{num(r.data.pabaon) != null ? formatCurrency(num(r.data.pabaon)!) : "—"}</TableCell>
                    <TableCell>{num(r.data.total_remit) != null ? formatCurrency(num(r.data.total_remit)!) : "—"}</TableCell>
                    <TableCell>{num(r.data.total_balance_current) != null ? formatCurrency(num(r.data.total_balance_current)!) : "—"}</TableCell>
                    <TableCell>
                      {r.category === "Invalid" && !resolvedMatches[r.rowNumber] ? (
                        <StatusBadge label="No System Record" tone="neutral" />
                      ) : (
                        <StatusBadge label={r.category} tone={CATEGORY_TONE[r.category]} />
                      )}
                      {resolvedMatches[r.rowNumber] && <StatusBadge label="Resolved" tone="info" className="ml-1" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button onClick={() => setStep(5)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Step 5 · Resolve Conflicts (Optional)</h2>
          {ambiguousRows.length === 0 && otherInvalidRows.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No conflicts found" description="Every row matched exactly one member." />
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Invalid rows below don&apos;t block importing the rest of the batch — any left unresolved are simply skipped and labeled
                &quot;No System Record&quot; (no contribution or loan payment gets created for them). Resolve one only if you want to match it to
                a member.
              </p>
              <div className="space-y-4">
                {ambiguousRows.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-warning">Duplicate Member Matches ({ambiguousRows.length})</p>
                    <ul className="space-y-1.5">
                      {ambiguousRows.map((r) => (
                        <li
                          key={r.rowNumber}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/20 bg-warning/5 p-2.5 text-sm"
                        >
                          <span>
                            Row {r.rowNumber + 1}: &quot;{String(r.data.name)}&quot; matches {r.matchCandidates.length} members
                            {excludedRows.has(r.rowNumber) && <StatusBadge label="Excluded" tone="neutral" className="ml-1.5" />}
                          </span>
                          <span className="flex gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => setConflictRow(r)}>
                              Resolve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExcludedRows((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(r.rowNumber)) next.delete(r.rowNumber)
                                  else next.add(r.rowNumber)
                                  return next
                                })
                              }
                            >
                              {excludedRows.has(r.rowNumber) ? "Restore" : "Exclude"}
                            </Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {otherInvalidRows.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-foreground">Invalid Rows — No System Record ({otherInvalidRows.length})</p>
                    <ul className="space-y-1.5">
                      {otherInvalidRows.map((r) => (
                        <li
                          key={r.rowNumber}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-sm"
                        >
                          <span>
                            Row {r.rowNumber + 1}: {String(r.data.name ?? "—")} — {r.reasons.join(", ")}
                            {excludedRows.has(r.rowNumber) && <StatusBadge label="Excluded" tone="neutral" className="ml-1.5" />}
                          </span>
                          <span className="flex gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => setConflictRow(r)}>
                              Resolve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExcludedRows((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(r.rowNumber)) next.delete(r.rowNumber)
                                  else next.add(r.rowNumber)
                                  return next
                                })
                              }
                            >
                              {excludedRows.has(r.rowNumber) ? "Restore" : "Exclude"}
                            </Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(4)}>
              Back
            </Button>
            <Button onClick={() => setStep(6)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 6 · Confirm Import</h2>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat label="Total Rows" value={String(rows.length)} />
            <SummaryStat label="Valid Rows" value={String(summaryCounts.Valid)} tone="success" />
            <SummaryStat label="Warning Rows" value={String(summaryCounts.Warning)} tone="warning" />
            <SummaryStat label="Invalid Rows" value={String(summaryCounts.Invalid)} tone="danger" />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={includeWarnings} onCheckedChange={(v) => setIncludeWarnings(!!v)} />
            Include rows with warnings
          </label>

          {unresolvedInvalidRows.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                {unresolvedInvalidRows.length} row(s) are invalid and will be skipped — labeled &quot;No System Record&quot;, with no
                contribution or loan payment created for them. Go back to <strong>Step 5</strong> to resolve or exclude them if needed.
              </span>
            </div>
          )}

          <p className="mt-4 text-sm text-muted-foreground">
            You are about to import <strong className="text-foreground">{importableRows.length}</strong> row(s) totaling{" "}
            <strong className="text-foreground">{formatCurrency(totalImportAmount)}</strong> in payroll deductions.
          </p>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(5)} disabled={isCommitting}>
              Back
            </Button>
            <Button onClick={() => setShowConfirmDialog(true)} disabled={!canConfirmImport || isCommitting}>
              <FileSpreadsheet />
              Confirm Import
            </Button>
          </div>
        </div>
      )}

      {step === 7 && commitResult && (
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Import Complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {commitResult.summary.loanPaymentsImported} loan payment(s), {commitResult.summary.contributionsCreated} contribution(s), and{" "}
            {commitResult.summary.deductionsCreated} Pabaon record(s) created — totaling{" "}
            <strong className="text-foreground">{formatCurrency(commitResult.summary.totalPayrollDeduction)}</strong>.
          </p>
          {(commitResult.summary.skippedRows > 0 || commitResult.summary.errors > 0) && (
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-warning">
              <XCircle className="size-3.5" /> {commitResult.summary.skippedRows} skipped · {commitResult.summary.errors} failed
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/payroll-deductions/history")}>View Import History</Button>
            <Button
              variant="outline"
              onClick={() => uploadResult && downloadPayrollImportReport(uploadResult.token, `payroll-import-${payrollPeriod}.csv`)}
            >
              <Download /> Download Import Report
            </Button>
            <Button variant="outline" onClick={resetWizard}>
              Import Another File
            </Button>
          </div>
        </div>
      )}

      <ConflictResolutionDialog
        row={conflictRow}
        onOpenChange={(open) => !open && setConflictRow(null)}
        onResolve={(rowNumber, memberId) => {
          setResolvedMatches((prev) => ({ ...prev, [rowNumber]: memberId }))
          setConflictRow(null)
        }}
      />

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={(open) => !isCommitting && setShowConfirmDialog(open)}
        title={isCommitting ? "Importing Payroll…" : `Import ${importableRows.length} payroll record(s)?`}
        description={
          isCommitting
            ? "Please wait — do not close this window until the import finishes."
            : `This creates loan payment, contribution, and Pabaon records for payroll period ${payrollPeriod}. This cannot be undone from here — use Rollback from Import History afterward if something needs reversing.`
        }
        confirmLabel={isCommitting ? "Importing…" : "Import"}
        isLoading={isCommitting}
        onConfirm={handleConfirmImport}
      >
        {isCommitting ? (
          <Progress value={commitStageIndex >= COMMIT_STAGES.length ? 100 : COMMIT_STAGES[commitStageIndex].pct}>
            <div className="flex w-full items-center justify-between">
              <ProgressLabel>{commitStageIndex >= COMMIT_STAGES.length ? "Finishing" : COMMIT_STAGES[commitStageIndex].label}</ProgressLabel>
              <ProgressValue />
            </div>
          </Progress>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-border p-2.5">
              <p className="text-xs text-muted-foreground">Loan Payments</p>
              <p className="font-heading text-base font-semibold text-foreground">{loanPaymentRowCount}</p>
            </div>
            <div className="rounded-lg border border-border p-2.5">
              <p className="text-xs text-muted-foreground">Contribution Records</p>
              <p className="font-heading text-base font-semibold text-foreground">{contributionRowCount}</p>
            </div>
            <div className="rounded-lg border border-border p-2.5">
              <p className="text-xs text-muted-foreground">Pabaon Records</p>
              <p className="font-heading text-base font-semibold text-foreground">{pabaonRowCount}</p>
            </div>
            <div className="rounded-lg border border-border p-2.5">
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="font-heading text-base font-semibold text-foreground">{formatCurrency(totalImportAmount)}</p>
            </div>
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "danger" }) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-destructive" : "text-foreground"
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-heading text-lg font-semibold", toneClass)}>{value}</p>
    </div>
  )
}
