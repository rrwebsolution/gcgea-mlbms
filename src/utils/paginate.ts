import type { PaginatedResponse } from "@/types"

export function paginate<T>(items: T[], page = 1, perPage = 10): PaginatedResponse<T> {
  const totalRecords = items.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * perPage
  const data = items.slice(start, start + perPage)

  return {
    data,
    meta: { currentPage, perPage, totalRecords, totalPages },
  }
}

export function sortBy<T>(items: T[], key?: string, dir: "asc" | "desc" = "asc"): T[] {
  if (!key) return items
  const sorted = [...items].sort((a, b) => {
    const av = (a as Record<string, unknown>)[key]
    const bv = (b as Record<string, unknown>)[key]
    if (av == null || bv == null) return 0
    if (typeof av === "number" && typeof bv === "number") return av - bv
    return String(av).localeCompare(String(bv))
  })
  return dir === "desc" ? sorted.reverse() : sorted
}
