import type { BenefitType, EligibilityCheckItem, LoanApplication, LoanType, Member } from "@/types"
import type { EligibilityResult } from "@/components/shared/EligibilityChecklist"
import { calculateDurationMonths } from "@/utils/format"
import { isProfileComplete } from "@/services/members.service"

export function evaluateLoanEligibility(
  member: Member,
  loanType: LoanType,
  requestedAmount: number | undefined,
  termMonths: number | undefined,
  contributionMonths: number,
  memberLoans: LoanApplication[]
): EligibilityCheckItem[] {
  const membershipMonths = calculateDurationMonths(member.membershipDate)
  const activeLoans = memberLoans.filter((l) => ["Active", "Overdue", "Released"].includes(l.status))
  const overdueLoans = memberLoans.filter((l) => l.status === "Overdue")

  const items: EligibilityCheckItem[] = [
    {
      label: "Active Member",
      passed: member.membershipStatus === "Active",
      detail: member.membershipStatus === "Active" ? "Member status is Active." : `Member status is ${member.membershipStatus}, not Active.`,
    },
    {
      label: "Minimum Membership Duration Met",
      passed: membershipMonths >= loanType.requiredMembershipMonths,
      detail: `Requires ${loanType.requiredMembershipMonths} month(s) of membership; member has ${membershipMonths} month(s).`,
    },
    {
      label: "Required Contributions Complete",
      passed: contributionMonths >= loanType.requiredContributionMonths,
      detail: `Requires ${loanType.requiredContributionMonths} month(s) of contributions on record; member has ${contributionMonths} month(s).`,
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
    {
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
  const criticalLabels = ["Active Member", "No Overdue Loan", "No Duplicate Pending Application"]
  const hasCritical = failed.some((i) => criticalLabels.includes(i.label))
  return hasCritical ? "Not Eligible" : "Eligible with Warning"
}
