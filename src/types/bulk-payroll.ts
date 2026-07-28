export interface BulkPayrollMemberContext {
  hasActiveLoan: boolean
  loanNumber: string | null
  loanableAmount: number | null
  outstandingPrincipal: number | null
  outstandingInterest: number | null
  outstandingBalance: number | null
  loanDeduction: number
}

export interface SaveBulkPayrollInput {
  payrollReference: string
  payrollPeriod: string
  payrollDate: string
  officeId: string
  remarks?: string
  rows: {
    memberId: string
    monthlyDues: number
    cashPabaon: number
    loanDeduction: number
    loanableAmount?: number | null
    outstandingInterest?: number | null
    outstandingBalance?: number | null
  }[]
}

export interface BulkPayrollBatch {
  id: string
  payrollReference: string
  payrollPeriod: string
  officeId: string
  status: "Draft" | "Posted"
  memberCount: number
  totalDeduction: number
  postedBy?: string
  postedAt?: string
}
