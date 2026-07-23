import type { BenefitType, EligibilityCheckItem, LoanApplication, LoanType, Member } from "@/types"
import type { EligibilityResult } from "@/components/shared/EligibilityChecklist"
import { calculateDurationMonths } from "@/utils/format"
import { isProfileComplete } from "@/services/members.service"

export interface DuesStanding {
  /** Has a Posted contribution of the given type on record for the current or immediately preceding contribution_period — mirrors the backend's pragmatic "current" definition; there's no arrears ledger. */
  hasCurrentMonthlyDues: boolean
  hasCurrentCashPabaon: boolean
}

export interface PaidMonthlyDuesSummary {
  paidMonths: number
  consecutivePaidMonths: number
  requiredMonths: number
  requiredAmount: number
  requirePaidContributions: boolean
  requireConsecutiveMonths: boolean
}

/**
 * Most members here (payroll/manual imports, legacy migrations) are created
 * directly at membershipStatus "Active" and never routed through the
 * registration draft-submission workflow, so approvalStatus comes back as a
 * literal JSON `null` (not an absent key) for them — that's not the same as
 * "not yet approved". Only a member still mid-review (membershipStatus
 * literally "Pending", or an approvalStatus that exists but isn't
 * "approved") fails this check. Mirrors the backend's
 * LoanEligibilityService::registrationApprovedCheck().
 *
 * Uses `== null` (not `=== undefined`) deliberately — the API sends `null`,
 * not an omitted key, so a strict undefined check would misclassify every
 * such member as unapproved.
 */
export function isRegistrationApproved(member: Member): boolean {
  return member.approvalStatus == null ? (member.membershipStatus as string) !== "Pending" : member.approvalStatus === "approved"
}

export function evaluateLoanEligibility(
  member: Member,
  loanType: LoanType,
  requestedAmount: number | undefined,
  termMonths: number | undefined,
  paidMonthlyDues: PaidMonthlyDuesSummary,
  memberLoans: LoanApplication[],
  minimumMembershipMonths: number,
  duesStanding: DuesStanding
): EligibilityCheckItem[] {
  const membershipMonths = calculateDurationMonths(member.membershipDate)
  const requiredMembershipMonths = Math.max(loanType.requiredMembershipMonths, minimumMembershipMonths)
  const activeLoans = memberLoans.filter((l) => ["Active", "Overdue", "Released"].includes(l.status))
  const overdueLoans = memberLoans.filter((l) => l.status === "Overdue")
  const verifiedPaidMonths = paidMonthlyDues.requireConsecutiveMonths
    ? paidMonthlyDues.consecutivePaidMonths
    : paidMonthlyDues.paidMonths
  const paidDuesPassed = !paidMonthlyDues.requirePaidContributions || verifiedPaidMonths >= paidMonthlyDues.requiredMonths

  const items: EligibilityCheckItem[] = [
    {
      label: "Registration Approved",
      passed: isRegistrationApproved(member),
      detail: isRegistrationApproved(member) ? "Member registration has been approved." : "Member registration is not yet approved.",
    },
    {
      label: "Active Member",
      passed: member.membershipStatus === "Active",
      detail: member.membershipStatus === "Active" ? "Member status is Active." : `Member status is ${member.membershipStatus}, not Active.`,
    },
    {
      label: "Minimum Membership Duration Met",
      passed: membershipMonths >= requiredMembershipMonths,
      detail: `Requires ${requiredMembershipMonths} month(s) of membership (org-wide minimum ${minimumMembershipMonths}); member has ${membershipMonths} month(s).`,
    },
    {
      label: "Fully Paid Monthly Dues",
      passed: paidDuesPassed,
      detail: !paidMonthlyDues.requirePaidContributions
        ? "Paid Monthly Dues eligibility is disabled in Loan Settings."
        : paidMonthlyDues.paidMonths === 0
          ? "This member cannot apply for a loan because no fully paid Monthly Dues contributions are recorded."
          : `${verifiedPaidMonths} fully paid Monthly Dues month(s) verified; requires ${paidMonthlyDues.requiredMonths} at ₱${paidMonthlyDues.requiredAmount.toLocaleString()} per month.`,
    },
    {
      label: "Monthly Dues Current",
      passed: duesStanding.hasCurrentMonthlyDues,
      detail: duesStanding.hasCurrentMonthlyDues ? "Monthly Dues contribution is current." : "No Monthly Dues contribution on record for the current or prior period.",
    },
    {
      label: "Cash Pabaon Current",
      passed: duesStanding.hasCurrentCashPabaon,
      detail: duesStanding.hasCurrentCashPabaon ? "Cash Pabaon contribution is current." : "No Cash Pabaon contribution on record for the current or prior period.",
    },
    {
      label: "No Disqualifying Active Loan",
      passed: loanType.allowExistingActiveLoan || activeLoans.length === 0,
      detail: loanType.allowExistingActiveLoan
        ? "This loan type allows an existing active loan."
        : activeLoans.length === 0
          ? "No conflicting active loan on record."
          : `Member has ${activeLoans.length} active loan(s), and this loan type does not allow concurrent loans.`,
    },
    {
      label: "No Overdue Loan",
      passed: overdueLoans.length === 0,
      detail: overdueLoans.length === 0 ? "No overdue accounts on record." : `Member has ${overdueLoans.length} overdue loan(s).`,
    },
    loanType.incomeBrackets.length > 0
      ? {
          label: "Net Pay On File",
          passed: member.netPay != null,
          detail: member.netPay != null
            ? `Member's monthly net pay (₱${member.netPay.toLocaleString()}) is on file for bracket lookup.`
            : "This loan type requires the member's monthly net take-home pay to determine the loanable amount.",
        }
      : {
          label: "Within Maximum Loan Amount",
          passed: requestedAmount != null && requestedAmount >= loanType.minAmount && requestedAmount <= loanType.maxAmount,
          detail: `Allowed range for ${loanType.name}: ₱${loanType.minAmount.toLocaleString()} – ₱${loanType.maxAmount.toLocaleString()}.`,
        },
    {
      label: "Loan Term Within Policy",
      passed: termMonths != null && termMonths > 0 && termMonths <= loanType.maxTermMonths,
      detail: `Maximum term for ${loanType.name} is ${loanType.maxTermMonths} month(s).`,
    },
    {
      label: "Required Member Profile Fields Complete",
      passed: isProfileComplete(member),
      detail: isProfileComplete(member) ? "Member profile is complete." : "Member profile is missing required information (contact, beneficiaries, or documents).",
    },
  ]

  return items
}

