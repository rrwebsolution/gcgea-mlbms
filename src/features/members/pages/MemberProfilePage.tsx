import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Ban,
  Banknote,
  FileText,
  Landmark,
  MoreHorizontal,
  PencilLine,
  Plus,
  PrinterIcon,
  UserRound,
  Wallet,
} from "lucide-react"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ProfileCompleteness } from "@/components/shared/ProfileCompleteness"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { EmptyState } from "@/components/shared/EmptyState"
import { DataTable } from "@/components/shared/DataTable"
import { SearchInput } from "@/components/shared/SearchInput"
import { DocumentCard } from "@/components/shared/DocumentCard"
import { DocumentGallery, type DocumentGalleryItem } from "@/components/shared/DocumentGallery"
import { ImagePreviewDialog } from "@/components/shared/ImagePreviewDialog"
import { VoidTransactionDialog } from "@/components/shared/VoidTransactionDialog"
import { ProfileSkeleton } from "@/components/shared/loaders/ProfileSkeleton"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ReloanButton } from "@/features/loans/components/ReloanButton"
import { getMember, profileCompleteness } from "@/services/members.service"
import { listAllContributions, voidContribution } from "@/services/contributions.service"
import { listAllLoans } from "@/services/loans.service"
import { listAllLoanPayments } from "@/services/loan-payments.service"
import { listAllDeductions } from "@/services/deductions.service"
import { listDeductionTypes } from "@/services/deduction-types.service"
import { getAllBenefits } from "@/services/benefits.service"
import { MEMBERSHIP_STATUS_TONE, LOAN_STATUS_TONE, BENEFIT_STATUS_TONE, CONTRIBUTION_STATUS_TONE } from "@/constants/status"
import { calculateAge, calculateDurationLabel, formatCurrency, formatDateShort, initialsFromName } from "@/utils/format"
import { cn } from "@/lib/utils"
import type { Contribution } from "@/types"

