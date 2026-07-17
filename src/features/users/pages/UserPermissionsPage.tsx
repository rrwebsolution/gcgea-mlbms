import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, RotateCcw, Save, ShieldAlert, ShieldCheck, UserCog } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionMatrix } from "@/features/roles/components/PermissionMatrix"
import { SidebarAccessPreview } from "@/features/users/components/SidebarAccessPreview"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useBreadcrumbExtra } from "@/contexts/BreadcrumbContext"
import { getUser, listAllUsers, updateUserPermissions } from "@/services/users.service"
import { listAllRoles } from "@/services/roles.service"
import { computeEffectivePermissionEntries, getUserRoles, permissionSourceLabel } from "@/utils/effective-permissions"
import type { PermissionCode } from "@/types"

const SOURCE_TONE: Record<string, "success" | "info" | "gold" | "danger" | "neutral"> = {
  "Primary Role": "info",
  "Additional Role": "info",
  "Direct Allow": "gold",
  "Direct Deny": "danger",
  "No Access": "neutral",
}

export default function UserPermissionsPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({ queryKey: ["users", id], queryFn: () => getUser(id) })
  const { data: allRoles = [] } = useQuery({ queryKey: ["roles", "all"], queryFn: listAllRoles })
  const { data: allUsers = [] } = useQuery({ queryKey: ["users", "all"], queryFn: listAllUsers })

  useBreadcrumbExtra(user?.fullName)

  const [allowed, setAllowed] = React.useState<PermissionCode[]>([])
  const [denied, setDenied] = React.useState<PermissionCode[]>([])
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = React.useState(false)
  const [copySourceId, setCopySourceId] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (user) {
      setAllowed(user.allowedPermissions)
      setDenied(user.deniedPermissions)
    }
  }, [user])

  const isDirty = user ? (!sameArray(allowed, user.allowedPermissions) || !sameArray(denied, user.deniedPermissions)) : false

  React.useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  const draftEntries = React.useMemo(() => {
    if (!user) return []
    return computeEffectivePermissionEntries({ roleId: user.roleId, additionalRoleIds: user.additionalRoleIds, allowedPermissions: allowed, deniedPermissions: denied }, allRoles)
  }, [user, allowed, denied, allRoles])

  const assignedRoles = user ? getUserRoles(user, allRoles) : []
  const effectiveCount = draftEntries.filter((e) => e.effective).length

  async function handleSave() {
    setIsSaving(true)
    try {
      await updateUserPermissions(id, allowed, denied)
      toast.success("User permissions updated.")
      queryClient.invalidateQueries({ queryKey: ["users"] })
      navigate("/admin/users")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save permissions.")
    } finally {
      setIsSaving(false)
    }
  }

  function handleResetToDefaults() {
    setAllowed([])
    setDenied([])
    toast.info("Reset to role defaults — save to apply.")
  }

  function handleCopyFrom() {
    const source = allUsers.find((u) => u.id === copySourceId)
    if (!source) return
    setAllowed(source.allowedPermissions)
    setDenied(source.deniedPermissions)
    setCopyDialogOpen(false)
    toast.success(`Copied permission overrides from ${source.fullName}.`)
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading user permissions…</p>
  if (!user) return <EmptyState icon={UserCog} title="User not found" description="This user may have been removed." />

  return (
    <div className="space-y-5 pb-16">
      <PageHeader title={`Permissions — ${user.fullName}`} description={`${user.username} · ${user.email}`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Assigned Roles" value={String(assignedRoles.length)} />
        <SummaryStat label="Additional Allows" value={String(allowed.length)} />
        <SummaryStat label="Explicit Denies" value={String(denied.length)} />
        <SummaryStat label="Effective Permissions" value={String(effectiveCount)} />
      </div>

      <Tabs defaultValue="roles">
        <TabsList className="flex-wrap">
          <TabsTrigger value="roles">Assigned Roles</TabsTrigger>
          <TabsTrigger value="inherited">Inherited Permissions</TabsTrigger>
          <TabsTrigger value="allowed">Additional Allowed</TabsTrigger>
          <TabsTrigger value="denied">Explicitly Denied</TabsTrigger>
          <TabsTrigger value="effective">Effective Permissions</TabsTrigger>
          <TabsTrigger value="sidebar">Sidebar Access Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4 space-y-3">
          {assignedRoles.length === 0 ? (
            <EmptyState title="No roles assigned" description="This user has no primary role assigned." />
          ) : (
            assignedRoles.map((role) => (
              <div key={role.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldCheck className="size-4 text-primary" />
                    {role.name}
                    {role.id === user.roleId && <StatusBadge label="Primary" tone="info" />}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{role.permissions.length} permissions granted</p>
                </div>
              </div>
            ))
          )}
          <Button variant="outline" size="sm" render={<Link to={`/admin/users/${id}/edit`} />}>
            Edit Role Assignment
          </Button>
        </TabsContent>

        <TabsContent value="inherited" className="mt-4">
          {draftEntries.filter((e) => e.sources.length > 0).length === 0 ? (
            <EmptyState title="No inherited permissions" description="The assigned role(s) do not grant any permissions." />
          ) : (
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-card p-4 shadow-sm">
              {draftEntries.filter((e) => e.sources.length > 0).map((entry) => (
                <span key={entry.code} className="rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info" title={entry.description}>
                  {entry.label}
                </span>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="allowed" className="mt-4">
          <AlertBanner tone="info" title="Additional Allowed Permissions" description="Grant access beyond what this user's roles already provide. Checking a permission here clears any matching direct deny." className="mb-3" />
          <PermissionMatrix
            selected={allowed}
            onChange={(codes) => {
              setAllowed(codes)
              setDenied((prev) => prev.filter((c) => !codes.includes(c)))
            }}
          />
        </TabsContent>

        <TabsContent value="denied" className="mt-4">
          <AlertBanner tone="danger" title="Explicitly Denied Permissions" description="A direct deny always overrides an inherited role permission or a direct allow — the user will have no access to it." className="mb-3" />
          <PermissionMatrix
            selected={denied}
            onChange={(codes) => {
              setDenied(codes)
              setAllowed((prev) => prev.filter((c) => !codes.includes(c)))
            }}
          />
        </TabsContent>

        <TabsContent value="effective" className="mt-4">
          <div className="max-h-[32rem] overflow-auto rounded-xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="bg-card">Permission</TableHead>
                  <TableHead className="bg-card">Module</TableHead>
                  <TableHead className="bg-card">Source</TableHead>
                  <TableHead className="bg-card">Direct Setting</TableHead>
                  <TableHead className="bg-card">Effective Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draftEntries.map((entry) => {
                  const sourceLabel = permissionSourceLabel(entry)
                  return (
                    <TableRow key={entry.code}>
                      <TableCell>
                        <span className="font-medium text-foreground">{entry.label}</span>
                        <span className="block text-xs text-muted-foreground">{entry.code}</span>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{entry.group.replace(/_/g, " ")}</TableCell>
                      <TableCell><StatusBadge label={sourceLabel} tone={SOURCE_TONE[sourceLabel] ?? "neutral"} /></TableCell>
                      <TableCell className="text-muted-foreground">{entry.directSetting ? (entry.directSetting === "allow" ? "Allowed" : "Denied") : "—"}</TableCell>
                      <TableCell>
                        <StatusBadge label={entry.effective ? "Access" : "No Access"} tone={entry.effective ? "success" : "neutral"} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sidebar" className="mt-4">
          <SidebarAccessPreview effectivePermissions={draftEntries.filter((e) => e.effective).map((e) => e.code)} />
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-3 sm:mx-0 sm:rounded-xl sm:border sm:shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">{isDirty ? "You have unsaved permission changes." : "No unsaved changes."}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setCopyDialogOpen(true)}>
            Copy Permissions from Another User
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetToDefaults}>
            <RotateCcw /> Reset to Role Defaults
          </Button>
          <Button variant="outline" onClick={() => (isDirty ? setShowLeaveConfirm(true) : navigate("/admin/users"))}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            Save User Permissions
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        title="Discard unsaved changes?"
        description="Leaving now will discard your permission changes for this user."
        confirmLabel="Discard Changes"
        destructive
        onConfirm={() => {
          setShowLeaveConfirm(false)
          navigate("/admin/users")
        }}
      />

      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Copy Permissions from Another User</DialogTitle>
            <DialogDescription>Only direct allow/deny overrides are copied — role assignments are not affected.</DialogDescription>
          </DialogHeader>
          <Select value={copySourceId} onValueChange={(v) => setCopySourceId(v ?? "")}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select a user" /></SelectTrigger>
            <SelectContent>
              {allUsers.filter((u) => u.id !== id).map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.username})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCopyFrom} disabled={!copySourceId}>
              <ShieldAlert /> Copy Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function sameArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((v) => setB.has(v))
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
