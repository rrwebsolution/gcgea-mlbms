import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PencilLine, Plus, Trash2, Banknote } from "lucide-react"
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
import type { LoanTypeFormValues } from "@/schemas/loan-type.schema"
import { LoanTypeFormDialog } from "@/features/loans/components/LoanTypeFormDialog"

export default function LoanTypesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingLoanType, setEditingLoanType] = React.useState<LoanType | undefined>(undefined)
  const [deletingLoanType, setDeletingLoanType] = React.useState<LoanType | undefined>(undefined)

  const { data: loanTypes = [] } = useQuery({ queryKey: ["loan-types"], queryFn: listLoanTypes })

  const createMutation = useMutation({
    mutationFn: createLoanType,
    onSuccess: (created) => {
      toast.success("Loan type added successfully.")
      queryClient.setQueryData<LoanType[]>(["loan-types"], (current = []) => [created, ...current])
      setDialogOpen(false)
      setEditingLoanType(undefined)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to add the loan type."),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: LoanTypeFormValues }) => updateLoanType(id, values),
    onSuccess: (updated) => {
      toast.success("Loan type updated successfully.")
      queryClient.setQueryData<LoanType[]>(["loan-types"], (current = []) =>
        current.map((loanType) => loanType.id === updated.id ? updated : loanType)
      )
      setDialogOpen(false)
      setEditingLoanType(undefined)
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update the loan type."),
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
      
      {loanTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 p-12 text-center bg-card/50">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Banknote className="size-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No loan types configured</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            Add a new loan product configuration to get started. These will be available for GCGEA member applications.
          </p>
          <PermissionGuard permission="settings.loan">
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5 text-xs"
              onClick={() => {
                setEditingLoanType(undefined)
                setDialogOpen(true)
              }}
            >
              <Plus className="size-3.5" /> Add First Loan Type
            </Button>
          </PermissionGuard>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loanTypes.map((lt) => (
            <div 
              key={lt.id} 
              className="group relative flex flex-col justify-between rounded-2xl border border-border/50 bg-gradient-to-b from-card to-card/95 p-5 shadow-sm hover:shadow-md hover:border-border/80 hover:-translate-y-0.5 transition-all duration-300 ease-out"
            >
              <div>
                {/* Header Section */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10">
                      <Banknote className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-bold tracking-tight text-foreground leading-tight line-clamp-1">{lt.name}</h3>
                      <div className="mt-1">
                        <StatusBadge label={lt.status} tone={lt.status === "Active" ? "success" : "neutral"} />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <PermissionGuard permission="settings.loan">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground/80 hover:text-foreground hover:bg-muted rounded-lg active:scale-95 transition-all"
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
                        size="icon" 
                        className="size-7 text-muted-foreground/80 hover:text-destructive hover:bg-destructive/10 rounded-lg active:scale-95 transition-all"
                        onClick={() => setDeletingLoanType(lt)} 
                        aria-label="Delete loan type"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </PermissionGuard>
                  </div>
                </div>

                <p className="mb-4 text-xs font-medium text-muted-foreground leading-relaxed line-clamp-2 min-h-8">
                  {lt.description || "No description provided."}
                </p>

                {/* Hero Financial Banner */}
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3 mb-4 border border-border/30">
                  <div className="text-center border-r border-border/30">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Interest Rate</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {lt.defaultInterestRate}% <span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Max Term</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {lt.maxTermMonths} <span className="text-[10px] font-normal text-muted-foreground">mos</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Secondary Details Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t border-border/30 text-[11px]">
                <div className="space-y-0.5">
                  <span className="block font-semibold uppercase tracking-wider text-[9px] text-muted-foreground/75">Amount Range</span>
                  <span className="font-medium text-foreground">{formatCurrency(lt.minAmount)} – {formatCurrency(lt.maxAmount)}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="block font-semibold uppercase tracking-wider text-[9px] text-muted-foreground/75">Interest Method</span>
                  <span className="font-medium text-foreground">{lt.interestMethod}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="block font-semibold uppercase tracking-wider text-[9px] text-muted-foreground/75">Processing Fee</span>
                  <span className="font-medium text-foreground">{formatCurrency(lt.processingFee)}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="block font-semibold uppercase tracking-wider text-[9px] text-muted-foreground/75">Active Loan</span>
                  <span className={`font-medium ${lt.allowExistingActiveLoan ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500"}`}>
                    {lt.allowExistingActiveLoan ? "Allowed" : "Not Allowed"}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="block font-semibold uppercase tracking-wider text-[9px] text-muted-foreground/75">Min. Membership</span>
                  <span className="font-medium text-foreground">{lt.requiredMembershipMonths} months</span>
                </div>
                <div className="space-y-0.5">
                  <span className="block font-semibold uppercase tracking-wider text-[9px] text-muted-foreground/75">Min. Contributions</span>
                  <span className="font-medium text-foreground">{lt.requiredContributionMonths} months</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <LoanTypeFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingLoanType(undefined)
        }}
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
