import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { CheckCircle2, Download, FileSpreadsheet, Loader2, XCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FileUploader } from "@/components/shared/FileUploader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { WizardStepIndicator } from "@/components/shared/WizardStepIndicator"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { parseCsv, downloadCsv, type ParsedCsv } from "@/utils/csv"
import { getAllActiveMembers } from "@/services/members.service"
import { bulkCreateContributions, hasExistingContribution } from "@/services/contributions.service"
import { useAuth } from "@/contexts/AuthContext"
import { formatCurrency } from "@/utils/format"

const STEPS = ["Download Template", "Upload File", "Map Columns", "Preview & Validate", "Review Errors", "Confirm Import", "Summary"]

interface TargetField {
  key: string
  label: string
  required: boolean
}

const TARGET_FIELDS: TargetField[] = [
  { key: "employeeNumber", label: "Employee Number", required: false },
  { key: "memberNumber", label: "Member Number", required: false },
  { key: "memberName", label: "Member Name", required: false },
  { key: "officeName", label: "Office", required: false },
  { key: "contributionPeriod", label: "Contribution Period", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "paymentDate", label: "Payment Date", required: false },
  { key: "payrollReference", label: "Payroll Reference", required: false },
  { key: "remarks", label: "Remarks", required: false },
]

type Category = "Valid" | "Warning" | "Invalid" | "Duplicate"
const CATEGORY_TONE: Record<Category, "success" | "warning" | "danger"> = { Valid: "success", Warning: "warning", Invalid: "danger", Duplicate: "warning" }

interface ValidatedRow {
  index: number
  data: Record<string, string>
  category: Category
  reasons: string[]
  memberId?: string
  memberName?: string
  officeName?: string
  amount?: number
  excluded: boolean
}