export function evaluateBenefitEligibility(
  member: Member,
  benefitType: BenefitType,
  requestedAmount: number | undefined,
  priorBenefitCount: number,
  hasPendingApplication: boolean
): EligibilityCheckItem[] {
  const membershipMonths = calculateDurationMonths(member.membershipDate)

  return [
    {
      label: "Active Member",
      passed: member.membershipStatus === "Active",
      detail: member.membershipStatus === "Active" ? "Member status is Active." : `Member status is ${member.membershipStatus}, not Active.`,
    },
    {
      label: "Minimum Membership Duration Met",
      passed: membershipMonths >= benefitType.requiredMembershipMonths,
      detail: `Requires ${benefitType.requiredMembershipMonths} month(s) of membership; member has ${membershipMonths} month(s).`,
    },
    {
      label: "Benefit Frequency Limit Not Exceeded",
      passed: priorBenefitCount === 0 || benefitType.frequencyLimit.toLowerCase().includes("year") ? priorBenefitCount < 2 : priorBenefitCount === 0,
      detail: `Frequency limit: ${benefitType.frequencyLimit}. Member has ${priorBenefitCount} prior claim(s) of this type.`,
    },
    {
      label: "No Duplicate Pending Application",
      passed: !hasPendingApplication,
      detail: hasPendingApplication ? "Member already has a pending application for this benefit type." : "No duplicate pending application found.",
    },
    {
      label: "Required Personal Data Complete",
      passed: isProfileComplete(member),
      detail: isProfileComplete(member) ? "Member profile is complete." : "Member profile is missing required information.",
    },
    {
      label: "Within Maximum Benefit Amount",
      passed: requestedAmount != null && requestedAmount > 0 && requestedAmount <= benefitType.maximumAmount,
      detail: `Maximum amount for ${benefitType.name}: ₱${benefitType.maximumAmount.toLocaleString()}.`,
    },
  ]
}

export function resultFor(items: EligibilityCheckItem[]): EligibilityResult {
  const failed = items.filter((i) => !i.passed)
  if (failed.length === 0) return "Eligible"
  const criticalLabels = [
    "Registration Approved",
    "Active Member",
    "Minimum Membership Duration Met",
    "Fully Paid Monthly Dues",
    "Monthly Dues Current",
    "No Overdue Loan",
    "No Duplicate Pending Application",
    "Previous Loan Belongs to Member",
    "Previous Loan Status Eligible",
    "No Duplicate Pending Reloan",
    "Previous Obligation Settled",
  ]
  const hasCritical = failed.some((i) => criticalLabels.includes(i.label))
  return hasCritical ? "Not Eligible" : "Eligible with Warning"
}

/**
 * Client-side preview mirroring the backend's ReloanEligibilityService — the
 * server remains authoritative (this is only used to render a live checklist
 * in the Reloan wizard before submit).
 */
