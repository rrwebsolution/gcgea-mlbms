import * as React from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, Download, FileSpreadsheet, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { FileUploader } from "@/components/shared/FileUploader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ImportStepper } from "@/features/members/components/ImportStepper"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { parseCsv, downloadCsv, type ParsedCsv } from "@/utils/csv"
import { MOCK_OFFICES } from "@/services/mock-data/offices"

interface TargetField {
  key: string
  label: string
  required: boolean
}

const TARGET_FIELDS: TargetField[] = [
  { key: "surname", label: "Surname", required: true },
  { key: "firstName", label: "First Name", required: true },
  { key: "middleName", label: "Middle Name", required: false },
  { key: "sex", label: "Sex", required: false },
  { key: "birthdate", label: "Birthdate", required: true },
  { key: "permanentAddress", label: "Permanent Address", required: false },
  { key: "cellphoneNumber", label: "Cellphone Number", required: false },
  { key: "email", label: "Email Address", required: false },
  { key: "nameOfSpouse", label: "Name of Spouse", required: false },
  { key: "officeName", label: "Present Office", required: true },
  { key: "position", label: "Occupation / Position", required: false },
  { key: "dateOfRegularAppointment", label: "Date of Regular Appointment", required: false },
  { key: "membershipType", label: "Membership Type", required: false },
  { key: "membershipDate", label: "Date as GCGEA Member", required: true },
  { key: "retireeStatus", label: "Retiree Status", required: false },
]

type ValidationCategory =
  | "Valid"
  | "Missing Member Names"
  | "Invalid Birthdates"
  | "Missing Membership Dates"
  | "Invalid Cellphone Numbers"
  | "Unknown Office Names"
  | "Duplicate Records"
  | "Incomplete Records"

interface ValidatedRow {
  index: number
  data: Record<string, string>
  category: ValidationCategory
}

const CATEGORY_TONE: Record<ValidationCategory, "success" | "danger" | "warning"> = {
  Valid: "success",
  "Missing Member Names": "danger",
  "Invalid Birthdates": "danger",
  "Missing Membership Dates": "danger",
  "Invalid Cellphone Numbers": "warning",
  "Unknown Office Names": "warning",
  "Duplicate Records": "warning",
  "Incomplete Records": "warning",
}

