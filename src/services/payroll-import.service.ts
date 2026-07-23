import type {
  PaginatedResponse,
  PaginationParams,
  PayrollColumnMapping,
  PayrollCommitResponse,
  PayrollImportBatchDetail,
  PayrollImportBatchSummary,
  PayrollPreviewResponse,
  PayrollUploadResponse,
} from "@/types"
import { api, getPaginated } from "@/lib/api"

export async function uploadPayrollFile(
  file: File,
  payrollPeriod: string,
  payrollReference?: string,
  onUploadProgress?: (percent: number) => void
): Promise<PayrollUploadResponse> {
  const form = new FormData()
  form.append("file", file)
  form.append("payrollPeriod", payrollPeriod)
  if (payrollReference) form.append("payrollReference", payrollReference)

  const { data } = await api.post<PayrollUploadResponse>("/payroll-imports", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onUploadProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  })
  return data
}

export async function selectPayrollSheet(token: string, sheet: string): Promise<PayrollUploadResponse> {
  const { data } = await api.post<PayrollUploadResponse>(`/payroll-imports/${token}/select-sheet`, { sheet })
  return data
}

export async function previewPayrollImport(token: string, mapping: PayrollColumnMapping): Promise<PayrollPreviewResponse> {
  const { data } = await api.post<PayrollPreviewResponse>(`/payroll-imports/${token}/preview`, { mapping })
  return data
}

export interface CommitPayrollImportInput {
  resolvedMatches: Record<number, string>
  excludedRows: number[]
  includeWarnings: boolean
}

export async function commitPayrollImport(token: string, input: CommitPayrollImportInput): Promise<PayrollCommitResponse> {
  const { data } = await api.post<PayrollCommitResponse>(`/payroll-imports/${token}/commit`, input)
  return data
}

export interface ListPayrollImportBatchesParams extends PaginationParams {
  period?: string
  status?: string
}

export async function listPayrollImportBatches(
  params: ListPayrollImportBatchesParams = {}
): Promise<PaginatedResponse<PayrollImportBatchSummary>> {
  return getPaginated<PayrollImportBatchSummary>("/payroll-imports", params)
}

export async function getPayrollImportBatch(token: string): Promise<PayrollImportBatchDetail> {
  const { data } = await api.get<PayrollImportBatchDetail>(`/payroll-imports/${token}`)
  return data
}

export async function rollbackPayrollImportBatch(token: string, reason: string): Promise<PayrollImportBatchSummary> {
  const { data } = await api.post<PayrollImportBatchSummary>(`/payroll-imports/${token}/rollback`, { reason })
  return data
}

/**
 * Downloads the batch's CSV report via the authenticated axios client
 * (cookie-based Sanctum session) rather than a plain `<a href>`, since a
 * cross-origin GET navigation can't reliably be relied on to carry the
 * session cookie.
 */
export async function downloadPayrollImportReport(token: string, filename: string): Promise<void> {
  const response = await api.get(`/payroll-imports/${token}/report`, { responseType: "blob" })
  const url = URL.createObjectURL(response.data as Blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
