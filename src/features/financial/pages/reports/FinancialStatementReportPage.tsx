import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { ArrowLeft, Loader2, PencilLine, Save } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getAppearance } from "@/services/settings.service"
import {
  getFinancialStatement,
  saveFinancialStatement,
  type FinancialStatementDocument,
  type FinancialStatementDraft,
} from "@/services/financial-statement.service"

export default function FinancialStatementReportPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["financial-statement"],
    queryFn: getFinancialStatement,
  })
  const [draft, setDraft] = React.useState<FinancialStatementDraft | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
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

  if (isLoading || !data || !draft) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>
  }

  const statement: FinancialStatementDocument = { ...draft, organization: data.organization }

  return (
    <div className="space-y-5 pb-20">
      <div data-financial-statement-export={JSON.stringify(draft)} className="hidden" />

      <Button variant="ghost" size="sm" className="-ml-2 w-fit" render={<Link to="/reports" />}>
        <ArrowLeft /> Back to Report Center
      </Button>

      <PageHeader
        title="Financial Statement"
        description="Edit, save, and export the official unaudited financial statement disclaimer."
        actions={(
          <PermissionButton permission="reports.export" variant={isEditing ? "outline" : "default"} onClick={() => setIsEditing((value) => !value)}>
            <PencilLine /> {isEditing ? "Close Editor" : "Edit Statement"}
          </PermissionButton>
        )}
      />

      {isEditing && (
        <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
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
    </div>
  )
}

function StatementPreview({ statement, leftLogo, rightLogo }: { statement: FinancialStatementDocument; leftLogo: string; rightLogo: string }) {
  const { organization } = statement
  return (
    <article className="mx-auto max-w-[850px] rounded-sm border border-border bg-white px-10 py-10 font-serif text-black shadow-md sm:px-14">
      <header className="grid grid-cols-[96px_1fr_96px] items-center gap-4 text-center">
        <img src={leftLogo} alt="Association logo" className="size-24 object-contain" />
        <div>
          <p className="font-sans text-sm font-bold uppercase">{organization.organizationName}</p>
          <p className="mt-1 font-sans text-sm font-bold">({organization.acronym})</p>
          <p className="mt-3 font-sans text-xs">{statement.registrationLine}</p>
          <p className="font-sans text-xs">{statement.accreditationLine}</p>
        </div>
        <img src={rightLogo} alt="City seal" className="size-24 object-contain" />
      </header>
      <div className="mt-4 text-center font-sans text-xs italic leading-5">
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
