import { api } from "@/lib/api"
import type { MembershipApprovalSetting } from "@/types"

export async function getMembershipApprovalSetting(): Promise<MembershipApprovalSetting> {
  const { data } = await api.get<MembershipApprovalSetting>("/settings/membership-approval")
  return data
}

export async function updateMembershipApprovalSetting(input: MembershipApprovalSetting): Promise<MembershipApprovalSetting> {
  const { data } = await api.put<MembershipApprovalSetting>("/settings/membership-approval", input)
  return data
}
