import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { CheckCircle2, Download, FileSpreadsheet, Loader2, XCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FileUploader } from "@/components/shared/FileUploader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { SearchInput } from "@/components/shared/SearchInput"
import { WizardStepIndicator } from "@/components/shared/WizardStepIndicator"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { WORKBOOK_EXTENSIONS, WORKBOOK_MIME_TYPES } from "@/lib/upload-validation"
import {
  uploadMemberImportFile,
  selectMemberImportWorksheet,
  previewMemberImport,
  resolveMemberImportOffice,
  commitMemberImport,
  downloadMemberImportReport,
} from "@/services/member-import.service"
import { OfficeAliasResolutionPanel } from "@/features/members/components/OfficeAliasResolutionPanel"
import { DuplicateComparisonTable } from "@/features/members/components/DuplicateComparisonTable"
import { formatDateShort } from "@/utils/format"
import type {
  MemberColumnMapping,
  MemberImportCommitResponse,
  MemberImportPreviewResponse,
  MemberImportRowResult,
  MemberImportSheetResponse,
  MemberImportUploadResponse,
  MemberTargetField,
  MemberValidationCategory,
  UnresolvedOfficeGroup,
} from "@/types"

const STEPS = [
  "Upload Workbook",
  "Select Worksheet",
  "Detect Header Row",
  "Map Columns",
  "Preview Records",
  "Validate & Clean",
  "Resolve Offices",
  "Resolve Duplicates",
  "Review Beneficiaries",
  "Review Legacy Loan Data",
  "Confirm Import",
  "Import Summary",
]

const CATEGORY_TONE: Record<MemberValidationCategory, "success" | "warning" | "danger" | "info"> = {
  New: "success",
  Exact: "danger",
  Probable: "warning",
  Possible: "info",
  Invalid: "danger",
}

const ROWS_PER_PAGE = 10

// Stable reference so useMemo/derived arrays below don't recompute every
// render just because previewResult is still null (before Step 5).
const EMPTY_ROWS: MemberImportRowResult[] = []

