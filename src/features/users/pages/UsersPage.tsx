import * as React from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Eye, History, KeyRound, Loader2, MoreHorizontal, PencilLine, Plus, Power, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CommandSelect } from "@/components/shared/CommandSelect"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { effectivePermissionCountFor, listAllUsersIncludingInactive, resetUserPassword, toggleUserStatus } from "@/services/users.service"
import { listAllRoles } from "@/services/roles.service"
import { USER_STATUS_TONE } from "@/constants/status"
import { formatDateTime, initialsFromName } from "@/utils/format"
import { paginate } from "@/utils/paginate"
import type { SystemUser } from "@/types"
import { LoginHistoryDialog } from "@/features/users/components/LoginHistoryDialog"

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [historyUser, setHistoryUser] = React.useState<SystemUser | null>(null)

  // Fetches every user (all statuses) once and pages/searches/filters entirely
  // client-side, mirroring UserController::applyFilters()'s rules so results match what
  // the equivalent server query used to return.
  const { data: allUsers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["users", "all-including-inactive"],
    queryFn: listAllUsersIncludingInactive,
  })
  const { data: allRoles = [] } = useQuery({ queryKey: ["roles", "all"], queryFn: listAllRoles })
  const roleNameById = React.useMemo(() => new Map(allRoles.map((r) => [r.id, r.name])), [allRoles])

  const filteredUsers = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return allUsers.filter((u) => {
      const matchesSearch = !q
        || (u.fullName ?? "").toLowerCase().includes(q)
        || (u.username ?? "").toLowerCase().includes(q)
        || (u.email ?? "").toLowerCase().includes(q)
      const matchesStatus = !status || u.status === status
      return matchesSearch && matchesStatus
    })
  }, [allUsers, search, status])

  const { data: pagedUsers, meta } = paginate(filteredUsers, page, perPage)

  const toggleMutation = useMutation({
    mutationFn: toggleUserStatus,
    onSuccess: (user) => {
      toast.success(`${user.fullName} is now ${user.status}.`)
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: (_data, id) => {
      const user = allUsers.find((u) => u.id === id)
      toast.success(`Password reset link sent to ${user?.email ?? "the user"}.`)
    },
  })

  const columns: ColumnDef<SystemUser, unknown>[] = [
    {
      accessorKey: "fullName",
      header: "Full Name",
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback className="bg-primary text-[0.65rem] text-primary-foreground">{initialsFromName(row.original.fullName)}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{row.original.fullName}</span>
        </span>
      ),
    },
    { accessorKey: "username", header: "Username" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "roleName", header: "Primary Role" },
    {
      id: "additionalRoles",
      header: "Additional Roles",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.additionalRoleIds.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.original.additionalRoleIds.map((id) => (
              <Badge key={id} variant="outline" className="text-[0.65rem]">
                {roleNameById.get(id) ?? id}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      id: "effectivePermissionCount",
      header: "Effective Permissions",
      enableSorting: false,
      cell: ({ row }) => effectivePermissionCountFor(row.original),
    },
    { accessorKey: "status", header: "Account Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={USER_STATUS_TONE[row.original.status]} /> },
    { accessorKey: "lastLoginAt", header: "Last Login", cell: ({ row }) => formatDateTime(row.original.lastLoginAt) },
    { accessorKey: "createdAt", header: "Created Date", cell: ({ row }) => formatDateTime(row.original.createdAt) },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="User actions" />}>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link to={`/admin/users/${user.id}/edit`} />}>
                <Eye /> View
              </DropdownMenuItem>
              <PermissionGuard permission="users.update">
                <DropdownMenuItem render={<Link to={`/admin/users/${user.id}/edit`} />}>
                  <PencilLine /> Edit
                </DropdownMenuItem>
              </PermissionGuard>
              <PermissionGuard permission="users.assign_role">
                <DropdownMenuItem render={<Link to={`/admin/users/${user.id}/edit`} />}>
                  <ShieldCheck /> Manage Roles
                </DropdownMenuItem>
              </PermissionGuard>
              <PermissionGuard permission="users.assign_permissions">
                <DropdownMenuItem render={<Link to={`/admin/users/${user.id}/permissions`} />}>
                  <ShieldCheck /> Manage Permissions
                </DropdownMenuItem>
              </PermissionGuard>
              <PermissionGuard permission="users.reset_password">
                <DropdownMenuItem
                  disabled={resetPasswordMutation.isPending && resetPasswordMutation.variables === user.id}
                  onClick={() => resetPasswordMutation.mutate(user.id)}
                >
                  {resetPasswordMutation.isPending && resetPasswordMutation.variables === user.id ? <Loader2 className="animate-spin" /> : <KeyRound />} Reset Password
                </DropdownMenuItem>
              </PermissionGuard>
              <PermissionGuard permission="users.view_login_history">
                <DropdownMenuItem onClick={() => setHistoryUser(user)}>
                  <History /> View Login History
                </DropdownMenuItem>
              </PermissionGuard>
              <PermissionGuard anyOf={["users.activate", "users.deactivate"]}>
                <DropdownMenuItem
                  disabled={toggleMutation.isPending && toggleMutation.variables === user.id}
                  onClick={() => toggleMutation.mutate(user.id)}
                >
                  {toggleMutation.isPending && toggleMutation.variables === user.id ? <Loader2 className="animate-spin" /> : <Power />} {user.status === "Active" ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              </PermissionGuard>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="User Management"
        description="Manage GCGEA MLBMS system user accounts and access."
        actions={
          <PermissionButton permission="users.create" render={<Link to="/admin/users/new" />}>
            <Plus />
            Add User
          </PermissionButton>
        }
      />
      <div className="rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by name, username, email…" className="max-w-sm" />
          <CommandSelect
            className="w-36"
            value={status || "all"}
            onValueChange={(v) => { setStatus(!v || v === "all" ? "" : v); setPage(1) }}
            placeholder="Status"
            options={[
              { value: "all", label: "All Statuses" },
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
              { value: "Disabled", label: "Disabled" },
            ]}
            hideSearch
          />
        </div>
        <DataTable
          columns={columns}
          data={pagedUsers}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No users found"
          emptyDescription="Try a different search term."
        />
        {!isLoading && !isError && <Pagination meta={meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>

      <LoginHistoryDialog open={!!historyUser} onOpenChange={(open) => !open && setHistoryUser(null)} user={historyUser} />
    </div>
  )
}
