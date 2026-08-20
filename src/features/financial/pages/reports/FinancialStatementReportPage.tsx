import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { ArrowLeft, FileText, Loader2, PencilLine, Save } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { EmptyState } from "@/components/shared/EmptyState"
import { formatCurrency } from "@/utils/format"
import { getAppearance } from "@/services/settings.service"
import {
  getFinancialStatement,
  generateUnauditedFinancialReport,
  saveFinancialStatement,
  type FinancialStatementDocument,
  type FinancialStatementDraft,
  type FinancialReportingPeriod,
  type UnauditedFinancialReport,
} from "@/services/financial-statement.service"

export default function FinancialStatementReportPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["financial-statement"],
    queryFn: getFinancialStatement,
  })
  const [draft, setDraft] = React.useState<FinancialStatementDraft | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [report, setReport] = React.useState<UnauditedFinancialReport | null>(null)
  const [reportError, setReportError] = React.useState("")
  const [fiscalYear, setFiscalYear] = React.useState(new Date().getFullYear())
  const [reportingPeriod, setReportingPeriod] = React.useState<FinancialReportingPeriod>("annual")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const appearance = getAppearance()

  React.useEffect(() => {
    if (!data) return
    setDraft({
      year: data.year,
      registrationLine: data.registrationLine,
      accreditationLine: data.accreditationLine,
      affiliationLines: [...data.affiliationLines],
      paragraphs: [...data.paragraphs],
    })
  }, [data])

  function patch<K extends keyof FinancialStatementDraft>(key: K, value: FinancialStatementDraft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current)
  }

  function changeYear(nextYear: number) {
    setDraft((current) => {
      if (!current) return current
      const previousYear = String(current.year)
      return {
        ...current,
        year: nextYear,
        paragraphs: current.paragraphs.map((paragraph) => paragraph.replaceAll(previousYear, String(nextYear))) as FinancialStatementDraft["paragraphs"],
      }
    })
  }

  async function handleSave() {
    if (!draft) return
    setIsSaving(true)
    try {
      await saveFinancialStatement(draft)
      await refetch()
      setIsEditing(false)
      toast.success("Financial statement content saved.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the financial statement.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleGenerate() {
    if (reportingPeriod === "custom" && (!startDate || !endDate || startDate > endDate)) {
      setReportError("Select a valid custom start and end date.")
      return
    }
    setIsGenerating(true)
    setReportError("")
    try {
      const result = await generateUnauditedFinancialReport({
        fiscalYear,
        reportingPeriod,
        startDate: reportingPeriod === "custom" ? startDate : undefined,
        endDate: reportingPeriod === "custom" ? endDate : undefined,
        transactionStatus: "posted",
      })
      setReport(result)
      toast.success("Unaudited financial report generated from posted transactions.")
    } catch (error) {
      setReport(null)
      setReportError(error instanceof Error ? error.message : "Unable to generate the financial report.")
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading || !data || !draft) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>
  }

  const statement: FinancialStatementDocument = { ...draft, organization: data.organization }

  return (
    <div className="space-y-5 pb-20">
      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader
        title="Unaudited Financial Report"
        description="Generate a financial summary from actual posted system transactions. The disclaimer remains the report cover page."
      />

      <Tabs defaultValue="financial-report" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="financial-report">Financial Report</TabsTrigger>
          <TabsTrigger value="cover-signatories">Cover &amp; Signatories</TabsTrigger>
        </TabsList>

        <TabsContent value="financial-report" className="space-y-5">
          <Card>
        <CardHeader><CardTitle className="text-base">Report Parameters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Fiscal Year"><Input type="number" min={1997} max={9999} value={fiscalYear} onChange={(event) => setFiscalYear(Number(event.target.value) || new Date().getFullYear())} /></Field>
            <Field label="Reporting Period">
              <CommandSelect
                value={reportingPeriod}
                onValueChange={(value) => setReportingPeriod(value as FinancialReportingPeriod)}
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "quarterly", label: "Quarterly" },
                  { value: "semi_annual", label: "Semi-Annual" },
                  { value: "annual", label: "Annual" },
                  { value: "custom", label: "Custom Date Range" },
                ]}
                placeholder="Select reporting period"
                searchPlaceholder="Search reporting period…"
                emptyText="No reporting period found."
              />
            </Field>
            <Field label="Start Date"><Input type="date" required={reportingPeriod === "custom"} disabled={reportingPeriod !== "custom"} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></Field>
            <Field label="End Date"><Input type="date" required={reportingPeriod === "custom"} disabled={reportingPeriod !== "custom"} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
          </div>
          <div className="flex items-center gap-3">
            <PermissionButton permission="reports.financial" onClick={handleGenerate} isLoading={isGenerating} loadingText="Generating…"><FileText /> Generate Report</PermissionButton>
            <Badge variant="outline">Transaction Status: Posted</Badge>
          </div>
          {reportError && <p role="alert" className="text-sm text-destructive">{reportError}</p>}
        </CardContent>
          </Card>

          {isGenerating ? <SummarySkeleton /> : report ? <FinancialSummary report={report} /> : (
            <EmptyState title="No report generated" description="Choose a fiscal year and reporting period, then generate the report. No amounts are estimated or prefilled." />
          )}
        </TabsContent>

        <TabsContent value="cover-signatories" className="space-y-5">
          <div data-financial-statement-export={JSON.stringify(draft)} className="hidden" />
          <div className="flex justify-end">
            <PermissionButton permission="reports.export" variant={isEditing ? "outline" : "default"} onClick={() => setIsEditing((value) => !value)}>
              <PencilLine /> {isEditing ? "Close Editor" : "Edit Cover Template"}
            </PermissionButton>
          </div>

          {isEditing && (
            <section className="space-y-4 rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-semibold">Statement Content</h2><p className="text-xs text-muted-foreground">Saved changes are used by both PDF and Excel exports.</p></div>
            <PermissionButton permission="reports.export" onClick={handleSave} isLoading={isSaving} loadingText="Saving…"><Save /> Save Changes</PermissionButton>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Year Ended"><Input type="number" min={1997} max={9999} value={draft.year} onChange={(event) => changeYear(Number(event.target.value) || draft.year)} /></Field>
            <Field label="DOLE Registration"><Input value={draft.registrationLine} onChange={(event) => patch("registrationLine", event.target.value)} /></Field>
            <Field label="CSC Accreditation"><Input value={draft.accreditationLine} onChange={(event) => patch("accreditationLine", event.target.value)} /></Field>
          </div>
          <div className="grid gap-3">
            {draft.affiliationLines.map((line, index) => (
              <Field key={index} label={`Affiliation line ${index + 1}`}>
                <Input value={line} onChange={(event) => patch("affiliationLines", draft.affiliationLines.map((item, itemIndex) => itemIndex === index ? event.target.value : item) as FinancialStatementDraft["affiliationLines"])} />
              </Field>
            ))}
          </div>
          <div className="space-y-3">
            {draft.paragraphs.map((paragraph, index) => (
              <Field key={index} label={`Disclaimer paragraph ${index + 1}`}>
                <Textarea rows={4} className="min-h-28 leading-6" value={paragraph} onChange={(event) => patch("paragraphs", draft.paragraphs.map((item, itemIndex) => itemIndex === index ? event.target.value : item) as FinancialStatementDraft["paragraphs"])} />
              </Field>
            ))}
          </div>
            </section>
          )}

          <StatementPreview statement={statement} leftLogo={appearance.sidebarFooterLeftLogoUrl || appearance.sidebarLogoUrl} rightLogo={appearance.sidebarFooterRightLogoUrl} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const SUMMARY_ROWS: Array<[keyof UnauditedFinancialReport["summary"], string]> = [
  ["monthlyDuesCollected", "Monthly Dues Collected"],
  ["cashPabaonCollected", "Cash Pabaon"],
  ["loanPrincipalCollected", "Loan Principal Collected"],
  ["loanInterestCollected", "Loan Interest Collected"],
  ["benefitsReleased", "Benefits Released"],
  ["outstandingLoanBalance", "Outstanding Loan Balance"],
]

