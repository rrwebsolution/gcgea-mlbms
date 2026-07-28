export interface LoanImportBatchSummary {
  token: string
  originalFilename: string
  balancePeriod: string
  totalRows: number
  createdCount: number
  skippedCount: number
  errors: string[]
  uploadedBy: string | null
  committedAt: string | null
}

export interface LoanImportBatchRow {
  id: string
  sheet: string
  rowNumber: number
  sourceName: string
  memberId: string | null
  memberName: string | null
  loanId: string | null
  loanReferenceNumber: string | null
  principal: number
  interest: number
  principalBalance: number
  interestBalance: number
  status: "Imported" | "Skipped"
  reason: string | null
}

export interface LoanImportBatchDetail {
  batch: LoanImportBatchSummary
  rows: LoanImportBatchRow[]
}
