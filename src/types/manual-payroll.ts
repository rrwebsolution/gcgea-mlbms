import type { Member } from "./member"

export interface ManualPayrollLoan {
  id: string
  loanNumber: string
  status: string
  releaseDate?: string
  principalAmount: number
  outstandingPrincipal: number
  outstandingInterest: number
  remainingBalance: number
  monthlyAmortization: number
}

export interface ManualPayrollContext {
  member: Member
  activeLoan: ManualPayrollLoan | null
}

export interface ManualPayrollDeduction {
  id: string
  payrollReference: string
  payrollPeriod: string
  payrollDate: string
  officeId: string
  remarks?: string
  member: Member
  activeLoan?: ManualPayrollLoan | null
  monthlyDues: number
  cashPabaon: number
  loanDeduction: number
  totalDeduction: number
  status: "Draft" | "Posted"
  postedBy?: string
  postedAt?: string
}

export interface SaveManualPayrollInput {
  payrollReference: string
  payrollPeriod: string
  payrollDate: string
  officeId: string
  remarks?: string
  memberId: string
  monthlyDues: number
  cashPabaon: number
  loanDeduction: number
}