export default function PayrollImportPage() {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuth()
  const canReplaceDuplicates = hasPermission("contributions.replace_duplicate")
  const [step, setStep] = React.useState(1)
  const [file, setFile] = React.useState<File | null>(null)
  const [parsed, setParsed] = React.useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = React.useState<Record<string, string>>({})
  const [rows, setRows] = React.useState<ValidatedRow[]>([])
  const [filterCategory, setFilterCategory] = React.useState<Category | "All">("All")
  const [skipInvalid, setSkipInvalid] = React.useState(true)
  const [includeWarnings, setIncludeWarnings] = React.useState(true)
  const [skipDuplicates, setSkipDuplicates] = React.useState(true)
  const [replaceDuplicates, setReplaceDuplicates] = React.useState(false)
  const [confirmChecked, setConfirmChecked] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)
  const [summary, setSummary] = React.useState<{ saved: number; skipped: number; duplicate: number; replaced: number; failed: number; totalAmount: number } | null>(null)

  function handleDownloadTemplate() {
    downloadCsv(
      "gcgea-payroll-contribution-template.csv",
      ["Employee Number", "Member Number", "Member Name", "Office", "Contribution Period", "Amount", "Payment Date", "Payroll Reference", "Remarks"],
      [["EMP-1042", "GCGEA-MEM-000001", "Abaquita, Rosalinda C.", "City Treasurer's Office", "2026-07", "150.00", "2026-07-05", "PR-2026-07-001", ""]]
    )
  }

  async function handleFileSelect(selected: File | null) {
    setFile(selected)
    if (!selected) {
      setParsed(null)
      return
    }
    if (selected.name.toLowerCase().endsWith(".csv")) {
      const text = await selected.text()
      setParsed(parseCsv(text))
    } else {
      toast.info("Excel preview uses sample data in this demo. Connect the Laravel API to parse real .xls/.xlsx files.")
      setParsed({
        headers: ["Employee Number", "Member Number", "Member Name", "Office", "Contribution Period", "Amount", "Payment Date"],
        rows: [
          { "Employee Number": "EMP-1108", "Member Number": "GCGEA-MEM-000002", "Member Name": "Bacus, Edwin T.", Office: "City Engineer's Office", "Contribution Period": "2026-07", Amount: "150", "Payment Date": "2026-07-05" },
          { "Employee Number": "EMP-9999", "Member Number": "GCGEA-MEM-999999", "Member Name": "Unknown, Member", Office: "Unknown Office", "Contribution Period": "", Amount: "abc", "Payment Date": "" },
        ],
      })
    }
  }

  React.useEffect(() => {
    if (!parsed) return
    const initial: Record<string, string> = {}
    for (const field of TARGET_FIELDS) {
      const match = parsed.headers.find((h) => h.toLowerCase().replace(/[^a-z]/g, "") === field.label.toLowerCase().replace(/[^a-z]/g, ""))
      initial[field.key] = match ?? "__none__"
    }
    setMapping(initial)
  }, [parsed])

  function autoMap() {
    if (!parsed) return
    const next: Record<string, string> = {}
    for (const field of TARGET_FIELDS) {
      const match = parsed.headers.find((h) => h.toLowerCase().replace(/[^a-z]/g, "").includes(field.key.toLowerCase().replace(/[^a-z]/g, "")))
      next[field.key] = match ?? "__none__"
    }
    setMapping(next)
    toast.success("Columns auto-mapped based on header names.")
  }

  function runValidation() {
    if (!parsed) return
    const members = getAllActiveMembers()
    const get = (row: Record<string, string>, key: string) => {
      const source = mapping[key]
      return source && source !== "__none__" ? (row[source] ?? "").trim() : ""
    }

    const results: ValidatedRow[] = parsed.rows.map((row, index) => {
      const employeeNumber = get(row, "employeeNumber")
      const memberNumber = get(row, "memberNumber")
      const period = get(row, "contributionPeriod")
      const amountRaw = get(row, "amount")
      const officeRaw = get(row, "officeName")
      const amount = Number(amountRaw)

      const member = members.find((m) => (memberNumber && m.memberNumber === memberNumber) || (employeeNumber && m.employeeNumber === employeeNumber))

      const reasons: string[] = []
      let category: Category = "Valid"

      if (!memberNumber && !employeeNumber) reasons.push("Missing member number or employee number")
      if (!period) reasons.push("Missing contribution period")
      if (!amountRaw || Number.isNaN(amount) || amount <= 0) reasons.push("Invalid or missing amount")
      if ((memberNumber || employeeNumber) && !member) reasons.push("Unknown member number")
      if (member && member.membershipStatus !== "Active") reasons.push("Member is not active")
      if (member && officeRaw && member.officeName !== officeRaw) reasons.push("Office does not match member's office on record")

      if (reasons.length > 0) {
        category = "Invalid"
      } else if (member && hasExistingContribution(member.id, period)) {
        category = "Duplicate"
        reasons.push("Contribution already exists for this member and period")
      }

      return {
        index,
        data: row,
        category,
        reasons,
        memberId: member?.id,
        memberName: member?.fullName ?? get(row, "memberName"),
        officeName: member?.officeName ?? officeRaw,
        amount: Number.isFinite(amount) ? amount : undefined,
        excluded: false,
      }
    })

    setRows(results)
    setStep(4)
  }

  const summaryCounts = React.useMemo(() => {
    const counts: Record<Category, number> = { Valid: 0, Warning: 0, Invalid: 0, Duplicate: 0 }
    for (const r of rows) counts[r.category]++
    return counts
  }, [rows])

  const visibleRows = filterCategory === "All" ? rows : rows.filter((r) => r.category === filterCategory)
  const invalidRows = rows.filter((r) => r.category === "Invalid")
  const duplicateRows = rows.filter((r) => r.category === "Duplicate")

  const importableRows = rows.filter((r) => {
    if (r.excluded) return false
    if (r.category === "Invalid") return false
    if (r.category === "Duplicate") return replaceDuplicates || !skipDuplicates
    return true
  })
  const totalImportAmount = importableRows.reduce((sum, r) => sum + (r.amount ?? 0), 0)

  function handleDownloadErrorReport() {
    const headers = ["Row", "Category", "Reasons", ...(parsed?.headers ?? [])]
    const errorRows = rows.filter((r) => r.category === "Invalid" || r.category === "Duplicate")
    downloadCsv(
      "payroll-import-errors.csv",
      headers,
      errorRows.map((r) => [r.index + 2, r.category, r.reasons.join("; "), ...(parsed?.headers ?? []).map((h) => r.data[h] ?? "")])
    )
  }

  async function handleConfirmImport() {
    if (!user) return
    setIsImporting(true)
    try {
      const result = await bulkCreateContributions({
        contributionPeriod: importableRows[0]?.data[mapping.contributionPeriod] ?? "",
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod: "Payroll Deduction",
        encodedBy: user.fullName,
        skipDuplicates,
        replaceDuplicates: canReplaceDuplicates && replaceDuplicates,
        rows: importableRows
          .filter((r) => r.memberId)
          .map((r) => ({ memberId: r.memberId!, memberNumber: r.data[mapping.memberNumber] ?? "", memberName: r.memberName ?? "", officeName: r.officeName ?? "", amount: r.amount ?? 0 })),
      })
      setSummary({ saved: result.saved, skipped: rows.filter((r) => r.excluded).length, duplicate: result.skippedDuplicates, replaced: result.replaced, failed: invalidRows.length + result.failed, totalAmount: totalImportAmount })
      setStep(7)
      toast.success(`Imported ${result.saved} contribution record(s).`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.")
    } finally {
      setIsImporting(false)
    }
  }

  function resetWizard() {
    setStep(1)
    setFile(null)
    setParsed(null)
    setRows([])
    setSummary(null)
    setConfirmChecked(false)
  }

  return (
    <div className="space-y-5 pb-10">
      <PageHeader title="Payroll Deduction Import" description="Import contribution records directly from a payroll deduction file." />
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <WizardStepIndicator steps={STEPS} currentStep={step} />
      </div>

      {step === 1 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Step 1 · Download Template</h2>
          <p className="mb-3 text-sm text-muted-foreground">Download the CSV template, fill it out from your payroll system export, then continue to upload it.</p>
          <div className="overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {["Employee Number", "Member Number", "Member Name", "Office", "Contribution Period", "Amount", "Payment Date", "Payroll Reference", "Remarks"].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>EMP-1042</TableCell>
                  <TableCell>GCGEA-MEM-000001</TableCell>
                  <TableCell>Abaquita, Rosalinda C.</TableCell>
                  <TableCell>City Treasurer's Office</TableCell>
                  <TableCell>2026-07</TableCell>
                  <TableCell>150.00</TableCell>
                  <TableCell>2026-07-05</TableCell>
                  <TableCell>PR-2026-07-001</TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={handleDownloadTemplate}><Download /> Download Template</Button>
            <Button onClick={() => setStep(2)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 2 · Upload File</h2>
          <FileUploader label="Payroll Contribution File" description="CSV, XLS, or XLSX" accept=".csv,.xls,.xlsx" fileName={file?.name} onFileSelect={handleFileSelect} required />
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button disabled={!file} onClick={() => setStep(3)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && parsed && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Step 3 · Map Columns</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={autoMap}>Auto-map Columns</Button>
              <Button variant="outline" size="sm" onClick={() => setMapping({})}>Reset Mapping</Button>
            </div>
          </div>
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
                {TARGET_FIELDS.map((field) => {
                  const mappedHeader = mapping[field.key]
                  const sample = mappedHeader && mappedHeader !== "__none__" ? parsed.rows[0]?.[mappedHeader] : ""
                  return (
                    <TableRow key={field.key}>
                      <TableCell className="font-medium text-foreground">{field.label}</TableCell>
                      <TableCell>{field.required ? <StatusBadge label="Required" tone="danger" /> : <StatusBadge label="Optional" tone="neutral" />}</TableCell>
                      <TableCell>
                        <Select value={mapping[field.key] ?? "__none__"} onValueChange={(v) => setMapping((prev) => ({ ...prev, [field.key]: v ?? "__none__" }))}>
                          <SelectTrigger size="sm" className="w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Do not import</SelectItem>
                            {parsed.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{sample || "—"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={runValidation}>Preview & Validate</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 4 · Preview & Validate</h2>
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
          <Button variant="outline" size="sm" onClick={() => setFilterCategory("All")} className="mb-3">Show All ({rows.length})</Button>
          <div className="max-h-96 overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="bg-card">Row</TableHead>
                  <TableHead className="bg-card">Category</TableHead>
                  <TableHead className="bg-card">Member</TableHead>
                  <TableHead className="bg-card">Period</TableHead>
                  <TableHead className="bg-card">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((r) => (
                  <TableRow key={r.index}>
                    <TableCell>{r.index + 2}</TableCell>
                    <TableCell><StatusBadge label={r.category} tone={CATEGORY_TONE[r.category]} /></TableCell>
                    <TableCell>{r.memberName || "—"}</TableCell>
                    <TableCell>{r.data[mapping.contributionPeriod] || "—"}</TableCell>
                    <TableCell>{r.amount != null ? formatCurrency(r.amount) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
            <Button onClick={() => setStep(5)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Step 5 · Review Errors</h2>
            <Button variant="outline" size="sm" onClick={handleDownloadErrorReport} disabled={invalidRows.length === 0 && duplicateRows.length === 0}>
              <Download /> Download Error Report
            </Button>
          </div>
          {invalidRows.length === 0 && duplicateRows.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No issues found" description="All rows passed validation." />
          ) : (
            <div className="space-y-4">
              {invalidRows.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-destructive">Invalid Rows ({invalidRows.length})</p>
                  <ul className="space-y-1.5">
                    {invalidRows.map((r) => (
                      <li key={r.index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-sm">
                        <span>Row {r.index + 2}: {r.reasons.join(", ")}</span>
                        <Button variant="ghost" size="sm" onClick={() => setRows((prev) => prev.map((row) => (row.index === r.index ? { ...row, excluded: !row.excluded } : row)))}>
                          {r.excluded ? "Restore" : "Exclude"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {duplicateRows.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-warning">Duplicate Rows ({duplicateRows.length})</p>
                  <ul className="space-y-1.5">
                    {duplicateRows.map((r) => (
                      <li key={r.index} className="rounded-lg border border-warning/20 bg-warning/5 p-2.5 text-sm">
                        Row {r.index + 2}: {r.memberName} — {r.reasons.join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={skipInvalid} onCheckedChange={(v) => setSkipInvalid(!!v)} />
            Skip invalid records and import only valid records
          </label>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(4)}>Back</Button>
            <Button onClick={() => setStep(6)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 6 · Confirm Import</h2>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat label="Total Rows" value={String(rows.length)} />
            <SummaryStat label="Valid Rows" value={String(summaryCounts.Valid)} />
            <SummaryStat label="Duplicate Rows" value={String(summaryCounts.Duplicate)} />
            <SummaryStat label="Invalid Rows" value={String(summaryCounts.Invalid)} />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={includeWarnings} onCheckedChange={(v) => setIncludeWarnings(!!v)} />
              Include warning rows
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={skipDuplicates} disabled={replaceDuplicates} onCheckedChange={(v) => setSkipDuplicates(!!v)} />
              Skip duplicate records
            </label>
            {canReplaceDuplicates && (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={replaceDuplicates} onCheckedChange={(v) => setReplaceDuplicates(!!v)} />
                Replace duplicate records with this import's values
                <StatusBadge label="Permission-gated" tone="gold" />
              </label>
            )}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            You are about to import <strong className="text-foreground">{importableRows.length}</strong> record(s) totaling{" "}
            <strong className="text-foreground">{formatCurrency(totalImportAmount)}</strong>.
          </p>
          <label className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <Checkbox checked={confirmChecked} onCheckedChange={(v) => setConfirmChecked(!!v)} />
            I confirm this payroll contribution batch is ready to import.
          </label>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(5)} disabled={isImporting}>Back</Button>
            <Button onClick={handleConfirmImport} disabled={!confirmChecked || isImporting || importableRows.length === 0}>
              {isImporting ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
              {isImporting ? "Importing…" : "Confirm Import"}
            </Button>
          </div>
        </div>
      )}

      {step === 7 && summary && (
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Import Complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Successfully imported <strong className="text-foreground">{summary.saved}</strong> record(s) totaling{" "}
            <strong className="text-foreground">{formatCurrency(summary.totalAmount)}</strong>.
          </p>
          {(summary.skipped > 0 || summary.duplicate > 0 || summary.replaced > 0 || summary.failed > 0) && (
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-warning">
              <XCircle className="size-3.5" /> {summary.skipped} skipped · {summary.duplicate} duplicate · {summary.replaced} replaced · {summary.failed} failed
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/contributions")}>View Contribution Records</Button>
            <Button variant="outline" onClick={handleDownloadErrorReport}>Download Import Summary</Button>
            <Button variant="outline" onClick={resetWizard}>Import Another File</Button>
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
