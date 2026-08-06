import { useState } from "react"
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
  Sparkles,
  BarChart3,
  Layers,
  ArrowUpRight,
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
  // Tabs State
  const [metricTab, setMetricTab] = useState<"overview" | "financials" | "reloans">("overview")
  const [chartTab, setChartTab] = useState<"financial" | "membership">("financial")
  const [activityTab, setActivityTab] = useState<"all" | "loans" | "alerts" | "members">("all")

  // React Query Hooks — one request for the whole page instead of 13 (see
  // DashboardController::overview() on the backend).
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => dashboardService.getDashboardOverview(),
  })

  const summary = overview?.summary
  const summaryLoading = overviewLoading
  const monthlyReleases = overview?.monthlyReleases ?? []
  const monthlyReleasesLoading = overviewLoading
  const monthlyCollections = overview?.monthlyCollections ?? []
  const monthlyCollectionsLoading = overviewLoading
  const loanStatusDist = overview?.loanStatus ?? []
  const loanStatusDistLoading = overviewLoading
  const benefitDist = overview?.benefitDistribution ?? []
  const benefitDistLoading = overviewLoading
  const membersPerOffice = overview?.membersPerOffice ?? []
  const membersPerOfficeLoading = overviewLoading
  const membershipGrowth = overview?.membershipGrowth ?? []
  const membershipGrowthLoading = overviewLoading

  const recentLoans = overview?.recentLoans ?? []
  const recentLoansLoading = overviewLoading
  const recentPayments = overview?.recentPayments ?? []
  const recentPaymentsLoading = overviewLoading
  const upcomingDue = overview?.upcomingDue ?? []
  const upcomingDueLoading = overviewLoading
  const overdueLoans = overview?.overdueLoans ?? []
  const overdueLoading = overviewLoading
  const recentBenefits = overview?.recentBenefits ?? []
  const recentBenefitsLoading = overviewLoading
  const recentMembers = overview?.recentMembers ?? []
  const recentMembersLoading = overviewLoading
  const incompleteProfiles = overview?.incompleteProfiles ?? []
  const incompleteLoading = overviewLoading

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
    <div className="space-y-8 pb-16">
      {/* GLOBAL PAGE HEADER */}
      <PageHeader 
        title="Dashboard" 
        description="Overview of GCGEA membership, loans, benefits, and collections." 
      />

      {/* EXECUTIVE HIGHLIGHT BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
              <Sparkles className="size-3.5" /> GCGEA Cooperative Overview
            </div>
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Executive Management Overview
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Real-time monitor for membership, loan balances, collections, and approval queues.
            </p>
          </div>

          {/* Quick Highlight Stats Chip */}
          <PermissionGuard permission="loan_payments.view">
            <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm p-3 rounded-xl border border-border/50 shadow-2xs">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Banknote className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Collections in the system</p>
                <p className="text-base font-bold text-foreground">
                  {summaryLoading ? "..." : formatCurrency(summary?.totalLoanCollections ?? 0)}
                </p>
              </div>
            </div>
          </PermissionGuard>
        </div>
      </div>

      {/* QUICK ACTIONS SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-primary animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Launch Actions</h2>
          </div>
        </div>
        <QuickActions />
      </section>

      {/* APPROVAL WORKFLOW SECTION */}
      <PermissionGuard anyOf={APPROVAL_NAV_PERMISSIONS}>
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1 border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">Approval Workflow</h3>
            </div>
            {pendingItems.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                {pendingItems.length} Action(s) Required
              </span>
            )}
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
            className="border-border/60"
          >
            {(recentApprovals?.data ?? []).map((item) => (
              <Link
                key={item.id}
                to={`/approvals/${item.subjectType}/${item.subjectId}`}
                className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3.5 text-sm hover:bg-muted/40 transition-colors"
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

      {/* METRIC CARDS WITH SEGMENTED TABS */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">Key Metric Indicators</h3>
          </div>

          {/* Segmented Controller */}
          <div className="inline-flex rounded-xl bg-muted/60 p-1 text-xs font-semibold text-muted-foreground">
            <button
              onClick={() => setMetricTab("overview")}
              className={`rounded-lg px-3 py-1.5 transition-all ${metricTab === "overview" ? "bg-background text-foreground shadow-xs font-bold" : "hover:text-foreground"}`}
            >
              Overview & Members
            </button>
            <button
              onClick={() => setMetricTab("financials")}
              className={`rounded-lg px-3 py-1.5 transition-all ${metricTab === "financials" ? "bg-background text-foreground shadow-xs font-bold" : "hover:text-foreground"}`}
            >
              Financials & Balances
            </button>
            <button
              onClick={() => setMetricTab("reloans")}
              className={`rounded-lg px-3 py-1.5 transition-all ${metricTab === "reloans" ? "bg-background text-foreground shadow-xs font-bold" : "hover:text-foreground"}`}
            >
              Reloans & Pipeline
            </button>
          </div>
        </div>

        {/* Tab 1: Overview & Members */}
        {metricTab === "overview" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 animate-in fade-in-50 duration-200">
            <PermissionGuard permission="members.view">
              <StatCard label="Total Members" value={String(summary?.totalMembers ?? 0)} icon={Users} tone="primary" isLoading={summaryLoading} />
              <StatCard label="Active Members" value={String(summary?.activeMembers ?? 0)} icon={UserCheck} tone="success" isLoading={summaryLoading} />
              <StatCard label="Retired Members" value={String(summary?.retiredMembers ?? 0)} icon={UserCog} tone="gold" isLoading={summaryLoading} />
            </PermissionGuard>
            <PermissionGuard permission="loans.view">
              <StatCard label="Pending Loan Apps" value={String(summary?.pendingLoanApplications ?? 0)} icon={FileClock} tone="warning" isLoading={summaryLoading} />
            </PermissionGuard>
            <PermissionGuard permission="benefits.view">
              <StatCard label="Pending Benefit Apps" value={String(summary?.pendingBenefitApplications ?? 0)} icon={FileWarning} tone="warning" isLoading={summaryLoading} />
            </PermissionGuard>
          </div>
        )}

        {/* Tab 2: Financials & Collections */}
        {metricTab === "financials" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 animate-in fade-in-50 duration-200">
            <PermissionGuard permission="loans.view">
              <StatCard label="Active Loans" value={String(summary?.activeLoans ?? 0)} icon={Landmark} tone="info" isLoading={summaryLoading} />
              <StatCard label="Outstanding Balance" value={formatCurrency(summary?.outstandingLoanBalance ?? 0)} icon={Banknote} tone="danger" isLoading={summaryLoading} />
            </PermissionGuard>
            <PermissionGuard permission="loan_payments.view">
              <StatCard label="Total Collections" value={formatCurrency(summary?.totalLoanCollections ?? 0)} icon={PiggyBank} tone="success" isLoading={summaryLoading} />
            </PermissionGuard>
            <PermissionGuard permission="benefits.view">
              <StatCard label="Benefits Released" value={String(summary?.benefitsReleased ?? 0)} icon={HeartHandshake} tone="gold" isLoading={summaryLoading} />
            </PermissionGuard>
            <PermissionGuard permission="contributions.view">
              <StatCard label="Monthly Contributions" value={formatCurrency(summary?.monthlyContributionsCollected ?? 0)} icon={Wallet} tone="primary" isLoading={summaryLoading} />
            </PermissionGuard>
            <PermissionGuard permission="annual_budgets.view">
              {(summary?.fundBalances ?? []).map((fund) => (
                <StatCard key={fund.fundId} label={`${fund.fundName} Balance`} value={formatCurrency(fund.balance)} icon={Wallet} tone="success" isLoading={summaryLoading} />
              ))}
            </PermissionGuard>
          </div>
        )}

        {/* Tab 3: Reloans & Pipeline */}
        {metricTab === "reloans" && (
          <PermissionGuard permission="loans.view">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 animate-in fade-in-50 duration-200">
              <StatCard label="Pending Reloan Apps" value={String(summary?.pendingReloanApplications ?? 0)} icon={RotateCw} tone="warning" isLoading={summaryLoading} />
              <StatCard label="Reloans Awaiting Review" value={String(summary?.reloansAwaitingReview ?? 0)} icon={FileClock} tone="info" isLoading={summaryLoading} />
              <StatCard label="Approved Reloans" value={String(summary?.approvedReloans ?? 0)} icon={ClipboardCheck} tone="success" isLoading={summaryLoading} />
              <StatCard label="Reloans Awaiting Release" value={String(summary?.reloansAwaitingRelease ?? 0)} icon={Banknote} tone="gold" isLoading={summaryLoading} />
              <StatCard label="Eligible This Month" value={String(summary?.membersBecomingLoanEligibleThisMonth ?? 0)} icon={UserPlus} tone="primary" isLoading={summaryLoading} />
            </div>
          </PermissionGuard>
        )}
      </section>

      {/* ANALYTICS WORKSPACE SECTION */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">Analytical Workspace</h3>
          </div>

          <div className="inline-flex rounded-xl bg-muted/60 p-1 text-xs font-semibold text-muted-foreground">
            <button
              onClick={() => setChartTab("financial")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${chartTab === "financial" ? "bg-background text-foreground shadow-xs font-bold" : "hover:text-foreground"}`}
            >
              <BarChart3 className="size-3.5" /> Financial Trends
            </button>
            <button
              onClick={() => setChartTab("membership")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${chartTab === "membership" ? "bg-background text-foreground shadow-xs font-bold" : "hover:text-foreground"}`}
            >
              <Users className="size-3.5" /> Membership & Scope
            </button>
          </div>
        </div>

        {/* Financial Trends View */}
        {chartTab === "financial" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 animate-in fade-in-50 duration-200">
            <PermissionGuard permission="loans.view">
              <div className="group rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:border-border hover:shadow-md">
                <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2.5">
                  <h4 className="text-sm font-semibold tracking-tight text-foreground/90">Monthly Loan Releases</h4>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full uppercase tracking-wide">Releases</span>
                </div>
                <MonthlyReleasesChart data={monthlyReleases} isLoading={monthlyReleasesLoading} />
              </div>
            </PermissionGuard>

            <PermissionGuard permission="loan_payments.view">
              <div className="group rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:border-border hover:shadow-md">
                <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2.5">
                  <h4 className="text-sm font-semibold tracking-tight text-foreground/90">Monthly Collections</h4>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full uppercase tracking-wide">Collections</span>
                </div>
                <MonthlyCollectionsChart data={monthlyCollections} isLoading={monthlyCollectionsLoading} />
              </div>
            </PermissionGuard>

            <PermissionGuard permission="loans.view">
              <div className="group rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:border-border hover:shadow-md lg:col-span-2">
                <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2.5">
                  <h4 className="text-sm font-semibold tracking-tight text-foreground/90">Loan Status Distribution</h4>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full uppercase tracking-wide">Distribution</span>
                </div>
                <LoanStatusChart data={loanStatusDist} isLoading={loanStatusDistLoading} />
              </div>
            </PermissionGuard>
          </div>
        )}

        {/* Membership & Scope View */}
        {chartTab === "membership" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 animate-in fade-in-50 duration-200">
            <PermissionGuard permission="benefits.view">
              <div className="group rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:border-border hover:shadow-md">
                <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2.5">
                  <h4 className="text-sm font-semibold tracking-tight text-foreground/90">Benefit Distribution by Type</h4>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full uppercase tracking-wide">Benefits</span>
                </div>
                <HorizontalBarChart data={benefitDist.map((b) => ({ label: b.type, value: b.count }))} valueLabel="Applications" isLoading={benefitDistLoading} />
              </div>
            </PermissionGuard>

            <PermissionGuard permission="members.view">
              <div className="group rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:border-border hover:shadow-md">
                <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2.5">
                  <h4 className="text-sm font-semibold tracking-tight text-foreground/90">Members per Office</h4>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full uppercase tracking-wide">Office Scope</span>
                </div>
                <HorizontalBarChart data={membersPerOffice.map((o) => ({ label: o.office, value: o.count }))} valueLabel="Members" isLoading={membersPerOfficeLoading} />
              </div>

              <div className="group rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:border-border hover:shadow-md lg:col-span-2">
                <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2.5">
                  <h4 className="text-sm font-semibold tracking-tight text-foreground/90">Membership Growth by Year</h4>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full uppercase tracking-wide">Historical Trend</span>
                </div>
                <MembershipGrowthChart data={membershipGrowth} isLoading={membershipGrowthLoading} />
              </div>
            </PermissionGuard>
          </div>
        )}
      </section>

      {/* RECENT ACTIVITY & MONITORING HUB */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">Activity & Monitoring Hub</h3>
          </div>

          {/* Activity Category Controller */}
          <div className="inline-flex rounded-xl bg-muted/60 p-1 text-xs font-semibold text-muted-foreground">
            <button
              onClick={() => setActivityTab("all")}
              className={`rounded-lg px-3 py-1.5 transition-all ${activityTab === "all" ? "bg-background text-foreground shadow-xs font-bold" : "hover:text-foreground"}`}
            >
              All Feeds
            </button>
            <button
              onClick={() => setActivityTab("loans")}
              className={`rounded-lg px-3 py-1.5 transition-all ${activityTab === "loans" ? "bg-background text-foreground shadow-xs font-bold" : "hover:text-foreground"}`}
            >
              Loans & Payments
            </button>
            <button
              onClick={() => setActivityTab("alerts")}
              className={`rounded-lg px-3 py-1.5 transition-all ${activityTab === "alerts" ? "bg-background text-foreground shadow-xs font-bold" : "hover:text-foreground"}`}
            >
              Alerts & Overdue
            </button>
            <button
              onClick={() => setActivityTab("members")}
              className={`rounded-lg px-3 py-1.5 transition-all ${activityTab === "members" ? "bg-background text-foreground shadow-xs font-bold" : "hover:text-foreground"}`}
            >
              Members & Benefits
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          
          {/* Loans & Payments Cards */}
          {(activityTab === "all" || activityTab === "loans") && (
            <>
              <PermissionGuard permission="loans.view">
                <DashboardListCard title="Recent Loan Applications" icon={Landmark} viewAllPath="/loans" isLoading={recentLoansLoading} isEmpty={recentLoans.length === 0} className="border-border/60 shadow-2xs">
                  {recentLoans.map((loan) => (
                    <Link key={loan.id} to={`/loans/${loan.id}`} className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3.5 text-sm hover:bg-muted/40 transition-colors">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{loan.memberName}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{loan.applicationNumber} · {formatCurrency(loan.requestedAmount)}</span>
                      </span>
                      <StatusBadge label={loan.status} tone={LOAN_STATUS_TONE[loan.status] ?? "neutral"} />
                    </Link>
                  ))}
                </DashboardListCard>
              </PermissionGuard>

              <PermissionGuard permission="loan_payments.view">
                <DashboardListCard title="Recent Payments" icon={CreditCard} viewAllPath="/loan-payments" isLoading={recentPaymentsLoading} isEmpty={recentPayments.length === 0} className="border-border/60 shadow-2xs">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{payment.memberName}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{payment.paymentReferenceNumber} · {formatDateShort(payment.paymentDate)}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(payment.amountPaid)}</span>
                    </div>
                  ))}
                </DashboardListCard>
              </PermissionGuard>
            </>
          )}

          {/* Alerts & Due Cards */}
          {(activityTab === "all" || activityTab === "alerts") && (
            <PermissionGuard permission="loans.view">
              <DashboardListCard title="Upcoming Loan Due Dates" icon={Clock} viewAllPath="/loans/active" isLoading={upcomingDueLoading} isEmpty={upcomingDue.length === 0} className="border-border/60 shadow-2xs">
                {upcomingDue.map(({ loan, entry }) => (
                  <Link key={loan.id} to={`/loans/${loan.id}`} className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3.5 text-sm hover:bg-muted/40 transition-colors">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{loan.memberName}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">Due {formatDateShort(entry.dueDate)}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-foreground">{formatCurrency(entry.amountDue)}</span>
                  </Link>
                ))}
              </DashboardListCard>

              <DashboardListCard title="Overdue Accounts" icon={AlertTriangle} viewAllPath="/loans/overdue" isLoading={overdueLoading} isEmpty={overdueLoans.length === 0} className="border-border/60 shadow-2xs">
                {overdueLoans.map((loan) => (
                  <Link key={loan.id} to={`/loans/${loan.id}`} className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3.5 text-sm hover:bg-muted/40 transition-colors">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{loan.memberName}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{loan.applicationNumber}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-destructive">{formatCurrency(loan.outstandingBalance)}</span>
                  </Link>
                ))}
              </DashboardListCard>
            </PermissionGuard>
          )}

          {/* Members & Benefits Cards */}
          {(activityTab === "all" || activityTab === "members") && (
            <>
              <PermissionGuard permission="benefits.view">
                <DashboardListCard title="Recent Benefit Applications" icon={Gift} viewAllPath="/benefits" isLoading={recentBenefitsLoading} isEmpty={recentBenefits.length === 0} className="border-border/60 shadow-2xs">
                  {recentBenefits.map((benefit) => (
                    <Link key={benefit.id} to={`/benefits/${benefit.id}`} className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3.5 text-sm hover:bg-muted/40 transition-colors">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{benefit.memberName}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{benefit.benefitTypeName}</span>
                      </span>
                      <StatusBadge label={benefit.status} tone={BENEFIT_STATUS_TONE[benefit.status] ?? "neutral"} />
                    </Link>
                  ))}
                </DashboardListCard>
              </PermissionGuard>

              <PermissionGuard permission="members.view">
                <DashboardListCard title="Recently Added Members" icon={UserPlus} viewAllPath="/members" isLoading={recentMembersLoading} isEmpty={recentMembers.length === 0} className="border-border/60 shadow-2xs">
                  {recentMembers.map((member) => (
                    <Link key={member.id} to={`/members/${member.id}`} className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3.5 text-sm hover:bg-muted/40 transition-colors">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{member.fullName}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{member.memberNumber} · {member.officeName}</span>
                      </span>
                      <ArrowUpRight className="size-4 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </DashboardListCard>

                <DashboardListCard
                  title="Incomplete Member Profiles"
                  icon={FileWarning}
                  viewAllPath="/members/incomplete"
                  isLoading={incompleteLoading}
                  isEmpty={incompleteProfiles.length === 0}
                  className="border-border/60 shadow-2xs"
                >
                  {incompleteProfiles.map((member) => (
                    <Link key={member.id} to={`/members/${member.id}`} className="group flex items-center justify-between gap-3 border-b border-border/30 last:border-0 px-4 py-3.5 text-sm hover:bg-muted/40 transition-colors">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground group-hover:text-primary transition-colors">{member.fullName}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{member.memberNumber}</span>
                      </span>
                      <ProfileCompleteness percentage={profileCompleteness(member)} />
                    </Link>
                  ))}
                </DashboardListCard>
              </PermissionGuard>
            </>
          )}

        </div>
      </section>
    </div>
  )
}