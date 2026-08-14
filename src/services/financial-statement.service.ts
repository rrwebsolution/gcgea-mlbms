import { api } from "@/lib/api"

export interface FinancialStatementOrganization {
  organizationName: string
  acronym: string
  bookkeeperName: string
  auditorName: string
  presidentName: string
}

export interface FinancialStatementDocument {
  year: number
  registrationLine: string
  accreditationLine: string
  affiliationLines: [string, string, string]
  paragraphs: [string, string, string, string]
  organization: FinancialStatementOrganization
}

export type FinancialStatementDraft = Omit<FinancialStatementDocument, "organization">

export type FinancialReportingPeriod = "monthly" | "quarterly" | "semi_annual" | "annual" | "custom"

export interface UnauditedFinancialReportFilters {
  fiscalYear: number
  reportingPeriod: FinancialReportingPeriod
  startDate?: string
  endDate?: string
  officeId?: string
  transactionStatus: "posted" | "verified"
}

export interface UnauditedFinancialSummary {
  monthlyDuesCollected: number
  cashPabaonCollected: number
  loanPrincipalCollected: number
  loanInterestCollected: number
  benefitsReleased: number
  outstandingLoanBalance: number
}

export interface UnauditedFinancialReport {
  fiscalYear: number
  periodStart: string
  periodEnd: string
  reportingPeriodLabel: string
  status: "UNAUDITED"
  generatedAt: string
  summary: UnauditedFinancialSummary
}

export async function getFinancialStatement(): Promise<FinancialStatementDocument> {
  const { data } = await api.get<FinancialStatementDocument>("/reports/financial-statement")
  return data
}

export async function saveFinancialStatement(value: FinancialStatementDraft): Promise<FinancialStatementDocument> {
  const { data } = await api.put<FinancialStatementDocument>("/reports/financial-statement", value)
  return data
}

/**
 * All official totals are calculated by the backend from posted/verified
 * transaction ledgers. Keeping this endpoint as the single source of truth
 * prevents browser, PDF, and spreadsheet totals from drifting apart.
 */
export async function generateUnauditedFinancialReport(filters: UnauditedFinancialReportFilters): Promise<UnauditedFinancialReport> {
  const { data } = await api.post<UnauditedFinancialReport>("/reports/unaudited-financial/generate", filters)
  return data
}