function isValidDate(value: string): boolean {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

function isValidMobile(value: string): boolean {
  if (!value) return true
  const digits = value.replace(/\D/g, "")
  return /^09\d{9}$/.test(digits)
}

const KNOWN_OFFICES = new Set(MOCK_OFFICES.map((o) => o.name.toLowerCase()))

export default function MemberImportWizardPage() {
  const navigate = useNavigate()
  const [step, setStep] = React.useState(1)
  const [file, setFile] = React.useState<File | null>(null)
  const [parsed, setParsed] = React.useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = React.useState<Record<string, string>>({})
  const [validatedRows, setValidatedRows] = React.useState<ValidatedRow[]>([])
  const [skipInvalid, setSkipInvalid] = React.useState(true)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [importedCount, setImportedCount] = React.useState(0)

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
        headers: ["Surname", "First Name", "Middle Name", "Sex", "Birthdate", "Present Office", "Cellphone Number", "Date as GCGEA Member"],
        rows: [
          { Surname: "Delos Reyes", "First Name": "Carmela", "Middle Name": "Santos", Sex: "Female", Birthdate: "1982-04-11", "Present Office": "City Health Office", "Cellphone Number": "09171234567", "Date as GCGEA Member": "2010-01-15" },
          { Surname: "Bautista", "First Name": "Ramon", "Middle Name": "", Sex: "Male", Birthdate: "not a date", "Present Office": "Unknown Office", "Cellphone Number": "12345", "Date as GCGEA Member": "" },
        ],
      })
    }
  }

  React.useEffect(() => {
    if (!parsed) return
    const initialMapping: Record<string, string> = {}
    for (const field of TARGET_FIELDS) {
      const match = parsed.headers.find((h) => h.toLowerCase().replace(/[^a-z]/g, "") === field.label.toLowerCase().replace(/[^a-z]/g, ""))
      initialMapping[field.key] = match ?? "__none__"
    }
    setMapping(initialMapping)
  }, [parsed])

  function runValidation() {
    if (!parsed) return
    const seen = new Set<string>()
    const results: ValidatedRow[] = parsed.rows.map((row, index) => {
      const get = (key: string) => {
        const source = mapping[key]
        return source && source !== "__none__" ? (row[source] ?? "").trim() : ""
      }
      const surname = get("surname")
      const firstName = get("firstName")
      const birthdate = get("birthdate")
      const membershipDate = get("membershipDate")
      const cellphone = get("cellphoneNumber")
      const office = get("officeName")
      const email = get("email")

      let category: ValidationCategory = "Valid"
      const dupKey = `${surname.toLowerCase()}|${firstName.toLowerCase()}|${birthdate}`

      if (!surname || !firstName) category = "Missing Member Names"
      else if (!isValidDate(birthdate)) category = "Invalid Birthdates"
      else if (!membershipDate || !isValidDate(membershipDate)) category = "Missing Membership Dates"
      else if (!isValidMobile(cellphone)) category = "Invalid Cellphone Numbers"
      else if (office && !KNOWN_OFFICES.has(office.toLowerCase())) category = "Unknown Office Names"
      else if (seen.has(dupKey)) category = "Duplicate Records"
      else if (!cellphone || !email) category = "Incomplete Records"

      if (category !== "Duplicate Records") seen.add(dupKey)

      return { index, data: row, category }
    })
    setValidatedRows(results)
    setStep(4)
  }

  const summary = React.useMemo(() => {
    const counts: Record<ValidationCategory, number> = {
      Valid: 0,
      "Missing Member Names": 0,
      "Invalid Birthdates": 0,
      "Missing Membership Dates": 0,
      "Invalid Cellphone Numbers": 0,
      "Unknown Office Names": 0,
      "Duplicate Records": 0,
      "Incomplete Records": 0,
    }
    for (const row of validatedRows) counts[row.category]++
    return counts
  }, [validatedRows])

  const invalidRows = validatedRows.filter((r) => !["Valid", "Incomplete Records"].includes(r.category))
  const importableRows = validatedRows.filter((r) => r.category === "Valid" || r.category === "Incomplete Records" || (!skipInvalid && r.category !== "Missing Member Names"))

  function handleConfirmImport() {
    setIsProcessing(true)
    setTimeout(() => {
      setImportedCount(importableRows.length)
      setIsProcessing(false)
      setStep(7)
    }, 900)
  }

  function handleDownloadErrorReport() {
    const headers = ["Row", "Category", ...(parsed?.headers ?? [])]
    const rows = invalidRows.map((r) => [r.index + 2, r.category, ...(parsed?.headers ?? []).map((h) => r.data[h] ?? "")])
    downloadCsv("gcgea-member-import-errors.csv", headers, rows)
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Import Members" description="Bulk import existing GCGEA member records from a CSV or Excel spreadsheet." />
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <ImportStepper currentStep={step} />
      </div>

      {step === 1 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 1 · Upload File</h2>
          <FileUploader label="Member Spreadsheet" description="Accepted formats: CSV, XLS, XLSX" accept=".csv,.xls,.xlsx" fileName={file?.name} onFileSelect={handleFileSelect} required />
          <div className="mt-4 flex justify-end">
            <Button disabled={!file} onClick={() => setStep(2)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 2 && parsed && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Step 2 · Preview Data</h2>
          <p className="mb-3 text-xs text-muted-foreground">Showing {Math.min(parsed.rows.length, 10)} of {parsed.rows.length} row(s) detected.</p>
          <div className="overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>{parsed.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {parsed.rows.slice(0, 10).map((row, i) => (
                  <TableRow key={i}>{parsed.headers.map((h) => <TableCell key={h}>{row[h] || "—"}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && parsed && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Step 3 · Map Spreadsheet Columns</h2>
          <p className="mb-3 text-xs text-muted-foreground">Match each system field to the corresponding column in your spreadsheet.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TARGET_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>
                  {field.label} {field.required && <span className="text-destructive">*</span>}
                </Label>
                <Select value={mapping[field.key] ?? "__none__"} onValueChange={(v) => setMapping((prev) => ({ ...prev, [field.key]: v ?? "__none__" }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Do not import</SelectItem>
                    {parsed.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={runValidation}>Validate Records</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step 4 · Validation Results</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(summary) as ValidationCategory[]).map((cat) => (
              <div key={cat} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{cat}</p>
                <p className="font-heading text-lg font-semibold text-foreground">{summary[cat]}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
            <Button onClick={() => setStep(5)}>Review Errors</Button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Step 5 · Review Errors</h2>
            <Button variant="outline" size="sm" onClick={handleDownloadErrorReport} disabled={invalidRows.length === 0}>
              <Download />
              Download Error Report
            </Button>
          </div>
          {invalidRows.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No blocking errors found" description="All records passed validation and are ready to import." />
          ) : (
            <div className="max-h-96 overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="bg-card">Row</TableHead>
                    <TableHead className="bg-card">Category</TableHead>
                    <TableHead className="bg-card">Surname</TableHead>
                    <TableHead className="bg-card">First Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invalidRows.map((row) => (
                    <TableRow key={row.index}>
                      <TableCell>{row.index + 2}</TableCell>
                      <TableCell><StatusBadge label={row.category} tone={CATEGORY_TONE[row.category]} /></TableCell>
                      <TableCell>{row.data[mapping.surname] || "—"}</TableCell>
                      <TableCell>{row.data[mapping.firstName] || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={skipInvalid} onCheckedChange={(v) => setSkipInvalid(!!v)} />
            Skip invalid records and import only valid / incomplete records
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
          <p className="mb-4 text-sm text-muted-foreground">
            You are about to import <span className="font-semibold text-foreground">{importableRows.length}</span> member record(s) out of{" "}
            <span className="font-semibold text-foreground">{validatedRows.length}</span> total row(s) detected.
            {skipInvalid && invalidRows.length > 0 && ` ${invalidRows.length} invalid record(s) will be skipped.`}
          </p>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(5)} disabled={isProcessing}>Back</Button>
            <Button onClick={handleConfirmImport} disabled={isProcessing || importableRows.length === 0}>
              {isProcessing ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
              {isProcessing ? "Importing…" : "Confirm Import"}
            </Button>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Import Complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Successfully imported <span className="font-semibold text-foreground">{importedCount}</span> member record(s).
            {invalidRows.length > 0 && (
              <span className="mt-1 flex items-center justify-center gap-1 text-warning">
                <XCircle className="size-3.5" /> {invalidRows.length} record(s) were skipped due to validation errors.
              </span>
            )}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={() => { setStep(1); setFile(null); setParsed(null); setValidatedRows([]) }}>
              Import Another File
            </Button>
            <Button onClick={() => navigate("/members")}>Go to Members List</Button>
          </div>
        </div>
      )}
    </div>
  )
}
