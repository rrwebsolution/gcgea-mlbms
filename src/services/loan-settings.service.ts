import type { LoanSettings } from "@/types"
import { api } from "@/lib/api"

// The one Settings section backed by the real API instead of localStorage —
// see src/services/settings.service.ts for the other 9 sections.

// Best-effort synchronous cache — the member-eligibility selector and
// eligibility.ts need the effective minimum-months figure synchronously in
// several places, mirroring the getLoanTypesSync()/getAllLoans() pattern.
let cachedLoanSettings: LoanSettings | null = null

export async function getLoanSettings(): Promise<LoanSettings> {
  const { data } = await api.get<LoanSettings>("/loan-settings")
  cachedLoanSettings = data
  return data
}

export function getLoanSettingsSync(): LoanSettings | null {
  return cachedLoanSettings
}

export type UpdateLoanSettingsInput = Pick<
  LoanSettings,
  | "minimumMembershipMonths"
  | "requirePaidContributions"
  | "minimumPaidContributionMonths"
  | "requiredMonthlyDuesAmount"
  | "requireConsecutiveContributionMonths"
  | "applyContributionRuleToReloan"
  | "defaultPenaltyRate"
  | "reloanPolicy"
>

export async function updateLoanSettings(input: UpdateLoanSettingsInput): Promise<LoanSettings> {
  const { reloanPolicy, ...settings } = input
  const { data } = await api.put<LoanSettings>("/loan-settings", { ...settings, ...reloanPolicy })
  cachedLoanSettings = data
  return data
}
