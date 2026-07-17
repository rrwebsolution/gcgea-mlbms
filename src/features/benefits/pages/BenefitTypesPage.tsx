import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { listBenefitTypes } from "@/services/benefits.service"
import { formatCurrency } from "@/utils/format"

export default function BenefitTypesPage() {
  const { data: benefitTypes = [] } = useQuery({ queryKey: ["benefit-types"], queryFn: listBenefitTypes })

  return (
    <div className="space-y-5">
      <PageHeader title="Benefit Types" description="Configured benefit programs available to GCGEA members." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {benefitTypes.map((bt) => (
          <div key={bt.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="font-heading text-sm font-semibold text-foreground">{bt.name}</h3>
              <StatusBadge label={bt.status} tone={bt.status === "Active" ? "success" : "neutral"} />
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{bt.description}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">Default Amount</dt>
              <dd className="text-right font-medium text-foreground">{formatCurrency(bt.defaultAmount)}</dd>
              <dt className="text-muted-foreground">Maximum Amount</dt>
              <dd className="text-right font-medium text-foreground">{formatCurrency(bt.maximumAmount)}</dd>
              <dt className="text-muted-foreground">Frequency Limit</dt>
              <dd className="text-right font-medium text-foreground">{bt.frequencyLimit}</dd>
              <dt className="text-muted-foreground">Min. Membership</dt>
              <dd className="text-right font-medium text-foreground">{bt.requiredMembershipMonths} months</dd>
              <dt className="text-muted-foreground">Approval Required</dt>
              <dd className="text-right font-medium text-foreground">{bt.approvalRequired ? "Yes" : "No"}</dd>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Required Documents: </span>
              {bt.requiredDocuments.join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
