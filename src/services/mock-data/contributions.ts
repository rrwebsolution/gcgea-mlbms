import type { Contribution } from "@/types"
import { MOCK_MEMBERS } from "./members"

const PERIODS = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]
const ENCODERS = ["Danilo T. Quiñones", "Girlie B. Nacua"]

let counter = 1
const contributions: Contribution[] = []

for (const period of PERIODS) {
  MOCK_MEMBERS.filter((m) => m.membershipStatus === "Active").forEach((member, idx) => {
    // Simulate a few members skipping a period (unpaid) to populate "Unpaid Contributions" reports
    const skip = (idx + PERIODS.indexOf(period)) % 11 === 0
    if (skip) return

    const amount = member.retireeStatus === "Retired" ? 100 : 150
    const [year, month] = period.split("-").map(Number)
    const paymentDate = new Date(year, month - 1, 5).toISOString().slice(0, 10)

    contributions.push({
      id: `con-${String(counter).padStart(4, "0")}`,
      referenceNumber: `GCGEA-CON-${year}-${String(counter).padStart(6, "0")}`,
      memberId: member.id,
      memberNumber: member.memberNumber,
      memberName: member.fullName,
      officeName: member.officeName,
      contributionPeriod: period,
      contributionType: "Monthly Dues",
      amount,
      paymentDate,
      paymentMethod: "Payroll Deduction",
      payrollReference: `PR-${period}-${member.employeeNumber}`,
      encodedBy: ENCODERS[counter % ENCODERS.length],
      status: "Posted",
      createdAt: paymentDate,
    })
    counter++
  })
}

// A couple of voided contributions for the void workflow demo
contributions.push({
  id: `con-${String(counter).padStart(4, "0")}`,
  referenceNumber: `GCGEA-CON-2026-${String(counter).padStart(6, "0")}`,
  memberId: MOCK_MEMBERS[2].id,
  memberNumber: MOCK_MEMBERS[2].memberNumber,
  memberName: MOCK_MEMBERS[2].fullName,
  officeName: MOCK_MEMBERS[2].officeName,
  contributionPeriod: "2026-06",
  contributionType: "Monthly Dues",
  amount: 150,
  paymentDate: "2026-06-05",
  paymentMethod: "Cash",
  encodedBy: "Danilo T. Quiñones",
  status: "Voided",
  voidReason: "Wrong member selected during encoding; reposted under correct account.",
  createdAt: "2026-06-05",
})
counter++

export const MOCK_CONTRIBUTIONS: Contribution[] = contributions.sort(
  (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
)
