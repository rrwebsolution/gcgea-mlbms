import type { BenefitApplication, BenefitStatus } from "@/types"
import { MOCK_MEMBERS } from "./members"
import { MOCK_BENEFIT_TYPES } from "./benefit-types"

interface BenefitSeed {
  memberIndex: number
  benefitTypeId: string
  applicationDate: string
  requestedAmount: number
  approvedAmount?: number
  status: BenefitStatus
  reason: string
  incidentDate?: string
}

const SEEDS: BenefitSeed[] = [
  { memberIndex: 2, benefitTypeId: "bt-07", applicationDate: "2027-06-01", requestedAmount: 30000, approvedAmount: 30000, status: "Approved", reason: "Retirement benefit claim upon compulsory retirement.", incidentDate: "2027-07-01" },
  { memberIndex: 8, benefitTypeId: "bt-08", applicationDate: "2024-11-15", requestedAmount: 10000, approvedAmount: 10000, status: "Released", reason: "Cash pabaon for retiring member.", incidentDate: "2024-12-01" },
  { memberIndex: 12, benefitTypeId: "bt-01", applicationDate: "2026-06-10", requestedAmount: 5000, status: "Under Review", reason: "Hospitalization for hypertension complications.", incidentDate: "2026-06-01" },
  { memberIndex: 16, benefitTypeId: "bt-07", applicationDate: "2026-01-10", requestedAmount: 30000, approvedAmount: 30000, status: "Released", reason: "Retirement benefit claim.", incidentDate: "2026-01-20" },
  { memberIndex: 22, benefitTypeId: "bt-08", applicationDate: "2024-09-01", requestedAmount: 10000, approvedAmount: 10000, status: "Completed", reason: "Cash pabaon for retiring member.", incidentDate: "2024-10-01" },
  { memberIndex: 4, benefitTypeId: "bt-02", applicationDate: "2026-07-08", requestedAmount: 8000, status: "For Approval", reason: "Hospital confinement for pneumonia.", incidentDate: "2026-06-28" },
  { memberIndex: 6, benefitTypeId: "bt-05", applicationDate: "2026-05-20", requestedAmount: 3000, approvedAmount: 3000, status: "Approved", reason: "Emergency assistance for house fire.", incidentDate: "2026-05-18" },
  { memberIndex: 9, benefitTypeId: "bt-06", applicationDate: "2026-04-02", requestedAmount: 5000, status: "Rejected", reason: "Calamity assistance for typhoon damage.", incidentDate: "2026-03-29" },
  { memberIndex: 13, benefitTypeId: "bt-01", applicationDate: "2026-07-15", requestedAmount: 4500, status: "Submitted", reason: "Outpatient treatment for dengue.", incidentDate: "2026-07-10" },
  { memberIndex: 17, benefitTypeId: "bt-10", applicationDate: "2026-03-15", requestedAmount: 2000, status: "Draft", reason: "Financial assistance for relocation expenses." },
  { memberIndex: 19, benefitTypeId: "bt-05", applicationDate: "2026-02-18", requestedAmount: 3000, approvedAmount: 3000, status: "Released", reason: "Emergency assistance for family bereavement.", incidentDate: "2026-02-12" },
  { memberIndex: 23, benefitTypeId: "bt-01", applicationDate: "2026-06-29", requestedAmount: 5000, status: "Cancelled", reason: "Applicant withdrew after receiving assistance elsewhere." },
]

export const MOCK_BENEFITS: BenefitApplication[] = SEEDS.map((seed, idx) => {
  const member = MOCK_MEMBERS[seed.memberIndex]
  const benefitType = MOCK_BENEFIT_TYPES.find((b) => b.id === seed.benefitTypeId)!
  const year = new Date(seed.applicationDate).getFullYear()
  const applicationNumber = `GCGEA-BEN-${year}-${String(idx + 1).padStart(6, "0")}`

  return {
    id: `ben-${String(idx + 1).padStart(2, "0")}`,
    applicationNumber,
    applicationDate: seed.applicationDate,
    memberId: member.id,
    memberNumber: member.memberNumber,
    memberName: member.fullName,
    officeName: member.officeName,
    benefitTypeId: benefitType.id,
    benefitTypeName: benefitType.name,
    requestedAmount: seed.requestedAmount,
    approvedAmount: seed.approvedAmount,
    reason: seed.reason,
    incidentDate: seed.incidentDate,
    beneficiaryOrRecipient: member.fullName,
    requirements: benefitType.requiredDocuments.map((label) => ({ label, completed: seed.status !== "Draft" })),
    status: seed.status,
    releaseDate: ["Released", "Completed"].includes(seed.status) ? seed.applicationDate : undefined,
    rejectionReason: seed.status === "Rejected" ? "Incident does not meet the calamity assistance eligibility criteria." : undefined,
    cancellationReason: seed.status === "Cancelled" ? "Applicant withdrew the application." : undefined,
    createdAt: seed.applicationDate,
    updatedAt: "2026-07-12",
    createdBy: "Girlie B. Nacua",
  } satisfies BenefitApplication
})
