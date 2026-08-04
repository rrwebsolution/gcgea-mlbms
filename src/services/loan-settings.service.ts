import type { LoanSettings } from "@/types"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/query-client"
import { getLookups } from "@/services/lookups.service"

// The one Settings section backed by the real API instead of localStorage —
// see src/services/settings.service.ts for the other 9 sections.

// Best-effort synchronous cache — the member-eligibility selector and
// eligibility.ts need the effective minimum-months figure synchronously in
// several places, mirroring the getLoanTypesSync()/getAllLoans() pattern.
let cachedLoanSettings: LoanSettings | null = null

export async function getLoanSettings(): Promise<LoanSettings> {
  const data = (await queryClient.fetchQuery({ queryKey: ["lookups"], queryFn: getLookups, staleTime: Infinity })).loanSettings
  cachedLoanSettings = data
  return data
}

export function getLoanSettingsSync(): LoanSettings | null {
  return cachedLoanSettings
}

export type UpdateLoanSettingsInput = LoanSettings

export async function updateLoanSettings(input: UpdateLoanSettingsInput): Promise<LoanSettings> {
  const { reloanPolicy, ...settings } = input
  const roundingAliases: Record<string, string> = {
    "Round to nearest centavo": "Nearest Centavo",
    "Round to nearest peso": "Nearest Peso",
    "Round up": "Round Up",
    "Round down": "Round Down",
  }
  const roundingRule = roundingAliases[settings.roundingRule] ?? settings.roundingRule
  const { data } = await api.put<LoanSettings>("/loan-settings", { ...settings, roundingRule, ...reloanPolicy })
  cachedLoanSettings = data
  return data
}
