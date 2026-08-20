import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Save, Send, Workflow } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { CardLoader } from "@/components/shared/loaders/CardLoader"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { WorkflowStageEditor } from "@/features/approval-workflow/components/WorkflowStageEditor"
import {
  listWorkflowDefinitions,
  toggleWorkflowDefinition,
  updateWorkflowStages,
} from "@/services/approval-workflow.service"
import { listAllRoles } from "@/services/roles.service"
import { listAllUsers } from "@/services/users.service"
import { listAllOffices } from "@/services/offices.service"
import type { WorkflowDefinition, WorkflowStage } from "@/types"
import { useAuth } from "@/contexts/AuthContext"

function permissionForStage(definition: WorkflowDefinition, stageType: WorkflowStage["stageType"]) {
  if (definition.moduleKey === "annual_budget") return "annual_budgets.approve"
  if (definition.moduleKey === "disbursement") return "disbursements.approve"
  const module = {
    member_registration: "members",
    loan_application: "loans",
    benefit_application: "benefits",
    annual_budget: "annual_budgets",
    disbursement: "disbursements",
  }[definition.moduleKey]
  return `${module}.${stageType}` as WorkflowStage["requiredPermissionCode"]
}

function DefinitionCard({ definition }: { definition: WorkflowDefinition }) {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const canConfigure = hasPermission("approval_workflow.configure")
  const [stages, setStages] = React.useState<WorkflowStage[]>(definition.stages)

  const { data: roles = [] } = useQuery({ queryKey: ["roles", "all"], queryFn: listAllRoles })
  const { data: users = [] } = useQuery({ queryKey: ["users", "all"], queryFn: listAllUsers })
  const { data: offices = [] } = useQuery({ queryKey: ["offices", "all"], queryFn: listAllOffices })

  React.useEffect(() => {
    setStages(definition.stages)
  }, [definition.stages])

  const isDirty = JSON.stringify(stages) !== JSON.stringify(definition.stages)

  function applySavedDefinition(saved: WorkflowDefinition) {
    queryClient.setQueryData<WorkflowDefinition[]>(
      ["admin", "workflow-definitions"],
      (current = []) => current.map((item) => item.id === saved.id ? saved : item)
    )
  }

  const toggleMutation = useMutation({
    mutationFn: (isEnabled: boolean) => toggleWorkflowDefinition(definition.id, isEnabled),
    onSuccess: (saved) => {
      applySavedDefinition(saved)
      toast.success(`${saved.label} workflow ${saved.isEnabled ? "enabled" : "disabled"}.`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Unable to update this workflow."),
  })

  const saveStagesMutation = useMutation({
    mutationFn: () => updateWorkflowStages(definition.id, stages),
    onSuccess: (saved) => {
      applySavedDefinition(saved)
      setStages(saved.stages)
      toast.success("Approver assignments saved.")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Unable to save these assignments."),
  })

  function updateStage(index: number, next: WorkflowStage) {
    setStages((prev) => prev.map((s, i) => (
      i === index
        ? { ...next, requiredPermissionCode: permissionForStage(definition, next.stageType) }
        : s
    )))
  }

  function addStage() {
    setStages((prev) => {
      const sequence = prev.length + 1
      const stageType: WorkflowStage["stageType"] = "approve"
      const role = roles[0]
      return [
        ...prev.map((stage) => ({ ...stage, isFinal: false })),
        {
          id: `new-${definition.id}-${Date.now()}`,
          sequence,
          code: `approve_${sequence}`,
          label: `Approval Stage ${sequence}`,
          stageType,
          approverType: "role",
          approverRoleId: role?.id,
          approverRoleName: role?.name,
          requiredPermissionCode: permissionForStage(definition, stageType),
          isFinal: true,
        },
      ]
    })
  }

  function removeStage(index: number) {
    setStages((prev) =>
      prev
        .filter((_, stageIndex) => stageIndex !== index)
        .map((stage, stageIndex, remaining) => ({
          ...stage,
          sequence: stageIndex + 1,
          isFinal: stageIndex === remaining.length - 1,
        }))
    )
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/90 shadow-xs backdrop-blur-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">{definition.label}</h3>
          <p className="text-xs text-muted-foreground">{definition.stages.length} approval stage{definition.stages.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`toggle-${definition.id}`} className="text-xs text-muted-foreground">
            {definition.isEnabled ? "Enabled" : "Disabled"}
          </Label>
          <Switch
            id={`toggle-${definition.id}`}
            checked={definition.isEnabled}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
            disabled={!canConfigure || toggleMutation.isPending}
          />
        </div>
      </div>

      <div className="space-y-3 p-4">
        {!definition.isEnabled && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
            This workflow is disabled — new submissions are auto-approved immediately, bypassing every stage below.
          </p>
        )}
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/60 bg-muted/5 p-3">
          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
            <Send className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{definition.submissionStage.label}</p>
            <p className="text-xs text-muted-foreground">{definition.submissionStage.description}</p>
          </div>
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Start</p>
        </div>
        {stages.map((stage, index) => (
          <fieldset key={stage.id} disabled={!canConfigure}>
            <WorkflowStageEditor
              stage={stage}
              roles={roles}
              users={users}
              offices={offices}
              onChange={(next) => updateStage(index, next)}
              onRemove={canConfigure && stages.length > 1 ? () => removeStage(index) : undefined}
            />
          </fieldset>
        ))}
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addStage} disabled={!canConfigure || roles.length === 0}>
          <Plus className="size-3.5" /> Add Stage
        </Button>
      </div>

      <div className="flex justify-end border-t border-border p-4">
        <Button size="sm" className="gap-1.5" disabled={!canConfigure || !isDirty || saveStagesMutation.isPending} onClick={() => saveStagesMutation.mutate()}>
          <Save className="size-3.5" />
          Save Workflow Setup
        </Button>
      </div>
    </div>
  )
}

export default function ApprovalWorkflowConfigPage() {
  const { data: definitions, isLoading } = useQuery({
    queryKey: ["admin", "workflow-definitions"],
    queryFn: listWorkflowDefinitions,
  })

  return (
    <PermissionGuard
      permission="approval_workflow.view"
      fallback={<EmptyState icon={Workflow} title="Not authorized" description="You don't have permission to view this page." />}
    >
      <div className="space-y-5 pb-12">
        <PageHeader
          title="Approval Workflow"
          description="Configure who reviews, approves, and releases each module — reassign approvers here without touching code."
        />

        {isLoading ? (
          <div className="space-y-4" role="status" aria-label="Loading workflow configuration">
            <CardLoader rows={4} />
            <CardLoader rows={4} />
          </div>
        ) : !definitions || definitions.length === 0 ? (
          <EmptyState icon={Workflow} title="No workflows configured" description="No approval workflows have been set up yet." />
        ) : (
          <div className="space-y-4">
            {definitions.map((definition) => (
              <DefinitionCard key={definition.id} definition={definition} />
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
