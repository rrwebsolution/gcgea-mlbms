import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { listLoanTypes } from "@/services/loans.service"
import { formatCurrency } from "@/utils/format"

export default function LoanTypesPage() {
  const { data: loanTypes = [] } = useQuery({ queryKey: ["loan-types"], queryFn: listLoanTypes })

  return (
    <div className="space-y-5">
      <PageHeader title="Loan Types" description="Configured loan products available to GCGEA members." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loanTypes.map((lt) => (
          <div key={lt.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="font-heading text-sm font-semibold text-foreground">{lt.name}</h3>
              <StatusBadge label={lt.status} tone={lt.status === "Active" ? "success" : "neutral"} />
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{lt.description}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">Amount Range</dt>
              <dd className="text-right font-medium text-foreground">{formatCurrency(lt.minAmount)} – {formatCurrency(lt.maxAmount)}</dd>
              <dt className="text-muted-foreground">Interest Rate</dt>
              <dd className="text-right font-medium text-foreground">{lt.defaultInterestRate}% / month</dd>
              <dt className="text-muted-foreground">Interest Method</dt>
              <dd className="text-right font-medium text-foreground">{lt.interestMethod}</dd>
              <dt className="text-muted-foreground">Processing Fee</dt>
              <dd className="text-right font-medium text-foreground">{formatCurrency(lt.processingFee)}</dd>
              <dt className="text-muted-foreground">Max Term</dt>
              <dd className="text-right font-medium text-foreground">{lt.maxTermMonths} months</dd>
              <dt className="text-muted-foreground">Min. Membership</dt>
              <dd className="text-right font-medium text-foreground">{lt.requiredMembershipMonths} months</dd>
              <dt className="text-muted-foreground">Min. Contributions</dt>
              <dd className="text-right font-medium text-foreground">{lt.requiredContributionMonths} months</dd>
              <dt className="text-muted-foreground">Existing Active Loan</dt>
              <dd className="text-right font-medium text-foreground">{lt.allowExistingActiveLoan ? "Allowed" : "Not Allowed"}</dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}
