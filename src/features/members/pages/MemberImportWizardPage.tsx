import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2, Download, FileSpreadsheet, Loader2, XCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { FileUploader } from "@/components/shared/FileUploader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { SearchInput } from "@/components/shared/SearchInput"
import { WizardStepIndicator } from "@/components/shared/WizardStepIndicator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { DataTable } from "@/components/shared/DataTable"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ColumnDef } from "@tanstack/react-table"
import { WORKBOOK_EXTENSIONS, WORKBOOK_MIME_TYPES } from "@/lib/upload-validation"
import type { ApiValidationError } from "@/lib/api"
import {
  uploadMemberImportFile,
  selectMemberImportWorksheet,
  previewMemberImport,
  resolveMemberImportOffice,
  commitMemberImport,
  downloadMemberImportReport,
} from "@/services/member-import.service"
import { OfficeAliasResolutionPanel } from "@/features/members/components/OfficeAliasResolutionPanel"
import { FixInvalidMemberRowDialog, type MemberRowEdit } from "@/features/members/components/FixInvalidMemberRowDialog"
import { calculateAge, formatDateShort } from "@/utils/format"
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

// Stable reference so useMemo/derived arrays below don't recompute every
// render just because previewResult is still null (before Step 5).
const EMPTY_ROWS: MemberImportRowResult[] = []

