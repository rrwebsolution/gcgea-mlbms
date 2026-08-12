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

export async function getFinancialStatement(): Promise<FinancialStatementDocument> {
  const { data } = await api.get<FinancialStatementDocument>("/reports/financial-statement")
  return data
}

export async function saveFinancialStatement(value: FinancialStatementDraft): Promise<FinancialStatementDocument> {
  const { data } = await api.put<FinancialStatementDocument>("/reports/financial-statement", value)
  return data
}
