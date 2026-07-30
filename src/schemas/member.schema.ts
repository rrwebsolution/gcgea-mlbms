import { z } from "zod"

const phRegex = /^09\d{9}$/

export const beneficiarySchema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(1, "Beneficiary name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  birthdate: z.string().min(1, "Birthdate is required"),
  contactNumber: z.string().optional().refine((v) => !v || phRegex.test(v.replace(/\s/g, "")), "Enter a valid Philippine mobile number"),
  address: z.string().trim().min(1, "Beneficiary address is required"),
  sharePercentage: z.number().min(0).max(100).optional(),
})
export type BeneficiaryFormValues = z.infer<typeof beneficiarySchema>

export const memberSchema = z.object({
  // Section 1: Personal Information
  memberNumber: z.string().optional(),
  employeeNumber: z.string().min(1, "Employee number is required"),
  surname: z.string().min(1, "Surname is required"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  suffix: z.string().optional(),
  sex: z.enum(["Male", "Female"]),
  birthdate: z.string().min(1, "Birthdate is required"),
  civilStatus: z.enum(["Single", "Married", "Widowed", "Separated", "Divorced"]),
  permanentAddress: z.string().min(1, "Permanent address is required"),
  cellphoneNumber: z.string().min(1, "Cellphone number is required").refine((v) => phRegex.test(v.replace(/\s/g, "")), "Enter a valid Philippine mobile number (09XXXXXXXXX)"),
  email: z.string().optional().refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email address"),
  nameOfSpouse: z.string().optional(),

  // Section 2: Employment Information
  officeId: z
    .string()
    .min(1, "Office is required")
    .regex(/^\d+$/, "Please select a valid office"),
  position: z.string().min(1, "Position is required"),
  dateOfRegularAppointment: z.string().min(1, "Date of regular appointment is required"),
  employmentStatus: z.string().min(1, "Employment status is required"),

  // Section 3: Membership Information
  membershipType: z.enum(["Regular", "Associate", "Honorary"]),
  membershipDate: z.string().min(1, "Membership date is required"),
  membershipStatus: z.enum(["Active", "Inactive", "Suspended", "Terminated", "Deceased"]),
  netPay: z.number().min(0, "Net pay must be zero or more").optional(),
  retireeStatus: z.enum(["Not Retired", "Retired"]),
  remarks: z.string().optional(),

  // Section 4: Beneficiaries
  beneficiaries: z.array(beneficiarySchema).min(1, "Add at least one qualified nuclear-family beneficiary"),
}).superRefine((member, context) => {
  const marriedRelationships = [
    "Legal Spouse",
    "Spouse",
    "Legitimate Unmarried Child",
    "Legally Adopted Unmarried Child",
    "Unmarried Child",
  ]
  const unmarriedRelationships = [
    "Living Father",
    "Father",
    "Living Mother",
    "Mother",
    "Single Brother",
    "Single Sister",
  ]
  const allowed = member.civilStatus === "Married" ? marriedRelationships : unmarriedRelationships

  member.beneficiaries.forEach((beneficiary, index) => {
    if (!allowed.includes(beneficiary.relationship)) {
      context.addIssue({
        code: "custom",
        path: ["beneficiaries", index, "relationship"],
        message: member.civilStatus === "Married"
          ? "Select a legal spouse or a legitimate/legally adopted unmarried child"
          : "Select a living parent or a single brother/sister",
      })
    }
  })

  const siblingCount = member.beneficiaries.filter((beneficiary) =>
    ["Single Brother", "Single Sister"].includes(beneficiary.relationship)
  ).length
  if (member.civilStatus !== "Married" && siblingCount > 3) {
    context.addIssue({
      code: "custom",
      path: ["beneficiaries"],
      message: "A maximum of three single brothers or sisters may be registered",
    })
  }
})
export type MemberFormValues = z.infer<typeof memberSchema>
