import * as React from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef, RowSelectionState, SortingState } from "@tanstack/react-table"
import { Archive, ArchiveRestore, Eye, PencilLine, Plus, UploadCloud } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ProfileCompleteness } from "@/components/shared/ProfileCompleteness"
import { DraftStatusBadge } from "@/components/shared/DraftStatusBadge"
import { DraftCompletionBar } from "@/components/shared/DraftCompletionBar"
import { ExportButtons } from "@/components/shared/ExportButtons"
import { PrintButton } from "@/components/shared/PrintButton"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { DeleteOrArchiveDialog } from "@/components/shared/DeleteOrArchiveDialog"
import { OfficeSelect } from "@/components/shared/OfficeSelect"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  archiveMember,
  listArchivedMembers,
  listMembers,
  profileCompleteness,
  restoreMember,
} from "@/services/members.service"
import { MEMBERSHIP_STATUS_TONE } from "@/constants/status"
import { calculateAge, calculateDurationLabel, formatDateShort, initialsFromName } from "@/utils/format"
import type { Member } from "@/types"

interface MembersPageProps {
  archived?: boolean
  incompleteOnly?: boolean
  draftsOnly?: boolean
  title?: string
  description?: string
}

export default function MembersPage({ archived = false, incompleteOnly = false, draftsOnly = false, title, description }: MembersPageProps) {
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
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [archiveTarget, setArchiveTarget] = React.useState<Member | null>(null)
  const [restoreTarget, setRestoreTarget] = React.useState<Member | null>(null)

  const sortBy = sorting[0]?.id
  const sortDir = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["members", { archived, incompleteOnly, draftsOnly, search, office, sex, membershipStatus, retireeStatus, page, perPage, sortBy, sortDir }],
    queryFn: () =>
      archived
        ? listArchivedMembers({ search, page, perPage, sortBy, sortDir })
        : listMembers({
            search,
            office: office || undefined,
            sex: sex || undefined,
            membershipStatus: membershipStatus || undefined,
            retireeStatus: retireeStatus || undefined,
            incompleteOnly: incompleteOnly || undefined,
            draftsOnly: draftsOnly || undefined,
            page,
            perPage,
            sortBy,
            sortDir,
          }),
  })

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
      header: draftsOnly ? "Draft Reference" : "Member Number",
      cell: ({ row }) =>
        draftsOnly ? (
          <div className="flex items-center gap-2">
            <Link to={`/members/${row.original.id}/edit`} className="font-medium text-primary hover:underline">
              {row.original.draftReferenceNo ?? "Untitled Member Draft"}
            </Link>
            <DraftStatusBadge status="Draft" />
          </div>
        ) : (
          <Link to={`/members/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.memberNumber}
          </Link>
        ),
    },
    {
      accessorKey: "fullName",
      header: "Full Name",
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback className="bg-primary text-[0.6rem] text-primary-foreground">{initialsFromName(row.original.fullName)}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{row.original.fullName}</span>
        </span>
      ),
    },
    { accessorKey: "sex", header: "Sex" },
    { accessorKey: "birthdate", header: "Birthdate", cell: ({ row }) => formatDateShort(row.original.birthdate) },
    { id: "age", header: "Age", enableSorting: false, cell: ({ row }) => calculateAge(row.original.birthdate) },
    { accessorKey: "officeName", header: "Office" },
    { accessorKey: "position", header: "Position" },
    { accessorKey: "cellphoneNumber", header: "Contact Number" },
    { accessorKey: "membershipDate", header: "Membership Date", cell: ({ row }) => formatDateShort(row.original.membershipDate) },
    { id: "membershipLength", header: "Membership Length", enableSorting: false, cell: ({ row }) => calculateDurationLabel(row.original.membershipDate) },
    { accessorKey: "membershipStatus", header: "Membership Status", cell: ({ row }) => <StatusBadge label={row.original.membershipStatus} tone={MEMBERSHIP_STATUS_TONE[row.original.membershipStatus]} /> },
    { accessorKey: "retireeStatus", header: "Retiree Status" },
    {
      id: "profileCompleteness",
      header: draftsOnly ? "Draft Completion" : "Profile Completeness",
      enableSorting: false,
      cell: ({ row }) =>
        draftsOnly ? (
          <DraftCompletionBar percentage={row.original.draftCompletionPercentage ?? 0} showLabel={false} />
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
            <Button variant="outline" size="sm" render={<Link to={`/members/${row.original.id}/edit`} />}>
              <PencilLine /> Continue Editing
            </Button>
          </PermissionGuard>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" render={<Link to={`/members/${row.original.id}`} />} aria-label="View member">
              <Eye />
            </Button>
            <PermissionGuard permission="members.update">
              <Button variant="ghost" size="icon-sm" render={<Link to={`/members/${row.original.id}/edit`} />} aria-label="Edit member">
                <PencilLine />
              </Button>
            </PermissionGuard>
            {archived ? (
              <PermissionButton permission="members.restore" variant="ghost" size="icon-sm" onClick={() => setRestoreTarget(row.original)} aria-label="Restore member">
                <ArchiveRestore />
              </PermissionButton>
            ) : (
              <PermissionButton permission="members.archive" variant="ghost" size="icon-sm" onClick={() => setArchiveTarget(row.original)} aria-label="Archive member">
                <Archive />
              </PermissionButton>
            )}
          </div>
        ),
    },
  ]

  const selectedCount = Object.values(rowSelection).filter(Boolean).length

  return (
    <div className="space-y-5">
      <PageHeader
        title={title ?? (archived ? "Archived Members" : draftsOnly ? "Member Drafts" : "Member Management")}
        description={
          description ??
          (archived
            ? "Members that have been archived. Their financial records remain intact."
            : draftsOnly
              ? "Incomplete registrations saved as drafts. Continue editing to finish and submit them."
              : "Manage GCGEA member records, profiles, and beneficiaries.")
        }
        actions={
          !archived &&
          !draftsOnly && (
            <>
              <PrintButton permission="members.print" label="Print List" />
              <ExportButtons permission="members.export" label="members" />
              <PermissionButton permission="members.import" variant="outline" render={<Link to="/members/import" />}>
                <UploadCloud />
                Import Members
              </PermissionButton>
              <PermissionButton permission="members.create" render={<Link to="/members/new" />}>
                <Plus />
                Add Member
              </PermissionButton>
            </>
          )
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search by name, member #, office, position, contact…"
            className="max-w-sm"
          />
          {!archived && !draftsOnly && (
            <>
              <OfficeSelect value={office} onValueChange={updateOfficeFilter} placeholder="All Offices" className="w-40" />
              <Select value={sex || "all"} onValueChange={(v) => { setSex(!v || v === "all" ? "" : v); setPage(1) }}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Sex">{(v: string) => (v === "all" ? "All Sexes" : v)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sexes</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
              <Select value={membershipStatus || "all"} onValueChange={(v) => { setMembershipStatus(!v || v === "all" ? "" : v); setPage(1) }}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Membership Status">{(v: string) => (v === "all" ? "All Statuses" : v)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                  <SelectItem value="Deceased">Deceased</SelectItem>
                </SelectContent>
              </Select>
              <Select value={retireeStatus || "all"} onValueChange={(v) => { setRetireeStatus(!v || v === "all" ? "" : v); setPage(1) }}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Retiree Status">{(v: string) => (v === "all" ? "All" : v)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Not Retired">Not Retired</SelectItem>
                  <SelectItem value="Retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          {selectedCount > 0 && (
            <span className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              {selectedCount} selected
              <ExportButtons permission="members.export" label={`${selectedCount} member(s)`} />
            </span>
          )}
        </div>

        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          sorting={sorting}
          onSortingChange={setSorting}
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(m) => m.id}
          emptyTitle={archived ? "No archived members" : draftsOnly ? "No member drafts" : incompleteOnly ? "All profiles complete" : "No members found"}
          emptyDescription={
            draftsOnly
              ? "Draft registrations you save will appear here so you can continue them later."
              : incompleteOnly
                ? "Every member profile currently has complete information."
                : "Try adjusting your search or filters."
          }
        />
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>

      <DeleteOrArchiveDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        recordLabel={archiveTarget ? archiveTarget.fullName : "this member"}
        mode="archive"
        isLoading={archiveMutation.isPending}
        onConfirm={(reason) => archiveTarget && archiveMutation.mutate({ id: archiveTarget.id, reason })}
      />
      <DeleteOrArchiveDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        recordLabel={restoreTarget ? restoreTarget.fullName : "this member"}
        mode="restore"
        isLoading={restoreMutation.isPending}
        onConfirm={() => restoreTarget && restoreMutation.mutate(restoreTarget.id)}
      />
    </div>
  )
}
