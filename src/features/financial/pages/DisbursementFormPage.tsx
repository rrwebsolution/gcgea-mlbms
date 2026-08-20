import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, Printer, Save, Send, WalletCards } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { ReasonDialog } from "@/components/shared/ReasonDialog"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/AuthContext"
import { listAnnualBudgets } from "@/services/annual-budgets.service"
import {
  createDisbursement,
  getDisbursement,
  payDisbursement,
  submitDisbursement,
  updateDisbursement,
  voidDisbursement,
  type DisbursementInput,
} from "@/services/disbursements.service"
import { formatCurrency } from "@/utils/format"

const today = new Date().toISOString().slice(0, 10)

export default function DisbursementFormPage() {
  const { id } = useParams<{ id: string }>()
  const editing = Boolean(id && id !== "new")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const detailQuery = useQuery({ queryKey: ["disbursements", id], queryFn: () => getDisbursement(id!), enabled: editing })
  const budgetsQuery = useQuery({
    queryKey: ["annual-budgets", "approved"],
    queryFn: () => listAnnualBudgets({ status: "Approved", page: 1, perPage: 100 }),
  })
  const [form, setForm] = React.useState<DisbursementInput>({
    annualBudgetId: "",
    annualBudgetItemId: "",
    disbursementDate: today,
    payee: "",
    amount: 0,
    paymentMethod: "Check",
    paymentReference: "",
    remarks: "",
  })
  const [voidOpen, setVoidOpen] = React.useState(false)

  React.useEffect(() => {
    if (!detailQuery.data) return
    const row = detailQuery.data
    setForm({
      annualBudgetId: row.annualBudgetId,
      annualBudgetItemId: row.annualBudgetItemId,
      disbursementDate: row.disbursementDate,
      payee: row.payee,
      amount: row.amount,
      paymentMethod: row.paymentMethod,
      paymentReference: row.paymentReference ?? "",
      remarks: row.remarks ?? "",
    })
  }, [detailQuery.data])

  const selectedBudget = budgetsQuery.data?.data.find((budget) => budget.id === form.annualBudgetId)
    ?? (detailQuery.data ? budgetsQuery.data?.data.find((budget) => budget.fiscalYear === detailQuery.data.fiscalYear) : undefined)
  const selectedItem = selectedBudget?.items.find((item) => item.id === form.annualBudgetItemId)
  const editable = hasPermission("disbursements.manage")
    && (!editing || ["Draft", "Rejected"].includes(detailQuery.data?.status ?? "Draft"))

  const saveMutation = useMutation({
    mutationFn: () => editing ? updateDisbursement(id!, form) : createDisbursement(form),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["disbursements"] })
      toast.success("Disbursement draft saved.")
      navigate(`/financial/disbursements/${saved.id}`, { replace: true })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save the disbursement."),
  })
  const submitMutation = useMutation({
    mutationFn: () => submitDisbursement(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["disbursements"] })
      toast.success("Disbursement submitted for approval.")
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to submit the disbursement."),
  })
  const payMutation = useMutation({
    mutationFn: () => payDisbursement(id!, form.paymentMethod, form.paymentReference),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["disbursements"] })
      toast.success("Disbursement marked as paid.")
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to mark the disbursement as paid."),
  })
  const voidMutation = useMutation({
    mutationFn: (reason: string) => voidDisbursement(id!, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["disbursements"] })
      setVoidOpen(false)
      toast.success("Disbursement voided.")
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to void the disbursement."),
  })

  const valid = Boolean(form.annualBudgetId && form.annualBudgetItemId && form.disbursementDate && form.payee.trim() && form.amount > 0)
  const set = <K extends keyof DisbursementInput>(key: K, value: DisbursementInput[K]) => setForm((current) => ({ ...current, [key]: value }))

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" render={<Link to="/financial/disbursements" />}><ArrowLeft /> Back to Disbursements</Button>
      <PageHeader
        title={editing ? detailQuery.data?.referenceNumber ?? "Disbursement" : "New Disbursement"}
        description="Record an expense against an approved annual-budget account."
        actions={
          detailQuery.data && (
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge label={detailQuery.data.status} tone={detailQuery.data.status === "Paid" || detailQuery.data.status === "Approved" ? "success" : detailQuery.data.status === "Rejected" ? "danger" : "warning"} />
              {detailQuery.data.status === "Paid" && detailQuery.data.paymentMethod === "Check" && (
                <PermissionButton permission="disbursements.print" size="sm" variant="outline" render={<Link to={`/financial/disbursements/${id}/check`} />}>
                  <Printer className="size-3.5" /> Print Check
                </PermissionButton>
              )}
            </div>
          )
        }
      />
      {detailQuery.data?.rejectionReason && <AlertBanner tone="danger" title="Disbursement rejected" description={detailQuery.data.rejectionReason} />}
      {!budgetsQuery.isLoading && (budgetsQuery.data?.data.length ?? 0) === 0 && !editing && (
        <AlertBanner tone="warning" title="No approved annual budget" description="An annual budget must be approved before a disbursement can be created." />
      )}
      <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Approved Annual Budget</Label>
            <CommandSelect disabled={!editable} value={form.annualBudgetId} onValueChange={(value) => { set("annualBudgetId", value); set("annualBudgetItemId", "") }} options={(budgetsQuery.data?.data ?? []).map((budget) => ({ value: budget.id!, label: `FY ${budget.fiscalYear} — ${formatCurrency(budget.estimatedRevenue)}` }))} placeholder="Select budget" />
          </div>
          <div className="space-y-1.5">
            <Label>Particular / Budget Account</Label>
            <CommandSelect disabled={!editable || !selectedBudget} value={form.annualBudgetItemId} onValueChange={(value) => set("annualBudgetItemId", value)} options={(selectedBudget?.items ?? []).map((item) => ({ value: item.id!, label: `${item.accountTitle} — ${formatCurrency(item.proposedAmount)}` }))} placeholder="Select account" />
          </div>
          <div className="space-y-1.5"><Label>Date</Label><Input disabled={!editable} type="date" value={form.disbursementDate} onChange={(event) => set("disbursementDate", event.target.value)} /></div>
          <div className="space-y-1.5"><Label>Payee</Label><Input disabled={!editable} value={form.payee} onChange={(event) => set("payee", event.target.value)} placeholder="Person or organization paid" /></div>
          <div className="space-y-1.5"><Label>Amount</Label><Input disabled={!editable} type="number" min={0.01} step="0.01" value={form.amount} onChange={(event) => set("amount", Number(event.target.value))} /></div>
          <div className="space-y-1.5"><Label>Payment Method</Label><CommandSelect disabled={!editable && detailQuery.data?.status !== "Approved"} value={form.paymentMethod} onValueChange={(value) => set("paymentMethod", value as DisbursementInput["paymentMethod"])} options={["Cash", "Bank Transfer", "Check"].map((value) => ({ value, label: value }))} hideSearch /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Check / Payment Reference</Label><Input disabled={!editable && detailQuery.data?.status !== "Approved"} value={form.paymentReference} onChange={(event) => set("paymentReference", event.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Remarks</Label><Textarea disabled={!editable} value={form.remarks} onChange={(event) => set("remarks", event.target.value)} rows={3} /></div>
        </div>
        {selectedItem && <p className="mt-4 text-xs text-muted-foreground">Allocation: <strong className="text-foreground">{formatCurrency(selectedItem.proposedAmount)}</strong> · Committed: <strong className="text-foreground">{formatCurrency(selectedItem.committedAmount ?? 0)}</strong> · Remaining: <strong className="text-foreground">{formatCurrency(selectedItem.remainingAmount ?? selectedItem.proposedAmount)}</strong>. The server rechecks the balance before saving.</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          {editable && <PermissionButton permission="disbursements.manage" disabled={!valid} isLoading={saveMutation.isPending} loadingText="Saving…" onClick={() => saveMutation.mutate()}><Save /> Save Draft</PermissionButton>}
          {editing && ["Draft", "Rejected"].includes(detailQuery.data?.status ?? "") && <PermissionButton permission="disbursements.submit" variant="outline" isLoading={submitMutation.isPending} loadingText="Submitting…" onClick={() => submitMutation.mutate()}><Send /> Submit for Approval</PermissionButton>}
          {editing && detailQuery.data?.status === "Approved" && <PermissionButton permission="disbursements.pay" isLoading={payMutation.isPending} loadingText="Posting Payment…" onClick={() => payMutation.mutate()}><WalletCards /> Mark as Paid</PermissionButton>}
          {editing && detailQuery.data?.status === "Paid" && <PermissionButton permission="disbursements.void" variant="destructive" onClick={() => setVoidOpen(true)}>Void Disbursement</PermissionButton>}
        </div>
      </div>
      <ReasonDialog open={voidOpen} onOpenChange={setVoidOpen} title="Void Disbursement" reasonLabel="Void Reason" confirmLabel="Void Disbursement" destructive isLoading={voidMutation.isPending} onConfirm={(reason) => voidMutation.mutate(reason)} />
    </div>
  )
}
