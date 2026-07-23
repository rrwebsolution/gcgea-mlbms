import type { WorkflowDefinition, WorkflowStage } from "@/types"
import { api } from "@/lib/api"

export async function listWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
  const { data } = await api.get<WorkflowDefinition[]>("/admin/workflow-definitions")
  return data
}

export async function getWorkflowDefinition(id: string): Promise<WorkflowDefinition> {
  const { data } = await api.get<WorkflowDefinition>(`/admin/workflow-definitions/${id}`)
  return data
}

export async function toggleWorkflowDefinition(id: string, isEnabled: boolean): Promise<WorkflowDefinition> {
  const { data } = await api.put<WorkflowDefinition>(`/admin/workflow-definitions/${id}`, { isEnabled })
  return data
}

export async function updateWorkflowStages(id: string, stages: WorkflowStage[]): Promise<WorkflowDefinition> {
  const { data } = await api.put<WorkflowDefinition>(`/admin/workflow-definitions/${id}/stages`, { stages })
  return data
}
