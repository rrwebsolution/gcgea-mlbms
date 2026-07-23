import type {
  MemberColumnMapping,
  MemberImportBatchDetail,
  MemberImportBatchSummary,
  MemberImportCommitResponse,
  MemberImportPreviewResponse,
  MemberImportResolveOfficeResponse,
  MemberImportSheetResponse,
  MemberImportUploadResponse,
  PaginatedResponse,
  PaginationParams,
} from "@/types"
import { api, getPaginated } from "@/lib/api"

export async function uploadMemberImportFile(
  file: File,
  onUploadProgress?: (percent: number) => void
): Promise<MemberImportUploadResponse> {
  const form = new FormData()
  form.append("file", file)

  const { data } = await api.post<MemberImportUploadResponse>("/member-imports", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onUploadProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  })
  return data
}

export async function selectMemberImportWorksheet(token: string, sheetName: string | null): Promise<MemberImportSheetResponse> {
  const { data } = await api.post<MemberImportSheetResponse>(`/member-imports/${token}/select-sheet`, { sheetName })
  return data
}

export async function previewMemberImport(token: string, mapping: MemberColumnMapping): Promise<MemberImportPreviewResponse> {
  const { data } = await api.post<MemberImportPreviewResponse>(`/member-imports/${token}/preview`, { mapping })
  return data
}

export interface ResolveMemberImportOfficeInput {
  rawText: string
  officeId?: string
  newOffice?: { code: string; name: string }
  saveAsAlias?: boolean
}

export async function resolveMemberImportOffice(token: string, input: ResolveMemberImportOfficeInput): Promise<MemberImportResolveOfficeResponse> {
  const { data } = await api.post<MemberImportResolveOfficeResponse>(`/member-imports/${token}/resolve-office`, input)
  return data
}

export async function resolveMemberImportDuplicates(token: string, resolutions: Record<number, string>): Promise<void> {
  await api.post(`/member-imports/${token}/resolve-duplicates`, { resolutions })
}

export async function commitMemberImport(token: string, resolutions: Record<number, string> = {}): Promise<MemberImportCommitResponse> {
  const { data } = await api.post<MemberImportCommitResponse>(`/member-imports/${token}/commit`, { resolutions })
  return data
}

export interface ImportedPendingReviewMember {
  id: string
  fullName: string
  officeName: string | null
  sourceWorksheet: string | null
  sourceRow: number | null
  importDate: string
  importedBy: string | null
  validationWarnings: string[]
  approvalStatus: "pending" | "approved" | "rejected" | "returned" | null
  membershipStatus: string
}

export async function listImportedPendingReview(params: PaginationParams = {}): Promise<PaginatedResponse<ImportedPendingReviewMember>> {
  return getPaginated<ImportedPendingReviewMember>("/member-imports/pending-review", params)
}

export interface ListMemberImportBatchesParams extends PaginationParams {
  status?: string
}

export async function listMemberImportBatches(params: ListMemberImportBatchesParams = {}): Promise<PaginatedResponse<MemberImportBatchSummary>> {
  return getPaginated<MemberImportBatchSummary>("/member-imports", params)
}

export async function getMemberImportBatch(token: string): Promise<MemberImportBatchDetail> {
  const { data } = await api.get<MemberImportBatchDetail>(`/member-imports/${token}`)
  return data
}

/** Downloads via the authenticated axios client — a plain `<a href>` can't reliably carry the Sanctum session cookie cross-origin. */
export async function downloadMemberImportReport(token: string, filename: string): Promise<void> {
  const response = await api.get(`/member-imports/${token}/report`, { responseType: "blob" })
  const url = URL.createObjectURL(response.data as Blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
