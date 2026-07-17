import * as React from "react"
import { toast } from "sonner"
import { FileSpreadsheet, FileText, Printer, RotateCcw } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/shared/EmptyState"
import { getAllActiveMembers } from "@/services/members.service"
import { getAllContributions } from "@/services/contributions.service"
import { getAllLoans } from "@/services/loans.service"
import { getAllBenefits } from "@/services/benefits.service"
import { getAllLoanPayments } from "@/services/loan-payments.service"
import { formatCurrency, formatDateShort } from "@/utils/format"

export type ReportCategory = "Member Reports" | "Contribution Reports" | "Loan Reports" | "Benefit Reports" | "Financial Reports"

interface ReportPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ReportCategory | null
  reportName: string | null
}

interface ReportRow {
  cells: string[]
}

function buildReport(category: ReportCategory, office: string, from: string, to: string): { columns: string[]; rows: ReportRow[] } {
  const inRange = (date: string) => (!from || date >= from) && (!to || date <= to)
  const matchesOffice = (officeName: string) => !office || officeName === office

  switch (category) {
    case "Member Reports": {
      const rows = getAllActiveMembers()
        .filter((m) => matchesOffice(m.officeName) && inRange(m.membershipDate))
        .map((m) => ({ cells: [m.memberNumber, m.fullName, m.officeName, m.membershipStatus, formatDateShort(m.membershipDate)] }))
      return { columns: ["Member #", "Name", "Office", "Status", "Membership Date"], rows }
    }
    case "Contribution Reports": {
      const rows = getAllContributions()
        .filter((c) => matchesOffice(c.officeName) && inRange(c.paymentDate))
        .map((c) => ({ cells: [c.referenceNumber, c.memberName, c.officeName, formatCurrency(c.amount), formatDateShort(c.paymentDate), c.status] }))
      return { columns: ["Reference #", "Member", "Office", "Amount", "Date", "Status"], rows }
    }
    case "Loan Reports": {
      const rows = getAllLoans()
        .filter((l) => matchesOffice(l.officeName) && inRange(l.applicationDate))
        .map((l) => ({ cells: [l.applicationNumber, l.memberName, l.loanTypeName, formatCurrency(l.requestedAmount), formatCurrency(l.outstandingBalance), l.status] }))
      return { columns: ["Application #", "Member", "Loan Type", "Requested", "Outstanding", "Status"], rows }
    }
    case "Benefit Reports": {
      const rows = getAllBenefits()
        .filter((b) => matchesOffice(b.officeName) && inRange(b.applicationDate))
        .map((b) => ({ cells: [b.applicationNumber, b.memberName, b.benefitTypeName, formatCurrency(b.requestedAmount), b.status] }))
      return { columns: ["Application #", "Member", "Benefit Type", "Requested", "Status"], rows }
    }
    case "Financial Reports": {
      const contributions = getAllContributions()
        .filter((c) => c.status === "Posted" && inRange(c.paymentDate))
        .map((c) => ({ cells: [formatDateShort(c.paymentDate), "Contribution", c.referenceNumber, c.memberName, formatCurrency(c.amount)] }))
      const payments = getAllLoanPayments()
        .filter((p) => p.status === "Posted" && inRange(p.paymentDate))
        .map((p) => ({ cells: [formatDateShort(p.paymentDate), "Loan Payment", p.paymentReferenceNumber, p.memberName, formatCurrency(p.amountPaid)] }))
      const rows = [...contributions, ...payments].sort((a, b) => a.cells[0].localeCompare(b.cells[0]))
      return { columns: ["Date", "Type", "Reference #", "Member", "Amount"], rows }
    }
    default:
      return { columns: [], rows: [] }
  }
}

export function ReportPreviewDialog({ open, onOpenChange, category, reportName }: ReportPreviewDialogProps) {
  const [office, setOffice] = React.useState("")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [result, setResult] = React.useState<{ columns: string[]; rows: ReportRow[] } | null>(null)

  React.useEffect(() => {
    if (open) {
      setOffice("")
      setFrom("")
      setTo("")
      setResult(null)
    }
  }, [open, reportName])

  function handleGenerate() {
    if (!category) return
    setResult(buildReport(category, office, from, to))
  }

  function handleReset() {
    setOffice("")
    setFrom("")
    setTo("")
    setResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{reportName}</DialogTitle>
          <DialogDescription>{category} · Filter and generate this report from current GCGEA MLBMS records.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Office</Label>
            <OfficeSelect value={office} onValueChange={setOffice} placeholder="All Offices" activeOnly={false} />
          </div>
          <div className="space-y-1.5">
            <Label>Date From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Date To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleGenerate}>Generate</Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw />
            Reset Filters
          </Button>
          <Button size="sm" variant="outline" disabled={!result} onClick={() => toast.info("Preparing document for printing…")}>
            <Printer />
            Print
          </Button>
          <Button size="sm" variant="outline" disabled={!result} onClick={() => toast.success("Exporting report to PDF…")}>
            <FileText />
            Export PDF
          </Button>
          <Button size="sm" variant="outline" disabled={!result} onClick={() => toast.success("Exporting report to Excel…")}>
            <FileSpreadsheet />
            Export Excel
          </Button>
        </div>

        {result && (
          result.rows.length === 0 ? (
            <EmptyState title="No records match your filters" description="Try widening the date range or clearing the office filter." />
          ) : (
            <div className="max-h-80 overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>{result.columns.map((c) => <TableHead key={c} className="bg-card">{c}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row, idx) => (
                    <TableRow key={idx}>{row.cells.map((cell, ci) => <TableCell key={ci}>{cell}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
