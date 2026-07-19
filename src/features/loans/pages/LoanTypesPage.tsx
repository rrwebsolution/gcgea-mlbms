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
import { listLoanTypes, createLoanType, updateLoanType, deleteLoanType } from "@/services/loans.service"
import { formatCurrency } from "@/utils/format"
import type { LoanType } from "@/types"
import { LoanTypeFormDialog } from "@/features/loans/components/LoanTypeFormDialog"

export default function LoanTypesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingLoanType, setEditingLoanType] = React.useState<LoanType | undefined>(undefined)
  const [deletingLoanType, setDeletingLoanType] = React.useState<LoanType | undefined>(undefined)

  const { data: loanTypes = [] } = useQuery({ queryKey: ["loan-types"], queryFn: listLoanTypes })

  const createMutation = useMutation({
    mutationFn: createLoanType,
    onSuccess: () => {
      toast.success("Loan type added successfully.")
      queryClient.invalidateQueries({ queryKey: ["loan-types"] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<LoanType> }) => updateLoanType(id, values),
    onSuccess: () => {
      toast.success("Loan type updated successfully.")
      queryClient.invalidateQueries({ queryKey: ["loan-types"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLoanType,
    onSuccess: () => {
      toast.success(`${deletingLoanType?.name} deleted successfully.`)
      queryClient.invalidateQueries({ queryKey: ["loan-types"] })
      setDeletingLoanType(undefined)
    },
  })

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Loan Types"
        description="Configured loan products available to GCGEA members."
        actions={
          <PermissionButton
            permission="settings.loan"
            className="h-9 gap-1.5 text-xs shadow-sm active:scale-97 transition-all"
            onClick={() => {
              setEditingLoanType(undefined)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-4" /> Add Loan Type
          </PermissionButton>
        }
      />
      
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loanTypes.map((lt) => (
          <div 
            key={lt.id} 
            className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/95 p-5 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              {/* Card Title & Controls */}
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/30 pb-2">
                <h3 className="font-heading text-sm font-bold tracking-tight text-foreground">{lt.name}</h3>
                <div className="flex items-center gap-1.5">
                  <StatusBadge label={lt.status} tone={lt.status === "Active" ? "success" : "neutral"} />
                  <PermissionGuard permission="settings.loan">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 h-7 w-7 text-muted-foreground/80 hover:text-foreground hover:bg-accent/80 rounded-full active:scale-95 transition-all"
                      onClick={() => {
                        setEditingLoanType(lt)
                        setDialogOpen(true)
                      }}
                      aria-label="Edit loan type"
                    >
                      <PencilLine className="size-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="size-7 h-7 w-7 text-muted-foreground/80 hover:text-destructive hover:bg-destructive/10 rounded-full active:scale-95 transition-all"
                      onClick={() => setDeletingLoanType(lt)} 
                      aria-label="Delete loan type"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
              <p className="mb-5 text-xs font-medium text-muted-foreground leading-relaxed line-clamp-2 min-h-8">{lt.description}</p>
            </div>

            {/* Spec parameters definitions list */}
            <dl className="space-y-2 border-t border-border/30 pt-4">
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Amount Range</dt>
                <dd className="text-xs font-semibold text-foreground">{formatCurrency(lt.minAmount)} – {formatCurrency(lt.maxAmount)}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Interest Rate</dt>
                <dd className="text-xs font-semibold text-foreground">{lt.defaultInterestRate}% / month</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Interest Method</dt>
                <dd className="text-xs font-semibold text-foreground">{lt.interestMethod}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Processing Fee</dt>
                <dd className="text-xs font-semibold text-foreground">{formatCurrency(lt.processingFee)}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Max Term</dt>
                <dd className="text-xs font-semibold text-foreground">{lt.maxTermMonths} months</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Min. Membership</dt>
                <dd className="text-xs font-semibold text-foreground">{lt.requiredMembershipMonths} months</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Min. Contributions</dt>
                <dd className="text-xs font-semibold text-foreground">{lt.requiredContributionMonths} months</dd>
              </div>
              <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/85">Existing Active Loan</dt>
                <dd className="text-xs font-semibold text-foreground">{lt.allowExistingActiveLoan ? "Allowed" : "Not Allowed"}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <LoanTypeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        loanType={editingLoanType}
        onSubmit={async (values) => {
          if (editingLoanType) {
            await updateMutation.mutateAsync({ id: editingLoanType.id, values })
          } else {
            await createMutation.mutateAsync(values)
          }
        }}
      />

      <ConfirmDialog
        open={!!deletingLoanType}
        onOpenChange={(open) => !open && setDeletingLoanType(undefined)}
        title="Delete Loan Type"
        description={`Are you sure you want to delete "${deletingLoanType?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingLoanType && deleteMutation.mutate(deletingLoanType.id)}
      />
    </div>
  )
}