function FinancialSummary({ report }: { report: UnauditedFinancialReport }) {
  return <Card data-unaudited-financial-report-export={JSON.stringify(report)}>
    <CardHeader className="text-center">
      <div className="flex justify-center"><Badge>{report.status}</Badge></div>
      <CardTitle>FINANCIAL REPORT – FY {report.fiscalYear}</CardTitle>
      <p className="text-sm text-muted-foreground">{report.reportingPeriodLabel}</p>
    </CardHeader>
    <CardContent>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm"><thead className="bg-muted/60"><tr><th className="px-4 py-3 text-left">Category</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
          <tbody>{SUMMARY_ROWS.map(([key, label]) => <tr key={key} className="border-t"><td className="px-4 py-3">{label}</td><td className="px-4 py-3 text-right font-mono tabular-nums" data-report-value={report.summary[key]}>{formatCurrency(report.summary[key] ?? 0)}</td></tr>)}</tbody>
        </table>
      </div>
    </CardContent>
  </Card>
}

function SummarySkeleton() {
  return <Card><CardContent className="space-y-3 pt-6">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-11 w-full" />)}</CardContent></Card>
}

function StatementPreview({ statement, leftLogo, rightLogo }: { statement: FinancialStatementDocument; leftLogo: string; rightLogo: string }) {
  const { organization } = statement
  return (
    <article className="mx-auto max-w-[850px] rounded-sm border border-border bg-white px-10 py-10 text-black shadow-md sm:px-14">
      <header className="grid grid-cols-[96px_1fr_96px] items-center gap-4 text-center">
        <img src={leftLogo} alt="Association logo" className="size-24 object-contain" />
        <div>
          <p className="text-sm font-bold uppercase">{organization.organizationName}</p>
          <p className="mt-1 text-sm font-bold">({organization.acronym})</p>
          <p className="mt-3 text-xs">{statement.registrationLine}</p>
          <p className="text-xs">{statement.accreditationLine}</p>
        </div>
        <img src={rightLogo} alt="City seal" className="size-24 object-contain" />
      </header>
      <div className="mt-4 text-center text-xs italic leading-5">
        {statement.affiliationLines.map((line) => <p key={line}>{line}</p>)}
      </div>
      <h1 className="mt-9 text-center text-2xl font-bold">Unaudited Financial Statement Disclaimer</h1>
      <p className="text-center text-base">For the Year Ended December 31, {statement.year}</p>
      <div className="mt-10 space-y-6 text-justify text-[15px] leading-8">
        {statement.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
      <footer className="mt-16 grid grid-cols-3 gap-8 text-center text-xs">
        <Signatory name={organization.bookkeeperName} role="Bookkeeper" />
        <Signatory name={organization.auditorName} role="Auditor" />
        <Signatory name={organization.presidentName} role="President" />
      </footer>
    </article>
  )
}

function Signatory({ name, role }: { name: string; role: string }) {
  return <div className="pt-8"><div className="border-b border-black font-bold uppercase">{name}</div><p>{role}</p></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
}
