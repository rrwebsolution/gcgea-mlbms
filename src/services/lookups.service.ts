import type { BenefitType, DeductionType, LoanSettings, LoanType, Office, Role, SystemUser } from "@/types"
import { api } from "@/lib/api"

/** Mirrors LookupsController::index() on the backend — bundles the small, rarely-changing
 *  reference lists that used to be fetched independently by 15+ different pages. Consumed
 *  through listAllRoles()/listAllUsers()/etc. below, not directly — see each service's
 *  comment for why. */
export interface LookupsData {
  roles: Role[]
  users: SystemUser[]
  offices: Office[]
  loanTypes: LoanType[]
  benefitTypes: BenefitType[]
  deductionTypes: DeductionType[]
  loanSettings: LoanSettings
}

export async function getLookups(): Promise<LookupsData> {
  const { data } = await api.get<LookupsData>("/lookups")
  return data
}
