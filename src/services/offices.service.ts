import type { Office, PaginatedResponse, PaginationParams } from "@/types"
import { simulateDelay } from "./http"
import { MOCK_OFFICES } from "./mock-data/offices"
import { paginate, sortBy } from "@/utils/paginate"

let offices: Office[] = [...MOCK_OFFICES]

export async function listOffices(params: PaginationParams = {}): Promise<PaginatedResponse<Office>> {
  let items = offices
  if (params.search) {
    const term = params.search.toLowerCase()
    items = items.filter((o) => o.name.toLowerCase().includes(term) || o.code.toLowerCase().includes(term))
  }
  items = sortBy(items, params.sortBy, params.sortDir)
  return simulateDelay(paginate(items, params.page, params.perPage))
}

export async function listAllOffices(): Promise<Office[]> {
  return simulateDelay(offices, 150)
}

export async function createOffice(input: Partial<Office>): Promise<Office> {
  const newOffice: Office = {
    id: `off-new-${Date.now()}`,
    code: input.code ?? "",
    name: input.name ?? "",
    description: input.description ?? "",
    status: input.status ?? "Active",
    memberCount: 0,
    createdAt: new Date().toISOString(),
  }
  offices = [newOffice, ...offices]
  return simulateDelay(newOffice, 400)
}

export async function updateOffice(id: string, input: Partial<Office>): Promise<Office> {
  const idx = offices.findIndex((o) => o.id === id)
  if (idx === -1) throw new Error("Office not found")
  const updated = { ...offices[idx], ...input }
  offices = offices.map((o, i) => (i === idx ? updated : o))
  return simulateDelay(updated, 400)
}

export async function toggleOfficeStatus(id: string): Promise<Office> {
  const idx = offices.findIndex((o) => o.id === id)
  if (idx === -1) throw new Error("Office not found")
  const updated: Office = { ...offices[idx], status: offices[idx].status === "Active" ? "Inactive" : "Active" }
  offices = offices.map((o, i) => (i === idx ? updated : o))
  return simulateDelay(updated, 300)
}
