export interface Office {
  id: string
  code: string
  name: string
  description: string
  status: "Active" | "Inactive"
  memberCount: number
  createdAt: string
}
