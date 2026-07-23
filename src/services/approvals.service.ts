import type {
  ActOnApprovalInput,
  ApprovalHistoryEntry,
  ApprovalSubjectType,
  MyApprovalItem,
  MyApprovalTab,
  PaginatedResponse,
  PaginationParams,
} from "@/types"
import { api, getPaginated } from "@/lib/api"

export interface MyApprovalListParams extends PaginationParams {
  tab?: MyApprovalTab
  subjectType?: ApprovalSubjectType
}

export async function listMyApprovals(params: MyApprovalListParams = {}): Promise<PaginatedResponse<MyApprovalItem>> {
  return getPaginated<MyApprovalItem>("/my-approvals", params)
}

export async function actOnApproval(subjectType: ApprovalSubjectType, id: string, input: ActOnApprovalInput): Promise<void> {
  await api.post(`/approvals/${subjectType}/${id}/act`, input)
}

export async function getApprovalHistory(subjectType: ApprovalSubjectType, id: string): Promise<ApprovalHistoryEntry[]> {
  const { data } = await api.get<ApprovalHistoryEntry[]>(`/approvals/${subjectType}/${id}/history`)
  return data
}
