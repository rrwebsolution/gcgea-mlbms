import { listAllActiveMembers } from "@/services/members.service"
import { listAllContributions } from "@/services/contributions.service"
import { listAllDeductions } from "@/services/deductions.service"
import { listAllLoans } from "@/services/loans.service"
import { listAllLoanPayments } from "@/services/loan-payments.service"
import { listAllBenefits } from "@/services/benefits.service"
import { listAllRoles } from "@/services/roles.service"
import { listAllUsers } from "@/services/users.service"

/**
 * Several pages read list data synchronously (e.g. duplicate-detection,
 * report pages, member picklists) via a module-level cache on the relevant
 * service instead of a query — see the `getAllX()` functions in each
 * `*.service.ts`. Call this once we know a session is active (session
 * restore or fresh login) so those caches aren't empty on first render.
 * Fire-and-forget — never awaited by callers.
 */
export function warmSyncCaches(): void {
  void listAllActiveMembers()
  void listAllContributions()
  void listAllDeductions()
  void listAllLoans()
  void listAllLoanPayments()
  void listAllBenefits()
  void listAllRoles()
  void listAllUsers()
}
