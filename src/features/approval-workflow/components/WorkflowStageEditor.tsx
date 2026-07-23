import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import type { ApproverType, Office, Role, StageType, SystemUser, WorkflowStage } from "@/types"

interface WorkflowStageEditorProps {
  stage: WorkflowStage
  roles: Role[]
  users: SystemUser[]
  offices: Office[]
  onChange: (stage: WorkflowStage) => void
  onRemove?: () => void
}

const STAGE_TYPES: { value: StageType; label: string }[] = [
  { value: "review", label: "Review" },
  { value: "approve", label: "Approve" },
  { value: "release", label: "Release" },
]

const APPROVER_TYPES: { value: ApproverType; label: string }[] = [
  { value: "role", label: "Role" },
  { value: "user", label: "Specific User" },
  { value: "office", label: "Office" },
]

export function WorkflowStageEditor({ stage, roles, users, offices, onChange, onRemove }: WorkflowStageEditorProps) {
  function update(patch: Partial<WorkflowStage>) {
    onChange({ ...stage, ...patch })
  }

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 sm:grid-cols-12 sm:items-end">
      <div className="grid gap-1.5 sm:col-span-3">
        <Label className="text-xs">Stage Label</Label>
        <Input value={stage.label} onChange={(e) => update({ label: e.target.value })} className="h-8 text-sm" />
      </div>

      <div className="grid gap-1.5 sm:col-span-2">
        <Label className="text-xs">Stage Type</Label>
        <CommandSelect
          className="h-8 w-full text-sm"
          value={stage.stageType}
          onValueChange={(v) => update({ stageType: v as StageType })}
          options={STAGE_TYPES}
          hideSearch
        />
      </div>

      <div className="grid gap-1.5 sm:col-span-2">
        <Label className="text-xs">Assign By</Label>
        <CommandSelect
          className="h-8 w-full text-sm"
          value={stage.approverType}
          onValueChange={(v) =>
            update({
              approverType: v as ApproverType,
              approverRoleId: undefined,
              approverUserId: undefined,
              approverOfficeId: undefined,
            })
          }
          options={APPROVER_TYPES}
          hideSearch
        />
      </div>

      <div className="grid gap-1.5 sm:col-span-4">
        <Label className="text-xs">Approver</Label>
        {stage.approverType === "role" && (
          <CommandSelect
            className="h-8 w-full text-sm"
            value={stage.approverRoleId ?? ""}
            onValueChange={(v) => update({ approverRoleId: v ?? undefined })}
            placeholder="Select a role"
            searchPlaceholder="Search roles…"
            options={roles.filter((r) => r.status === "Active").map((r) => ({ value: r.id, label: r.name }))}
          />
        )}
        {stage.approverType === "user" && (
          <CommandSelect
            className="h-8 w-full text-sm"
            value={stage.approverUserId ?? ""}
            onValueChange={(v) => update({ approverUserId: v ?? undefined })}
            placeholder="Select a user"
            searchPlaceholder="Search users…"
            options={users.filter((u) => u.status === "Active").map((u) => ({ value: u.id, label: u.fullName }))}
          />
        )}
        {stage.approverType === "office" && (
          <CommandSelect
            className="h-8 w-full text-sm"
            value={stage.approverOfficeId ?? ""}
            onValueChange={(v) => update({ approverOfficeId: v ?? undefined })}
            placeholder="Select an office"
            searchPlaceholder="Search offices…"
            options={offices.filter((o) => o.status === "Active").map((o) => ({ value: o.id, label: o.name }))}
          />
        )}
      </div>

      <div className="sm:col-span-1 text-right">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Step {stage.sequence}</p>
        {onRemove && (
          <Button type="button" variant="ghost" size="icon-sm" className="mt-1 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={`Remove ${stage.label}`}>
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="sm:col-span-12">
        <p className="text-xs text-muted-foreground">
          Requires permission <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{stage.requiredPermissionCode}</code>
          {stage.isFinal && " · Final stage"}
        </p>
      </div>
    </div>
  )
}
