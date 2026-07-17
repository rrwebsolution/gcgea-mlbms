import { z } from "zod"

const phRegex = /^09\d{9}$/

export const beneficiarySchema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(1, "Beneficiary name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  birthdate: z.string().min(1, "Birthdate is required"),
  contactNumber: z.string().optional().refine((v) => !v || phRegex.test(v.replace(/\s/g, "")), "Enter a valid Philippine mobile number"),
  address: z.string().optional(),
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
  officeId: z.string().min(1, "Office is required"),
  position: z.string().min(1, "Position is required"),
  dateOfRegularAppointment: z.string().min(1, "Date of regular appointment is required"),
  employmentStatus: z.enum(["Permanent", "Casual", "Job Order", "Contractual", "Co-terminus"]),

  // Section 3: Membership Information
  membershipType: z.enum(["Regular", "Associate", "Honorary"]),
  membershipDate: z.string().min(1, "Membership date is required"),
  membershipStatus: z.enum(["Active", "Inactive", "Suspended", "Terminated", "Deceased"]),
  retireeStatus: z.enum(["Not Retired", "Retired"]),
  remarks: z.string().optional(),

  // Section 4: Beneficiaries
  beneficiaries: z.array(beneficiarySchema),
})
export type MemberFormValues = z.infer<typeof memberSchema>
