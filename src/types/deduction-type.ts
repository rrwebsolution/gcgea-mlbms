export interface DeductionType {
  id: string
  name: string
  code: string
  description: string | null
  defaultAmount: number
  isActive: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}
