import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Eraser, Loader2, RotateCcw, Save, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { PermissionMatrix } from "@/features/roles/components/PermissionMatrix"
import { Button } from "@/components/ui/button"
import { getRole, updateRolePermissions } from "@/services/roles.service"
import { listAllUsers } from "@/services/users.service"
import { ALL_PERMISSION_CODES, APPROVER_PERMISSION_CODES, ENCODER_PERMISSION_CODES, VIEW_ONLY_PERMISSION_CODES } from "@/constants/permissions"
import type { PermissionCode } from "@/types"

function sameSet(a: PermissionCode[], b: PermissionCode[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((code) => setB.has(code))
}

export default function RolePermissionsPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: role, isLoading } = useQuery({ queryKey: ["roles", id], queryFn: () => getRole(id) })
  const { data: allUsers = [] } = useQuery({ queryKey: ["users", "all"], queryFn: listAllUsers })

  const [draft, setDraft] = React.useState<PermissionCode[]>([])
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false)
  const [showRemovalConfirm, setShowRemovalConfirm] = React.useState(false)

  React.useEffect(() => {
    if (role) setDraft(role.permissions)
  }, [role])

  const isSuperAdmin = role?.name === "Super Administrator"
  const isDirty = role ? !sameSet(draft, role.permissions) : false
  const affectedUserCount = role ? allUsers.filter((u) => u.roleId === role.id || u.additionalRoleIds.includes(role.id)).length : 0
  const removedCount = role ? role.permissions.filter((c) => !draft.includes(c)).length : 0

  React.useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  const saveMutation = useMutation({
    mutationFn: (codes: PermissionCode[]) => updateRolePermissions(id, codes),
    onSuccess: () => {
      toast.success("Role permissions updated.")
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      setShowRemovalConfirm(false)
      navigate(`/admin/roles/${id}`)
    },
  })

  function handleSaveClick() {
    if (removedCount > 0 && affectedUserCount > 0) {
      setShowRemovalConfirm(true)
    } else {
      saveMutation.mutate(draft)
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading role permissions…</p>
  if (!role) return <EmptyState icon={ShieldCheck} title="Role not found" description="This role may have been deleted." />

  return (
    <div className="space-y-5 pb-16">
      <PageHeader title={`Manage Permissions — ${role.name}`} description="Check or uncheck permissions granted to this role." />

      {isSuperAdmin && (
        <AlertBanner tone="warning" title="Super Administrator is locked to full access" description="This role must always retain every permission in the system." />
      )}
      {!isSuperAdmin && affectedUserCount > 0 && (
        <AlertBanner
          tone="info"
          title={`${affectedUserCount} user${affectedUserCount !== 1 ? "s" : ""} currently hold this role`}
          description="Removing permissions here immediately reduces what those users can access unless they hold another role or a direct allow for the same permission."
        />
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <Button variant="outline" size="sm" disabled={isSuperAdmin} onClick={() => setDraft(VIEW_ONLY_PERMISSION_CODES)}>View Only Preset</Button>
        <Button variant="outline" size="sm" disabled={isSuperAdmin} onClick={() => setDraft(ENCODER_PERMISSION_CODES)}>Encoder Preset</Button>
        <Button variant="outline" size="sm" disabled={isSuperAdmin} onClick={() => setDraft(APPROVER_PERMISSION_CODES)}>Approver Preset</Button>
        <Button variant="outline" size="sm" disabled={isSuperAdmin} onClick={() => setDraft(ALL_PERMISSION_CODES)}>Full Access Preset</Button>
        <Button variant="outline" size="sm" disabled={isSuperAdmin} onClick={() => setDraft([])}>
          <Eraser /> Clear All
        </Button>
        <Button variant="outline" size="sm" disabled={isSuperAdmin || !isDirty} onClick={() => setDraft(role.permissions)}>
          <RotateCcw /> Reset Changes
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <PermissionMatrix
          selected={isSuperAdmin ? ALL_PERMISSION_CODES : draft}
          onChange={setDraft}
          lockedCodes={isSuperAdmin ? ALL_PERMISSION_CODES : []}
        />
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-3 sm:mx-0 sm:rounded-xl sm:border sm:shadow-sm">
        {isDirty ? (
          <p className="text-xs font-medium text-warning">You have unsaved permission changes.</p>
        ) : (
          <p className="text-xs text-muted-foreground">No unsaved changes.</p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => (isDirty ? setShowLeaveConfirm(true) : navigate(`/admin/roles/${id}`))}>
            Cancel
          </Button>
          <Button onClick={handleSaveClick} disabled={!isDirty || saveMutation.isPending || isSuperAdmin}>
            {saveMutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
            Save Permissions
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        title="Discard unsaved permission changes?"
        description="Leaving now will discard your changes to this role's permissions."
        confirmLabel="Discard Changes"
        destructive
        onConfirm={() => {
          setShowLeaveConfirm(false)
          navigate(`/admin/roles/${id}`)
        }}
      />

      <ConfirmDialog
        open={showRemovalConfirm}
        onOpenChange={setShowRemovalConfirm}
        title="Confirm permission removal"
        description={`You are removing ${removedCount} permission(s) from a role currently assigned to ${affectedUserCount} user(s). Their access will change immediately after saving.`}
        confirmLabel="Save Permissions"
        destructive
        isLoading={saveMutation.isPending}
        onConfirm={() => saveMutation.mutate(draft)}
      />
    </div>
  )
}
