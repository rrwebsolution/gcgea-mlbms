export interface BulkPayrollMemberContext {
  hasActiveLoan: boolean
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
