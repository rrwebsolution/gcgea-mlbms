import type { AuditLog, PaginatedResponse, PaginationParams } from "@/types"
import { simulateDelay } from "./http"
import { MOCK_AUDIT_LOGS } from "./mock-data/audit-logs"
import { paginate, sortBy } from "@/utils/paginate"

const auditLogs: AuditLog[] = [...MOCK_AUDIT_LOGS]

export interface AuditLogListParams extends PaginationParams {
  module?: string
  action?: string
}

export async function listAuditLogs(params: AuditLogListParams = {}): Promise<PaginatedResponse<AuditLog>> {
  let items = auditLogs
  if (params.search) {
    const term = params.search.toLowerCase()
    items = items.filter(
      (a) => a.userName.toLowerCase().includes(term) || a.recordReference.toLowerCase().includes(term)
    )
  }
  if (params.module) items = items.filter((a) => a.module === params.module)
  if (params.action) items = items.filter((a) => a.action === params.action)
  items = sortBy(items, params.sortBy ?? "dateTime", params.sortDir ?? "desc")
  return simulateDelay(paginate(items, params.page, params.perPage))
}
