import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PencilLine, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { useAuth } from "@/contexts/AuthContext"
import { createEmploymentStatus, listEmploymentStatuses, toggleEmploymentStatus, updateEmploymentStatus } from "@/services/employment-statuses.service"
import type { EmploymentStatusRecord } from "@/types"

export function EmploymentStatusesSettings() {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission("settings.update")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<EmploymentStatusRecord>()
  const [name, setName] = React.useState("")
  const [sortOrder, setSortOrder] = React.useState(0)
  const { data: statuses = [], isLoading } = useQuery({ queryKey: ["employment-statuses"], queryFn: listEmploymentStatuses })
  const saveMutation = useMutation({
    mutationFn: () => editing ? updateEmploymentStatus(editing.id, { name: name.trim(), sortOrder }) : createEmploymentStatus({ name: name.trim(), sortOrder }),
    onSuccess: () => {
      toast.success(`Employment status ${editing ? "updated" : "added"}.`)
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ["employment-statuses"] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save employment status."),
  })
  const toggleMutation = useMutation({
    mutationFn: toggleEmploymentStatus,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["employment-statuses"] }),
  })

  function showForm(status?: EmploymentStatusRecord) {
    setEditing(status)
    setName(status?.name ?? "")
    setSortOrder(status?.sortOrder ?? statuses.length + 1)
    setOpen(true)
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="font-heading text-base font-bold">Employment Statuses</h2><p className="text-xs text-muted-foreground">Values available in Member Registration.</p></div>
        {canUpdate && <Button size="sm" onClick={() => showForm()}><Plus /> Add Status</Button>}
      </div>
      {isLoading ? <div className="h-32 animate-pulse rounded-xl bg-muted" /> : statuses.length === 0 ? (
        <EmptyState title="No employment statuses configured" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {statuses.map((status) => (
            <div key={status.id} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div className="space-y-1"><p className="text-sm font-semibold">{status.name}</p><StatusBadge label={status.isActive ? "Active" : "Inactive"} tone={status.isActive ? "success" : "neutral"} /></div>
              {canUpdate && <div className="flex items-center gap-2"><Switch checked={status.isActive} onCheckedChange={() => toggleMutation.mutate(status.id)} /><Button variant="ghost" size="icon-sm" onClick={() => showForm(status)}><PencilLine /></Button></div>}
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Employment Status" : "Add Employment Status"}</DialogTitle><DialogDescription>Enabled values appear in Member Registration.</DialogDescription></DialogHeader>
          <div className="space-y-3"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Status name" /><Input type="number" min={0} value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} placeholder="Display order" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
