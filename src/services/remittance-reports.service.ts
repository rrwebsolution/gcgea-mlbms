import { api } from "@/lib/api"

export interface RemittanceBreakdownRow {
  period: string
  kind: "month" | "otc"
  principal: number
  interest: number
  serviceIncome: number
  monthlyDues: number
  cashPabaon: number
  total: number
}

export interface RemittanceBreakdownTotals {
  principal: number
  interest: number
  serviceIncome: number
  monthlyDues: number
  cashPabaon: number
  total: number
}

export interface RemittanceBreakdownReport {
  year: number
  rows: RemittanceBreakdownRow[]
  totals: RemittanceBreakdownTotals
  loanReceivables: number
  asOfDate: string
}

export async function getRemittanceBreakdown(year: number): Promise<RemittanceBreakdownReport> {
  const { data } = await api.get<RemittanceBreakdownReport>("/reports/remittance-breakdown", {
    params: { year },
  })
  return data
}
