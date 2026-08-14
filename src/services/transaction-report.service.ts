import { api } from "@/lib/api"

export interface ReportTransaction { id: string; date: string; reference: string; type: string; direction: "Inflow" | "Outflow"; party: string; details: string; amount: number; method: string; status: string }
export interface TransactionReport { periodStart: string; periodEnd: string; transactions: ReportTransaction[]; summary: { inflow: number; outflow: number; count: number } }
export async function getTransactionReport(filters: { startDate: string; endDate: string; type: string }): Promise<TransactionReport> {
  return (await api.get<TransactionReport>("/reports/transactions", { params: filters })).data
}
