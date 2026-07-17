export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface PaginationMeta {
  currentPage: number
  perPage: number
  totalRecords: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface PaginationParams {
  page?: number
  perPage?: number
  search?: string
  sortBy?: string
  sortDir?: "asc" | "desc"
  [key: string]: string | number | boolean | undefined
}

export type Sex = "Male" | "Female"

export type CivilStatus = "Single" | "Married" | "Widowed" | "Separated" | "Divorced"

export type PaymentMethod = "Payroll Deduction" | "Cash" | "Bank Transfer" | "Check"

export interface SelectOption {
  label: string
  value: string
}
