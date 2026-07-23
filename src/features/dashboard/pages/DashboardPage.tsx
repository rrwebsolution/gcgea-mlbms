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
  Activity,
  TrendingUp,
  ClipboardCheck,
  RotateCw,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ProfileCompleteness } from "@/components/shared/ProfileCompleteness"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { DashboardListCard } from "@/features/dashboard/components/DashboardListCard"
import { QuickActions } from "@/features/dashboard/components/QuickActions"
import { MonthlyReleasesChart } from "@/features/dashboard/components/MonthlyReleasesChart"
import { MonthlyCollectionsChart } from "@/features/dashboard/components/MonthlyCollectionsChart"
import { LoanStatusChart } from "@/features/dashboard/components/LoanStatusChart"
import { HorizontalBarChart } from "@/features/dashboard/components/HorizontalBarChart"
import { MembershipGrowthChart } from "@/features/dashboard/components/MembershipGrowthChart"
import * as dashboardService from "@/services/dashboard.service"
import { profileCompleteness } from "@/services/members.service"
import { listMyApprovals } from "@/services/approvals.service"
import { APPROVAL_NAV_PERMISSIONS } from "@/constants/navigation"
import { formatCurrency, formatDateShort } from "@/utils/format"
import { LOAN_STATUS_TONE, BENEFIT_STATUS_TONE } from "@/constants/status"

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: dashboardService.getDashboardSummary,
  })
  const { data: monthlyReleases = [], isLoading: monthlyReleasesLoading } = useQuery({ queryKey: ["dashboard", "monthly-releases"], queryFn: dashboardService.getMonthlyLoanReleases })
  const { data: monthlyCollections = [], isLoading: monthlyCollectionsLoading } = useQuery({ queryKey: ["dashboard", "monthly-collections"], queryFn: dashboardService.getMonthlyCollections })
  const { data: loanStatusDist = [], isLoading: loanStatusDistLoading } = useQuery({ queryKey: ["dashboard", "loan-status"], queryFn: dashboardService.getLoanStatusDistribution })
  const { data: benefitDist = [], isLoading: benefitDistLoading } = useQuery({ queryKey: ["dashboard", "benefit-dist"], queryFn: dashboardService.getBenefitDistributionByType })
  const { data: membersPerOffice = [], isLoading: membersPerOfficeLoading } = useQuery({ queryKey: ["dashboard", "members-office"], queryFn: dashboardService.getMembersPerOffice })
  const { data: membershipGrowth = [], isLoading: membershipGrowthLoading } = useQuery({ queryKey: ["dashboard", "growth"], queryFn: dashboardService.getMembershipGrowthByYear })

  const { data: recentLoans = [], isLoading: recentLoansLoading } = useQuery({ queryKey: ["dashboard", "recent-loans"], queryFn: () => dashboardService.getRecentLoanApplications() })
  const { data: recentPayments = [], isLoading: recentPaymentsLoading } = useQuery({ queryKey: ["dashboard", "recent-payments"], queryFn: () => dashboardService.getRecentPayments() })
  const { data: upcomingDue = [], isLoading: upcomingDueLoading } = useQuery({ queryKey: ["dashboard", "upcoming-due"], queryFn: () => dashboardService.getUpcomingDueLoans() })
  const { data: overdueLoans = [], isLoading: overdueLoading } = useQuery({ queryKey: ["dashboard", "overdue"], queryFn: () => dashboardService.getOverdueLoans() })
  const { data: recentBenefits = [], isLoading: recentBenefitsLoading } = useQuery({ queryKey: ["dashboard", "recent-benefits"], queryFn: () => dashboardService.getRecentBenefitApplications() })
  const { data: recentMembers = [], isLoading: recentMembersLoading } = useQuery({ queryKey: ["dashboard", "recent-members"], queryFn: () => dashboardService.getRecentlyAddedMembers() })
  const { data: incompleteProfiles = [], isLoading: incompleteLoading } = useQuery({ queryKey: ["dashboard", "incomplete"], queryFn: () => dashboardService.getIncompleteProfiles() })

  const { data: pendingApprovals, isLoading: pendingApprovalsLoading } = useQuery({
    queryKey: ["my-approvals", "dashboard-pending"],
    queryFn: () => listMyApprovals({ tab: "pending", perPage: 100 }),
  })
  const { data: recentApprovals, isLoading: recentApprovalsLoading } = useQuery({
    queryKey: ["my-approvals", "dashboard-recent"],
    queryFn: () => listMyApprovals({ tab: "approved", perPage: 5 }),
  })
  const pendingItems = pendingApprovals?.data ?? []
  const awaitingReview = pendingItems.filter((item) => item.currentStageType === "review").length
  const awaitingApproval = pendingItems.filter((item) => item.currentStageType === "approve").length
  const awaitingRelease = pendingItems.filter((item) => item.currentStageType === "release").length

  return (
    <div className="space-y-8 pb-10">
      <PageHeader title="Dashboard" description="Overview of GCGEA membership, loans, benefits, and collections." />

      {/* QUICK ACTIONS SECTION */}
      <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-background p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex size-2 rounded-full bg-primary/90 animate-pulse" />
          <h2 className="text-sm font-bold tracking-tight text-foreground">Quick Actions</h2>
        </div>
        <QuickActions />
      </section>

      {/* APPROVAL WORKFLOW SECTION — only shown to users who hold any approval permission */}
      <PermissionGuard anyOf={APPROVAL_NAV_PERMISSIONS}>
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <ClipboardCheck className="size-4 text-muted-foreground/85" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">Approval Workflow</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Pending My Action" value={String(pendingItems.length)} icon={ClipboardCheck} tone="warning" isLoading={pendingApprovalsLoading} />
            <StatCard label="Awaiting Review" value={String(awaitingReview)} icon={FileClock} tone="info" isLoading={pendingApprovalsLoading} />
            <StatCard label="Awaiting Approval" value={String(awaitingApproval)} icon={FileWarning} tone="warning" isLoading={pendingApprovalsLoading} />
            <StatCard label="Awaiting Release" value={String(awaitingRelease)} icon={Banknote} tone="success" isLoading={pendingApprovalsLoading} />
          </div>
          <DashboardListCard
            title="Recent Approvals"
            icon={ClipboardCheck}
            viewAllPath="/my-approvals"
            isLoading={recentApprovalsLoading}
            isEmpty={(recentApprovals?.data.length ?? 0) === 0}
          >
            {(recentApprovals?.data ?? []).map((item) => (
              <Link
                key={item.id}
                to={`/approvals/${item.subjectType}/${item.subjectId}`}
                className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{item.reference ?? item.title}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{item.memberName ?? item.title}</span>
                </span>
                <StatusBadge label={item.status} tone="success" />
              </Link>
            ))}
          </DashboardListCard>
        </section>
      </PermissionGuard>

      {/* STAT CARDS SECTION */}
      <div className="space-y-6">
        {/* Membership & Benefits Group */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Users className="size-4 text-muted-foreground/85" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">Membership & Benefits Overview</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total Members" value={String(summary?.totalMembers ?? 0)} icon={Users} tone="primary" isLoading={summaryLoading} />
            <StatCard label="Active Members" value={String(summary?.activeMembers ?? 0)} icon={UserCheck} tone="success" isLoading={summaryLoading} />
            <StatCard label="Retired Members" value={String(summary?.retiredMembers ?? 0)} icon={UserCog} tone="gold" isLoading={summaryLoading} />
            <StatCard label="Pending Loan Apps" value={String(summary?.pendingLoanApplications ?? 0)} icon={FileClock} tone="warning" isLoading={summaryLoading} />
            <StatCard label="Pending Benefit Apps" value={String(summary?.pendingBenefitApplications ?? 0)} icon={FileWarning} tone="warning" isLoading={summaryLoading} />
          </div>
        </section>

        {/* Financial Metrics & Collections Group */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Landmark className="size-4 text-muted-foreground/85" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">Financial Metrics & Collections</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Active Loans" value={String(summary?.activeLoans ?? 0)} icon={Landmark} tone="info" isLoading={summaryLoading} />
            <StatCard label="Outstanding Balance" value={formatCurrency(summary?.outstandingLoanBalance ?? 0)} icon={Banknote} tone="danger" isLoading={summaryLoading} />
            <StatCard label="Total Collections" value={formatCurrency(summary?.totalLoanCollections ?? 0)} icon={PiggyBank} tone="success" isLoading={summaryLoading} />
            <StatCard label="Benefits Released" value={String(summary?.benefitsReleased ?? 0)} icon={HeartHandshake} tone="gold" isLoading={summaryLoading} />
            <StatCard label="Monthly Contributions" value={formatCurrency(summary?.monthlyContributionsCollected ?? 0)} icon={Wallet} tone="primary" isLoading={summaryLoading} />
          </div>
        </section>

        {/* Reloan & Eligibility Group */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <RotateCw className="size-4 text-muted-foreground/85" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">Reloan & Eligibility</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Pending Reloan Apps" value={String(summary?.pendingReloanApplications ?? 0)} icon={RotateCw} tone="warning" isLoading={summaryLoading} />
            <StatCard label="Reloans Awaiting Review" value={String(summary?.reloansAwaitingReview ?? 0)} icon={FileClock} tone="info" isLoading={summaryLoading} />
            <StatCard label="Approved Reloans" value={String(summary?.approvedReloans ?? 0)} icon={ClipboardCheck} tone="success" isLoading={summaryLoading} />
            <StatCard label="Reloans Awaiting Release" value={String(summary?.reloansAwaitingRelease ?? 0)} icon={Banknote} tone="gold" isLoading={summaryLoading} />
            <StatCard label="Members Eligible This Month" value={String(summary?.membersBecomingLoanEligibleThisMonth ?? 0)} icon={UserPlus} tone="primary" isLoading={summaryLoading} />
          </div>
        </section>
      </div>

      {/* CHARTS SECTION */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="size-4 text-muted-foreground/85" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">Analytical Insights</h3>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/100 hover:shadow-md">
            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
              <h4 className="text-sm font-semibold tracking-tight text-foreground/90">Monthly Loan Releases</h4>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">Loan Data</span>
            </div>
            <MonthlyReleasesChart data={monthlyReleases} isLoading={monthlyReleasesLoading} />
          </div>
          <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/100 hover:shadow-md">
            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
              <h4 className="text-sm font-semibold tracking-tight text-foreground/90">Monthly Collections</h4>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">Collections Data</span>
            </div>
            <MonthlyCollectionsChart data={monthlyCollections} isLoading={monthlyCollectionsLoading} />
          </div>
          <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/100 hover:shadow-md">
            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
              <h4 className="text-sm font-semibold tracking-tight text-foreground/90">Loan Status Distribution</h4>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">Distribution</span>
            </div>
            <LoanStatusChart data={loanStatusDist} isLoading={loanStatusDistLoading} />
          </div>
          <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/100 hover:shadow-md">
            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
              <h4 className="text-sm font-semibold tracking-tight text-foreground/90">Benefit Distribution by Type</h4>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">Benefits Type</span>
            </div>
            <HorizontalBarChart data={benefitDist.map((b) => ({ label: b.type, value: b.count }))} valueLabel="Applications" isLoading={benefitDistLoading} />
          </div>
          <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/100 hover:shadow-md">
            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
              <h4 className="text-sm font-semibold tracking-tight text-foreground/90">Members per Office</h4>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">Office Scope</span>
            </div>
            <HorizontalBarChart data={membersPerOffice.map((o) => ({ label: o.office, value: o.count }))} valueLabel="Members" isLoading={membersPerOfficeLoading} />
          </div>
          <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/100 hover:shadow-md">
            <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
              <h4 className="text-sm font-semibold tracking-tight text-foreground/90">Membership Growth by Year</h4>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">Growth Trend</span>
            </div>
            <MembershipGrowthChart data={membershipGrowth} isLoading={membershipGrowthLoading} />
          </div>
        </div>
      </section>

      {/* RECENT ACTIVITY & LISTCARDS SECTION */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Activity className="size-4 text-muted-foreground/85" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">Recent Activity & Monitoring</h3>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          
          <DashboardListCard title="Recent Loan Applications" icon={Landmark} viewAllPath="/loans" isLoading={recentLoansLoading} isEmpty={recentLoans.length === 0}>
            {recentLoans.map((loan) => (
              <Link key={loan.id} to={`/loans/${loan.id}`} className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3 text-sm hover:bg-muted/40 transition-colors">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{loan.memberName}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{loan.applicationNumber} · {formatCurrency(loan.requestedAmount)}</span>
                </span>
                <StatusBadge label={loan.status} tone={LOAN_STATUS_TONE[loan.status] ?? "neutral"} />
              </Link>
            ))}
          </DashboardListCard>

          <DashboardListCard title="Recent Payments" icon={CreditCard} viewAllPath="/loan-payments" isLoading={recentPaymentsLoading} isEmpty={recentPayments.length === 0}>
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{payment.memberName}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{payment.paymentReferenceNumber} · {formatDateShort(payment.paymentDate)}</span>
                </span>
                <span className="shrink-0 font-semibold text-success">{formatCurrency(payment.amountPaid)}</span>
              </div>
            ))}
          </DashboardListCard>

          <DashboardListCard title="Upcoming Loan Due Dates" icon={Clock} viewAllPath="/loans/active" isLoading={upcomingDueLoading} isEmpty={upcomingDue.length === 0}>
            {upcomingDue.map(({ loan, entry }) => (
              <Link key={loan.id} to={`/loans/${loan.id}`} className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3 text-sm hover:bg-muted/40 transition-colors">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{loan.memberName}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">Due {formatDateShort(entry.dueDate)}</span>
                </span>
                <span className="shrink-0 font-semibold text-foreground">{formatCurrency(entry.amountDue)}</span>
              </Link>
            ))}
          </DashboardListCard>

          <DashboardListCard title="Overdue Accounts" icon={AlertTriangle} viewAllPath="/loans/overdue" isLoading={overdueLoading} isEmpty={overdueLoans.length === 0}>
            {overdueLoans.map((loan) => (
              <Link key={loan.id} to={`/loans/${loan.id}`} className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3 text-sm hover:bg-muted/40 transition-colors">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{loan.memberName}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{loan.applicationNumber}</span>
                </span>
                <span className="shrink-0 font-semibold text-destructive">{formatCurrency(loan.outstandingBalance)}</span>
              </Link>
            ))}
          </DashboardListCard>

          <DashboardListCard title="Recent Benefit Applications" icon={Gift} viewAllPath="/benefits" isLoading={recentBenefitsLoading} isEmpty={recentBenefits.length === 0}>
            {recentBenefits.map((benefit) => (
              <Link key={benefit.id} to={`/benefits/${benefit.id}`} className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3 text-sm hover:bg-muted/40 transition-colors">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{benefit.memberName}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{benefit.benefitTypeName}</span>
                </span>
                <StatusBadge label={benefit.status} tone={BENEFIT_STATUS_TONE[benefit.status] ?? "neutral"} />
              </Link>
            ))}
          </DashboardListCard>

          <DashboardListCard title="Recently Added Members" icon={UserPlus} viewAllPath="/members" isLoading={recentMembersLoading} isEmpty={recentMembers.length === 0}>
            {recentMembers.map((member) => (
              <Link key={member.id} to={`/members/${member.id}`} className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3 text-sm hover:bg-muted/40 transition-colors">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{member.fullName}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{member.memberNumber} · {member.officeName}</span>
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
              <Link key={member.id} to={`/members/${member.id}`} className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3 text-sm hover:bg-muted/40 transition-colors">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{member.fullName}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{member.memberNumber}</span>
                </span>
                <ProfileCompleteness percentage={profileCompleteness(member)} />
              </Link>
            ))}
          </DashboardListCard>
          
        </div>
      </section>
    </div>
  )
}