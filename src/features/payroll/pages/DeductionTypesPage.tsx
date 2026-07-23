import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PencilLine, Plus } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { IndeterminateBar } from "@/components/shared/loaders/IndeterminateBar"
import { usePageRefresh } from "@/contexts/PageRefreshContext"
import { listDeductionTypes, createDeductionType, updateDeductionType, toggleDeductionTypeStatus } from "@/services/deduction-types.service"
import { DeductionTypeFormDialog } from "@/features/payroll/components/DeductionTypeFormDialog"
import type { DeductionType } from "@/types"
import { formatCurrency } from "@/utils/format"

export default function DeductionTypesPage() {
  const queryClient = useQueryClient()
  const { isRefreshing } = usePageRefresh()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingType, setEditingType] = React.useState<DeductionType | undefined>(undefined)

  const { data: deductionTypes = [], isLoading } = useQuery({ queryKey: ["deduction-types"], queryFn: listDeductionTypes })
  const showSkeleton = isLoading || isRefreshing

  const createMutation = useMutation({
    mutationFn: createDeductionType,
    onSuccess: () => {
      toast.success("Deduction type added.")
      queryClient.invalidateQueries({ queryKey: ["deduction-types"] })
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<DeductionType> }) => updateDeductionType(id, values),
    onSuccess: () => {
      toast.success("Deduction type updated.")
      queryClient.invalidateQueries({ queryKey: ["deduction-types"] })
    },
  })
  const toggleMutation = useMutation({
    mutationFn: toggleDeductionTypeStatus,
    onSuccess: () => {
      toast.success("Deduction type status updated.")
      queryClient.invalidateQueries({ queryKey: ["deduction-types"] })
    },
  })

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Deduction Types"
        description="Configurable payroll deduction categories (e.g. Pabaon) — rename or disable without touching the import logic."
        actions={
          <PermissionButton
            permission="deduction_types.create"
            className="h-9 gap-1.5 text-xs shadow-sm"
            onClick={() => {
              setEditingType(undefined)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-4" /> Add Deduction Type
          </PermissionButton>
        }
      />

      {showSkeleton ? (
        <div className="space-y-3">
          <IndeterminateBar />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="size-7 rounded-md" />
                  </div>
                </div>
                <Skeleton className="mb-2 h-3 w-full" />
                <Skeleton className="mb-4 h-3 w-3/4" />
                <div className="flex items-center justify-between gap-3 border-t border-border/30 pt-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : deductionTypes.length === 0 ? (
        <EmptyState title="No deduction types configured" description="Add one (e.g. Pabaon) so payroll import can detect and post it." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deductionTypes.map((dt) => (
            <div key={dt.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-heading text-sm font-semibold text-foreground">{dt.name}</h3>
                <div className="flex items-center gap-1.5">
                  <StatusBadge label={dt.isActive ? "Active" : "Inactive"} tone={dt.isActive ? "success" : "neutral"} />
                  <PermissionGuard permission="deduction_types.update">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7"
                      aria-label="Edit deduction type"
                      onClick={() => {
                        setEditingType(dt)
                        setDialogOpen(true)
                      }}
                    >
                      <PencilLine className="size-3.5" />
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{dt.description || "No description."}</p>
              <div className="flex items-center justify-between border-t border-border/30 pt-3 text-xs">
                <span className="text-muted-foreground">Code: <code className="text-foreground">{dt.code}</code></span>
                <span className="text-muted-foreground">Default: <strong className="text-foreground">{formatCurrency(dt.defaultAmount)}</strong></span>
                <PermissionGuard permission="deduction_types.deactivate">
                  <label className="flex items-center gap-2">
                    <span className="text-muted-foreground">Enabled</span>
                    <Switch checked={dt.isActive} onCheckedChange={() => toggleMutation.mutate(dt.id)} />
                  </label>
                </PermissionGuard>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeductionTypeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deductionType={editingType}
        onSubmit={async (values) => {
          if (editingType) {
            await updateMutation.mutateAsync({ id: editingType.id, values })
          } else {
            await createMutation.mutateAsync(values)
          }
        }}
      />
    </div>
  )
}
