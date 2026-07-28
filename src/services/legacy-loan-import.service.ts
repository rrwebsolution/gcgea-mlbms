import { api } from "@/lib/api"

export interface LegacyLoanImportRow {
  key: string
  sheet: string
  rowNumber: number
  name: string
  memberId: string | null
  memberName: string | null
  loanStart: string
  principal: number
  interest: number
  principalBalance: number
  interestBalance: number
  currentPayment: number
  lastPaymentMonth: string
  category: string
  reasons: string[]
  candidates: { id: string; name: string; memberNumber: string; score: number }[]
}

export interface LegacyLoanPreview {
  token: string
  rows: LegacyLoanImportRow[]
  summary: { total: number; ready: number; invalid: number; alreadyImported: number }
}

export async function previewLegacyLoans(file: File, balancePeriod: string) {
  const body = new FormData()
  body.append("file", file)
  body.append("balancePeriod", balancePeriod)
  const { data } = await api.post<LegacyLoanPreview>("/legacy-loan-imports", body, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}

export async function commitLegacyLoans(token: string, excludedRows: string[], resolvedMatches: Record<string, string>) {
  const { data } = await api.post<{ created: number; skipped: number; errors: string[]; batchToken?: string }>(
    `/legacy-loan-imports/${token}/commit`,
    { excludedRows, resolvedMatches },
  )
  return data
}
