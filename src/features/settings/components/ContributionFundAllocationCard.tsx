import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { formatCurrency } from "@/utils/format"
import {
  createContributionFund,
  deleteContributionFund,
  listContributionFunds,
  updateContributionFund,
  type ContributionFundInput,
} from "@/services/contribution-funds.service"
import type { ContributionFund } from "@/types"

const EMPTY: ContributionFundInput = {
  fundName: "",
  allocationType: "Percentage",
  allocationValue: 0,
  description: "",
  isEnabled: true,
  displayOrder: 1,
}

export function ContributionFundAllocationCard({ monthlyDues }: { monthlyDues: number }) {
  const queryClient = useQueryClient()
  const { data: funds = [], isLoading } = useQuery({ queryKey: ["contribution-funds"], queryFn: listContributionFunds })
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ContributionFund | null>(null)
  const [form, setForm] = React.useState<ContributionFundInput>(EMPTY)

  const enabled = funds.filter((fund) => fund.status === "Enabled")
  const percentageTotal = enabled.filter((fund) => fund.allocationType === "Percentage").reduce((sum, fund) => sum + fund.allocationValue, 0)
  const computedTotal = enabled.reduce((sum, fund) => sum + (
    fund.allocationType === "Percentage" ? monthlyDues * fund.allocationValue / 100 : fund.allocationValue
  ), 0)
  const isValid = Math.abs(computedTotal - monthlyDues) < 0.01

  const saveMutation = useMutation({
    mutationFn: () => editing ? updateContributionFund(editing.id, form) : createContributionFund(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contribution-funds"] })
      setOpen(false)
      toast.success(editing ? "Fund updated." : "Fund added.")
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteContributionFund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contribution-funds"] })
      toast.success("Fund deleted.")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function showForm(fund?: ContributionFund) {
    setEditing(fund ?? null)
    setForm(fund ? {
      fundName: fund.fundName,
      allocationType: fund.allocationType,
      allocationValue: fund.allocationValue,
      description: fund.description,
      isEnabled: fund.status === "Enabled",
      displayOrder: fund.displayOrder,
    } : { ...EMPTY, displayOrder: funds.length + 1 })
    setOpen(true)
  }

  return (
    <div className="mt-6 rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h3 className="font-semibold">Contribution Fund Allocation</h3>
          <p className="text-sm text-muted-foreground">New enabled funds automatically appear in allocation ledgers and summaries.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button type="button" size="sm" onClick={() => showForm()} />}>
            <Plus className="size-4" /> Add Fund
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Fund" : "Add Fund"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2"><Label>Fund Name</Label><Input value={form.fundName} onChange={(e) => setForm({ ...form, fundName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Allocation Type</Label>
                  <CommandSelect value={form.allocationType} onValueChange={(value) => setForm({ ...form, allocationType: value as ContributionFundInput["allocationType"] })} options={[{ value: "Percentage", label: "Percentage" }, { value: "Fixed Amount", label: "Fixed Amount" }]} hideSearch />
                </div>
                <div className="grid gap-2"><Label>{form.allocationType === "Percentage" ? "Percentage" : "Amount"}</Label><Input type="number" min={0} step="0.01" value={form.allocationValue} onChange={(e) => setForm({ ...form, allocationValue: Number(e.target.value) })} /></div>
              </div>
              <div className="grid gap-2"><Label>Description</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Display Order</Label><Input type="number" min={0} value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} /></div>
              <div className="flex items-center justify-between rounded-lg border p-3"><Label>Enabled</Label><Switch checked={form.isEnabled} onCheckedChange={(checked) => setForm({ ...form, isEnabled: checked })} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" disabled={!form.fundName.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save Fund</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className={`border-b px-4 py-3 text-sm ${isValid ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
        Allocation for {formatCurrency(monthlyDues)} Monthly Dues: <strong>{formatCurrency(computedTotal)}</strong>
        {enabled.every((fund) => fund.allocationType === "Percentage") && <> · Percentage total: <strong>{percentageTotal}%</strong></>}
        {!isValid && <span className="ml-2">Fund allocation must equal the Monthly Dues amount.</span>}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Fund Name</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead><TableHead>Order</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6}>Loading funds…</TableCell></TableRow> : funds.map((fund) => (
              <TableRow key={fund.id}>
                <TableCell><button type="button" className="font-medium text-primary hover:underline" onClick={() => showForm(fund)}>{fund.fundName}</button></TableCell>
                <TableCell>{fund.allocationType}</TableCell>
                <TableCell>{fund.allocationType === "Percentage" ? `${fund.allocationValue}%` : formatCurrency(fund.allocationValue)}</TableCell>
                <TableCell>{fund.status}</TableCell>
                <TableCell>{fund.displayOrder}</TableCell>
                <TableCell className="text-right"><Button type="button" size="icon-sm" variant="ghost" aria-label={`Delete ${fund.fundName}`} onClick={() => deleteMutation.mutate(fund.id)}><Trash2 className="size-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
