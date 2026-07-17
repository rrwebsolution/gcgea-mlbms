import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Copy,
  Eye,
  KeyRound,
  Lock,
  MoreHorizontal,
  PencilLine,
  Plus,
  Power,
  Trash2,
  Users as UsersIcon,
} from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteRole, duplicateRole, listRoles, toggleRoleStatus } from "@/services/roles.service"
import { listAllUsers } from "@/services/users.service"
import { formatDateShort } from "@/utils/format"
import type { Role } from "@/types"
import { AssignedUsersDialog } from "@/features/roles/components/AssignedUsersDialog"

export default function RolesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [roleType, setRoleType] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [assignedUsersRole, setAssignedUsersRole] = React.useState<Role | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Role | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["roles", { search, status, roleType, page, perPage }],
    queryFn: () =>
      listRoles({
        search,
        status: status || undefined,
        roleType: (roleType as "System" | "Custom") || undefined,
        page,
        perPage,
      }),
  })

  const { data: allUsers = [] } = useQuery({ queryKey: ["users", "all"], queryFn: listAllUsers })

  function assignedUserCount(roleId: string) {
    return allUsers.filter((u) => u.roleId === roleId || u.additionalRoleIds.includes(roleId)).length
  }

  const toggleMutation = useMutation({
    mutationFn: toggleRoleStatus,
    onSuccess: (role) => {
      toast.success(`${role.name} is now ${role.status}.`)
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: duplicateRole,
    onSuccess: (role) => {
      toast.success(`Duplicated as "${role.name}".`)
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      navigate(`/admin/roles/${role.id}/edit`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      toast.success("Role deleted.")
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Unable to delete role.")
    },
  })

  const columns: ColumnDef<Role, unknown>[] = [
    {
      accessorKey: "name",
      header: "Role Name",
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          <Link to={`/admin/roles/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.name}
          </Link>
          {row.original.isSystemRole && (
            <Badge variant="outline" className="gap-1 text-[0.65rem] text-muted-foreground">
              <Lock className="size-2.5" />
              System Role
            </Badge>
          )}
        </span>
      ),
    },
    { accessorKey: "code", header: "Role Code", cell: ({ row }) => <code className="text-xs text-muted-foreground">{row.original.code}</code> },
    { accessorKey: "description", header: "Description", cell: ({ row }) => <span className="line-clamp-1 text-muted-foreground">{row.original.description}</span> },
    {
      id: "assignedUsers",
      header: "Assigned Users",
      enableSorting: false,
      cell: ({ row }) => (
        <button type="button" className="text-primary hover:underline" onClick={() => setAssignedUsersRole(row.original)}>
          {assignedUserCount(row.original.id)}
        </button>
      ),
    },
    { id: "permissionCount", header: "Permission Count", enableSorting: false, cell: ({ row }) => row.original.permissions.length },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={row.original.status === "Active" ? "success" : "neutral"} /> },
    { accessorKey: "createdAt", header: "Created Date", cell: ({ row }) => formatDateShort(row.original.createdAt) },
    { accessorKey: "updatedAt", header: "Updated Date", cell: ({ row }) => formatDateShort(row.original.updatedAt) },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => {
        const role = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Role actions" />}>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link to={`/admin/roles/${role.id}`} />}>
                <Eye /> View
              </DropdownMenuItem>
              <PermissionGuard permission="roles.update">
                <DropdownMenuItem render={<Link to={`/admin/roles/${role.id}/edit`} />}>
                  <PencilLine /> Edit
                </DropdownMenuItem>
              </PermissionGuard>
              <PermissionGuard permission="roles.assign_permissions">
                <DropdownMenuItem render={<Link to={`/admin/roles/${role.id}/permissions`} />}>
                  <KeyRound /> Manage Permissions
                </DropdownMenuItem>
              </PermissionGuard>
              <PermissionGuard permission="roles.view_users">
                <DropdownMenuItem onClick={() => setAssignedUsersRole(role)}>
                  <UsersIcon /> View Assigned Users
                </DropdownMenuItem>
              </PermissionGuard>
              <PermissionGuard permission="roles.duplicate">
                <DropdownMenuItem onClick={() => duplicateMutation.mutate(role.id)}>
                  <Copy /> Duplicate
                </DropdownMenuItem>
              </PermissionGuard>
              <PermissionGuard permission="roles.update">
                <DropdownMenuItem onClick={() => toggleMutation.mutate(role.id)}>
                  <Power /> {role.status === "Active" ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              </PermissionGuard>
              {!role.isSystemRole && (
                <PermissionGuard permission="roles.delete">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(role)}>
                    <Trash2 /> Delete Custom Role
                  </DropdownMenuItem>
                </PermissionGuard>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roles & Permissions"
        description="Manage system roles and their assigned permissions."
        actions={
          <PermissionButton permission="roles.create" render={<Link to="/admin/roles/new" />}>
            <Plus />
            Add Role
          </PermissionButton>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by role name or code…" className="max-w-sm" />
          <Select value={status || "all"} onValueChange={(v) => { setStatus(!v || v === "all" ? "" : v); setPage(1) }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status">{(v: string) => (v === "all" ? "All Statuses" : v)}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleType || "all"} onValueChange={(v) => { setRoleType(!v || v === "all" ? "" : v); setPage(1) }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Role Type">{(v: string) => (v === "all" ? "All Types" : v === "System" ? "System Role" : v === "Custom" ? "Custom Role" : v)}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="System">System Role</SelectItem>
              <SelectItem value="Custom">Custom Role</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No roles found"
          emptyDescription="Try adjusting your search or filters."
        />
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>

      <AssignedUsersDialog open={!!assignedUsersRole} onOpenChange={(open) => !open && setAssignedUsersRole(null)} role={assignedUsersRole} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        description="This custom role will be permanently removed. Users currently assigned to it will lose the permissions it grants unless they hold another role with equivalent access."
        confirmLabel="Delete Role"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </div>
  )
}
