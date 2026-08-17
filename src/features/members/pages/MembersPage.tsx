import * as React from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef, SortingState } from "@tanstack/react-table"
import {
  Archive,
  ArchiveRestore,
  Eye,
  PencilLine,
  Plus,
  RotateCcw,
  UploadCloud,
} from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { ProfileCompleteness } from "@/components/shared/ProfileCompleteness"
import { DraftStatusBadge } from "@/components/shared/DraftStatusBadge"
import { DraftCompletionBar } from "@/components/shared/DraftCompletionBar"
import { ExportButtons } from "@/components/shared/ExportButtons"
import { PrintButton } from "@/components/shared/PrintButton"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { DeleteOrArchiveDialog } from "@/components/shared/DeleteOrArchiveDialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CommandSelect } from "@/components/shared/CommandSelect"
import {
  archiveMember,
  listAllMembersForBrowse,
  profileCompleteness,
  restoreMember,
  updateMemberMembershipStatus,
} from "@/services/members.service"
import { calculateAge, calculateDurationLabel, formatDateShort, initialsFromName } from "@/utils/format"
import { paginate, sortBy as applySortBy } from "@/utils/paginate"
import type { Member } from "@/types"
import { cn } from "@/lib/utils"

interface MembersPageProps {
  archived?: boolean
  incompleteOnly?: boolean
  draftsOnly?: boolean
  title?: string
  description?: string
}

