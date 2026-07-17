import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  Users,
  UserCheck,
  UserCog,
  FileClock,
  Landmark,
  Wallet,
  Banknote,
  HeartHandshake,
  Gift,
  PiggyBank,
  Clock,
  AlertTriangle,
  CreditCard,
  UserPlus,
  FileWarning,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ProfileCompleteness } from "@/components/shared/ProfileCompleteness"
import { DashboardListCard } from "@/features/dashboard/components/DashboardListCard"
import { QuickActions } from "@/features/dashboard/components/QuickActions"
import { MonthlyReleasesChart } from "@/features/dashboard/components/MonthlyReleasesChart"
import { MonthlyCollectionsChart } from "@/features/dashboard/components/MonthlyCollectionsChart"
import { LoanStatusChart } from "@/features/dashboard/components/LoanStatusChart"
import { HorizontalBarChart } from "@/features/dashboard/components/HorizontalBarChart"
import { MembershipGrowthChart } from "@/features/dashboard/components/MembershipGrowthChart"
import * as dashboardService from "@/services/dashboard.service"
import { profileCompleteness } from "@/services/members.service"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { LOAN_STATUS_TONE, BENEFIT_STATUS_TONE } from "@/constants/status"

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: dashboardService.getDashboardSummary,
  })
  const { data: monthlyReleases = [] } = useQuery({ queryKey: ["dashboard", "monthly-releases"], queryFn: dashboardService.getMonthlyLoanReleases })
  const { data: monthlyCollections = [] } = useQuery({ queryKey: ["dashboard", "monthly-collections"], queryFn: dashboardService.getMonthlyCollections })
  const { data: loanStatusDist = [] } = useQuery({ queryKey: ["dashboard", "loan-status"], queryFn: dashboardService.getLoanStatusDistribution })
  const { data: benefitDist = [] } = useQuery({ queryKey: ["dashboard", "benefit-dist"], queryFn: dashboardService.getBenefitDistributionByType })
  const { data: membersPerOffice = [] } = useQuery({ queryKey: ["dashboard", "members-office"], queryFn: dashboardService.getMembersPerOffice })
  const { data: membershipGrowth = [] } = useQuery({ queryKey: ["dashboard", "growth"], queryFn: dashboardService.getMembershipGrowthByYear })

  const { data: recentLoans = [], isLoading: recentLoansLoading } = useQuery({ queryKey: ["dashboard", "recent-loans"], queryFn: () => dashboardService.getRecentLoanApplications() })
  const { data: recentPayments = [], isLoading: recentPaymentsLoading } = useQuery({ queryKey: ["dashboard", "recent-payments"], queryFn: () => dashboardService.getRecentPayments() })
  const { data: upcomingDue = [], isLoading: upcomingDueLoading } = useQuery({ queryKey: ["dashboard", "upcoming-due"], queryFn: () => dashboardService.getUpcomingDueLoans() })
  const { data: overdueLoans = [], isLoading: overdueLoading } = useQuery({ queryKey: ["dashboard", "overdue"], queryFn: () => dashboardService.getOverdueLoans() })
  const { data: recentBenefits = [], isLoading: recentBenefitsLoading } = useQuery({ queryKey: ["dashboard", "recent-benefits"], queryFn: () => dashboardService.getRecentBenefitApplications() })
  const { data: recentMembers = [], isLoading: recentMembersLoading } = useQuery({ queryKey: ["dashboard", "recent-members"], queryFn: () => dashboardService.getRecentlyAddedMembers() })
  const { data: incompleteProfiles = [], isLoading: incompleteLoading } = useQuery({ queryKey: ["dashboard", "incomplete"], queryFn: () => dashboardService.getIncompleteProfiles() })

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of GCGEA membership, loans, benefits, and collections." />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Quick Actions</h2>
        <QuickActions />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Members" value={String(summary?.totalMembers ?? 0)} icon={Users} tone="primary" isLoading={summaryLoading} />
        <StatCard label="Active Members" value={String(summary?.activeMembers ?? 0)} icon={UserCheck} tone="success" isLoading={summaryLoading} />
        <StatCard label="Retired Members" value={String(summary?.retiredMembers ?? 0)} icon={UserCog} tone="gold" isLoading={summaryLoading} />
        <StatCard label="Pending Loan Applications" value={String(summary?.pendingLoanApplications ?? 0)} icon={FileClock} tone="warning" isLoading={summaryLoading} />
        <StatCard label="Active Loans" value={String(summary?.activeLoans ?? 0)} icon={Landmark} tone="info" isLoading={summaryLoading} />
        <StatCard label="Outstanding Loan Balance" value={formatCurrency(summary?.outstandingLoanBalance ?? 0)} icon={Banknote} tone="danger" isLoading={summaryLoading} />
        <StatCard label="Total Loan Collections" value={formatCurrency(summary?.totalLoanCollections ?? 0)} icon={PiggyBank} tone="success" isLoading={summaryLoading} />
        <StatCard label="Pending Benefit Applications" value={String(summary?.pendingBenefitApplications ?? 0)} icon={FileWarning} tone="warning" isLoading={summaryLoading} />
        <StatCard label="Benefits Released" value={String(summary?.benefitsReleased ?? 0)} icon={HeartHandshake} tone="gold" isLoading={summaryLoading} />
        <StatCard label="Monthly Contributions Collected" value={formatCurrency(summary?.monthlyContributionsCollected ?? 0)} icon={Wallet} tone="primary" isLoading={summaryLoading} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Monthly Loan Releases</h3>
          <MonthlyReleasesChart data={monthlyReleases} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Monthly Collections</h3>
          <MonthlyCollectionsChart data={monthlyCollections} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Loan Status Distribution</h3>
          <LoanStatusChart data={loanStatusDist} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Benefit Distribution by Type</h3>
          <HorizontalBarChart data={benefitDist.map((b) => ({ label: b.type, value: b.count }))} valueLabel="Applications" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Members per Office</h3>
          <HorizontalBarChart data={membersPerOffice.map((o) => ({ label: o.office, value: o.count }))} valueLabel="Members" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Membership Growth by Year</h3>
          <MembershipGrowthChart data={membershipGrowth} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <DashboardListCard title="Recent Loan Applications" icon={Landmark} viewAllPath="/loans" isLoading={recentLoansLoading} isEmpty={recentLoans.length === 0}>
          {recentLoans.map((loan) => (
            <Link key={loan.id} to={`/loans/${loan.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted/50">
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{loan.memberName}</span>
                <span className="block text-xs text-muted-foreground">{loan.applicationNumber} · {formatCurrency(loan.requestedAmount)}</span>
              </span>
              <StatusBadge label={loan.status} tone={LOAN_STATUS_TONE[loan.status] ?? "neutral"} />
            </Link>
          ))}
        </DashboardListCard>

        <DashboardListCard title="Recent Payments" icon={CreditCard} viewAllPath="/loan-payments" isLoading={recentPaymentsLoading} isEmpty={recentPayments.length === 0}>
          {recentPayments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{payment.memberName}</span>
                <span className="block text-xs text-muted-foreground">{payment.paymentReferenceNumber} · {formatDateShort(payment.paymentDate)}</span>
              </span>
              <span className="shrink-0 font-medium text-success">{formatCurrency(payment.amountPaid)}</span>
            </div>
          ))}
        </DashboardListCard>

        <DashboardListCard title="Upcoming Loan Due Dates" icon={Clock} viewAllPath="/loans/active" isLoading={upcomingDueLoading} isEmpty={upcomingDue.length === 0}>
          {upcomingDue.map(({ loan, entry }) => (
            <Link key={loan.id} to={`/loans/${loan.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted/50">
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{loan.memberName}</span>
                <span className="block text-xs text-muted-foreground">Due {formatDateShort(entry.dueDate)}</span>
              </span>
              <span className="shrink-0 font-medium text-foreground">{formatCurrency(entry.amountDue)}</span>
            </Link>
          ))}
        </DashboardListCard>

        <DashboardListCard title="Overdue Accounts" icon={AlertTriangle} viewAllPath="/loans/overdue" isLoading={overdueLoading} isEmpty={overdueLoans.length === 0}>
          {overdueLoans.map((loan) => (
            <Link key={loan.id} to={`/loans/${loan.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted/50">
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{loan.memberName}</span>
                <span className="block text-xs text-muted-foreground">{loan.applicationNumber}</span>
              </span>
              <span className="shrink-0 font-medium text-destructive">{formatCurrency(loan.outstandingBalance)}</span>
            </Link>
          ))}
        </DashboardListCard>

        <DashboardListCard title="Recent Benefit Applications" icon={Gift} viewAllPath="/benefits" isLoading={recentBenefitsLoading} isEmpty={recentBenefits.length === 0}>
          {recentBenefits.map((benefit) => (
            <Link key={benefit.id} to={`/benefits/${benefit.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted/50">
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{benefit.memberName}</span>
                <span className="block text-xs text-muted-foreground">{benefit.benefitTypeName}</span>
              </span>
              <StatusBadge label={benefit.status} tone={BENEFIT_STATUS_TONE[benefit.status] ?? "neutral"} />
            </Link>
          ))}
        </DashboardListCard>

        <DashboardListCard title="Recently Added Members" icon={UserPlus} viewAllPath="/members" isLoading={recentMembersLoading} isEmpty={recentMembers.length === 0}>
          {recentMembers.map((member) => (
            <Link key={member.id} to={`/members/${member.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted/50">
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{member.fullName}</span>
                <span className="block text-xs text-muted-foreground">{member.memberNumber} · {member.officeName}</span>
              </span>
            </Link>
          ))}
        </DashboardListCard>

        <DashboardListCard
          title="Incomplete Member Profiles"
          icon={FileWarning}
          viewAllPath="/members/incomplete"
          isLoading={incompleteLoading}
          isEmpty={incompleteProfiles.length === 0}
          className="xl:col-span-1"
        >
          {incompleteProfiles.map((member) => (
            <Link key={member.id} to={`/members/${member.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted/50">
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{member.fullName}</span>
                <span className="block text-xs text-muted-foreground">{member.memberNumber}</span>
              </span>
              <ProfileCompleteness percentage={profileCompleteness(member)} />
            </Link>
          ))}
        </DashboardListCard>
      </section>
    </div>
  )
}
