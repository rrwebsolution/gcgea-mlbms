import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getMembershipApprovalSetting, updateMembershipApprovalSetting } from "@/services/membership-approval-settings.service"
import { listAllRoles } from "@/services/roles.service"
import { listAllUsers } from "@/services/users.service"
import { listWorkflowDefinitions } from "@/services/approval-workflow.service"
import type { MemberApproverAssignmentType, MembershipApprovalSetting } from "@/types"
import { computeEffectivePermissionCodes } from "@/utils/effective-permissions"

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-4">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

export function MembershipApprovalSettingsCard() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["settings", "membership-approval"], queryFn: getMembershipApprovalSetting })
  const { data: roles = [] } = useQuery({ queryKey: ["roles", "all"], queryFn: listAllRoles })
  const { data: users = [] } = useQuery({ queryKey: ["users", "all"], queryFn: listAllUsers })
  const { data: workflows = [] } = useQuery({ queryKey: ["admin", "workflow-definitions"], queryFn: listWorkflowDefinitions })
  const [form, setForm] = React.useState<MembershipApprovalSetting | null>(null)

  React.useEffect(() => { if (data) setForm(data) }, [data])

  const mutation = useMutation({
    mutationFn: (input: MembershipApprovalSetting) => updateMembershipApprovalSetting(input),
    onSuccess: (saved) => {
      setForm(saved)
      queryClient.setQueryData(["settings", "membership-approval"], saved)
      toast.success("Membership approval settings saved.")
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save membership approval settings."),
  })

  if (isLoading || !form) return <p className="text-sm text-muted-foreground">Loading membership approval settings…</p>
  const requiresApproval = form.manualRegistrationRequiresApproval || form.importedMembersRequireApproval
  const activeUsers = users.filter((user) => user.status === "Active" && computeEffectivePermissionCodes(user, roles).includes("members.approve"))
  const enabledWorkflows = workflows.filter((workflow) => workflow.isEnabled && workflow.moduleKey === "member_registration")

  function patch(value: Partial<MembershipApprovalSetting>) {
    setForm((current) => current ? { ...current, ...value } : current)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="mb-5 flex items-start gap-3 border-b border-border/40 pb-4">
          <ShieldCheck className="mt-0.5 size-5 text-primary" />
          <div>
            <h2 className="font-heading font-bold">Member Registration Approval Workflow</h2>
            <p className="text-xs text-muted-foreground">Choose separate approval behavior for manual registration and Excel/CSV imports.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ToggleRow
            label="Manual Registration Requires Approval"
            description="When off, authorized registrations are approved and activated immediately."
            checked={form.manualRegistrationRequiresApproval}
            onChange={(checked) => patch({ manualRegistrationRequiresApproval: checked })}
          />
          <ToggleRow
            label="Imported Members Require Approval"
            description="When off, valid imported members are approved and activated on commit."
            checked={form.importedMembersRequireApproval}
            onChange={(checked) => patch({ importedMembersRequireApproval: checked })}
          />
          <ToggleRow
            label="Prevent Self-Approval"
            description="The encoder/importer cannot approve their own submitted registration."
            checked={form.preventSelfApproval}
            onChange={(checked) => patch({ preventSelfApproval: checked })}
          />
          <ToggleRow
            label="Require Auto-Approve Permission"
            description="Only users with members.auto_approve may bypass approval."
            checked={form.autoApproveRequiresPermission}
            onChange={(checked) => patch({ autoApproveRequiresPermission: checked })}
          />
        </div>

        {requiresApproval && (
          <div className="mt-5 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="space-y-1.5">
              <Label>Approver Assignment Type</Label>
              <CommandSelect
                value={form.approverAssignmentType}
                onValueChange={(value) => patch({
                  approverAssignmentType: value as MemberApproverAssignmentType,
                  defaultApproverUserId: null,
                  defaultApproverRoleId: null,
                  approvalWorkflowId: null,
                })}
                options={[
                  { value: "user", label: "Specific User" },
                  { value: "role", label: "Role" },
                  { value: "workflow", label: "Approval Workflow" },
                ]}
                hideSearch
              />
            </div>

            {form.approverAssignmentType === "user" && (
              <div className="space-y-1.5">
                <Label>Default Member Registration Approver</Label>
                <CommandSelect
                  value={form.defaultApproverUserId ?? ""}
                  onValueChange={(value) => patch({ defaultApproverUserId: value })}
                  placeholder="Select an active approving user"
                  searchPlaceholder="Search users…"
                  options={activeUsers.map((user) => ({ value: user.id, label: `${user.fullName} · ${user.username} · ${user.roleName}` }))}
                />
              </div>
            )}
            {form.approverAssignmentType === "role" && (
              <div className="space-y-1.5">
                <Label>Approving Role</Label>
                <CommandSelect
                  value={form.defaultApproverRoleId ?? ""}
                  onValueChange={(value) => patch({ defaultApproverRoleId: value })}
                  placeholder="Select a role"
                  options={roles.filter((role) => role.status === "Active").map((role) => ({ value: role.id, label: role.name }))}
                />
              </div>
            )}
            {form.approverAssignmentType === "workflow" && (
              <div className="space-y-1.5">
                <Label>Approval Workflow</Label>
                <CommandSelect
                  value={form.approvalWorkflowId ?? ""}
                  onValueChange={(value) => patch({ approvalWorkflowId: value })}
                  placeholder="Select an enabled workflow"
                  options={enabledWorkflows.map((workflow) => ({ value: workflow.id, label: workflow.label }))}
                  hideSearch
                />
              </div>
            )}
          </div>
        )}

        {!requiresApproval && (
          <AlertBanner className="mt-5" tone="info" title="Automatic approval enabled" description="Valid registrations and imports are immediately Approved + Active when the encoder has members.auto_approve permission; otherwise they fall back to the configured workflow." />
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save Membership Approval Settings
        </Button>
      </div>
    </div>
  )
}
