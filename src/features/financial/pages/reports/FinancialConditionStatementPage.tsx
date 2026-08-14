import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { ArrowLeft, Eye, FileBarChart, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/utils/format"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { getFinancialConditionStatements, type FinancialConditionAccounts, type FinancialConditionStatement } from "@/services/financial-condition.service"

export default function FinancialConditionStatementPage() {
  const { hasPermission } = useAuth()
  const query = useQuery({ queryKey: ["financial-condition-statements"], queryFn: getFinancialConditionStatements })
  const [preview, setPreview] = React.useState<FinancialConditionStatement | null>(null)
  const [exporting, setExporting] = React.useState<string | null>(null)

  async function download(report: FinancialConditionStatement, format: "pdf" | "excel") {
    const exportKey = `${report.id}-${format}`
    setExporting(exportKey)
    try {
      const response = await api.post(`/reports/financial-condition/${report.fiscalYear}/${format}`, undefined, { responseType: "blob" })
      const file = response.data instanceof Blob ? response.data : new Blob([response.data], { type: format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      if (!file.size) throw new Error("The server returned an empty report file.")
      const url = URL.createObjectURL(file)
      const link = document.createElement("a")
      link.href = url
      link.download = `statement-of-financial-condition-${report.fiscalYear}.${format === "pdf" ? "pdf" : "xlsx"}`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
      toast.success(`${format === "pdf" ? "PDF" : "Excel"} statement downloaded.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Unable to generate ${format.toUpperCase()}.`)
    } finally { setExporting(null) }
  }

  return <div className="space-y-5 pb-20">
    <Button variant="ghost" size="sm" render={<Link to="/reports" />}><ArrowLeft /> Back to Report Center</Button>
    <PageHeader title="Financial Statements" description="Statements generated automatically from posted transactions recorded in the system." />

    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-5 py-4"><h2 className="font-semibold">Generated Financial Statements</h2><p className="text-sm text-muted-foreground">Choose a reporting year to preview the full Statement of Financial Condition.</p></div>
      {query.isLoading ? <div className="space-y-2 p-5">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div> :
        <Table><TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Reporting Period</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>{query.data?.length ? query.data.map((report) => <TableRow key={report.id}><TableCell><span className="flex items-center gap-2 font-medium"><FileBarChart className="size-4 text-primary" /> Statement of Financial Condition</span></TableCell><TableCell>As of December 31, {report.fiscalYear}</TableCell><TableCell><Badge variant="secondary">{report.status}</Badge></TableCell><TableCell className="text-muted-foreground">Posted system transactions</TableCell><TableCell><div className="flex justify-end gap-1.5"><Button size="sm" variant="outline" onClick={() => setPreview(report)}><Eye /> Preview</Button>{hasPermission("reports.export") && <><Button size="sm" variant="outline" disabled={exporting !== null} onClick={() => download(report, "pdf")}>{exporting === `${report.id}-pdf` ? <Loader2 className="animate-spin" /> : <FileText />} PDF</Button><Button size="sm" variant="outline" disabled={exporting !== null} onClick={() => download(report, "excel")}>{exporting === `${report.id}-excel` ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Excel</Button></>}</div></TableCell></TableRow>) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No posted financial transactions are available for reporting.</TableCell></TableRow>}</TableBody>
        </Table>}
    </div>

    <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null) }}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-[920px]">
        <DialogHeader className="sr-only"><DialogTitle>Financial Statement Preview</DialogTitle><DialogDescription>System-generated Statement of Financial Condition</DialogDescription></DialogHeader>
        {preview && <StatementPreview report={preview} />}
      </DialogContent>
    </Dialog>
  </div>
}

function StatementPreview({ report }: { report: FinancialConditionStatement }) {
  const a = report.accounts
  const receivables = a.solidarityReceivables - a.doubtfulAccountsAllowance
  const currentAssets = a.cashInBank + receivables
  const netEquipment = a.officeEquipment - a.accumulatedDepreciation
  const totalAssets = currentAssets + netEquipment
  const funds = a.loanInvestmentFund + a.membershipCoreServicesFund + a.operationalFund + a.pabaonMortuaryFund + a.membershipFeeFund
  const payables = a.dueToPsLink + a.insurancePremiumPayables
  const liabilities = funds + payables
  return <article className="mx-auto w-full bg-white px-6 py-8 font-[Arial] text-[11px] text-black sm:px-10">
    <header className="grid grid-cols-[80px_1fr_80px] text-center"><img src={report.organization.leftLogo} className="size-20 object-contain" alt="Organization logo" /><div><p className="font-bold uppercase">{report.organization.name}</p><p className="font-bold">({report.organization.acronym})</p><p className="mt-2">DOLE Registration No. 528, dated, October 2, 1997</p><p>CSC Accreditation No. 166, dated, October 7, 1998</p><div className="mt-3 italic"><p>Affiliated to Public Services Labor Independent Confederation</p><p>An accredited training Institution on Public Sector Unionism</p><p>Prescribed under CSC, MC. No.9, s. 1994</p></div></div><img src={report.organization.rightLogo} className="size-20 object-contain" alt="City seal" /></header>
    <h1 className="mt-5 text-center text-xs font-bold uppercase">Statement of Financial Condition</h1><p className="mt-3 text-center font-bold">as of December 31, {report.fiscalYear}</p>
    <StatementTable a={a} v={{ receivables, currentAssets, netEquipment, totalAssets, funds, payables, liabilities, grandTotal: liabilities + a.equity }} />
    <p className="mt-6 text-center text-[9px] text-gray-500">Automatically generated from posted GCGEA-MLBMS transactions.</p>
  </article>
}

function StatementTable({ a, v }: { a: FinancialConditionAccounts; v: Record<string, number> }) {
  const Row = ({ label, amount, level = 0, strong, total }: { label: string; amount?: number; level?: number; strong?: boolean; total?: boolean }) => <tr className={total ? "border-b-2 border-black" : ""}><td className={`py-1 ${strong ? "font-bold" : ""}`} style={{ paddingLeft: level * 20 }}>{label}</td><td className={`py-1 text-right tabular-nums ${strong ? "font-bold" : ""}`}>{amount == null ? "" : formatCurrency(amount)}</td></tr>
  return <table className="mt-5 w-full"><tbody><Row label="ASSETS" strong /><Row label="Current Assets" level={1} strong /><Row label="Cash" level={2} strong /><Row label="Cash in Bank - Current" level={3} amount={a.cashInBank} /><Row label="Accounts and Other Receivables" level={2} strong /><Row label="Solidarity Cash Assistance Receivables" level={3} amount={a.solidarityReceivables} /><Row label="Allowance for Doubtful Accounts" level={3} amount={-a.doubtfulAccountsAllowance} /><Row label="Net Receivables" level={2} amount={v.receivables} strong /><Row label="Total Current Assets" level={1} amount={v.currentAssets} strong /><Row label="Non-current Assets" level={1} strong /><Row label="Office Equipment" level={3} amount={a.officeEquipment} /><Row label="Less: Accumulated Depreciation" level={3} amount={-a.accumulatedDepreciation} /><Row label="Net Book Value" level={2} amount={v.netEquipment} strong /><Row label="TOTAL ASSETS" amount={v.totalAssets} strong total /><tr><td className="h-4" /></tr><Row label="LIABILITIES AND MEMBERS' EQUITY" strong /><Row label="LIABILITIES" level={1} strong /><Row label="Current Liabilities" level={2} strong /><Row label="Loan Investment Fund" level={3} amount={a.loanInvestmentFund} /><Row label="Membership Core Services Fund" level={3} amount={a.membershipCoreServicesFund} /><Row label="Operational Fund" level={3} amount={a.operationalFund} /><Row label="Pabaon and Mortuary Assistance Fund" level={3} amount={a.pabaonMortuaryFund} /><Row label="Membership Fee Fund" level={3} amount={a.membershipFeeFund} /><Row label="Total Funds" level={2} amount={v.funds} strong /><Row label="Accounts and Other Payables" level={2} strong /><Row label="Due to PS Link" level={3} amount={a.dueToPsLink} /><Row label="Insurance Premium Payables" level={3} amount={a.insurancePremiumPayables} /><Row label="Total Payables" level={2} amount={v.payables} strong /><Row label="TOTAL LIABILITIES" level={1} amount={v.liabilities} strong /><Row label="EQUITY" level={1} amount={a.equity} strong /><Row label="TOTAL LIABILITIES AND EQUITY" amount={v.grandTotal} strong total /></tbody></table>
}