export default function MemberProfilePage() {
  const { id = "" } = useParams()
  const queryClient = useQueryClient()
  const { data: member, isLoading } = useQuery({ queryKey: ["members", id], queryFn: () => getMember(id) })
  const { data: allContributions = [] } = useQuery({ queryKey: ["contributions", "all"], queryFn: listAllContributions })
  const { data: allPayments = [], isLoading: isLoadingPayments } = useQuery({ queryKey: ["loan-payments", "all"], queryFn: listAllLoanPayments })
  const { data: allLoans = [] } = useQuery({ queryKey: ["loans", "all"], queryFn: listAllLoans })
  const { data: allDeductions = [] } = useQuery({ queryKey: ["deductions", "all"], queryFn: listAllDeductions })
  const { data: deductionTypes = [] } = useQuery({ queryKey: ["deduction-types"], queryFn: listDeductionTypes })
  const [photoPreviewOpen, setPhotoPreviewOpen] = React.useState(false)
  const [voidTarget, setVoidTarget] = React.useState<Contribution | null>(null)
  const [isVoiding, setIsVoiding] = React.useState(false)
  const [tableSearches, setTableSearches] = React.useState<Record<string, string>>({})
  const [tableStatuses, setTableStatuses] = React.useState<Record<string, string>>({})

  useBreadcrumbExtra(member?.fullName)

  if (isLoading) return <ProfileSkeleton cards={2} />
  if (!member) return <EmptyState icon={UserRound} title="Member not found" description="This member record may have been archived or removed." />

  const contributions = allContributions.filter((c) => c.memberId === member.id)

  async function handleVoidContribution(reason: string) {
    if (!voidTarget) return
    setIsVoiding(true)
    try {
      await voidContribution(voidTarget.id, reason)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["contributions"] }),
        queryClient.invalidateQueries({ queryKey: ["deductions"] }),
      ])
      toast.success("Contribution voided.")
      setVoidTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to void this contribution.")
    } finally {
      setIsVoiding(false)
    }
  }

  const loans = allLoans.filter((l) => l.memberId === member.id)
  const payments = allPayments.filter((p) => p.memberId === member.id)
  const benefits = getAllBenefits().filter((b) => b.memberId === member.id)
  const memberDeductions = allDeductions.filter((deduction) => deduction.memberId === member.id)

  const pabaonDeductionType = deductionTypes.find((deductionType) => deductionType.code === "pabaon")
  const contributionTabRows = [
    ...contributions.map((c) => ({
      id: c.id,
      referenceNumber: c.referenceNumber,
      type: c.contributionType,
      period: c.contributionPeriod,
      amount: c.amount,
      paymentDate: c.paymentDate,
      status: c.status,
      contribution: c as Contribution | undefined,
    })),
    ...(pabaonDeductionType
      ? memberDeductions
          .filter((deduction) => deduction.deductionTypeId === pabaonDeductionType.id)
          .map((deduction) => ({
            id: `deduction-${deduction.id}`,
            referenceNumber: deduction.referenceNumber,
            type: "Cash Pabaon",
            period: deduction.period,
            amount: deduction.amount,
            paymentDate: deduction.paymentDate,
            status: deduction.status,
            contribution: undefined as Contribution | undefined,
          }))
      : []),
  ].sort((a, b) => b.period.localeCompare(a.period))

  const filterRows = <TRow extends object>(key: string, rows: TRow[]) => {
    const search = (tableSearches[key] ?? "").trim().toLowerCase()
    const status = tableStatuses[key] ?? "all"
    return rows.filter((row) => {
      const values = Object.values(row)
      const matchesSearch =
        !search ||
        values.some(
          (value) =>
            value != null && typeof value !== "object" && String(value).toLowerCase().includes(search)
        )
      const rowStatus = "status" in row ? String(row.status) : ""
      return matchesSearch && (status === "all" || rowStatus === status)
    })
  }

  const setTableSearch = (key: string, value: string) =>
    setTableSearches((current) => ({ ...current, [key]: value }))
  const setTableStatus = (key: string, value: string | null) =>
    setTableStatuses((current) => ({ ...current, [key]: value ?? "all" }))

  const contributionRows = filterRows("contributions", contributionTabRows)
  const loanRows = filterRows("loans", loans)
  const paymentRows = filterRows("payments", payments)
  const benefitRows = filterRows("benefits", benefits)

  const outstandingBalance = loans.reduce((sum, l) => sum + l.outstandingBalance, 0)
  const totalContributions = contributions
    .filter((c) => c.status === "Posted")
    .reduce((sum, c) => sum + c.amount, 0)
  const contributedMonthCount = new Set(
    contributionTabRows.filter((row) => row.status === "Posted").map((row) => row.period)
  ).size
  const voidedContributionCount = contributionTabRows.filter((row) => row.status === "Voided").length
  const totalBenefits = benefits
    .filter((b) => b.status === "Released" || b.status === "Completed")
    .reduce((sum, b) => sum + (b.approvedAmount ?? 0), 0)
  const completeness = profileCompleteness(member)

  const contributionColumns: ColumnDef<(typeof contributionTabRows)[number], unknown>[] = [
    {
      accessorKey: "referenceNumber",
      header: "Reference #",
      cell: ({ row }) =>
        row.original.contribution ? (
          <Link
            to={`/contributions/${row.original.contribution.id}`}
            className="font-mono text-xs font-semibold text-primary hover:underline"
          >
            {row.original.referenceNumber}
          </Link>
        ) : (
          <span className="font-mono text-xs font-semibold">{row.original.referenceNumber}</span>
        ),
    },
    { accessorKey: "type", header: "Type" },
    { accessorKey: "period", header: "Period", cell: ({ row }) => <span className="font-mono text-xs">{row.original.period}</span> },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: "paymentDate",
      header: "Payment Date",
      cell: ({ row }) => formatDateShort(row.original.paymentDate),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          label={row.original.status}
          tone={CONTRIBUTION_STATUS_TONE[row.original.status as keyof typeof CONTRIBUTION_STATUS_TONE]}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) =>
        row.original.contribution && row.original.status === "Posted" ? (
          <PermissionGuard permission="contributions.void">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon-sm" className="size-8 rounded-lg hover:bg-muted" aria-label="Row actions">
                  <MoreHorizontal className="size-4 text-muted-foreground/80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setVoidTarget(row.original.contribution!)}
                  className="rounded-lg text-xs"
                >
                  <Ban className="mr-2 size-3.5" /> Void Transaction
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGuard>
        ) : null,
    },
  ]

  const loanColumns: ColumnDef<(typeof loans)[number], unknown>[] = [
    {
      accessorKey: "applicationNumber",
      header: "Application #",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Link to={`/loans/${row.original.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
            {row.original.applicationNumber}
          </Link>
          {row.original.applicationType === "reloan" && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Reloan #{row.original.reloanSequence ?? 1}
            </span>
          )}
        </div>
      ),
    },
    { accessorKey: "loanTypeName", header: "Loan Type" },
    {
      accessorKey: "requestedAmount",
      header: "Requested",
      cell: ({ row }) => <span className="font-mono text-xs">{formatCurrency(row.original.requestedAmount)}</span>,
    },
    {
      accessorKey: "outstandingBalance",
      header: "Outstanding",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-destructive">
          {formatCurrency(row.original.outstandingBalance)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge label={row.original.status} tone={LOAN_STATUS_TONE[row.original.status]} />,
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <ReloanButton loan={row.original} eligible={["Fully Paid", "Active", "Released"].includes(row.original.status)} />
      ),
    },
  ]

  const paymentColumns: ColumnDef<(typeof payments)[number], unknown>[] = [
    {
      accessorKey: "paymentReferenceNumber",
      header: "Reference #",
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.paymentReferenceNumber}</span>,
    },
    {
      accessorKey: "loanApplicationNumber",
      header: "Loan App #",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.loanApplicationNumber}</span>,
    },
    {
      accessorKey: "paymentDate",
      header: "Payment Date",
      cell: ({ row }) => formatDateShort(row.original.paymentDate),
    },
    {
      accessorKey: "amountPaid",
      header: "Amount Paid",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.original.amountPaid)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge label={row.original.status} tone={row.original.status === "Posted" ? "success" : "danger"} />
      ),
    },
  ]

  const benefitColumns: ColumnDef<(typeof benefits)[number], unknown>[] = [
    {
      accessorKey: "applicationNumber",
      header: "Application #",
      cell: ({ row }) => (
        <Link to={`/benefits/${row.original.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
          {row.original.applicationNumber}
        </Link>
      ),
    },
    { accessorKey: "benefitTypeName", header: "Benefit Type" },
    {
      accessorKey: "requestedAmount",
      header: "Requested Amount",
      cell: ({ row }) => <span className="font-mono text-xs">{formatCurrency(row.original.requestedAmount)}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge label={row.original.status} tone={BENEFIT_STATUS_TONE[row.original.status]} />,
    },
  ]

  return (
    <div className="space-y-6 pb-16">
      {/* Premium Profile Hero Identity Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 shadow-xs backdrop-blur-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <button
              type="button"
              onClick={() => member.profilePhotoUrl && setPhotoPreviewOpen(true)}
              className={cn(
                "group relative shrink-0 rounded-2xl border-2 border-border/60 p-1 bg-background/80 shadow-xs outline-none transition-all duration-300",
                "focus-visible:ring-2 focus-visible:ring-primary hover:border-primary/40 hover:scale-105 hover:shadow-md",
                member.profilePhotoUrl ? "cursor-zoom-in" : "cursor-default"
              )}
              aria-label={member.profilePhotoUrl ? "View profile photo" : undefined}
            >
              <Avatar className="size-20 rounded-xl">
                {member.profilePhotoUrl && <AvatarImage src={member.profilePhotoUrl} alt={member.fullName} className="object-cover" />}
                <AvatarFallback className="bg-gradient-to-br from-primary/25 to-primary/10 text-xl font-bold text-primary font-heading">
                  {initialsFromName(member.fullName)}
                </AvatarFallback>
              </Avatar>
            </button>

            <div className="space-y-1.5">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {member.fullName}
              </h1>
              <p className="text-xs font-medium text-muted-foreground flex flex-wrap items-center gap-1.5">
                <span className="font-mono font-semibold text-foreground/80">{member.memberNumber}</span>
                <span>·</span>
                <span>{member.position}</span>
                <span>·</span>
                <span className="text-foreground/80 font-semibold">{member.officeName}</span>
              </p>
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge label={member.membershipStatus} tone={MEMBERSHIP_STATUS_TONE[member.membershipStatus]} />
                {member.retireeStatus === "Retired" && <StatusBadge label="Retired" tone="gold" />}
                <ProfileCompleteness percentage={completeness} />
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            <PermissionButton
              permission="members.update"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-2xs hover:bg-muted active:scale-95 transition-all"
              render={<Link to={`/members/${member.id}/edit`} />}
            >
              <PencilLine className="size-3.5" /> Edit Profile
            </PermissionButton>
            <PermissionButton
              permission="members.print"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-2xs hover:bg-muted active:scale-95 transition-all"
            >
              <PrinterIcon className="size-3.5" /> Print Profile
            </PermissionButton>
          </div>
        </div>

        {/* Structured Summary Metrics Widgets */}
        <div className="mt-6 grid grid-cols-1 gap-3.5 border-t border-border/50 pt-6 sm:grid-cols-3">
          <SummaryStat
            label="Outstanding Loan Balance"
            value={formatCurrency(outstandingBalance)}
            tone={outstandingBalance > 0 ? "danger" : undefined}
            badge="Liability"
          />
          <SummaryStat
            label="Total Contributions"
            value={formatCurrency(totalContributions)}
            tone="success"
            badge="Ledger"
            description={`${contributedMonthCount} month(s) active · ${voidedContributionCount} voided`}
          />
          <SummaryStat
            label="Total Benefits Received"
            value={formatCurrency(totalBenefits)}
            badge="Benefits"
          />
        </div>

        {/* Quick Launch Action Pods */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/50 pt-5">
          <PermissionButton
            permission="contributions.create"
            variant="secondary"
            size="sm"
            className="h-8.5 gap-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-400 font-semibold text-xs active:scale-95 transition-all"
            render={<Link to={`/contributions/new?member=${member.id}`} />}
          >
            <Wallet className="size-3.5" strokeWidth={2.2} /> Record Contribution
          </PermissionButton>

          <PermissionButton
            permission="loans.create"
            variant="secondary"
            size="sm"
            className="h-8.5 gap-1.5 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400 font-semibold text-xs active:scale-95 transition-all"
            render={<Link to={`/loans/new?member=${member.id}`} />}
          >
            <Landmark className="size-3.5" strokeWidth={2.2} /> Create Loan
          </PermissionButton>

          <PermissionButton
            permission="loan_payments.create"
            variant="secondary"
            size="sm"
            className="h-8.5 gap-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 font-semibold text-xs active:scale-95 transition-all"
            render={<Link to={`/loan-payments/new?member=${member.id}`} />}
          >
            <Banknote className="size-3.5" strokeWidth={2.2} /> Record Payment
          </PermissionButton>

          <PermissionButton
            permission="benefits.create"
            variant="secondary"
            size="sm"
            className="h-8.5 gap-1.5 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 font-semibold text-xs active:scale-95 transition-all"
            render={<Link to={`/benefits/new?member=${member.id}`} />}
          >
            <Plus className="size-3.5" strokeWidth={2.2} /> Create Benefit Request
          </PermissionButton>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="inline-flex h-11 items-center gap-1 rounded-2xl border border-border/60 bg-muted/30 p-1 backdrop-blur-xs">
            <TabsTrigger value="overview" className="rounded-xl px-3.5 text-xs font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="employment" className="rounded-xl px-3.5 text-xs font-semibold">Employment</TabsTrigger>
            <TabsTrigger value="beneficiaries" className="rounded-xl px-3.5 text-xs font-semibold">Beneficiaries</TabsTrigger>
            <TabsTrigger value="contributions" className="rounded-xl px-3.5 text-xs font-semibold">Contributions</TabsTrigger>
            <TabsTrigger value="contribution-allocation" className="rounded-xl px-3.5 text-xs font-semibold">Contribution Allocation</TabsTrigger>
            {deductionTypes
              .filter((deductionType) => deductionType.isActive)
              .map((deductionType) => (
                <TabsTrigger
                  key={deductionType.id}
                  value={`deduction-${deductionType.id}`}
                  className="rounded-xl px-3.5 text-xs font-semibold whitespace-nowrap"
                >
                  {deductionType.name}
                </TabsTrigger>
              ))}
            <TabsTrigger value="loans" className="rounded-xl px-3.5 text-xs font-semibold">Loans</TabsTrigger>
            <TabsTrigger value="payments" className="rounded-xl px-3.5 text-xs font-semibold">Loan Payments</TabsTrigger>
            <TabsTrigger value="benefits" className="rounded-xl px-3.5 text-xs font-semibold">Benefits</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-xl px-3.5 text-xs font-semibold">Documents</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-xl px-3.5 text-xs font-semibold">Activity History</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content: Overview */}
        <TabsContent value="overview" className="mt-0">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6">
            <dl className="grid grid-cols-1 gap-x-12 gap-y-3.5 text-sm md:grid-cols-2">
              <Detail label="Sex" value={member.sex} />
              <Detail
                label="Birthdate"
                value={`${formatDateShort(member.birthdate)} (${calculateAge(member.birthdate)} years old)`}
              />
              <Detail label="Civil Status" value={member.civilStatus} />
              <Detail label="Name of Spouse" value={member.nameOfSpouse || "—"} />
              <Detail label="Cellphone Number" value={member.cellphoneNumber} isMono />
              <Detail label="Email Address" value={member.email || "—"} />
              <Detail label="Permanent Address" value={member.permanentAddress} />
              <Detail label="Membership Type" value={member.membershipType} />
              <Detail
                label="Membership Date"
                value={`${formatDateShort(member.membershipDate)} (${calculateDurationLabel(member.membershipDate)})`}
              />
              <Detail label="Remarks" value={member.remarks || "—"} />
            </dl>
          </div>
        </TabsContent>

        {/* Tab Content: Employment */}
        <TabsContent value="employment" className="mt-0">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6">
            <dl className="grid grid-cols-1 gap-x-12 gap-y-3.5 text-sm md:grid-cols-2">
              <Detail label="Present Office" value={member.officeName} />
              <Detail label="Position" value={member.position} />
              <Detail label="Date of Regular Appointment" value={formatDateShort(member.dateOfRegularAppointment)} />
              <Detail
                label="Length of Government Service"
                value={calculateDurationLabel(member.dateOfRegularAppointment)}
              />
              <Detail label="Employment Status" value={member.employmentStatus} />
            </dl>
          </div>
        </TabsContent>

        {/* Tab Content: Beneficiaries */}
        <TabsContent value="beneficiaries" className="mt-0">
          {member.beneficiaries.length === 0 ? (
            <EmptyState
              title="No beneficiaries on record"
              description="Add beneficiaries when editing this member's profile."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 bg-muted/15">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 pl-5">
                      Full Name
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                      Relationship
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                      Birthdate
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
                      Contact Number
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 pr-5">
                      Share %
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.beneficiaries.map((b) => (
                    <TableRow key={b.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30">
                      <TableCell className="font-heading font-semibold text-foreground py-3.5 pl-5">
                        {b.fullName}
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-muted-foreground">{b.relationship}</TableCell>
                      <TableCell className="py-3.5 text-xs text-muted-foreground">
                        {formatDateShort(b.birthdate)}
                      </TableCell>
                      <TableCell className="py-3.5 font-mono text-xs text-muted-foreground">
                        {b.contactNumber || "—"}
                      </TableCell>
                      <TableCell className="py-3.5 font-mono text-xs font-semibold pr-5">
                        {b.sharePercentage != null ? `${b.sharePercentage}%` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tab Content: Contributions */}
        <TabsContent value="contributions" className="mt-0">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs">
            <DataTable
              columns={contributionColumns}
              data={contributionRows}
              getRowId={(row) => row.id}
              enableColumnVisibility={false}
              toolbar={
                <MemberTableToolbar
                  search={tableSearches.contributions ?? ""}
                  onSearchChange={(value) => setTableSearch("contributions", value)}
                  status={tableStatuses.contributions ?? "all"}
                  onStatusChange={(value) => setTableStatus("contributions", value)}
                  statuses={Array.from(new Set(contributionTabRows.map((row) => row.status)))}
                />
              }
              emptyTitle="No contributions on record"
              emptyDescription="This member has no contribution or Cash Pabaon records yet."
              maxHeight="max-h-[32rem]"
            />
          </div>
        </TabsContent>

        {/* Tab Content: Contribution Allocation */}
        <TabsContent value="contribution-allocation" className="mt-0">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs">
            <ContributionAllocationDataTable contributions={contributions} />
          </div>
        </TabsContent>

        {/* Dynamic Deduction Tabs */}
        {deductionTypes
          .filter((deductionType) => deductionType.isActive)
          .map((deductionType) => {
            const deductionRecords = memberDeductions
              .filter((deduction) => deduction.deductionTypeId === deductionType.id)
              .map((deduction) => ({
                id: `deduction-${deduction.id}`,
                referenceNumber: deduction.referenceNumber,
                period: deduction.period,
                amount: deduction.amount,
                paymentDate: deduction.paymentDate,
                payrollReference: deduction.payrollReference || "—",
                status: deduction.status,
                source: "Payroll Deduction" as const,
              }))

            const contributionRecords =
              deductionType.code === "pabaon"
                ? contributions
                    .filter((c) => c.contributionType === "Cash Pabaon")
                    .map((c) => ({
                      id: `contribution-${c.id}`,
                      referenceNumber: c.referenceNumber,
                      period: c.contributionPeriod,
                      amount: c.amount,
                      paymentDate: c.paymentDate,
                      payrollReference: "—",
                      status: c.status,
                      source: "Direct Contribution" as const,
                    }))
                : []

            const records = [...deductionRecords, ...contributionRecords].sort((a, b) =>
              b.period.localeCompare(a.period)
            )
            const tableKey = `deduction-${deductionType.id}`
            const filteredRecords = filterRows(tableKey, records)
            const totalPosted = records
              .filter((record) => record.status === "Posted")
              .reduce((sum, record) => sum + record.amount, 0)

            const deductionColumns: ColumnDef<(typeof records)[number], unknown>[] = [
              {
                accessorKey: "referenceNumber",
                header: "Reference #",
                cell: ({ row }) => (
                  <span className="font-mono text-xs font-semibold">{row.original.referenceNumber}</span>
                ),
              },
              {
                accessorKey: "period",
                header: "Period",
                cell: ({ row }) => <span className="font-mono text-xs">{row.original.period}</span>,
              },
              {
                accessorKey: "amount",
                header: "Amount",
                cell: ({ row }) => (
                  <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(row.original.amount)}
                  </span>
                ),
              },
              {
                accessorKey: "paymentDate",
                header: "Payment Date",
                cell: ({ row }) => formatDateShort(row.original.paymentDate),
              },
              { accessorKey: "payrollReference", header: "Payroll Reference" },
              ...(deductionType.code === "pabaon"
                ? [
                    {
                      accessorKey: "source",
                      header: "Source",
                      cell: ({ row }: { row: { original: (typeof records)[number] } }) => (
                        <span className="text-xs text-muted-foreground">{row.original.source}</span>
                      ),
                    } as ColumnDef<(typeof records)[number], unknown>,
                  ]
                : []),
              {
                accessorKey: "status",
                header: "Status",
                cell: ({ row }) => (
                  <StatusBadge
                    label={row.original.status}
                    tone={row.original.status === "Posted" ? "success" : "neutral"}
                  />
                ),
              },
            ]

            return (
              <TabsContent key={deductionType.id} value={`deduction-${deductionType.id}`} className="mt-0">
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs">
                  <DataTable
                    columns={deductionColumns}
                    data={filteredRecords}
                    getRowId={(row) => row.id}
                    enableColumnVisibility={false}
                    toolbar={
                      <MemberTableToolbar
                        search={tableSearches[tableKey] ?? ""}
                        onSearchChange={(value) => setTableSearch(tableKey, value)}
                        status={tableStatuses[tableKey] ?? "all"}
                        onStatusChange={(value) => setTableStatus(tableKey, value)}
                        statuses={Array.from(new Set(records.map((row) => row.status)))}
                      />
                    }
                    emptyTitle={`No ${deductionType.name} deductions on record`}
                    emptyDescription={`This member has no ${deductionType.name} transactions yet.`}
                    maxHeight="max-h-[32rem]"
                    footer={
                      <div className="flex items-center justify-between">
                        <span>Total {deductionType.name} (Posted):</span>
                        <strong className="font-mono text-sm font-bold text-foreground">
                          {formatCurrency(totalPosted)}
                        </strong>
                      </div>
                    }
                  />
                </div>
              </TabsContent>
            )
          })}

        {/* Tab Content: Loans */}
        <TabsContent value="loans" className="mt-0">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs">
            <DataTable
              columns={loanColumns}
              data={loanRows}
              getRowId={(row) => row.id}
              enableColumnVisibility={false}
              toolbar={
                <MemberTableToolbar
                  search={tableSearches.loans ?? ""}
                  onSearchChange={(value) => setTableSearch("loans", value)}
                  status={tableStatuses.loans ?? "all"}
                  onStatusChange={(value) => setTableStatus("loans", value)}
                  statuses={Array.from(new Set(loans.map((row) => row.status)))}
                />
              }
              emptyTitle="No loan applications on record"
              emptyDescription="This member has no loan applications yet."
              maxHeight="max-h-[32rem]"
            />
          </div>
        </TabsContent>

        {/* Tab Content: Payments */}
        <TabsContent value="payments" className="mt-0">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs">
            <DataTable
              columns={paymentColumns}
              data={paymentRows}
              isLoading={isLoadingPayments}
              getRowId={(row) => row.id}
              enableColumnVisibility={false}
              toolbar={
                <MemberTableToolbar
                  search={tableSearches.payments ?? ""}
                  onSearchChange={(value) => setTableSearch("payments", value)}
                  status={tableStatuses.payments ?? "all"}
                  onStatusChange={(value) => setTableStatus("payments", value)}
                  statuses={Array.from(new Set(payments.map((row) => row.status)))}
                />
              }
              emptyTitle="No loan payments on record"
              emptyDescription="This member has no posted loan payments yet."
              maxHeight="max-h-[32rem]"
            />
          </div>
        </TabsContent>

        {/* Tab Content: Benefits */}
        <TabsContent value="benefits" className="mt-0">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs">
            <DataTable
              columns={benefitColumns}
              data={benefitRows}
              getRowId={(row) => row.id}
              enableColumnVisibility={false}
              toolbar={
                <MemberTableToolbar
                  search={tableSearches.benefits ?? ""}
                  onSearchChange={(value) => setTableSearch("benefits", value)}
                  status={tableStatuses.benefits ?? "all"}
                  onStatusChange={(value) => setTableStatus("benefits", value)}
                  statuses={Array.from(new Set(benefits.map((row) => row.status)))}
                />
              }
              emptyTitle="No benefit applications on record"
              emptyDescription="This member has no benefit applications yet."
              maxHeight="max-h-[32rem]"
            />
          </div>
        </TabsContent>

        {/* Tab Content: Documents */}
        <TabsContent value="documents" className="mt-0">
          {member.documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents uploaded"
              description="Documents can be uploaded when editing this member's profile."
            />
          ) : (
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-5 shadow-xs">
              <DocumentGallery
                items={member.documents.map(
                  (doc): DocumentGalleryItem => ({
                    key: doc.id,
                    category: doc.category,
                    node: (
                      <DocumentCard
                        title={doc.category}
                        fileName={doc.fileName}
                        fileUrl={doc.fileUrl}
                        fileSize={doc.fileSize}
                        uploadedAt={formatDateShort(doc.uploadedAt)}
                        uploadedBy={doc.uploadedBy}
                      />
                    ),
                  })
                )}
              />
            </div>
          )}
        </TabsContent>

        {/* Tab Content: Activity */}
        <TabsContent value="activity" className="mt-0">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xs backdrop-blur-xs sm:p-6">
            <dl className="grid grid-cols-1 gap-x-12 gap-y-3.5 text-sm md:grid-cols-2">
              <Detail
                label="Record Created"
                value={`${formatDateShort(member.createdAt)} by ${member.createdBy}`}
              />
              <Detail label="Last Updated" value={formatDateShort(member.updatedAt)} />
            </dl>
          </div>
        </TabsContent>
      </Tabs>

      {/* Photo Preview Dialog */}
      {member.profilePhotoUrl && (
        <ImagePreviewDialog
          open={photoPreviewOpen}
          onOpenChange={setPhotoPreviewOpen}
          images={[{ url: member.profilePhotoUrl, name: `${member.fullName} — Profile Photo` }]}
        />
      )}

      {/* Void Dialog */}
      <VoidTransactionDialog
        open={!!voidTarget}
        onOpenChange={(open) => !open && setVoidTarget(null)}
        transactionLabel={voidTarget ? `Contribution ${voidTarget.referenceNumber}` : "Contribution"}
        description={
          voidTarget?.contributionType === "Monthly Dues"
            ? "This is a grouped payment. Voiding the Monthly Dues will also void the linked Cash Pabaon for the same member and period. Both records will keep their audit trail."
            : undefined
        }
        isLoading={isVoiding}
        onConfirm={handleVoidContribution}
      />
    </div>
  )
}

function MemberTableToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  statuses,
}: {
  search: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (value: string | null) => void
  statuses: string[]
}) {
  return (
    <>
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search records…"
        className="w-full sm:max-w-xs"
      />
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value="all">All Statuses</SelectItem>
          {statuses.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}

function ContributionAllocationDataTable({ contributions }: { contributions: Contribution[] }) {
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const rows = React.useMemo(
    () => contributions.filter((contribution) => contribution.contributionType === "Monthly Dues"),
    [contributions]
  )
  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((contribution) => {
      const matchesSearch =
        !query ||
        [
          contribution.contributionPeriod,
          contribution.paymentDate,
          contribution.encodedBy,
          contribution.remarks,
        ].some((value) => value?.toLowerCase().includes(query))
      return matchesSearch && (status === "all" || contribution.status === status)
    })
  }, [rows, search, status])

  const funds = React.useMemo(
    () =>
      Array.from(
        new Map(
          rows
            .flatMap((contribution) => contribution.fundAllocations ?? [])
            .map((allocation) => [allocation.fundId, allocation])
        ).values()
      ),
    [rows]
  )

  const columns = React.useMemo<ColumnDef<Contribution, unknown>[]>(
    () => [
      {
        accessorKey: "contributionPeriod",
        header: "Period",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.contributionPeriod}</span>,
      },
      {
        accessorKey: "paymentDate",
        header: "Date",
        cell: ({ row }) => formatDateShort(row.original.paymentDate),
      },
      {
        accessorKey: "amount",
        header: "Monthly Dues",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      ...funds.map(
        (fund): ColumnDef<Contribution, unknown> => ({
          id: `fund-${fund.fundId}`,
          header: fund.fundName,
          accessorFn: (contribution) =>
            contribution.fundAllocations?.find((allocation) => allocation.fundId === fund.fundId)
              ?.allocatedAmount ?? 0,
          cell: ({ getValue }) => (
            <span className="font-mono text-xs">{formatCurrency(Number(getValue()))}</span>
          ),
        })
      ),
      {
        id: "allocationTotal",
        header: "Total",
        accessorFn: (contribution) =>
          contribution.fundAllocations?.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0) ??
          0,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-bold text-foreground">
            {formatCurrency(Number(getValue()))}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            label={row.original.status}
            tone={CONTRIBUTION_STATUS_TONE[row.original.status]}
          />
        ),
      },
      { accessorKey: "encodedBy", header: "Posted By" },
      { accessorKey: "remarks", header: "Remarks", cell: ({ row }) => row.original.remarks || "—" },
    ],
    [funds]
  )

  const posted = rows.filter((contribution) => contribution.status === "Posted")
  const totalDues = posted.reduce((sum, contribution) => sum + contribution.amount, 0)
  const totalAllocated = posted
    .flatMap((contribution) => contribution.fundAllocations ?? [])
    .reduce((sum, allocation) => sum + allocation.allocatedAmount, 0)

  return (
    <DataTable
      columns={columns}
      data={filteredRows}
      getRowId={(row) => row.id}
      toolbar={
        <MemberTableToolbar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={(value) => setStatus(value ?? "all")}
          statuses={Array.from(new Set(rows.map((row) => row.status)))}
        />
      }
      emptyTitle="No Monthly Dues allocations on record"
      emptyDescription="Posted Monthly Dues and their configured fund allocations will appear here."
      maxHeight="max-h-[32rem]"
      footer={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Monthly Dues
              </p>
              <p className="mt-0.5 font-heading text-lg font-bold text-foreground">
                {formatCurrency(totalDues)}
              </p>
            </div>
            <div className="rounded-xl border border-primary/25 bg-primary/10 p-3 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Grand Total Allocated
              </p>
              <p className="mt-0.5 font-heading text-lg font-bold text-primary">
                {formatCurrency(totalAllocated)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {funds.map((fund) => (
              <div
                key={fund.fundId}
                className="rounded-lg border border-border/50 bg-muted/20 p-2.5 shadow-2xs"
              >
                <p className="truncate text-[10px] font-semibold text-muted-foreground" title={fund.fundName}>
                  {fund.fundName}
                </p>
                <p className="mt-0.5 font-mono text-xs font-bold text-foreground">
                  {formatCurrency(
                    posted.reduce(
                      (sum, contribution) =>
                        sum +
                        (contribution.fundAllocations?.find(
                          (allocation) => allocation.fundId === fund.fundId
                        )?.allocatedAmount ?? 0),
                      0
                    )
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      }
    />
  )
}

function SummaryStat({
  label,
  value,
  tone,
  badge,
  description,
}: {
  label: string
  value: string
  tone?: "danger" | "success"
  badge?: string
  description?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-4 shadow-2xs backdrop-blur-xs transition-all hover:border-border/90 hover:shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
          {label}
        </span>
        {badge && (
          <span className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-1 font-heading text-xl font-bold tracking-tight",
          tone === "danger"
            ? "text-destructive"
            : tone === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-foreground"
        )}
      >
        {value}
      </p>
      {description && (
        <p className="mt-1 text-[11px] font-medium text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

function Detail({
  label,
  value,
  isMono,
}: {
  label: string
  value: string
  isMono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/30 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
        {label}
      </dt>
      <dd
        className={cn(
          "max-w-md truncate text-left text-sm font-medium text-foreground sm:text-right",
          isMono && "font-mono text-xs"
        )}
      >
        {value}
      </dd>
    </div>
  )
}