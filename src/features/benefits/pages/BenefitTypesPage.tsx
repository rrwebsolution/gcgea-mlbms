import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  PencilLine,
  Plus,
  Trash2,
  Gift
} from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import {
  listBenefitTypes,
  createBenefitType,
  updateBenefitType,
  deleteBenefitType,
} from "@/services/benefits.service"
import { formatCurrency } from "@/utils/format"
import type { BenefitType } from "@/types"
import { BenefitTypeFormDialog } from "@/features/benefits/components/BenefitTypeFormDialog"
import type { BenefitTypeFormValues } from "@/schemas/benefit-type.schema"
import { cn } from "@/lib/utils"

const CORE_BENEFIT_NAMES = new Set([
  "Retirement and Separation Benefit",
  "Mortuary Cash Assistance",
  "Mortuary Cash Assistance for Nuclear Family Member",
])

function withSharedProration(type: BenefitType, values: BenefitTypeFormValues): BenefitTypeFormValues {
  return {
    name: type.name,
    description: type.description,
    defaultAmount: type.defaultAmount,
    maximumAmount: type.maximumAmount,
    prorationBasis: values.prorationBasis,
    prorationTiers: values.prorationTiers,
    fyAmounts: type.fyAmounts.map((amount) => ({
      fiscalYear: amount.fiscalYear,
      baseAmount: amount.baseAmount,
    })),
    eligibilityRequirements: type.eligibilityRequirements,
    requiredMembershipMonths: type.requiredMembershipMonths,
    frequencyLimit: type.frequencyLimit,
    requiredDocuments: type.requiredDocuments,
    approvalRequired: type.approvalRequired,
    status: type.status,
  }
}

export default function BenefitTypesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingBenefitType, setEditingBenefitType] = React.useState<BenefitType | undefined>(undefined)
  const [deletingBenefitType, setDeletingBenefitType] = React.useState<BenefitType | undefined>(undefined)

  const { data: benefitTypes = [] } = useQuery({
    queryKey: ["benefit-types"],
    queryFn: listBenefitTypes,
  })

  React.useEffect(() => {
    if (!editingBenefitType) return
    const latest = benefitTypes.find((benefitType) => benefitType.id === editingBenefitType.id)
    if (latest && latest !== editingBenefitType) setEditingBenefitType(latest)
  }, [benefitTypes, editingBenefitType])

  const createMutation = useMutation({
    mutationFn: createBenefitType,
    onSuccess: () => {
      toast.success("Benefit program added successfully.")
      queryClient.invalidateQueries({ queryKey: ["benefit-types"] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BenefitTypeFormValues }) =>
      updateBenefitType(id, values),
    onSuccess: () => {
      toast.success("Benefit program updated successfully.")
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
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Benefit Programs &amp; Policy Matrix"
        description="Configure association mutual aid programs, eligibility tenure, and document verification rules."
        actions={
          <PermissionButton
            permission="settings.benefit"
            className="h-9 gap-2 rounded-xl px-4 text-xs font-semibold shadow-xs active:scale-95 transition-all"
            onClick={() => {
              setEditingBenefitType(undefined)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-4" /> Add Benefit Program
          </PermissionButton>
        }
      />

      {/* Program Grid */}
      {benefitTypes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-12 text-center">
          <EmptyState
            icon={Gift}
            title="No benefit programs configured"
            description="Create your first mutual aid program to configure member assistance policies."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {benefitTypes.map((bt) => (
            <div
              key={bt.id}
              className={cn(
                "group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs",
                "transition-all duration-300 hover:-translate-y-1 hover:border-border/90 hover:shadow-md"
              )}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3.5 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-2xs">
                      <Gift className="size-4" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading text-sm font-bold tracking-tight text-foreground truncate">
                        {bt.name}
                      </h3>
                      <div className="mt-1">
                        <StatusBadge
                          label={bt.status}
                          tone={bt.status === "Active" ? "success" : "neutral"}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <PermissionGuard permission="settings.benefit">
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-90"
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
                        className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90"
                        onClick={() => setDeletingBenefitType(bt)}
                        aria-label="Delete benefit type"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </PermissionGuard>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-8 mb-4">
                  {bt.description || "No description provided for this benefit program."}
                </p>
              </div>

              {/* Policy Parameters Grid */}
              <div className="space-y-4">
                <dl className="divide-y divide-border/30 rounded-xl border border-border/50 bg-muted/20 px-3.5 py-1 text-xs">
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Default Amount
                    </dt>
                    <dd className="font-mono font-semibold text-foreground">
                      {formatCurrency(bt.defaultAmount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Maximum Amount
                    </dt>
                    <dd className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(bt.maximumAmount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Frequency Limit
                    </dt>
                    <dd className="font-medium text-foreground">{bt.frequencyLimit}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Required Tenure
                    </dt>
                    <dd className="font-mono font-semibold text-foreground">
                      {bt.requiredMembershipMonths} month(s)
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Approval Workflow
                    </dt>
                    <dd className="font-semibold text-foreground">
                      {bt.approvalRequired ? "Mandatory" : "Direct Release"}
                    </dd>
                  </div>
                </dl>

                {/* Required Documents Tag Tray */}
                {bt.requiredDocuments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Required Supporting Credentials
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {bt.requiredDocuments.map((doc) => (
                        <span
                          key={doc}
                          className="inline-flex items-center rounded-lg border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-2xs"
                        >
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Program Modal Dialog */}
      <BenefitTypeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        benefitType={editingBenefitType}
        onSubmit={async (values) => {
          if (editingBenefitType) {
            await updateMutation.mutateAsync({ id: editingBenefitType.id, values })
            if (CORE_BENEFIT_NAMES.has(editingBenefitType.name)) {
              await Promise.all(
                benefitTypes
                  .filter((type) => type.id !== editingBenefitType.id && CORE_BENEFIT_NAMES.has(type.name))
                  .map((type) => updateBenefitType(type.id, withSharedProration(type, values)))
              )
              await queryClient.refetchQueries({ queryKey: ["benefit-types"], type: "all" })
            }
          } else {
            await createMutation.mutateAsync(values)
          }
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingBenefitType}
        onOpenChange={(open) => !open && setDeletingBenefitType(undefined)}
        title="Delete Benefit Program"
        description={`Are you sure you want to delete "${deletingBenefitType?.name}"? This action cannot be reversed.`}
        confirmLabel="Yes, Delete Program"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={() => deletingBenefitType && deleteMutation.mutate(deletingBenefitType.id)}
      />
    </div>
  )
}