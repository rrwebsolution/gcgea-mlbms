/**
 * Field keys mirror the backend's PayrollColumnMapper::TARGET_FIELDS exactly
 * (snake_case, not camelCase) since the mapping object is passed through to
 * the API verbatim. "loan_remarks" is deliberately not "date" — the sheet's
 * DATE column holds values like "Fully Paid" or "New Loan 10/2024", not
 * actual dates.
 */
export type PayrollTargetField =
  | "member_number"
  | "employee_number"
  | "name"
  | "loan_remarks"
  | "principal"
  | "interest"
  | "principal_balance_previous"
  | "interest_balance_previous"
  | "current_month_loan_payment"
  | "monthly_dues"
  | "pabaon"
  | "total_remit"
  | "principal_balance_current"
  | "interest_balance_current"
  | "total_balance_current"

export type PayrollColumnMapping = Partial<Record<PayrollTargetField, string | null>>

export interface PayrollUploadResponse {
  token: string
  targetFields: Record<PayrollTargetField, string>
  requiredFields: PayrollTargetField[]
  headers: string[]
  detectedMapping: PayrollColumnMapping
  unmatchedHeaders: string[]
  sampleRows: Record<string, string | number | null>[]
  totalRows: number
  sheetNames: string[]
  selectedSheet: string
}

export interface PayrollMatchCandidate {
  id: string
  name: string
  memberNumber?: string | null
  employeeNumber?: string | null
  officeName?: string | null
}

export interface PayrollImportRowResult {
  rowNumber: number
  data: Partial<Record<PayrollTargetField, string | number | null>>
  category: "Valid" | "Warning" | "Invalid"
  reasons: string[]
  memberId: string | null
  memberName: string | null
  matchMethod: "member_number" | "employee_number" | "name" | null
  matchCandidates: PayrollMatchCandidate[]
  loanId: string | null
  excluded?: boolean
  rowStatus?: string
}

export interface PayrollPreviewSummary {
  total: number
  valid: number
  warning: number
  invalid: number
}

export interface PayrollPreviewResponse {
  token: string
  rows: PayrollImportRowResult[]
  summary: PayrollPreviewSummary
  batchWarnings: string[]
}

export interface PayrollCommitSummary {
  totalRows: number
  importedMembers: number
  skippedRows: number
  warnings: number
  errors: number
  loanPaymentsImported: number
  contributionsCreated: number
  deductionsCreated: number
  totalPayrollDeduction: number
}

export interface PayrollCommitResponse {
  token: string
  summary: PayrollCommitSummary
}

export interface PayrollImportBatchSummary {
  id: string
  token: string
  payrollPeriod: string
  payrollReference: string | null
  uploadedBy: string | null
  importDate: string
  totalRows: number
  importedRows: number
  skippedRows: number
  errorRows: number
  loanPaymentsImported: number
  contributionsCreated: number
  deductionsCreated: number
  totalPayrollDeduction: number
  status: "Uploaded" | "Previewed" | "Committed" | "RolledBack"
  committedBy: string | null
  committedAt: string | null
  rolledBackBy?: string | null
  rolledBackAt?: string | null
  rollbackReason?: string | null
}

export interface PayrollImportBatchDetail extends PayrollImportBatchSummary {
  columnMapping: PayrollColumnMapping
  rows: PayrollImportRowResult[]
}