export default function MembersPage({
  archived = false,
  incompleteOnly = false,
  draftsOnly = false,
  title,
  description,
}: MembersPageProps) {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = React.useState("")
  const [office, setOffice] = React.useState(searchParams.get("office") ?? "")
  const [sex, setSex] = React.useState("")
  const [membershipStatus, setMembershipStatus] = React.useState("")
  const [retireeStatus, setRetireeStatus] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [archiveTarget, setArchiveTarget] = React.useState<Member | null>(null)
  const [restoreTarget, setRestoreTarget] = React.useState<Member | null>(null)
  const [deactivateTarget, setDeactivateTarget] = React.useState<Member | null>(null)

  const sortBy = sorting[0]?.id
  const sortDir = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

  // Fetches full dataset for client-side search/sort/paginate
  const { data: allMembers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["members", "all", archived ? "archived" : draftsOnly ? "drafts" : "browse"],
    queryFn: () => listAllMembersForBrowse({ archived, draftsOnly }),
  })

  const filteredMembers = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return allMembers.filter((m) => {
      const matchesSearch =
        !q ||
        (m.fullName ?? "").toLowerCase().includes(q) ||
        (m.memberNumber ?? "").toLowerCase().includes(q) ||
        (m.position ?? "").toLowerCase().includes(q) ||
        (m.cellphoneNumber ?? "").toLowerCase().includes(q) ||
        (m.officeName ?? "").toLowerCase().includes(q)

      if (archived || draftsOnly) return matchesSearch

      const matchesOffice = !office || m.officeName === office
      const matchesSex = !sex || m.sex === sex
      const matchesMembershipStatus = !membershipStatus || m.membershipStatus === membershipStatus
      const matchesRetiree = !retireeStatus || m.retireeStatus === retireeStatus
      const matchesIncomplete =
        !incompleteOnly ||
        !m.email ||
        !m.cellphoneNumber ||
        !m.permanentAddress ||
        (m.beneficiaries?.length ?? 0) === 0 ||
        (m.documents?.length ?? 0) === 0

      return (
        matchesSearch &&
        matchesOffice &&
        matchesSex &&
        matchesMembershipStatus &&
        matchesRetiree &&
        matchesIncomplete
      )
    })
  }, [allMembers, search, archived, draftsOnly, office, sex, membershipStatus, retireeStatus, incompleteOnly])

  const sortedMembers = React.useMemo(
    () => applySortBy(filteredMembers, sortBy, sortDir),
    [filteredMembers, sortBy, sortDir]
  )
  const { data: pagedMembers, meta } = paginate(sortedMembers, page, perPage)

  const hasActiveFilters = Boolean(search || office || sex || membershipStatus || retireeStatus)

  function clearFilters() {
    setSearch("")
    setOffice("")
    setSex("")
    setMembershipStatus("")
    setRetireeStatus("")
    setPage(1)
    const next = new URLSearchParams(searchParams)
    next.delete("office")
    setSearchParams(next, { replace: true })
  }

  const archiveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => archiveMember(id, reason),
    onSuccess: () => {
      toast.success("Member archived successfully.")
      queryClient.invalidateQueries({ queryKey: ["members"] })
      setArchiveTarget(null)
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreMember(id),
    onSuccess: () => {
      toast.success("Member restored successfully.")
      queryClient.invalidateQueries({ queryKey: ["members"] })
      setRestoreTarget(null)
    },
  })

  const membershipStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "Active" | "Inactive" }) =>
      updateMemberMembershipStatus(id, status),
    onSuccess: (member) => {
      toast.success(`${member.fullName} is now ${member.membershipStatus.toLowerCase()}.`)
      queryClient.invalidateQueries({ queryKey: ["members"] })
      setDeactivateTarget(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to update membership status.")
    },
  })

  function updateOfficeFilter(value: string) {
    setOffice(value)
    setPage(1)
    const next = new URLSearchParams(searchParams)
    if (value) next.set("office", value)
    else next.delete("office")
    setSearchParams(next, { replace: true })
  }

  const columns: ColumnDef<Member, unknown>[] = [
    {
      accessorKey: "memberNumber",
      header: draftsOnly ? "Draft Reference" : "Member ID",
      meta: { sticky: "left" },
      cell: ({ row }) =>
        draftsOnly ? (
          <div className="flex items-center gap-2">
            <Link
              to={`/members/${row.original.id}/edit`}
              className="font-medium text-primary hover:underline"
            >
              {row.original.draftReferenceNo ?? "Untitled Draft"}
            </Link>
            <DraftStatusBadge status="Draft" />
          </div>
        ) : (
          <Link
            to={`/members/${row.original.id}`}
            className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            {row.original.memberNumber}
          </Link>
        ),
    },
    {
      accessorKey: "fullName",
      header: "Member Name",
      meta: { sticky: "left" },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8 border border-border/60 shadow-2xs">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-xs font-bold text-primary">
              {initialsFromName(row.original.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-heading font-semibold text-foreground tracking-tight">
              {row.original.fullName}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {row.original.position || "Member"}
            </span>
          </div>
        </div>
      ),
    },
    { accessorKey: "sex", header: "Sex" },
    {
      accessorKey: "birthdate",
      header: "Birthdate",
      cell: ({ row }) => formatDateShort(row.original.birthdate),
    },
    {
      id: "age",
      header: "Age",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-xs">{calculateAge(row.original.birthdate)}</span>
      ),
    },
    { accessorKey: "officeName", header: "Office" },
    {
      accessorKey: "cellphoneNumber",
      header: "Contact",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.cellphoneNumber || "—"}
        </span>
      ),
    },
    {
      accessorKey: "membershipDate",
      header: "Joined Date",
      cell: ({ row }) => formatDateShort(row.original.membershipDate),
    },
    {
      id: "membershipLength",
      header: "Tenure",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {calculateDurationLabel(row.original.membershipDate)}
        </span>
      ),
    },
    {
      accessorKey: "membershipStatus",
      header: "Status",
      cell: ({ row }) => {
        const member = row.original
        const isActive = member.membershipStatus === "Active"
        const isUpdating =
          membershipStatusMutation.isPending &&
          membershipStatusMutation.variables?.id === member.id

        return (
          <PermissionGuard
            permission="members.update"
            fallback={
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
              )}>
                <span className={cn("size-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-muted-foreground")} />
                {member.membershipStatus}
              </span>
            }
          >
            <div className="flex items-center gap-2">
              <Switch
                variant="status"
                checked={isActive}
                disabled={isUpdating || archived || draftsOnly}
                aria-label={`Set ${member.fullName} membership status`}
                onCheckedChange={(checked) => {
                  if (checked) {
                    membershipStatusMutation.mutate({ id: member.id, status: "Active" })
                  } else {
                    setDeactivateTarget(member)
                  }
                }}
              />
              <span
                className={cn(
                  "text-xs font-semibold tracking-tight",
                  isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                )}
              >
                {member.membershipStatus}
              </span>
            </div>
          </PermissionGuard>
        )
      },
    },
    { accessorKey: "retireeStatus", header: "Retiree Status" },
    {
      id: "profileCompleteness",
      header: draftsOnly ? "Draft Completion" : "Completeness",
      enableSorting: false,
      cell: ({ row }) =>
        draftsOnly ? (
          <DraftCompletionBar
            percentage={row.original.draftCompletionPercentage ?? 0}
            showLabel={false}
          />
        ) : (
          <ProfileCompleteness percentage={profileCompleteness(row.original)} />
        ),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) =>
        draftsOnly ? (
          <PermissionGuard permission="members.update">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg text-xs"
              render={<Link to={`/members/${row.original.id}/edit`} />}
            >
              <PencilLine className="size-3.5" /> Continue Editing
            </Button>
          </PermissionGuard>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8 rounded-lg hover:bg-muted/80 active:scale-90"
              render={<Link to={`/members/${row.original.id}`} />}
              aria-label="View member profile"
            >
              <Eye className="size-3.5" />
            </Button>
            <PermissionGuard permission="members.update">
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-8 rounded-lg hover:bg-muted/80 active:scale-90"
                render={<Link to={`/members/${row.original.id}/edit`} />}
                aria-label="Edit member"
              >
                <PencilLine className="size-3.5" />
              </Button>
            </PermissionGuard>
            {archived ? (
              <PermissionButton
                permission="members.restore"
                variant="ghost"
                size="icon-sm"
                className="size-8 rounded-lg text-emerald-600 hover:bg-emerald-500/10 active:scale-90"
                onClick={() => setRestoreTarget(row.original)}
                aria-label="Restore member"
              >
                <ArchiveRestore className="size-3.5" />
              </PermissionButton>
            ) : (
              <PermissionButton
                permission="members.archive"
                variant="ghost"
                size="icon-sm"
                className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90"
                onClick={() => setArchiveTarget(row.original)}
                aria-label="Archive member"
              >
                <Archive className="size-3.5" />
              </PermissionButton>
            )}
          </div>
        ),
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title={
          title ?? (archived ? "Archived Members" : draftsOnly ? "Member Drafts" : "Member Directory")
        }
        description={
          description ??
          (archived
            ? "Members that have been archived. Their historical records and ledgers remain intact."
            : draftsOnly
              ? "Incomplete registrations saved as drafts. Continue editing to finish and submit them."
              : "Comprehensive roster of GCGEA members, profiles, and associated records.")
        }
        actions={
          !archived &&
          !draftsOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <PrintButton permission="members.print" label="Print List" />
              <ExportButtons permission="members.export" label="members" />
              <PermissionButton
                permission="member_import.create"
                variant="outline"
                render={<Link to="/members/import" />}
              >
                <UploadCloud className="size-4" />
                Import
              </PermissionButton>
              <PermissionButton permission="members.create" render={<Link to="/members/new" />}>
                <Plus className="size-4" />
                Add Member
              </PermissionButton>
            </div>
          )
        }
      />

      {/* Main Table Glass Card */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-muted/15 p-4">
          <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-[280px]">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(1)
              }}
              placeholder="Search by name, member #, office, position…"
              className="max-w-sm"
            />
            {!archived && !draftsOnly && (
              <>
                <OfficeSelect
                  value={office}
                  onValueChange={updateOfficeFilter}
                  placeholder="All Offices"
                  className="w-40"
                />
                <CommandSelect
                  className="w-32"
                  value={sex || "all"}
                  onValueChange={(v) => {
                    setSex(!v || v === "all" ? "" : v)
                    setPage(1)
                  }}
                  options={[
                    { value: "all", label: "All Sexes" },
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                  ]}
                  placeholder="Sex"
                  hideSearch
                />
                <CommandSelect
                  className="w-44"
                  value={membershipStatus || "all"}
                  onValueChange={(v) => {
                    setMembershipStatus(!v || v === "all" ? "" : v)
                    setPage(1)
                  }}
                  options={[
                    { value: "all", label: "All Statuses" },
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                    { value: "Suspended", label: "Suspended" },
                    { value: "Terminated", label: "Terminated" },
                    { value: "Deceased", label: "Deceased" },
                  ]}
                  placeholder="Status"
                  hideSearch
                />
                <CommandSelect
                  className="w-40"
                  value={retireeStatus || "all"}
                  onValueChange={(v) => {
                    setRetireeStatus(!v || v === "all" ? "" : v)
                    setPage(1)
                  }}
                  options={[
                    { value: "all", label: "All Retirees" },
                    { value: "Not Retired", label: "Not Retired" },
                    { value: "Retired", label: "Retired" },
                  ]}
                  placeholder="Retiree Status"
                  hideSearch
                />
              </>
            )}
          </div>

          {/* Reset Filters Prompt */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground active:scale-95"
            >
              <RotateCcw className="size-3" />
              Reset Filters
            </Button>
          )}
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={pagedMembers}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          sorting={sorting}
          onSortingChange={setSorting}
          getRowId={(m) => m.id}
          enableColumnVisibility={false}
          emptyTitle={
            archived
              ? "No archived members"
              : draftsOnly
                ? "No member drafts"
                : incompleteOnly
                  ? "All profiles complete"
                  : "No members found"
          }
          emptyDescription={
            draftsOnly
              ? "Draft registrations you save will appear here so you can continue them later."
              : incompleteOnly
                ? "Every member profile currently has complete information."
                : "Try adjusting your search query or removing active filters."
          }
        />

        {/* Pagination Bar */}
        {!isLoading && !isError && (
          <div className="border-t border-border/40 bg-muted/10 p-3">
            <Pagination
              meta={meta}
              onPageChange={setPage}
              onPerPageChange={(n) => {
                setPerPage(n)
                setPage(1)
              }}
            />
          </div>
        )}
      </div>

      {/* Confirmation & Archive Dialogs */}
      <DeleteOrArchiveDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        recordLabel={archiveTarget ? archiveTarget.fullName : "this member"}
        mode="archive"
        isLoading={archiveMutation.isPending}
        onConfirm={(reason) =>
          archiveTarget && archiveMutation.mutate({ id: archiveTarget.id, reason })
        }
      />
      <DeleteOrArchiveDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        recordLabel={restoreTarget ? restoreTarget.fullName : "this member"}
        mode="restore"
        isLoading={restoreMutation.isPending}
        onConfirm={() => restoreTarget && restoreMutation.mutate(restoreTarget.id)}
      />
      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Set member as inactive?"
        description={
          deactivateTarget
            ? `Are you sure you want to set ${deactivateTarget.fullName} as inactive? The member will no longer be treated as an active member for transactions and eligibility checks.`
            : undefined
        }
        confirmLabel="Yes, Set Inactive"
        confirmingLabel="Updating..."
        destructive
        isLoading={membershipStatusMutation.isPending}
        onConfirm={() =>
          deactivateTarget &&
          membershipStatusMutation.mutate({ id: deactivateTarget.id, status: "Inactive" })
        }
      />
    </div>
  )
}