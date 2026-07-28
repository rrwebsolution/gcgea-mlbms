import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { 
  ArrowLeft, 
  CalendarDays, 
  Copy, 
  Landmark, 
  Plus, 
  Save, 
  Send, 
  Trash2, 
  Wallet, 
  Calculator,
  ShieldCheck
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { StatCard } from "@/components/shared/StatCard"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  copyPreviousAnnualBudget,
  getAnnualBudget,
  saveAnnualBudget,
  submitAnnualBudget,
  type AnnualBudgetItem,
  type AnnualBudgetStatus,
} from "@/services/annual-budgets.service"
import { useAuth } from "@/contexts/AuthContext"
import { formatCurrency } from "@/utils/format"
import { cn } from "@/lib/utils"

const currentYear = new Date().getFullYear()

function statusClass(status: AnnualBudgetStatus): string {
  if (status === "Approved") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
  if (status === "For Approval") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
  if (status === "Rejected") return "border-destructive/30 bg-destructive/10 text-destructive"
  return "border-border/60 bg-muted text-muted-foreground"
}

function cloneItems(items: AnnualBudgetItem[]): AnnualBudgetItem[] {
  return items.map((item) => ({ ...item }))
}

export default function AnnualBudgetReportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams<{ year?: string }>()
  const routeYear = Number(params.year)
  const initialYear = Number.isInteger(routeYear) && routeYear >= 2000 && routeYear <= 2100 ? routeYear : currentYear
  const openedFromReports = location.pathname.startsWith("/reports/")
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()

  const [draftYear, setDraftYear] = React.useState(initialYear)
  const [year, setYear] = React.useState(initialYear)
  const [estimatedRevenue, setEstimatedRevenue] = React.useState(0)
  const [status, setStatus] = React.useState<AnnualBudgetStatus>("Draft")
  const [notes, setNotes] = React.useState("")
  const [items, setItems] = React.useState<AnnualBudgetItem[]>([])
  const [dirty, setDirty] = React.useState(false)

  const budgetQuery = useQuery({
    queryKey: ["annual-budget", year],
    queryFn: () => getAnnualBudget(year),
  })

  React.useEffect(() => {
    if (!budgetQuery.data) return
    setEstimatedRevenue(budgetQuery.data.estimatedRevenue)
    setStatus(budgetQuery.data.status)
    setNotes(budgetQuery.data.notes ?? "")
    setItems(cloneItems(budgetQuery.data.items))
    setDirty(false)
  }, [budgetQuery.data])

  const total = React.useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.proposedAmount) || 0), 0),
    [items]
  )
  const balance = estimatedRevenue - total

  const saveMutation = useMutation({
    mutationFn: () => saveAnnualBudget(year, {
      estimatedRevenue,
      status: "Draft",
      notes: notes.trim() || null,
      items: items
        .map((item) => ({ accountTitle: item.accountTitle.trim(), proposedAmount: Number(item.proposedAmount) || 0 }))
        .filter((item) => item.accountTitle),
    }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["annual-budget", year], saved)
      setDirty(false)
      toast.success(`${year} annual budget saved.`)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save the annual budget."),
  })

  const copyMutation = useMutation({
    mutationFn: () => copyPreviousAnnualBudget(year),
    onSuccess: (copied) => {
      queryClient.setQueryData(["annual-budget", year], copied)
      toast.success(`Copied the ${year - 1} budget into ${year}.`)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to copy the previous budget."),
  })

  const submitMutation = useMutation({
    mutationFn: () => submitAnnualBudget(year),
    onSuccess: (submitted) => {
      queryClient.setQueryData(["annual-budget", year], submitted)
      void queryClient.invalidateQueries({ queryKey: ["annual-budgets"] })
      toast.success(`${year} annual budget submitted for approval.`)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to submit the annual budget."),
  })

  function markChanged(action: () => void) {
    action()
    setDirty(true)
  }

  function changeYear() {
    const normalized = Math.min(2100, Math.max(2000, Math.trunc(draftYear)))
    setDraftYear(normalized)
    setYear(normalized)
    if (!openedFromReports) navigate(`/financial/annual-budgets/${normalized}`)
  }

  function updateItem(index: number, patch: Partial<AnnualBudgetItem>) {
    markChanged(() => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)))
  }

  function removeItem(index: number) {
    markChanged(() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index)))
  }

  const canSave = items.some((item) => item.accountTitle.trim()) && estimatedRevenue >= 0 && balance >= 0
  const isEditable = hasPermission("annual_budgets.manage")
    && (!budgetQuery.data?.exists || ["Draft", "Rejected"].includes(budgetQuery.data.status))

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        render={<Link to={openedFromReports ? "/reports" : "/financial/annual-budgets"} />}
        className="-ml-2 w-fit rounded-xl print:hidden text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        <span>{openedFromReports ? "Back to Report Center" : "Back to Annual Budgets"}</span>
      </Button>

      {/* Page Header */}
      <PageHeader
        title={`GCGEA Proposed Annual Budget ${year}`}
        description="Prepare, review, approve, print, and export the annual expenditure program."
        badge={dirty ? <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-xs">Unsaved Edits</Badge> : undefined}
      />

      {/* Year Switcher Toolbar */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 w-full sm:w-auto">
            <div className="w-full space-y-1.5 sm:w-44">
              <Label htmlFor="budget-year" className="text-xs font-semibold text-muted-foreground">Fiscal Year</Label>
              <Input
                id="budget-year"
                type="number"
                min={2000}
                max={2100}
                value={draftYear}
                onChange={(event) => setDraftYear(Number(event.target.value))}
                onKeyDown={(event) => event.key === "Enter" && changeYear()}
                className="font-mono font-bold text-sm h-9 rounded-xl"
              />
            </div>
            <Button size="sm" onClick={changeYear} disabled={budgetQuery.isFetching} className="h-9 rounded-xl text-xs gap-1.5">
              <CalendarDays className="size-3.5" /> Load Budget
            </Button>
          </div>

          {!budgetQuery.data?.exists && (
            <PermissionButton
              permission="annual_budgets.manage"
              size="sm"
              variant="outline"
              isLoading={copyMutation.isPending}
              loadingText="Copying…"
              onClick={() => copyMutation.mutate()}
              className="h-9 rounded-xl text-xs gap-1.5"
            >
              <Copy className="size-3.5" /> Copy FY {year - 1} Budget
            </PermissionButton>
          )}
        </div>
      </div>

      {budgetQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {balance < 0 && (
            <AlertBanner
              tone="danger"
              title="Budget exceeds estimated revenue"
              description={`Reduce proposed expenditures by ${formatCurrency(Math.abs(balance))} before saving.`}
            />
          )}

          {budgetQuery.data?.status === "Rejected" && budgetQuery.data.rejectionReason && (
            <AlertBanner
              tone="danger"
              title="Annual budget was rejected"
              description={budgetQuery.data.rejectionReason}
            />
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Estimated Annual Revenue" value={formatCurrency(estimatedRevenue)} icon={Wallet} tone="primary" />
            <StatCard label="Total Proposed Budget" value={formatCurrency(total)} icon={Landmark} tone="gold" />
            <StatCard label="Unallocated Balance" value={formatCurrency(balance)} icon={Wallet} tone={balance < 0 ? "danger" : "success"} />
          </div>

          {/* Main Expenditure Program Builder */}
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
            
            {/* Header Form Settings */}
            <div className="flex flex-col gap-4 border-b border-border/50 bg-muted/20 p-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full max-w-sm space-y-1.5">
                <Label htmlFor="estimated-revenue" className="text-xs font-semibold text-foreground/80">Estimated Annual Revenue</Label>
                <Input
                  id="estimated-revenue"
                  type="number"
                  min={0}
                  step="0.01"
                  value={estimatedRevenue}
                  disabled={!isEditable}
                  onChange={(event) => markChanged(() => setEstimatedRevenue(Number(event.target.value)))}
                  className="font-mono font-bold text-sm h-10 rounded-xl"
                />
              </div>

              <div className="flex items-end gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Budget Status</Label>
                  <div>
                    <Badge variant="outline" className={cn("h-10 px-4 rounded-xl text-xs font-semibold shadow-2xs", statusClass(status))}>
                      {status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenditure Program Banner */}
            <div className="border-b border-border/50 bg-primary/5 px-5 py-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-primary inline-flex items-center gap-1.5">
                <Calculator className="size-3.5" /> Expenditure Program Items
              </p>
              <span className="text-[11px] font-semibold text-muted-foreground">{items.length} Account(s) Listed</span>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="w-14 px-5 py-3 text-center">#</th>
                    <th className="px-5 py-3">Account Title</th>
                    <th className="w-64 px-5 py-3 text-right">FY {year} Proposed Budget</th>
                    <th className="w-16 px-5 py-3 print:hidden text-center"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {items.map((item, index) => (
                    <tr key={item.id ?? `new-${index}`} className="hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-2.5 text-center text-xs font-mono font-medium text-muted-foreground">{index + 1}</td>
                      <td className="px-5 py-2.5">
                        <Input
                          value={item.accountTitle}
                          disabled={!isEditable}
                          onChange={(event) => updateItem(index, { accountTitle: event.target.value })}
                          placeholder="Account title (e.g., Office Supplies, Member Benefits)"
                          className="h-9 rounded-xl border-border/40 bg-background/50 hover:bg-background focus:bg-background text-sm font-medium shadow-2xs transition-colors print:border-0 print:p-0"
                        />
                      </td>
                      <td className="px-5 py-2.5">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.proposedAmount}
                          disabled={!isEditable}
                          onChange={(event) => updateItem(index, { proposedAmount: Number(event.target.value) })}
                          className="h-9 rounded-xl border-border/40 bg-background/50 hover:bg-background focus:bg-background text-right font-mono text-sm font-semibold text-foreground shadow-2xs transition-colors print:border-0 print:p-0"
                        />
                      </td>
                      <td className="px-5 py-2.5 text-center print:hidden">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          disabled={!isEditable} 
                          onClick={() => removeItem(index)} 
                          aria-label={`Remove ${item.accountTitle || "budget item"}`}
                          className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border/80 bg-muted/40 font-bold">
                    <td className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground" colSpan={2}>
                      Total Proposed Expenditures
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-base font-bold text-primary">
                      {formatCurrency(total)}
                    </td>
                    <td className="print:hidden" />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom Actions & Notes */}
            <div className="flex flex-col gap-5 border-t border-border/50 p-5 print:hidden bg-muted/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit rounded-xl h-9 text-xs gap-1.5 shadow-2xs"
                disabled={!isEditable}
                onClick={() => markChanged(() => setItems((current) => [...current, { accountTitle: "", proposedAmount: 0 }]))}
              >
                <Plus className="size-3.5" /> Add Account Title
              </Button>

              <div className="space-y-1.5">
                <Label htmlFor="budget-notes" className="text-xs font-semibold text-muted-foreground">Notes & Approval References</Label>
                <Textarea
                  id="budget-notes"
                  rows={2}
                  value={notes}
                  disabled={!isEditable}
                  onChange={(event) => markChanged(() => setNotes(event.target.value))}
                  placeholder="Optional operational notes or board resolution references…"
                  className="rounded-xl text-sm bg-background"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-border/30">
                <PermissionButton
                  permission="annual_budgets.manage"
                  disabled={!dirty || !canSave}
                  isLoading={saveMutation.isPending}
                  loadingText="Saving…"
                  onClick={() => saveMutation.mutate()}
                  className="rounded-xl h-9 text-xs gap-1.5 shadow-2xs"
                >
                  <Save className="size-3.5" /> Save Budget Draft
                </PermissionButton>

                {budgetQuery.data?.exists && isEditable && (
                  <PermissionButton
                    permission="annual_budgets.submit"
                    variant="outline"
                    disabled={dirty || !canSave}
                    isLoading={submitMutation.isPending}
                    loadingText="Submitting…"
                    onClick={() => submitMutation.mutate()}
                    className="rounded-xl h-9 text-xs gap-1.5"
                  >
                    <Send className="size-3.5" /> Submit for Approval
                  </PermissionButton>
                )}
              </div>
            </div>
          </div>

          {/* Governance Sign-off Audit Cards */}
          {(budgetQuery.data?.preparedBy || budgetQuery.data?.approvedBy) && (
            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 pt-2">
              <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-2xs flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Calculator className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prepared By</p>
                  <p className="text-sm font-bold text-foreground">{budgetQuery.data.preparedBy ?? "—"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-2xs flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Approval Sign-off</p>
                  <p className="text-sm font-bold text-foreground">{budgetQuery.data.approvedBy ?? "Pending Official Approval"}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
