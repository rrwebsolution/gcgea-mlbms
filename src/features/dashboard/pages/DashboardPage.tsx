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
  ChevronRight,
  ShieldCheck,
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
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  // Tabs State
  const [metricTab, setMetricTab] = useState<"overview" | "financials" | "reloans">("overview")
  const [chartTab, setChartTab] = useState<"financial" | "membership">("financial")
  const [activityTab, setActivityTab] = useState<"all" | "loans" | "alerts" | "members">("all")

  // React Query Hook — Single call for the whole dashboard
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
    <div className="space-y-8 pb-20">
      {/* GLOBAL PAGE HEADER */}
      <PageHeader
        title="Dashboard"
        description="Comprehensive overview of GCGEA membership, loans, benefits, and collections."
      />

      {/* EXECUTIVE HIGHLIGHT HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/95 to-primary/10 p-6 sm:p-7 shadow-xs">
        {/* Subtle Ambient Radial Glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 size-64 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-xs">
              <Sparkles className="size-3.5" />
              <span>GCGEA Cooperative Intelligence</span>
            </div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Executive Management Hub
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Monitor real-time membership growth, loan lifecycle metrics, collection balances, and pending approval workflows from a centralized operational cockpit.
            </p>
          </div>

          {/* Quick Highlight Stat Glass Chip */}
          <PermissionGuard permission="loan_payments.view">
            <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-border/70 bg-background/80 p-4 shadow-xs backdrop-blur-md transition-all hover:border-border hover:shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                <Banknote className="size-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total Loan Collections
                </p>
                <p className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {summaryLoading ? "..." : formatCurrency(summary?.totalLoanCollections ?? 0)}
                </p>
              </div>
            </div>
          </PermissionGuard>
        </div>
      </div>

      {/* QUICK ACTIONS SECTION */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-3.5" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Quick Launch Actions
          </h2>
        </div>
        <QuickActions />
      </section>

      {/* APPROVAL WORKFLOW SECTION */}
      <PermissionGuard anyOf={APPROVAL_NAV_PERMISSIONS}>
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 px-1 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="size-3.5" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">
                Approval Workflow
              </h3>
            </div>
            {pendingItems.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                {pendingItems.length} Action{pendingItems.length > 1 ? "s" : ""} Required
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
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
            className="border-border/60 shadow-xs"
          >
            {(recentApprovals?.data ?? []).map((item) => (
              <Link
                key={item.id}
                to={`/approvals/${item.subjectType}/${item.subjectId}`}
                className="group flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3.5 text-sm transition-colors last:border-0 hover:bg-muted/40"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground transition-colors group-hover:text-primary">
                    {item.reference ?? item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.memberName ?? item.title}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge label={item.status} tone="success" />
                  <ChevronRight className="size-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </Link>
            ))}
          </DashboardListCard>
        </section>
      </PermissionGuard>

      {/* METRIC CARDS WITH SEGMENTED PILL TABS */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 border-b border-border/40 pb-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="size-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">
              Key Metric Indicators
            </h3>
          </div>

          {/* Segmented Controller */}
          <div className="inline-flex overflow-x-auto rounded-xl border border-border/40 bg-muted/40 p-1 text-xs font-medium backdrop-blur-xs">
            <button
              onClick={() => setMetricTab("overview")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 transition-all duration-200 whitespace-nowrap",
                metricTab === "overview"
                  ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Overview & Members
            </button>
            <button
              onClick={() => setMetricTab("financials")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 transition-all duration-200 whitespace-nowrap",
                metricTab === "financials"
                  ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Financials & Balances
            </button>
            <button
              onClick={() => setMetricTab("reloans")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 transition-all duration-200 whitespace-nowrap",
                metricTab === "reloans"
                  ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Reloans & Pipeline
            </button>
          </div>
        </div>

        {/* Tab 1: Overview & Members */}
        {metricTab === "overview" && (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5 animate-in fade-in duration-200">
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
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5 animate-in fade-in duration-200">
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
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5 animate-in fade-in duration-200">
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
        <div className="flex flex-col justify-between gap-3 border-b border-border/40 pb-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="size-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">
              Analytical Workspace
            </h3>
          </div>

          <div className="inline-flex rounded-xl border border-border/40 bg-muted/40 p-1 text-xs font-medium backdrop-blur-xs">
            <button
              onClick={() => setChartTab("financial")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all duration-200",
                chartTab === "financial"
                  ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className="size-3.5" />
              <span>Financial Trends</span>
            </button>
            <button
              onClick={() => setChartTab("membership")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all duration-200",
                chartTab === "membership"
                  ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="size-3.5" />
              <span>Membership & Scope</span>
            </button>
          </div>
        </div>

        {/* Financial Trends View */}
        {chartTab === "financial" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 animate-in fade-in duration-200">
            <PermissionGuard permission="loans.view">
              <div className="group rounded-3xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:border-border hover:shadow-md">
                <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                  <h4 className="font-heading text-sm font-semibold tracking-tight text-foreground/90">
                    Monthly Loan Releases
                  </h4>
                  <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Releases
                  </span>
                </div>
                <MonthlyReleasesChart data={monthlyReleases} isLoading={monthlyReleasesLoading} />
              </div>
            </PermissionGuard>

            <PermissionGuard permission="loan_payments.view">
              <div className="group rounded-3xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:border-border hover:shadow-md">
                <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                  <h4 className="font-heading text-sm font-semibold tracking-tight text-foreground/90">
                    Monthly Collections
                  </h4>
                  <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Collections
                  </span>
                </div>
                <MonthlyCollectionsChart data={monthlyCollections} isLoading={monthlyCollectionsLoading} />
              </div>
            </PermissionGuard>

            <PermissionGuard permission="loans.view">
              <div className="group rounded-3xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:border-border hover:shadow-md lg:col-span-2">
                <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                  <h4 className="font-heading text-sm font-semibold tracking-tight text-foreground/90">
                    Loan Status Distribution
                  </h4>
                  <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Distribution
                  </span>
                </div>
                <LoanStatusChart data={loanStatusDist} isLoading={loanStatusDistLoading} />
              </div>
            </PermissionGuard>
          </div>
        )}

        {/* Membership & Scope View */}
        {chartTab === "membership" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 animate-in fade-in duration-200">
            <PermissionGuard permission="benefits.view">
              <div className="group rounded-3xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:border-border hover:shadow-md">
                <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                  <h4 className="font-heading text-sm font-semibold tracking-tight text-foreground/90">
                    Benefit Distribution by Type
                  </h4>
                  <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Benefits
                  </span>
                </div>
                <HorizontalBarChart
                  data={benefitDist.map((b) => ({ label: b.type, value: b.count }))}
                  valueLabel="Applications"
                  isLoading={benefitDistLoading}
                />
              </div>
            </PermissionGuard>

            <PermissionGuard permission="members.view">
              <div className="group rounded-3xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:border-border hover:shadow-md">
                <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                  <h4 className="font-heading text-sm font-semibold tracking-tight text-foreground/90">
                    Members per Office
                  </h4>
                  <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Office Scope
                  </span>
                </div>
                <HorizontalBarChart
                  data={membersPerOffice.map((o) => ({ label: o.office, value: o.count }))}
                  valueLabel="Members"
                  isLoading={membersPerOfficeLoading}
                />
              </div>

              <div className="group rounded-3xl border border-border/60 bg-card p-5 shadow-xs transition-all duration-300 hover:border-border hover:shadow-md lg:col-span-2">
                <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
                  <h4 className="font-heading text-sm font-semibold tracking-tight text-foreground/90">
                    Membership Growth by Year
                  </h4>
                  <span className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Historical Trend
                  </span>
                </div>
                <MembershipGrowthChart data={membershipGrowth} isLoading={membershipGrowthLoading} />
              </div>
            </PermissionGuard>
          </div>
        )}
      </section>

      {/* RECENT ACTIVITY & MONITORING HUB */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 border-b border-border/40 pb-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="size-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">
              Activity & Monitoring Hub
            </h3>
          </div>

          {/* Activity Category Controller */}
          <div className="inline-flex overflow-x-auto rounded-xl border border-border/40 bg-muted/40 p-1 text-xs font-medium backdrop-blur-xs">
            <button
              onClick={() => setActivityTab("all")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 transition-all duration-200 whitespace-nowrap",
                activityTab === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Feeds
            </button>
            <button
              onClick={() => setActivityTab("loans")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 transition-all duration-200 whitespace-nowrap",
                activityTab === "loans"
                  ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Loans & Payments
            </button>
            <button
              onClick={() => setActivityTab("alerts")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 transition-all duration-200 whitespace-nowrap",
                activityTab === "alerts"
                  ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Alerts & Overdue
            </button>
            <button
              onClick={() => setActivityTab("members")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 transition-all duration-200 whitespace-nowrap",
                activityTab === "members"
                  ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
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
                <DashboardListCard
                  title="Recent Loan Applications"
                  icon={Landmark}
                  viewAllPath="/loans"
                  isLoading={recentLoansLoading}
                  isEmpty={recentLoans.length === 0}
                  className="border-border/60 shadow-xs"
                >
                  {recentLoans.map((loan) => (
                    <Link
                      key={loan.id}
                      to={`/loans/${loan.id}`}
                      className="group flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3.5 text-sm transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground transition-colors group-hover:text-primary">
                          {loan.memberName}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {loan.applicationNumber} · {formatCurrency(loan.requestedAmount)}
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge label={loan.status} tone={LOAN_STATUS_TONE[loan.status] ?? "neutral"} />
                        <ChevronRight className="size-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                    </Link>
                  ))}
                </DashboardListCard>
              </PermissionGuard>

              <PermissionGuard permission="loan_payments.view">
                <DashboardListCard
                  title="Recent Payments"
                  icon={CreditCard}
                  viewAllPath="/loan-payments"
                  isLoading={recentPaymentsLoading}
                  isEmpty={recentPayments.length === 0}
                  className="border-border/60 shadow-xs"
                >
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3.5 text-sm last:border-0"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">
                          {payment.memberName}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {payment.paymentReferenceNumber} · {formatDateShort(payment.paymentDate)}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(payment.amountPaid)}
                      </span>
                    </div>
                  ))}
                </DashboardListCard>
              </PermissionGuard>
            </>
          )}

          {/* Alerts & Due Cards */}
          {(activityTab === "all" || activityTab === "alerts") && (
            <PermissionGuard permission="loans.view">
              <DashboardListCard
                title="Upcoming Loan Due Dates"
                icon={Clock}
                viewAllPath="/loans/active"
                isLoading={upcomingDueLoading}
                isEmpty={upcomingDue.length === 0}
                className="border-border/60 shadow-xs"
              >
                {upcomingDue.map(({ loan, entry }) => (
                  <Link
                    key={loan.id}
                    to={`/loans/${loan.id}`}
                    className="group flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3.5 text-sm transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground transition-colors group-hover:text-primary">
                        {loan.memberName}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Due {formatDateShort(entry.dueDate)}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold font-mono text-foreground">
                      {formatCurrency(entry.amountDue)}
                    </span>
                  </Link>
                ))}
              </DashboardListCard>

              <DashboardListCard
                title="Overdue Accounts"
                icon={AlertTriangle}
                viewAllPath="/loans/overdue"
                isLoading={overdueLoading}
                isEmpty={overdueLoans.length === 0}
                className="border-border/60 shadow-xs"
              >
                {overdueLoans.map((loan) => (
                  <Link
                    key={loan.id}
                    to={`/loans/${loan.id}`}
                    className="group flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3.5 text-sm transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground transition-colors group-hover:text-primary">
                        {loan.memberName}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {loan.applicationNumber}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold font-mono text-destructive">
                      {formatCurrency(loan.outstandingBalance)}
                    </span>
                  </Link>
                ))}
              </DashboardListCard>
            </PermissionGuard>
          )}

          {/* Members & Benefits Cards */}
          {(activityTab === "all" || activityTab === "members") && (
            <>
              <PermissionGuard permission="benefits.view">
                <DashboardListCard
                  title="Recent Benefit Applications"
                  icon={Gift}
                  viewAllPath="/benefits"
                  isLoading={recentBenefitsLoading}
                  isEmpty={recentBenefits.length === 0}
                  className="border-border/60 shadow-xs"
                >
                  {recentBenefits.map((benefit) => (
                    <Link
                      key={benefit.id}
                      to={`/benefits/${benefit.id}`}
                      className="group flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3.5 text-sm transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground transition-colors group-hover:text-primary">
                          {benefit.memberName}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {benefit.benefitTypeName}
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge label={benefit.status} tone={BENEFIT_STATUS_TONE[benefit.status] ?? "neutral"} />
                        <ChevronRight className="size-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                    </Link>
                  ))}
                </DashboardListCard>
              </PermissionGuard>

              <PermissionGuard permission="members.view">
                <DashboardListCard
                  title="Recently Added Members"
                  icon={UserPlus}
                  viewAllPath="/members"
                  isLoading={recentMembersLoading}
                  isEmpty={recentMembers.length === 0}
                  className="border-border/60 shadow-xs"
                >
                  {recentMembers.map((member) => (
                    <Link
                      key={member.id}
                      to={`/members/${member.id}`}
                      className="group flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3.5 text-sm transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground transition-colors group-hover:text-primary">
                          {member.fullName}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {member.memberNumber} · {member.officeName}
                        </span>
                      </span>
                      <ArrowUpRight className="size-4 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                    </Link>
                  ))}
                </DashboardListCard>

                <DashboardListCard
                  title="Incomplete Member Profiles"
                  icon={FileWarning}
                  viewAllPath="/members/incomplete"
                  isLoading={incompleteLoading}
                  isEmpty={incompleteProfiles.length === 0}
                  className="border-border/60 shadow-xs"
                >
                  {incompleteProfiles.map((member) => (
                    <Link
                      key={member.id}
                      to={`/members/${member.id}`}
                      className="group flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3.5 text-sm transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground transition-colors group-hover:text-primary">
                          {member.fullName}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {member.memberNumber}
                        </span>
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