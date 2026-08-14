import { api } from "@/lib/api"

export interface FinancialConditionAccounts {
  cashInBank: number; solidarityReceivables: number; doubtfulAccountsAllowance: number
  officeEquipment: number; accumulatedDepreciation: number; loanInvestmentFund: number
  membershipCoreServicesFund: number; operationalFund: number; pabaonMortuaryFund: number
  membershipFeeFund: number; dueToPsLink: number; insurancePremiumPayables: number; equity: number
}
export interface FinancialConditionStatement {
  id: string; fiscalYear: number; asOfDate: string; generatedAt: string; status: string
  accounts: FinancialConditionAccounts
  organization: { name: string; acronym: string; leftLogo: string; rightLogo: string }
}
export async function getFinancialConditionStatements(): Promise<FinancialConditionStatement[]> {
  return (await api.get<{ reports: FinancialConditionStatement[] }>("/reports/financial-condition")).data.reports
}
