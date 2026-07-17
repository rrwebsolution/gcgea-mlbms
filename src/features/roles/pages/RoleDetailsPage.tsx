import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Copy, KeyRound, PencilLine, Power, ShieldCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { ActivityTimeline, type TimelineEntry } from "@/components/shared/ActivityTimeline"
import { EmptyState } from "@/components/shared/EmptyState"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { deleteRole, duplicateRole, getRole, toggleRoleStatus } from "@/services/roles.service"
import { listAllUsers } from "@/services/users.service"
import { PERMISSION_GROUPS } from "@/constants/permissions"
import { USER_STATUS_TONE } from "@/constants/status"
import { formatDateShort, initialsFromName } from "@/utils/format"

export default function RoleDetailsPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteConfirm, setDeleteConfirm] = React.useState(false)

  const { data: role, isLoading } = useQuery({ queryKey: ["roles", id], queryFn: () => getRole(id) })
  const { data: allUsers = [] } = useQuery({ queryKey: ["users", "all"], queryFn: listAllUsers })

  useBreadcrumbExtra(role?.name)

  const toggleMutation = useMutation({
    mutationFn: toggleRoleStatus,
    onSuccess: (updated) => {
      toast.success(`${updated.name} is now ${updated.status}.`)
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: duplicateRole,
    onSuccess: (newRole) => {
      toast.success(`Duplicated as "${newRole.name}".`)
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      navigate(`/admin/roles/${newRole.id}/edit`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      toast.success("Role deleted.")
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      navigate("/admin/roles")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Unable to delete role."),
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading role…</p>
  if (!role) return <EmptyState icon={ShieldCheck} title="Role not found" description="This role may have been deleted." />

  const assignedUsers = allUsers.filter((u) => u.roleId === role.id || u.additionalRoleIds.includes(role.id))

  const activity: TimelineEntry[] = [
    { id: "created", title: "Role created", timestamp: role.createdAt, tone: "info" },
    ...(role.updatedAt !== role.createdAt ? [{ id: "updated", title: "Permissions or details last updated", timestamp: role.updatedAt, tone: "warning" as const }] : []),
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={role.name}
        description={role.description}
        actions={
          <>
            <StatusBadge label={role.status} tone={role.status === "Active" ? "success" : "neutral"} className="h-7 px-3 text-sm" />
            {role.isSystemRole && <StatusBadge label="System Role" tone="gold" className="h-7 px-3 text-sm" />}
            <PermissionButton permission="roles.update" variant="outline" size="sm" render={<Link to={`/admin/roles/${role.id}/edit`} />}>
              <PencilLine /> Edit Role
            </PermissionButton>
            <PermissionButton permission="roles.assign_permissions" variant="outline" size="sm" render={<Link to={`/admin/roles/${role.id}/permissions`} />}>
              <KeyRound /> Manage Permissions
            </PermissionButton>
            <PermissionButton permission="roles.duplicate" variant="outline" size="sm" onClick={() => duplicateMutation.mutate(role.id)}>
              <Copy /> Duplicate
            </PermissionButton>
            <PermissionButton permission="roles.update" variant="outline" size="sm" onClick={() => toggleMutation.mutate(role.id)}>
              <Power /> {role.status === "Active" ? "Deactivate" : "Activate"}
            </PermissionButton>
            {!role.isSystemRole && (
              <PermissionButton permission="roles.delete" variant="destructive" size="sm" onClick={() => setDeleteConfirm(true)}>
                <Trash2 /> Delete
              </PermissionButton>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Role Code" value={role.code} />
        <SummaryStat label="Role Type" value={role.isSystemRole ? "System" : "Custom"} />
        <SummaryStat label="Permission Count" value={String(role.permissions.length)} />
        <SummaryStat label="Assigned Users" value={String(assignedUsers.length)} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="users">Assigned Users</TabsTrigger>
          <TabsTrigger value="activity">Activity History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <dt className="text-muted-foreground">Role Name</dt>
              <dd className="font-medium text-foreground">{role.name}</dd>
              <dt className="text-muted-foreground">Role Code</dt>
              <dd className="font-medium text-foreground">{role.code}</dd>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="font-medium text-foreground">{role.description || "—"}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium text-foreground">{role.status}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium text-foreground">{formatDateShort(role.createdAt)}</dd>
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd className="font-medium text-foreground">{formatDateShort(role.updatedAt)}</dd>
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <div className="space-y-3">
            {PERMISSION_GROUPS.map((group) => {
              const granted = group.permissions.filter((p) => role.permissions.includes(p.code))
              if (granted.length === 0) return null
              return (
                <div key={group.group} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                    <span className="text-xs text-muted-foreground">{granted.length}/{group.permissions.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {granted.map((perm) => (
                      <span key={perm.code} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {perm.label}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
            {role.permissions.length === 0 && <EmptyState title="No permissions granted" description="This role currently has no access." />}
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          {assignedUsers.length === 0 ? (
            <EmptyState title="No users assigned" description="No user currently holds this role." />
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
              {assignedUsers.map((u) => (
                <Link key={u.id} to={`/admin/users/${u.id}/edit`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-primary text-[0.6rem] text-primary-foreground">{initialsFromName(u.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{u.fullName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {u.username} · {u.roleId === role.id ? "Primary Role" : "Additional Role"}
                    </span>
                  </span>
                  <StatusBadge label={u.status} tone={USER_STATUS_TONE[u.status]} />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <ActivityTimeline entries={activity} />
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title={`Delete ${role.name}?`}
        description="This custom role will be permanently removed."
        confirmLabel="Delete Role"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(role.id)}
      />
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