export function evaluateReloanEligibility(
  member: Member,
  previousLoan: LoanApplication,
  loanType: LoanType,
  requestedAmount: number | undefined,
  termMonths: number | undefined,
  minimumMembershipMonths: number,
  duesStanding: DuesStanding,
  policy: {
    reloanEnabled: boolean
    reloanAllowAfterFullyPaid: boolean
    reloanAllowWhileActive: boolean
    reloanMaxConcurrentActiveLoans: number
  },
  memberLoans: LoanApplication[],
  hasPendingReloan: boolean
): EligibilityCheckItem[] {
  const membershipMonths = calculateDurationMonths(member.membershipDate)
  const requiredMembershipMonths = Math.max(loanType.requiredMembershipMonths, minimumMembershipMonths)

  const eligibleStatuses: string[] = []
  if (policy.reloanAllowAfterFullyPaid) eligibleStatuses.push("Fully Paid")
  if (policy.reloanAllowWhileActive) eligibleStatuses.push("Active", "Released")
  const previousLoanStatusEligible = policy.reloanEnabled && eligibleStatuses.includes(previousLoan.status)

  const otherActiveLoans = memberLoans.filter((l) => l.id !== previousLoan.id && ["Active", "Overdue", "Released"].includes(l.status))
  const previousObligation = previousLoan.outstandingBalance

  const items: EligibilityCheckItem[] = [
    {
      label: "Registration Approved",
      passed: isRegistrationApproved(member),
      detail: isRegistrationApproved(member) ? "Member registration has been approved." : "Member registration is not yet approved.",
    },
    {
      label: "Active Member",
      passed: member.membershipStatus === "Active",
      detail: member.membershipStatus === "Active" ? "Member status is Active." : `Member status is ${member.membershipStatus}, not Active.`,
    },
    {
      label: "Minimum Membership Duration Met",
      passed: membershipMonths >= requiredMembershipMonths,
      detail: `Requires ${requiredMembershipMonths} month(s) of membership; member has ${membershipMonths} month(s).`,
    },
    {
      label: "Monthly Dues Current",
      passed: duesStanding.hasCurrentMonthlyDues,
      detail: duesStanding.hasCurrentMonthlyDues ? "Monthly Dues contribution is current." : "No Monthly Dues contribution on record for the current or prior period.",
    },
    {
      label: "Cash Pabaon Current",
      passed: duesStanding.hasCurrentCashPabaon,
      detail: duesStanding.hasCurrentCashPabaon ? "Cash Pabaon contribution is current." : "No Cash Pabaon contribution on record for the current or prior period.",
    },
    {
      label: "Previous Loan Belongs to Member",
      passed: previousLoan.memberId === member.id,
      detail: previousLoan.memberId === member.id ? "Previous loan belongs to the selected member." : "The selected previous loan does not belong to this member.",
    },
    {
      label: "Previous Loan Status Eligible",
      passed: previousLoanStatusEligible,
      detail: previousLoanStatusEligible
        ? `Previous loan status "${previousLoan.status}" is eligible for reloan under the current policy.`
        : `Previous loan status is "${previousLoan.status}"; current policy requires: ${eligibleStatuses.join(", ") || "none — reloan disabled"}.`,
    },
    {
      label: "No Duplicate Pending Reloan",
      passed: !hasPendingReloan,
      detail: hasPendingReloan ? "A reloan application already exists for this loan." : "No pending reloan application exists for this loan.",
    },
    {
      label: "Within Maximum Concurrent Active Loans",
      passed: otherActiveLoans.length < policy.reloanMaxConcurrentActiveLoans,
      detail: `Member has ${otherActiveLoans.length} other active loan(s); policy allows a maximum of ${policy.reloanMaxConcurrentActiveLoans}.`,
    },
    loanType.incomeBrackets.length > 0
      ? {
          label: "Net Pay On File",
          passed: member.netPay != null,
          detail: member.netPay != null
            ? `Member's monthly net pay (₱${member.netPay.toLocaleString()}) is on file for bracket lookup.`
            : "This loan type requires the member's monthly net take-home pay to determine the loanable amount.",
        }
      : {
          label: "Within Maximum Loan Amount",
          passed: requestedAmount != null && requestedAmount >= loanType.minAmount && requestedAmount <= loanType.maxAmount,
          detail: `Allowed range for ${loanType.name}: ₱${loanType.minAmount.toLocaleString()} – ₱${loanType.maxAmount.toLocaleString()}.`,
        },
    {
      label: "Loan Term Within Policy",
      passed: termMonths != null && termMonths > 0 && termMonths <= loanType.maxTermMonths,
      detail: `Maximum term for ${loanType.name} is ${loanType.maxTermMonths} month(s).`,
    },
    {
      label: "Required Member Profile Fields Complete",
      passed: isProfileComplete(member),
      detail: isProfileComplete(member) ? "Member profile is complete." : "Member profile is missing required information (contact, beneficiaries, or documents).",
    },
  ]

  if (previousObligation > 0) {
    items.push({
      label: "Previous Obligation Settled",
      passed: false,
      detail: `Previous loan has an outstanding balance of ₱${previousObligation.toLocaleString()} that must be settled before this reloan can be released.`,
    })
  }

  return items
}