export default function MemberImportWizardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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

  // Always empty now that Resolve Duplicates was removed — kept only because
  // commitMemberImport()'s signature still expects a per-row resolution map.
  const [resolutions] = React.useState<Record<number, string>>({})

  // Corrections made to rows across the wizard (Step 5 fixes, Step 8 beneficiary edits, etc.) — partial since a row may only ever get some fields touched
  const [rowEdits, setRowEdits] = React.useState<Record<number, Partial<MemberRowEdit>>>({})
  const [fixDialogRow, setFixDialogRow] = React.useState<MemberImportRowResult | null>(null)

  // Step 7
  const [unresolvedOffices, setUnresolvedOffices] = React.useState<UnresolvedOfficeGroup[]>([])

  // Step 11/12
  const [confirmChecked, setConfirmChecked] = React.useState(false)
  const [isCommitting, setIsCommitting] = React.useState(false)
  const [commitResult, setCommitResult] = React.useState<MemberImportCommitResponse | null>(null)

  const rows = previewResult?.rows ?? EMPTY_ROWS

  function isRowFixed(r: MemberImportRowResult): boolean {
    const edit = rowEdits[r.rowNumber]
    if (!edit) return false
    return Boolean(edit.first_name?.trim() && edit.last_name?.trim() && edit.birthdate?.trim())
  }

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
      setRowEdits({})
      setStep(5)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed.")
    } finally {
      setIsPreviewing(false)
    }
  }

  async function handleOfficeResolve(input: Parameters<typeof resolveMemberImportOffice>[1]) {
    if (!uploadResult) return
    try {
      const result = await resolveMemberImportOffice(uploadResult.token, input)
      // Not refetching /preview here on purpose: that endpoint deletes and
      // re-validates every row from scratch on the backend, which only
      // re-resolves an office via a saved alias or exact name match. If
      // "Remember this mapping" was left unchecked (or the match doesn't
      // round-trip through alias lookup), that silently undoes the direct
      // row resolution this endpoint just applied and Continue stays stuck
      // disabled with no visible error. This response's unresolvedOffices
      // reflects a direct, unconditional row write — trust it instead.
      setUnresolvedOffices(result.unresolvedOffices)
      // A "Create New Office" resolution adds a row to the offices table —
      // invalidate so every OfficeCommandSelect (other unresolved groups on
      // this same screen, the Fix Invalid Record dialog, etc.) picks it up
      // as a selectable match right away instead of showing stale cached data.
      queryClient.invalidateQueries({ queryKey: ["offices"] })
      queryClient.invalidateQueries({ queryKey: ["offices", "all"] })
      toast.success(`Office mapping applied to ${result.rowsResolved} row(s).`)
    } catch (err) {
      const fieldErrors = (err as ApiValidationError)?.errors
      const detail = fieldErrors ? Object.values(fieldErrors).flat().join(" ") : undefined
      toast.error(detail || (err instanceof Error ? err.message : "Could not resolve this office."))
      // Rethrow so OfficeAliasResolutionPanel's submit handler knows this
      // failed (e.g. duplicate office code/name) and keeps the form open
      // instead of marking the group "Resolved" — otherwise there is no way
      // to retry with a different code or switch to "Match Existing Office".
      throw err
    }
  }

  async function handleConfirmImport() {
    if (!uploadResult) return
    setIsCommitting(true)
    try {
      const result = await commitMemberImport(uploadResult.token, resolutions, rowEdits)
      setCommitResult(result)
      setStep(11)
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
    setRowEdits({})
    setFixDialogRow(null)
    setUnresolvedOffices([])
    setConfirmChecked(false)
    setCommitResult(null)
  }

  const summaryCounts = React.useMemo(() => {
    const counts: Record<MemberValidationCategory, number> = { New: 0, Exact: 0, Probable: 0, Possible: 0, Invalid: 0 }
    for (const r of rows) {
      if (r.category === "Invalid" && isRowFixed(r)) continue
      counts[r.category]++
    }
    return counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, rowEdits])

  // No positions master list exists in the backend — options come from distinct
  // values already present in this worksheet so the picker still has something useful.
  const positionOptions = React.useMemo(() => {
    const values = new Set<string>()
    for (const r of rows) if (r.data.position) values.add(r.data.position)
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [rows])

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
  const visibleRows =
    filterCategory === "All"
      ? searchedRows
      : filterCategory === "Invalid"
        ? searchedRows.filter((r) => r.category === "Invalid" && !isRowFixed(r))
        : searchedRows.filter((r) => r.category === filterCategory)

  const invalidRows = rows.filter((r) => r.category === "Invalid")
  const unresolvedInvalidRows = invalidRows.filter((r) => !isRowFixed(r))
  const beneficiaryRows = rows.filter((r) => r.data.beneficiary_1 || r.data.beneficiary_2)
  const legacyLoanRows = rows.filter((r) => r.data.legacy_loan_status !== "No legacy loan information")

  const previewColumns: ColumnDef<MemberImportRowResult, unknown>[] = [
    { id: "row", header: "Row", enableSorting: false, cell: ({ row }) => row.original.rowNumber + 1 },
    {
      id: "fullName",
      header: "Full Name",
      enableSorting: false,
      cell: ({ row }) => {
        const edit = rowEdits[row.original.rowNumber]
        const firstName = edit?.first_name ?? row.original.data.first_name ?? ""
        const middleName = edit?.middle_name ?? row.original.data.middle_name ?? ""
        const lastName = edit?.last_name ?? row.original.data.last_name ?? ""
        return `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, " ").trim()
      },
    },
    {
      id: "office",
      header: "Office",
      enableSorting: false,
      cell: ({ row }) => {
        const edit = rowEdits[row.original.rowNumber]
        if (edit?.office_name_raw) return edit.office_name_raw
        return row.original.data.resolved_office_name ?? row.original.data.office_name_raw ?? "—"
      },
    },
    {
      id: "position",
      header: "Position",
      enableSorting: false,
      cell: ({ row }) => rowEdits[row.original.rowNumber]?.position || row.original.data.position || "—",
    },
    {
      id: "birthdate",
      header: "Birthdate",
      enableSorting: false,
      cell: ({ row }) => {
        const edit = rowEdits[row.original.rowNumber]
        const birthdate = edit?.birthdate ?? row.original.data.birthdate
        return birthdate ? formatDateShort(birthdate) : "—"
      },
    },
    {
      id: "age",
      header: "Age",
      enableSorting: false,
      cell: ({ row }) => {
        const edit = rowEdits[row.original.rowNumber]
        if (edit?.birthdate) return calculateAge(edit.birthdate)
        return row.original.data.computed_age ?? "—"
      },
    },
    {
      id: "contact",
      header: "Contact",
      enableSorting: false,
      cell: ({ row }) => rowEdits[row.original.rowNumber]?.cellphone_number || row.original.data.cellphone_number || "—",
    },
    { id: "sex", header: "Sex", enableSorting: false, cell: ({ row }) => row.original.data.sex ?? "—" },
    {
      id: "beneficiaries",
      header: "Beneficiaries",
      enableSorting: false,
      cell: ({ row }) => {
        const edit = rowEdits[row.original.rowNumber]
        const beneficiary1 = edit?.beneficiary_1 ?? row.original.data.beneficiary_1
        const beneficiary2 = edit?.beneficiary_2 ?? row.original.data.beneficiary_2
        return [beneficiary1, beneficiary2].filter(Boolean).length
      },
    },
    {
      id: "legacyLoan",
      header: "Legacy Loan",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.data.legacy_loan_status === "No legacy loan information" ? "—" : row.original.data.legacy_loan_status,
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original
        if (r.category === "Invalid" && isRowFixed(r)) return <StatusBadge label="Fixed" tone="success" />
        return <StatusBadge label={r.category} tone={CATEGORY_TONE[r.category]} />
      },
    },
    {
      id: "action",
      header: "Action",
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original
        if (r.category !== "Invalid") return "—"
        return (
          <Button variant="outline" size="sm" onClick={() => setFixDialogRow(r)}>
            {isRowFixed(r) ? "Edit" : "Fix"}
          </Button>
        )
      },
    },
  ]

  const importableCount = rows.filter((r) => r.category !== "Invalid" || isRowFixed(r)).length

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
          {unresolvedInvalidRows.length > 0 && (
            <AlertBanner
              tone="danger"
              title={`${unresolvedInvalidRows.length} invalid record(s) must be resolved before continuing`}
              description={
                <>
                  Missing required fields (surname, first name, or birthdate). Search any of these names above to find
                  them, then use Exclude in the table&apos;s Action column: {" "}
                  {unresolvedInvalidRows.slice(0, 10).map((r, i) => (
                    <span key={r.rowNumber}>
                      {i > 0 && ", "}
                      <strong>{`${r.data.first_name ?? ""} ${r.data.last_name ?? ""}`.trim() || `Row ${r.rowNumber + 1}`}</strong>
                    </span>
                  ))}
                  {unresolvedInvalidRows.length > 10 && `, and ${unresolvedInvalidRows.length - 10} more`}.
                </>
              }
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterCategory("Invalid")
                    setSearchTerm("")
                  }}
                >
                  Show Invalid Only
                </Button>
              }
              className="mb-3"
            />
          )}
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(Object.keys(summaryCounts) as MemberValidationCategory[]).map((cat) => (
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterCategory("All")}
            className="mb-3"
          >
            Show All ({rows.length})
          </Button>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name, office, position, email, or contact number…"
            className="mb-3 max-w-sm"
          />
          {normalizedSearch && (
            <p className="mb-3 text-xs text-muted-foreground">
              {visibleRows.length} of {rows.length} record(s) match &quot;{searchTerm}&quot;
              {filterCategory !== "All" ? ` in ${filterCategory}` : ""}
            </p>
          )}
          <div className="overflow-hidden rounded-lg border border-border">
            <DataTable
              columns={previewColumns}
              data={visibleRows}
              getRowId={(r) => String(r.rowNumber)}
              enableColumnVisibility={false}
              emptyTitle="No records match"
              emptyDescription="Try adjusting your search or category filter."
              maxHeight="max-h-[28rem]"
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(4)}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              {unresolvedInvalidRows.length > 0 && (
                <p className="text-xs font-medium text-destructive">
                  Resolve all invalid records to continue.
                </p>
              )}
              <Button onClick={() => setStep(6)} disabled={unresolvedInvalidRows.length > 0}>
                Continue
              </Button>
            </div>
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
              <p className="mb-2 text-sm font-semibold text-success">Corrected Rows ({invalidRows.length}) — fixed in Step 5</p>
              {invalidRows.map((r) => {
                const edit = rowEdits[r.rowNumber]
                return (
                  <div key={r.rowNumber} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-success/20 bg-success/5 p-2.5 text-sm">
                    <span>
                      Row {r.rowNumber + 1}: {edit?.first_name ?? r.data.first_name} {edit?.last_name ?? r.data.last_name} — originally {r.reasons.join(", ").toLowerCase()}
                    </span>
                    <StatusBadge label="Fixed" tone="success" />
                  </div>
                )
              })}
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
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 8 · Review Beneficiaries</h2>
          {beneficiaryRows.length === 0 ? (
            <EmptyState title="No beneficiaries in this worksheet" description="Neither dependent/beneficiary column had any names to import." />
          ) : (
            <div className="min-h-[16rem] overflow-auto rounded-lg border border-border">
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
                    const edit = rowEdits[r.rowNumber]
                    const beneficiary1 = edit?.beneficiary_1 ?? r.data.beneficiary_1 ?? ""
                    const beneficiary2 = edit?.beneficiary_2 ?? r.data.beneficiary_2 ?? ""
                    return (
                      <TableRow key={r.rowNumber}>
                        <TableCell>
                          {r.data.first_name} {r.data.last_name}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 w-48"
                            placeholder="Optional"
                            value={beneficiary1}
                            onChange={(e) =>
                              setRowEdits((prev) => ({ ...prev, [r.rowNumber]: { ...prev[r.rowNumber], beneficiary_1: e.target.value } }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 w-48"
                            placeholder="Optional"
                            value={beneficiary2}
                            onChange={(e) =>
                              setRowEdits((prev) => ({ ...prev, [r.rowNumber]: { ...prev[r.rowNumber], beneficiary_2: e.target.value } }))
                            }
                          />
                        </TableCell>
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
            <Button variant="outline" onClick={() => setStep(7)}>
              Back
            </Button>
            <Button onClick={() => setStep(9)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 9 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 9 · Review Legacy Loan Data</h2>
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
            <Button variant="outline" onClick={() => setStep(8)}>
              Back
            </Button>
            <Button onClick={() => setStep(10)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 10 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 10 · Confirm Import</h2>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat label="Total Rows" value={String(rows.length)} />
            <SummaryStat label="New" value={String(summaryCounts.New)} />
            <SummaryStat label="Possible Duplicates" value={String(summaryCounts.Possible + summaryCounts.Probable + summaryCounts.Exact)} />
            <SummaryStat label="Invalid" value={String(summaryCounts.Invalid)} />
          </div>
          <p className="text-sm text-muted-foreground">
            You are about to import <strong className="text-foreground">{importableCount}</strong> record(s).
            Imported members are <strong className="text-foreground">automatically approved and activated</strong> — this cannot be undone from this wizard.
          </p>
          <label className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <Checkbox checked={confirmChecked} onCheckedChange={(v) => setConfirmChecked(!!v)} />
            I confirm that I have reviewed the member records and import decisions.
          </label>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(9)} disabled={isCommitting}>
              Back
            </Button>
            <Button onClick={handleConfirmImport} disabled={!confirmChecked || isCommitting || importableCount === 0}>
              {isCommitting ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
              {isCommitting ? "Importing…" : "Confirm Import"}
            </Button>
          </div>
        </div>
      )}

      {step === 11 && commitResult && (
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

      <FixInvalidMemberRowDialog
        row={fixDialogRow}
        edit={fixDialogRow ? rowEdits[fixDialogRow.rowNumber] : undefined}
        positionOptions={positionOptions}
        onOpenChange={(open) => {
          if (!open) setFixDialogRow(null)
        }}
        onSave={(rowNumber, values) => setRowEdits((prev) => ({ ...prev, [rowNumber]: values }))}
      />
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
