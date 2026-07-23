import type { PaginationParams } from "./common"

export type PayrollEntryType = "Manual Entry" | "Bulk Entry" | "Excel Import"

export interface PayrollDeductionHistoryEntry {
  id: string
  entryType: PayrollEntryType
  reference: string | null
  payrollPeriod: string
  payrollDate: string
  officeId: string
  officeName: string
  memberId: string | null
  memberName: string | null
  monthlyDues: number
  cashPabaon: number
  loanDeduction: number
  totalDeduction: number
  status: string
  encodedBy: string | null
  encodedAt: string | null
  /** Set for Excel Import rows — links to the payroll import batch detail page. */
  detailToken?: string
}

export interface PayrollHistoryFilters extends PaginationParams {
  payrollPeriod?: string
  office?: string
  member?: string
  entryType?: PayrollEntryType
  status?: string
  dateFrom?: string
  dateTo?: string
}
