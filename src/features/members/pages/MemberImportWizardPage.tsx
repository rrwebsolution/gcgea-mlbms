import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  XCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  AlertTriangle,
  RotateCcw
} from "lucide-react"
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
import { cn } from "@/lib/utils"
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

const CATEGORY_CONFIG: Record<
  MemberValidationCategory,
  { label: string; tone: "success" | "warning" | "danger" | "info"; bg: string; border: string; text: string }
> = {
  New: { label: "New Records", tone: "success", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400" },
  Exact: { label: "Exact Duplicates", tone: "danger", bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-600 dark:text-rose-400" },
  Probable: { label: "Probable Matches", tone: "warning", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-600 dark:text-amber-400" },
  Possible: { label: "Possible Matches", tone: "info", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-600 dark:text-blue-400" },
  Invalid: { label: "Invalid Records", tone: "danger", bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive" },
}

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

  const [resolutions] = React.useState<Record<number, string>>({})
  const [rowEdits, setRowEdits] = React.useState<Record<number, Partial<MemberRowEdit>>>({})
  const [fixDialogRow, setFixDialogRow] = React.useState<MemberImportRowResult | null>(null)

  // Step 7
  const [unresolvedOffices, setUnresolvedOffices] = React.useState<UnresolvedOfficeGroup[]>([])

  // Step 10/11
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
      setUnresolvedOffices(result.unresolvedOffices)
      queryClient.invalidateQueries({ queryKey: ["offices"] })
      queryClient.invalidateQueries({ queryKey: ["offices", "all"] })
      toast.success(`Office mapping applied to ${result.rowsResolved} row(s).`)
    } catch (err) {
      const fieldErrors = (err as ApiValidationError)?.errors
      const detail = fieldErrors ? Object.values(fieldErrors).flat().join(" ") : undefined
      toast.error(detail || (err instanceof Error ? err.message : "Could not resolve this office."))
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

  const positionOptions = React.useMemo(() => {
    const values = new Set<string>()
    for (const r of rows) if (r.data.position) values.add(r.data.position)
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const searchedRows = normalizedSearch
    ? rows.filter((r) => {
        const haystack = [
          r.data.first_name,
          r.data.last_name,
          r.data.middle_name,
          r.data.resolved_office_name,
          r.data.office_name_raw,
          r.data.position,
          r.data.email,
          r.data.cellphone_number,
        ]
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
    {
      id: "row",
      header: "Row",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-muted-foreground">
          #{row.original.rowNumber + 1}
        </span>
      ),
    },
    {
      id: "fullName",
      header: "Full Name",
      enableSorting: false,
      cell: ({ row }) => {
        const edit = rowEdits[row.original.rowNumber]
        const firstName = edit?.first_name ?? row.original.data.first_name ?? ""
        const middleName = edit?.middle_name ?? row.original.data.middle_name ?? ""
        const lastName = edit?.last_name ?? row.original.data.last_name ?? ""
        return (
          <span className="font-heading font-semibold text-foreground">
            {`${firstName} ${middleName} ${lastName}`.replace(/\s+/g, " ").trim() || "—"}
          </span>
        )
      },
    },
    {
      id: "office",
      header: "Office",
      enableSorting: false,
      cell: ({ row }) => {
        const edit = rowEdits[row.original.rowNumber]
        if (edit?.office_name_raw) return edit.office_name_raw
        return (
          <span className="text-xs text-muted-foreground">
            {row.original.data.resolved_office_name ?? row.original.data.office_name_raw ?? "—"}
          </span>
        )
      },
    },
    {
      id: "position",
      header: "Position",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {rowEdits[row.original.rowNumber]?.position || row.original.data.position || "—"}
        </span>
      ),
    },
    {
      id: "birthdate",
      header: "Birthdate",
      enableSorting: false,
      cell: ({ row }) => {
        const edit = rowEdits[row.original.rowNumber]
        const birthdate = edit?.birthdate ?? row.original.data.birthdate
        return <span className="font-mono text-xs">{birthdate ? formatDateShort(birthdate) : "—"}</span>
      },
    },
    {
      id: "age",
      header: "Age",
      enableSorting: false,
      cell: ({ row }) => {
        const edit = rowEdits[row.original.rowNumber]
        if (edit?.birthdate) return <span className="font-mono text-xs">{calculateAge(edit.birthdate)}</span>
        return <span className="font-mono text-xs">{row.original.data.computed_age ?? "—"}</span>
      },
    },
    {
      id: "contact",
      header: "Contact",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {rowEdits[row.original.rowNumber]?.cellphone_number || row.original.data.cellphone_number || "—"}
        </span>
      ),
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
        const count = [beneficiary1, beneficiary2].filter(Boolean).length
        return count > 0 ? (
          <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
            {count}
          </span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )
      },
    },
    {
      id: "legacyLoan",
      header: "Legacy Loan",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.data.legacy_loan_status === "No legacy loan information" ? (
          <span className="text-muted-foreground/60">—</span>
        ) : (
          <StatusBadge
            label={row.original.data.legacy_loan_status}
            tone={row.original.data.legacy_loan_status === "Complete legacy loan information" ? "warning" : "info"}
          />
        ),
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original
        if (r.category === "Invalid" && isRowFixed(r)) return <StatusBadge label="Fixed" tone="success" />
        return <StatusBadge label={r.category} tone={CATEGORY_CONFIG[r.category].tone} />
      },
    },
    {
      id: "action",
      header: "Action",
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original
        if (r.category !== "Invalid") return <span className="text-muted-foreground/60">—</span>
        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-lg text-xs font-semibold active:scale-95"
            onClick={() => setFixDialogRow(r)}
          >
            {isRowFixed(r) ? "Edit Fix" : "Fix Record"}
          </Button>
        )
      },
    },
  ]

  const importableCount = rows.filter((r) => r.category !== "Invalid" || isRowFixed(r)).length

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <PageHeader
        title="Member Profile Import"
        description="Batch import member records from existing GCGEA Members Profile spreadsheets without manual re-formatting."
      />

      {/* Step Indicator Card */}
      <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xs backdrop-blur-xs sm:p-5">
        <WizardStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* STEP 1: Upload Workbook */}
      {step === 1 && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-xs sm:p-7">
          <StepHeader
            number={1}
            title="Upload Workbook"
            description="Upload the master GCGEA Members Profile workbook (.xlsx, .xls, or .csv)."
          />
          <div className="mt-5">
            <FileUploader
              key={fileResetKey}
              label="Members Profile Workbook"
              description="Drop spreadsheet here or click to browse. Existing column layouts are detected automatically."
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
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              disabled={!file || isUploading}
              onClick={handleUpload}
              className="h-10 gap-2 rounded-xl px-5 text-xs font-semibold active:scale-95 transition-all shadow-xs"
            >
              {isUploading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              {isUploading ? "Uploading & Analyzing…" : "Continue to Sheet Selection"}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Select Worksheet */}
      {step === 2 && uploadResult && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-xs sm:p-7">
          <StepHeader
            number={2}
            title="Select Worksheet"
            description={`Workbook contains ${uploadResult.worksheets.length} worksheet(s). Select the target sheet to process.`}
          />
          <RadioGroup
            value={selectedSheet ?? ""}
            onValueChange={setSelectedSheet}
            className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {uploadResult.worksheets.map((ws) => (
              <Label
                key={ws.name}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-2xl border p-4 shadow-2xs transition-all duration-200",
                  selectedSheet === ws.name
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/70 bg-card/70 hover:border-border hover:bg-muted/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={ws.name} />
                  <div>
                    <p className="font-heading text-sm font-bold text-foreground">{ws.name}</p>
                    <p className="text-xs text-muted-foreground">Worksheet Target</p>
                  </div>
                </div>
                <span className="rounded-lg bg-muted/60 px-2 py-1 font-mono text-[11px] font-semibold text-muted-foreground">
                  {ws.totalRows} rows · {ws.totalColumns} cols
                </span>
              </Label>
            ))}
          </RadioGroup>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <Button
              disabled={!selectedSheet || isSelectingSheet}
              onClick={handleSelectSheet}
              className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold active:scale-95 shadow-xs"
            >
              {isSelectingSheet ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-3.5" />}
              {isSelectingSheet ? "Reading sheet…" : "Continue to Header Detection"}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Detect Header Row */}
      {step === 3 && sheetResult && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-xs sm:p-7">
          <StepHeader
            number={3}
            title="Detect Header Row"
            description="Review the detected column headers and sample data rows extracted from the worksheet."
          />

          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Sparkles className="size-4" />
              <span>Detected Header Position: Row {sheetResult.headerRowIndex}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {sheetResult.headerRowIndex > 1
                ? `Row 1 contains workbook metadata or office titles. Data headers were identified on Row ${sheetResult.headerRowIndex}.`
                : "Standard headers recognized on the first row of this worksheet."}
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 shadow-2xs">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  {sheetResult.headers.map((h) => (
                    <TableHead key={h} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheetResult.sampleRows.slice(0, 3).map((row, i) => (
                  <TableRow key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                    {sheetResult.headers.map((h) => (
                      <TableCell key={h} className="font-mono text-xs text-muted-foreground">
                        {row[h] != null ? String(row[h]) : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <Button
              onClick={() => setStep(4)}
              className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold active:scale-95 shadow-xs"
            >
              <span>Continue to Column Mapping</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Map Columns */}
      {step === 4 && sheetResult && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-xs sm:p-7">
          <StepHeader
            number={4}
            title="Map Columns"
            description={`Verify auto-mapped database fields for ${sheetResult.totalRows} record(s).`}
          />

          {sheetResult.unmatchedHeaders.length > 0 && (
            <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Ignored spreadsheet columns: </span>
              {sheetResult.unmatchedHeaders.join(", ")}
            </div>
          )}

          <div className="mt-4 max-h-[30rem] overflow-auto rounded-2xl border border-border/60 shadow-2xs">
            <Table>
              <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-md">
                <TableRow className="border-b border-border/50">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-5">
                    System Target Field
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Required
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Spreadsheet Source Column
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pr-5">
                    Sample Value
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(sheetResult.targetFields) as MemberTargetField[]).map((field) => {
                  const mappedHeader = mapping[field]
                  const sample = mappedHeader ? sheetResult.sampleRows[0]?.[mappedHeader] : undefined
                  const required = sheetResult.requiredFields.includes(field)
                  return (
                    <TableRow key={field} className="border-b border-border/30 last:border-0 hover:bg-muted/25">
                      <TableCell className="font-heading font-semibold text-foreground pl-5">
                        {sheetResult.targetFields[field]}
                      </TableCell>
                      <TableCell>
                        {required ? (
                          <StatusBadge label="Required" tone="danger" />
                        ) : (
                          <StatusBadge label="Optional" tone="neutral" />
                        )}
                      </TableCell>
                      <TableCell>
                        <CommandSelect
                          size="sm"
                          className="w-56"
                          value={mapping[field] ?? "__none__"}
                          onValueChange={(v) =>
                            setMapping((prev) => ({ ...prev, [field]: v === "__none__" ? null : v }))
                          }
                          options={[
                            { value: "__none__", label: "Do not import" },
                            ...sheetResult.headers.map((h) => ({ value: h, label: h })),
                          ]}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground pr-5">
                        {sample != null ? String(sample) : "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(3)}
              className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <Button
              onClick={handlePreview}
              disabled={isPreviewing}
              className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold active:scale-95 shadow-xs"
            >
              {isPreviewing ? <Loader2 className="size-4 animate-spin" /> : <FileCheck className="size-4" />}
              {isPreviewing ? "Validating data…" : "Preview & Validate Records"}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Preview Records */}
      {step === 5 && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-xs sm:p-7">
          <StepHeader
            number={5}
            title="Preview Records & Validation"
            description="Review analyzed row categories and correct invalid entries before continuing."
          />

          {unresolvedInvalidRows.length > 0 && (
            <div className="mt-4">
              <AlertBanner
                tone="danger"
                title={`${unresolvedInvalidRows.length} invalid record(s) need correction`}
                description={
                  <>
                    Rows missing compulsory surname, first name, or birthdate. Use the <strong>Fix Record</strong> button
                    in the Action column:{" "}
                    {unresolvedInvalidRows.slice(0, 8).map((r, i) => (
                      <span key={r.rowNumber}>
                        {i > 0 && ", "}
                        <strong>{`${r.data.first_name ?? ""} ${r.data.last_name ?? ""}`.trim() || `Row ${r.rowNumber + 1}`}</strong>
                      </span>
                    ))}
                    {unresolvedInvalidRows.length > 8 && `, and ${unresolvedInvalidRows.length - 8} more`}.
                  </>
                }
                actions={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => {
                      setFilterCategory("Invalid")
                      setSearchTerm("")
                    }}
                  >
                    Filter Invalid Only
                  </Button>
                }
              />
            </div>
          )}

          {/* Metric Category Selectors */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(Object.keys(summaryCounts) as MemberValidationCategory[]).map((cat) => {
              const cfg = CATEGORY_CONFIG[cat]
              const isSelected = filterCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={cn(
                    "flex flex-col gap-1 rounded-2xl border p-3.5 text-left transition-all duration-200 active:scale-98 shadow-2xs",
                    isSelected
                      ? `${cfg.border} ${cfg.bg} ring-2 ring-primary/40`
                      : "border-border/60 bg-card hover:border-border hover:bg-muted/30"
                  )}
                >
                  <span className={cn("text-[11px] font-bold uppercase tracking-wider", cfg.text)}>
                    {cfg.label}
                  </span>
                  <span className="font-heading text-xl font-bold text-foreground">
                    {summaryCounts[cat]}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search by name, office, email…"
                className="w-72"
              />
              {filterCategory !== "All" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterCategory("All")}
                  className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3" /> Show All ({rows.length})
                </Button>
              )}
            </div>
            {normalizedSearch && (
              <span className="text-xs font-medium text-muted-foreground">
                Showing {visibleRows.length} of {rows.length} records
              </span>
            )}
          </div>

          {/* Data Table */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 shadow-xs">
            <DataTable
              columns={previewColumns}
              data={visibleRows}
              getRowId={(r) => String(r.rowNumber)}
              enableColumnVisibility={false}
              emptyTitle="No records match filter"
              emptyDescription="Try clearing your search query or selecting another category."
              maxHeight="max-h-[30rem]"
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(4)}
              className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <div className="flex items-center gap-3">
              {unresolvedInvalidRows.length > 0 && (
                <span className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" />
                  Fix {unresolvedInvalidRows.length} invalid record(s) to proceed.
                </span>
              )}
              <Button
                onClick={() => setStep(6)}
                disabled={unresolvedInvalidRows.length > 0}
                className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold active:scale-95 shadow-xs"
              >
                <span>Continue to Data Clean</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: Validate & Clean */}
      {step === 6 && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-xs sm:p-7">
          <StepHeader
            number={6}
            title="Validate & Clean"
            description="Audit summary of applied row fixes and warning validations."
          />

          <div className="mt-5 space-y-4">
            {invalidRows.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Zero Invalid Rows"
                description="All workbook records meet minimum validation requirements."
              />
            ) : (
              <div className="space-y-2">
                <p className="font-heading text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Fixed Records ({invalidRows.length})
                </p>
                {invalidRows.map((r) => {
                  const edit = rowEdits[r.rowNumber]
                  return (
                    <div
                      key={r.rowNumber}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs"
                    >
                      <span className="font-medium text-foreground">
                        Row #{r.rowNumber + 1}: {edit?.first_name ?? r.data.first_name}{" "}
                        {edit?.last_name ?? r.data.last_name} — originally{" "}
                        <span className="text-muted-foreground">{r.reasons.join(", ").toLowerCase()}</span>
                      </span>
                      <StatusBadge label="Resolved" tone="success" />
                    </div>
                  )
                })}
              </div>
            )}

            {rows.some((r) => r.reasons.length > 0 && r.category !== "Invalid") && (
              <div className="space-y-2 pt-2">
                <p className="font-heading text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Advisory Warnings
                </p>
                {rows
                  .filter((r) => r.reasons.length > 0 && r.category !== "Invalid")
                  .map((r) => (
                    <div
                      key={r.rowNumber}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground"
                    >
                      <strong>Row #{r.rowNumber + 1}:</strong> {r.data.first_name} {r.data.last_name} —{" "}
                      <span className="text-muted-foreground">{r.reasons.join("; ")}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(5)}
              className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <Button
              onClick={() => setStep(7)}
              className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold active:scale-95 shadow-xs"
            >
              <span>Continue to Office Resolution</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 7: Resolve Offices */}
      {step === 7 && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-xs sm:p-7">
          <StepHeader
            number={7}
            title="Resolve Offices"
            description="Match unrecognized office alias names to registered GCGEA agency units."
          />
          <div className="mt-5">
            <OfficeAliasResolutionPanel groups={unresolvedOffices} onResolve={handleOfficeResolve} />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(6)}
              className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <Button
              onClick={() => setStep(8)}
              disabled={unresolvedOffices.length > 0}
              className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold active:scale-95 shadow-xs"
            >
              <span>Continue to Beneficiary Review</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 8: Review Beneficiaries */}
      {step === 8 && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-xs sm:p-7">
          <StepHeader
            number={8}
            title="Review Beneficiaries"
            description="Verify imported primary and secondary dependent entries."
          />

          {beneficiaryRows.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="No beneficiaries identified"
                description="No dependent entries found in the active worksheet columns."
              />
            </div>
          ) : (
            <div className="mt-5 max-h-[28rem] overflow-auto rounded-2xl border border-border/60 shadow-2xs">
              <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-md">
                  <TableRow className="border-b border-border/50">
                    <TableHead className="pl-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Member Name
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Beneficiary #1
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Beneficiary #2
                    </TableHead>
                    <TableHead className="pr-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Warning Note
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beneficiaryRows.map((r) => {
                    const duplicateWarning = r.reasons.find((reason) =>
                      reason.toLowerCase().includes("duplicate beneficiary")
                    )
                    const edit = rowEdits[r.rowNumber]
                    const beneficiary1 = edit?.beneficiary_1 ?? r.data.beneficiary_1 ?? ""
                    const beneficiary2 = edit?.beneficiary_2 ?? r.data.beneficiary_2 ?? ""
                    return (
                      <TableRow key={r.rowNumber} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                        <TableCell className="font-heading font-semibold text-foreground pl-5">
                          {r.data.first_name} {r.data.last_name}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 w-52 rounded-lg text-xs"
                            placeholder="Primary beneficiary"
                            value={beneficiary1}
                            onChange={(e) =>
                              setRowEdits((prev) => ({
                                ...prev,
                                [r.rowNumber]: { ...prev[r.rowNumber], beneficiary_1: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 w-52 rounded-lg text-xs"
                            placeholder="Secondary beneficiary"
                            value={beneficiary2}
                            onChange={(e) =>
                              setRowEdits((prev) => ({
                                ...prev,
                                [r.rowNumber]: { ...prev[r.rowNumber], beneficiary_2: e.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell className="pr-5">
                          {duplicateWarning ? (
                            <StatusBadge label="Duplicate Name" tone="warning" />
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(7)}
              className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <Button
              onClick={() => setStep(9)}
              className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold active:scale-95 shadow-xs"
            >
              <span>Continue to Legacy Loans</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 9: Review Legacy Loan Data */}
      {step === 9 && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-xs sm:p-7">
          <StepHeader
            number={9}
            title="Review Legacy Loan Data"
            description="Staged legacy loan records for reference (no automated active loans are generated)."
          />

          {legacyLoanRows.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="No legacy loan figures"
                description="Zero legacy loan amortization or solidarity loan values detected."
              />
            </div>
          ) : (
            <div className="mt-5 max-h-[28rem] overflow-auto rounded-2xl border border-border/60 shadow-2xs">
              <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-md">
                  <TableRow className="border-b border-border/50">
                    <TableHead className="pl-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Member Name
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Cash Pabaon
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Loan Start
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Solidarity Loan
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Months
                    </TableHead>
                    <TableHead className="pr-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Monthly Amort
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {legacyLoanRows.map((r) => (
                    <TableRow key={r.rowNumber} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                      <TableCell className="font-heading font-semibold text-foreground pl-5">
                        {r.data.first_name} {r.data.last_name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={r.data.legacy_loan_status}
                          tone={r.data.legacy_loan_status === "Complete legacy loan information" ? "warning" : "info"}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.data.legacy_loan.cash_pabaon ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.data.legacy_loan.loan_start ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.data.legacy_loan.solidarity_assistance_loan ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.data.legacy_loan.no_of_months ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs pr-5">{r.data.legacy_loan.monthly_amort ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(8)}
              className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <Button
              onClick={() => setStep(10)}
              className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold active:scale-95 shadow-xs"
            >
              <span>Continue to Confirmation</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 10: Confirm Import */}
      {step === 10 && (
        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xs backdrop-blur-xs sm:p-7">
          <StepHeader
            number={10}
            title="Confirm Import"
            description="Final review of ready records before writing to production database."
          />

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat label="Total Processed" value={String(rows.length)} badge="Dataset" />
            <SummaryStat label="New Records" value={String(summaryCounts.New)} tone="success" badge="Ready" />
            <SummaryStat
              label="Potential Duplicates"
              value={String(summaryCounts.Possible + summaryCounts.Probable + summaryCounts.Exact)}
              tone="warning"
              badge="Audit"
            />
            <SummaryStat label="Invalid Excluded" value={String(summaryCounts.Invalid)} badge="Filter" />
          </div>

          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs text-foreground leading-relaxed">
              You are committing <strong className="text-primary font-bold">{importableCount}</strong> validated member records.
              All records will be initialized into the active directory.
            </p>
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-3.5 text-xs font-semibold text-foreground">
            <Checkbox
              checked={confirmChecked}
              onCheckedChange={(v) => setConfirmChecked(!!v)}
              className="size-4"
            />
            <span>I acknowledge and confirm that I have reviewed the member data mappings and row resolutions.</span>
          </label>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(9)}
              disabled={isCommitting}
              className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!confirmChecked || isCommitting || importableCount === 0}
              className="h-9 gap-1.5 rounded-xl px-5 text-xs font-semibold active:scale-95 shadow-xs"
            >
              {isCommitting ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
              {isCommitting ? "Committing Import…" : "Confirm & Import Records"}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 11: Import Summary */}
      {step === 11 && commitResult && (
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/95 to-primary/5 p-8 text-center shadow-xs backdrop-blur-xs sm:p-10">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm">
            <CheckCircle2 className="size-8" />
          </div>

          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Import Completed Successfully
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <strong className="text-foreground">{commitResult.summary.membersCreated}</strong> member(s) registered,{" "}
            <strong className="text-foreground">{commitResult.summary.membersMerged}</strong> merged,{" "}
            <strong className="text-foreground">{commitResult.summary.beneficiariesCreated}</strong> beneficiaries, and{" "}
            <strong className="text-foreground">{commitResult.summary.legacyLoanDraftsCreated}</strong> legacy records staged.
          </p>

          {(commitResult.summary.membersSkipped > 0 || commitResult.summary.failedRows > 0) && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <XCircle className="size-4" /> {commitResult.summary.membersSkipped} skipped · {commitResult.summary.failedRows} failed
            </p>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            <Button
              onClick={() => navigate("/members")}
              className="h-10 rounded-xl px-5 text-xs font-semibold active:scale-95 shadow-xs"
            >
              View Member Directory
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                uploadResult &&
                downloadMemberImportReport(uploadResult.token, `member-import-${uploadResult.token}.csv`)
              }
              className="h-10 gap-1.5 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              <Download className="size-4" /> Download Audit Report
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/members/import-history")}
              className="h-10 rounded-xl px-4 text-xs font-semibold active:scale-95"
            >
              Import History
            </Button>
            <Button
              variant="ghost"
              onClick={resetWizard}
              className="h-10 rounded-xl px-4 text-xs font-semibold hover:bg-muted"
            >
              Import Another File
            </Button>
          </div>
        </div>
      )}

      {/* Row Fix Dialog */}
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

function StepHeader({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border/40 pb-4">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary font-heading text-xs font-bold shadow-2xs">
        {number}
      </div>
      <div>
        <h2 className="font-heading text-base font-bold tracking-tight text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  tone,
  badge,
}: {
  label: string
  value: string
  tone?: "success" | "warning";
  badge?: string
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/15 p-3.5 shadow-2xs backdrop-blur-xs">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</span>
        {badge && (
          <span className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-1 font-heading text-xl font-bold tracking-tight",
          tone === "success"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "warning"
              ? "text-amber-600 dark:text-amber-400"
              : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}