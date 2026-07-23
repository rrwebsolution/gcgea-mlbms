import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PencilLine, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { listBenefitTypes, createBenefitType, updateBenefitType, deleteBenefitType } from "@/services/benefits.service"
import { formatCurrency } from "@/utils/format"
import type { BenefitType } from "@/types"
import { BenefitTypeFormDialog } from "@/features/benefits/components/BenefitTypeFormDialog"
import type { BenefitTypeFormValues } from "@/schemas/benefit-type.schema"

export default function BenefitTypesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingBenefitType, setEditingBenefitType] = React.useState<BenefitType | undefined>(undefined)
  const [deletingBenefitType, setDeletingBenefitType] = React.useState<BenefitType | undefined>(undefined)

  const { data: benefitTypes = [] } = useQuery({ queryKey: ["benefit-types"], queryFn: listBenefitTypes })

  const createMutation = useMutation({
    mutationFn: createBenefitType,
    onSuccess: () => {
      toast.success("Benefit type added successfully.")
      queryClient.invalidateQueries({ queryKey: ["benefit-types"] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BenefitTypeFormValues }) => updateBenefitType(id, values),
    onSuccess: () => {
      toast.success("Benefit type updated successfully.")
      queryClient.invalidateQueries({ queryKey: ["benefit-types"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBenefitType,
    onSuccess: () => {
      toast.success(`${deletingBenefitType?.name} deleted successfully.`)
      queryClient.invalidateQueries({ queryKey: ["benefit-types"] })
      setDeletingBenefitType(undefined)
    },
  })

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Benefit Types"
        description="Configured benefit programs available to GCGEA members."
        actions={
          <PermissionButton
            permission="settings.benefit"
            className="h-9 gap-1.5 text-xs shadow-sm active:scale-97 transition-all"
            onClick={() => {
              setEditingBenefitType(undefined)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-4" /> Add Benefit Type
          </PermissionButton>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {benefitTypes.map((bt) => (
          <div 
            key={bt.id} 
            className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/95 p-5 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              {/* Card Title & Controls */}
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/30 pb-2">
                <h3 className="font-heading text-sm font-bold tracking-tight text-foreground">{bt.name}</h3>
                <div className="flex items-center gap-1.5">
                  <StatusBadge label={bt.status} tone={bt.status === "Active" ? "success" : "neutral"} />
                  <PermissionGuard permission="settings.benefit">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 h-7 w-7 text-muted-foreground/80 hover:text-foreground hover:bg-accent/80 rounded-full active:scale-95 transition-all"
                      onClick={() => {
                        setEditingBenefitType(bt)
                        setDialogOpen(true)
                      }}
                      aria-label="Edit benefit type"
                    >
                      <PencilLine className="size-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="size-7 h-7 w-7 text-muted-foreground/80 hover:text-destructive hover:bg-destructive/10 rounded-full active:scale-95 transition-all"
                      onClick={() => setDeletingBenefitType(bt)} 
                      aria-label="Delete benefit type"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
              <p className="mb-5 text-xs font-medium text-muted-foreground leading-relaxed line-clamp-2 min-h-8">{bt.description}</p>
            </div>

            {/* Spec parameters definitions list */}
            <dl className="space-y-2 border-t border-border/30 pt-4">
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Default Amount</dt>
                <dd className="text-xs font-semibold text-foreground">{formatCurrency(bt.defaultAmount)}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Maximum Amount</dt>
                <dd className="text-xs font-semibold text-foreground">{formatCurrency(bt.maximumAmount)}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Frequency Limit</dt>
                <dd className="text-xs font-semibold text-foreground">{bt.frequencyLimit}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Min. Membership</dt>
                <dd className="text-xs font-semibold text-foreground">{bt.requiredMembershipMonths} months</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Approval Required</dt>
                <dd className="text-xs font-semibold text-foreground">{bt.approvalRequired ? "Yes" : "No"}</dd>
              </div>
            </dl>

            {/* Document Checklist Tag Tray */}
            {bt.requiredDocuments.length > 0 && (
              <div className="mt-4 border-t border-border/30 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85 block mb-2">Required Documents</span>
                <div className="flex flex-wrap gap-1.5">
                  {bt.requiredDocuments.map((doc) => (
                    <span 
                      key={doc} 
                      className="inline-flex items-center text-[10px] font-medium bg-muted/65 text-foreground/90 px-2 py-0.5 rounded-md border border-border/10"
                    >
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <BenefitTypeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        benefitType={editingBenefitType}
        onSubmit={async (values) => {
          if (editingBenefitType) {
            await updateMutation.mutateAsync({ id: editingBenefitType.id, values })
          } else {
            await createMutation.mutateAsync(values)
          }
        }}
      />

      <ConfirmDialog
        open={!!deletingBenefitType}
        onOpenChange={(open) => !open && setDeletingBenefitType(undefined)}
        title="Delete Benefit Type"
        description={`Are you sure you want to delete "${deletingBenefitType?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingBenefitType && deleteMutation.mutate(deletingBenefitType.id)}
      />
    </div>
  )
}