export default function MemberImportWizardPage() {
  const navigate = useNavigate()

  const [step, setStep] = React.useState(1)

  // Step 1
  const [file, setFile] = React.useState<File | null>(null)
  const [fileResetKey, setFileResetKey] = React.useState(0)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [uploadResult, setUploadResult] = React.useState<MemberImportUploadResponse | null>(null)

  // Step 2
  const [selectedSheet, setSelectedSheet] = React.useState<string | null>(null)
  const [isSelectingSheet, setIsSelectingSheet] = React.useState(false)
  const [sheetResult, setSheetResult] = React.useState<MemberImportSheetResponse | null>(null)

  // Step 4
  const [mapping, setMapping] = React.useState<MemberColumnMapping>({})
  const [isPreviewing, setIsPreviewing] = React.useState(false)

  // Step 5/6
  const [previewResult, setPreviewResult] = React.useState<MemberImportPreviewResponse | null>(null)
  const [filterCategory, setFilterCategory] = React.useState<MemberValidationCategory | "All">("All")
  const [searchTerm, setSearchTerm] = React.useState("")
  const [page, setPage] = React.useState(1)

  // Shared row decisions: rowNumber -> 'create_new' | 'skip' | 'merge_into:{id}'
  const [resolutions, setResolutions] = React.useState<Record<number, string>>({})

  // Step 7
  const [unresolvedOffices, setUnresolvedOffices] = React.useState<UnresolvedOfficeGroup[]>([])

  // Step 11/12
  const [confirmChecked, setConfirmChecked] = React.useState(false)
  const [isCommitting, setIsCommitting] = React.useState(false)
  const [commitResult, setCommitResult] = React.useState<MemberImportCommitResponse | null>(null)

  const rows = previewResult?.rows ?? EMPTY_ROWS

  async function handleUpload() {
    if (!file) return
    setIsUploading(true)
    setUploadProgress(0)
    try {
      const result = await uploadMemberImportFile(file, setUploadProgress)
      setUploadResult(result)
      if (result.worksheets.length === 1) {
        setSelectedSheet(result.worksheets[0].name)
      }
      setStep(2)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSelectSheet() {
    if (!uploadResult) return
    setIsSelectingSheet(true)
    try {
      const result = await selectMemberImportWorksheet(uploadResult.token, selectedSheet)
      setSheetResult(result)
      setMapping(result.detectedMapping)
      setStep(3)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read this worksheet.")
    } finally {
      setIsSelectingSheet(false)
    }
  }

  async function handlePreview() {
    if (!uploadResult) return
    setIsPreviewing(true)
    try {
      const result = await previewMemberImport(uploadResult.token, mapping)
      setPreviewResult(result)
      setUnresolvedOffices(result.unresolvedOffices)
      setResolutions({})
      setPage(1)
      setStep(5)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed.")
    } finally {
      setIsPreviewing(false)
    }
  }

  async function refreshPreview() {
    if (!uploadResult) return
    const result = await previewMemberImport(uploadResult.token, mapping)
    setPreviewResult(result)
    setUnresolvedOffices(result.unresolvedOffices)
  }

  async function handleOfficeResolve(input: Parameters<typeof resolveMemberImportOffice>[1]) {
    if (!uploadResult) return
    try {
      const result = await resolveMemberImportOffice(uploadResult.token, input)
      setUnresolvedOffices(result.unresolvedOffices)
      await refreshPreview()
      toast.success(`Office mapping applied to ${result.rowsResolved} row(s).`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resolve this office.")
    }
  }

  async function handleConfirmImport() {
    if (!uploadResult) return
    setIsCommitting(true)
    try {
      const result = await commitMemberImport(uploadResult.token, resolutions)
      setCommitResult(result)
      setStep(12)
      toast.success(
        result.summary.pendingReview > 0
          ? `Imported member records were submitted for approval (${result.summary.pendingReview} pending).`
          : `${result.summary.membersCreated} member(s) successfully imported, approved, and activated.`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.")
    } finally {
      setIsCommitting(false)
    }
  }

  function resetWizard() {
    setStep(1)
    setFile(null)
    setFileResetKey((k) => k + 1)
    setUploadResult(null)
    setSelectedSheet(null)
    setSheetResult(null)
    setMapping({})
    setPreviewResult(null)
    setFilterCategory("All")
    setSearchTerm("")
    setPage(1)
    setResolutions({})
    setUnresolvedOffices([])
    setConfirmChecked(false)
    setCommitResult(null)
  }

  const summaryCounts = React.useMemo(() => {
    const counts: Record<MemberValidationCategory, number> = { New: 0, Exact: 0, Probable: 0, Possible: 0, Invalid: 0 }
    for (const r of rows) counts[r.category]++
    return counts
  }, [rows])

  // Search always runs against the full `rows` array (every record in this
  // worksheet, already loaded client-side from the preview response) — not
  // `pagedRows` — so it finds matches on any page, not just the one showing.
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const searchedRows = normalizedSearch
    ? rows.filter((r) => {
        const haystack = [r.data.first_name, r.data.last_name, r.data.middle_name, r.data.resolved_office_name, r.data.office_name_raw, r.data.position, r.data.email, r.data.cellphone_number]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return haystack.includes(normalizedSearch)
      })
    : rows
  const visibleRows = filterCategory === "All" ? searchedRows : searchedRows.filter((r) => r.category === filterCategory)
  const pagedRows = visibleRows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / ROWS_PER_PAGE))

  const invalidRows = rows.filter((r) => r.category === "Invalid")
  const ambiguousRows = rows.filter((r) => ["Exact", "Probable", "Possible"].includes(r.category) && r.duplicateCandidates.length > 0)
  const unresolvedAmbiguous = ambiguousRows.filter((r) => !resolutions[r.rowNumber])
  const beneficiaryRows = rows.filter((r) => r.data.beneficiary_1 || r.data.beneficiary_2)
  const legacyLoanRows = rows.filter((r) => r.data.legacy_loan_status !== "No legacy loan information")

  const excludedCount = Object.values(resolutions).filter((a) => a === "skip").length
  const importableCount = rows.filter((r) => {
    if (resolutions[r.rowNumber] === "skip") return false
    if (r.category === "Invalid") return false
    return true
  }).length

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="Member Profile Import" description="Import member records from the existing GCGEA Members Profile workbook — no changes to its layout required." />
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <WizardStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {step === 1 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 1 · Upload Workbook</h2>
          <FileUploader
            key={fileResetKey}
            label="Members Profile Workbook"
            description="Upload the existing GCGEA Members Profile file (XLSX, XLS, or CSV) — its layout does not need to change."
            accept={WORKBOOK_MIME_TYPES}
            acceptExtensions={WORKBOOK_EXTENSIONS}
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
          <div className="mt-4 flex justify-end">
            <Button disabled={!file || isUploading} onClick={handleUpload}>
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
            This workbook has {uploadResult.worksheets.length} worksheet{uploadResult.worksheets.length === 1 ? "" : "s"}. Choose the one to import — importing is done one worksheet at a time.
          </p>
          <RadioGroup value={selectedSheet ?? ""} onValueChange={setSelectedSheet} className="space-y-2">
            {uploadResult.worksheets.map((ws) => (
              <Label
                key={ws.name}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 text-sm has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
              >
                <span className="flex items-center gap-3">
                  <RadioGroupItem value={ws.name} />
                  <span className="font-medium text-foreground">{ws.name}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {ws.totalRows} row(s) · {ws.totalColumns} column(s)
                </span>
              </Label>
            ))}
          </RadioGroup>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button disabled={!selectedSheet || isSelectingSheet} onClick={handleSelectSheet}>
              {isSelectingSheet ? <Loader2 className="animate-spin" /> : null}
              {isSelectingSheet ? "Reading worksheet…" : "Continue"}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && sheetResult && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 3 · Detect Header Row</h2>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-foreground">
              Detected Header Row: <strong>{sheetResult.headerRowIndex}</strong>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {sheetResult.headerRowIndex > 1
                ? `Row 1 looks like a title or office label, not column headers — row ${sheetResult.headerRowIndex} was used instead.`
                : "Column headers start on the first row of this worksheet."}
            </p>
          </div>
          <div className="mt-3 overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {sheetResult.headers.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheetResult.sampleRows.slice(0, 3).map((row, i) => (
                  <TableRow key={i}>
                    {sheetResult.headers.map((h) => (
                      <TableCell key={h}>{row[h] != null ? String(row[h]) : "—"}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={() => setStep(4)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 4 && sheetResult && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Step 4 · Map Columns</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Columns were auto-detected ({sheetResult.totalRows} row(s) found). Adjust any mapping below if needed.
          </p>
          {sheetResult.unmatchedHeaders.length > 0 && (
            <p className="mb-3 text-xs text-muted-foreground">Ignored columns (not used): {sheetResult.unmatchedHeaders.join(", ")}</p>
          )}
          <div className="max-h-[28rem] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="bg-card">System Field</TableHead>
                  <TableHead className="bg-card">Required</TableHead>
                  <TableHead className="bg-card">Spreadsheet Column</TableHead>
                  <TableHead className="bg-card">Sample Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(sheetResult.targetFields) as MemberTargetField[]).map((field) => {
                  const mappedHeader = mapping[field]
                  const sample = mappedHeader ? sheetResult.sampleRows[0]?.[mappedHeader] : undefined
                  const required = sheetResult.requiredFields.includes(field)
                  return (
                    <TableRow key={field}>
                      <TableCell className="font-medium text-foreground">{sheetResult.targetFields[field]}</TableCell>
                      <TableCell>{required ? <StatusBadge label="Required" tone="danger" /> : <StatusBadge label="Optional" tone="neutral" />}</TableCell>
                      <TableCell>
                        <CommandSelect
                          size="sm"
                          className="w-56"
                          value={mapping[field] ?? "__none__"}
                          onValueChange={(v) => setMapping((prev) => ({ ...prev, [field]: v === "__none__" ? null : v }))}
                          options={[
                            { value: "__none__", label: "Do not import" },
                            ...sheetResult.headers.map((h) => ({ value: h, label: h })),
                          ]}
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
            <Button variant="outline" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button onClick={handlePreview} disabled={isPreviewing}>
              {isPreviewing ? <Loader2 className="animate-spin" /> : null}
              {isPreviewing ? "Validating…" : "Preview & Validate"}
            </Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 5 · Preview Records</h2>
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(Object.keys(summaryCounts) as MemberValidationCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setFilterCategory(cat)
                  setPage(1)
                }}
                className={`rounded-lg border p-3 text-left transition-colors ${filterCategory === cat ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
              >
                <p className="text-xs text-muted-foreground">{cat}</p>
                <p className="font-heading text-lg font-semibold text-foreground">{summaryCounts[cat]}</p>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilterCategory("All")
              setPage(1)
            }}
            className="mb-3"
          >
            Show All ({rows.length})
          </Button>
          <SearchInput
            value={searchTerm}
            onChange={(v) => {
              setSearchTerm(v)
              setPage(1)
            }}
            placeholder="Search by name, office, position, email, or contact number…"
            className="mb-3 max-w-sm"
          />
          {normalizedSearch && (
            <p className="mb-3 text-xs text-muted-foreground">
              {visibleRows.length} of {rows.length} record(s) match &quot;{searchTerm}&quot;
              {filterCategory !== "All" ? ` in ${filterCategory}` : ""} — searched across every row in this worksheet, not just this page.
            </p>
          )}
          <div className="max-h-[28rem] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="bg-card">Row</TableHead>
                  <TableHead className="bg-card">Full Name</TableHead>
                  <TableHead className="bg-card">Office</TableHead>
                  <TableHead className="bg-card">Position</TableHead>
                  <TableHead className="bg-card">Birthdate</TableHead>
                  <TableHead className="bg-card">Age</TableHead>
                  <TableHead className="bg-card">Contact</TableHead>
                  <TableHead className="bg-card">Sex</TableHead>
                  <TableHead className="bg-card">Beneficiaries</TableHead>
                  <TableHead className="bg-card">Legacy Loan</TableHead>
                  <TableHead className="bg-card">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((r) => (
                  <TableRow key={r.rowNumber}>
                    <TableCell>{r.rowNumber + 1}</TableCell>
                    <TableCell>
                      {r.data.first_name} {r.data.last_name}
                    </TableCell>
                    <TableCell>{r.data.resolved_office_name ?? r.data.office_name_raw ?? "—"}</TableCell>
                    <TableCell>{r.data.position ?? "—"}</TableCell>
                    <TableCell>{r.data.birthdate ? formatDateShort(r.data.birthdate) : "—"}</TableCell>
                    <TableCell>{r.data.computed_age ?? "—"}</TableCell>
                    <TableCell>{r.data.cellphone_number ?? "—"}</TableCell>
                    <TableCell>{r.data.sex ?? "—"}</TableCell>
                    <TableCell>{[r.data.beneficiary_1, r.data.beneficiary_2].filter(Boolean).length}</TableCell>
                    <TableCell>{r.data.legacy_loan_status === "No legacy loan information" ? "—" : r.data.legacy_loan_status}</TableCell>
                    <TableCell>
                      <StatusBadge label={r.category} tone={CATEGORY_TONE[r.category]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
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
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 6 · Validate &amp; Clean</h2>
          {invalidRows.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No invalid rows" description="Every row has the minimum required fields (surname, first name, birthdate)." />
          ) : (
            <div className="space-y-1.5">
              <p className="mb-2 text-sm font-semibold text-destructive">Invalid Rows ({invalidRows.length}) — missing required data</p>
              {invalidRows.map((r) => (
                <div key={r.rowNumber} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-sm">
                  <span>
                    Row {r.rowNumber + 1}: {r.data.first_name} {r.data.last_name} — {r.reasons.join(", ")}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setResolutions((prev) => ({ ...prev, [r.rowNumber]: prev[r.rowNumber] === "skip" ? "" : "skip" }))}
                  >
                    {resolutions[r.rowNumber] === "skip" ? "Restore" : "Exclude"}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {rows.some((r) => r.reasons.length > 0 && r.category !== "Invalid") && (
            <div className="mt-4 space-y-1.5">
              <p className="mb-2 text-sm font-semibold text-warning">Rows with warnings</p>
              {rows
                .filter((r) => r.reasons.length > 0 && r.category !== "Invalid")
                .map((r) => (
                  <div key={r.rowNumber} className="rounded-lg border border-warning/20 bg-warning/5 p-2.5 text-sm">
                    Row {r.rowNumber + 1}: {r.data.first_name} {r.data.last_name} — {r.reasons.join("; ")}
                  </div>
                ))}
            </div>
          )}
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(5)}>
              Back
            </Button>
            <Button onClick={() => setStep(7)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 7 · Resolve Offices</h2>
          <OfficeAliasResolutionPanel groups={unresolvedOffices} onResolve={handleOfficeResolve} />
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(6)}>
              Back
            </Button>
            <Button onClick={() => setStep(8)} disabled={unresolvedOffices.length > 0}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 8 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 8 · Resolve Duplicates</h2>
          {ambiguousRows.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No possible duplicates" description="Every row is a new record with no matching existing member." />
          ) : (
            <div className="space-y-3">
              {unresolvedAmbiguous.length > 0 && (
                <p className="text-xs font-medium text-warning">{unresolvedAmbiguous.length} row(s) still need a decision.</p>
              )}
              {ambiguousRows.map((r) => (
                <DuplicateComparisonTable
                  key={r.rowNumber}
                  row={r}
                  resolution={resolutions[r.rowNumber]}
                  onChange={(action) => setResolutions((prev) => ({ ...prev, [r.rowNumber]: action }))}
                />
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(7)}>
              Back
            </Button>
            <Button onClick={() => setStep(9)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 9 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 9 · Review Beneficiaries</h2>
          {beneficiaryRows.length === 0 ? (
            <EmptyState title="No beneficiaries in this worksheet" description="Neither dependent/beneficiary column had any names to import." />
          ) : (
            <div className="overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Beneficiary 1</TableHead>
                    <TableHead>Beneficiary 2</TableHead>
                    <TableHead>Warning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beneficiaryRows.map((r) => {
                    const duplicateWarning = r.reasons.find((reason) => reason.toLowerCase().includes("duplicate beneficiary"))
                    return (
                      <TableRow key={r.rowNumber}>
                        <TableCell>
                          {r.data.first_name} {r.data.last_name}
                        </TableCell>
                        <TableCell>{r.data.beneficiary_1 ?? "—"}</TableCell>
                        <TableCell>{r.data.beneficiary_2 ?? "—"}</TableCell>
                        <TableCell>{duplicateWarning ? <StatusBadge label="Duplicate Names" tone="warning" /> : "—"}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Relationships are unknown for imported beneficiaries and can be filled in later from the member&apos;s profile.
          </p>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(8)}>
              Back
            </Button>
            <Button onClick={() => setStep(10)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 10 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 10 · Review Legacy Loan Data</h2>
          {legacyLoanRows.length === 0 ? (
            <EmptyState title="No legacy loan data" description="No rows have values in the CASH PABAON / Loan Start / Solidarity Assistance Loan columns." />
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                These rows have legacy loan figures. They will be staged for manual review only — no active loan is created automatically.
              </p>
              <div className="overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cash Pabaon</TableHead>
                      <TableHead>Loan Start</TableHead>
                      <TableHead>Solidarity Loan</TableHead>
                      <TableHead>Months</TableHead>
                      <TableHead>Monthly Amort</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {legacyLoanRows.map((r) => (
                      <TableRow key={r.rowNumber}>
                        <TableCell>
                          {r.data.first_name} {r.data.last_name}
                        </TableCell>
                        <TableCell>
                          <StatusBadge label={r.data.legacy_loan_status} tone={r.data.legacy_loan_status === "Complete legacy loan information" ? "warning" : "info"} />
                        </TableCell>
                        <TableCell>{r.data.legacy_loan.cash_pabaon ?? "—"}</TableCell>
                        <TableCell>{r.data.legacy_loan.loan_start ?? "—"}</TableCell>
                        <TableCell>{r.data.legacy_loan.solidarity_assistance_loan ?? "—"}</TableCell>
                        <TableCell>{r.data.legacy_loan.no_of_months ?? "—"}</TableCell>
                        <TableCell>{r.data.legacy_loan.monthly_amort ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(9)}>
              Back
            </Button>
            <Button onClick={() => setStep(11)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 11 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 11 · Confirm Import</h2>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat label="Total Rows" value={String(rows.length)} />
            <SummaryStat label="New" value={String(summaryCounts.New)} />
            <SummaryStat label="Possible Duplicates" value={String(summaryCounts.Possible + summaryCounts.Probable + summaryCounts.Exact)} />
            <SummaryStat label="Invalid" value={String(summaryCounts.Invalid)} />
          </div>
          <p className="text-sm text-muted-foreground">
            You are about to import <strong className="text-foreground">{importableCount}</strong> record(s)
            {excludedCount > 0 && (
              <>
                {" "}
                (<strong className="text-foreground">{excludedCount}</strong> excluded)
              </>
            )}
            . Imported members are <strong className="text-foreground">automatically approved and activated</strong> — this cannot be undone from this wizard.
          </p>
          <label className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <Checkbox checked={confirmChecked} onCheckedChange={(v) => setConfirmChecked(!!v)} />
            I confirm that I have reviewed the member records and import decisions.
          </label>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(10)} disabled={isCommitting}>
              Back
            </Button>
            <Button onClick={handleConfirmImport} disabled={!confirmChecked || isCommitting || importableCount === 0}>
              {isCommitting ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
              {isCommitting ? "Importing…" : "Confirm Import"}
            </Button>
          </div>
        </div>
      )}

      {step === 12 && commitResult && (
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Import Complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <strong className="text-foreground">{commitResult.summary.membersCreated}</strong> member(s) created,{" "}
            <strong className="text-foreground">{commitResult.summary.membersMerged}</strong> merged,{" "}
            <strong className="text-foreground">{commitResult.summary.beneficiariesCreated}</strong> beneficiary record(s), and{" "}
            <strong className="text-foreground">{commitResult.summary.legacyLoanDraftsCreated}</strong> legacy loan draft(s) staged for review.
          </p>
          {(commitResult.summary.membersSkipped > 0 || commitResult.summary.failedRows > 0) && (
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-warning">
              <XCircle className="size-3.5" /> {commitResult.summary.membersSkipped} skipped · {commitResult.summary.failedRows} failed
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/members")}>View Imported Members</Button>
            <Button
              variant="outline"
              onClick={() => uploadResult && downloadMemberImportReport(uploadResult.token, `member-import-${uploadResult.token}.csv`)}
            >
              <Download /> Download Import Report
            </Button>
            <Button variant="outline" onClick={() => navigate("/members/import-history")}>
              View Import History
            </Button>
            <Button variant="outline" onClick={resetWizard}>
              Import Another Workbook
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
