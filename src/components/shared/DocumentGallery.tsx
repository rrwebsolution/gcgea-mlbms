import type { ReactNode } from "react"
import type { DocumentCategory } from "@/types"

export interface DocumentGalleryItem {
  key?: string
  category: DocumentCategory
  node: ReactNode
}

interface DocumentGroupDefinition {
  title: string
  categories: DocumentCategory[]
}

const DOCUMENT_GROUPS: DocumentGroupDefinition[] = [
  { title: "Personal Documents", categories: ["Valid ID"] },
  { title: "Employment Documents", categories: ["Appointment Document", "Payslip"] },
  { title: "Membership Documents", categories: ["Membership Form"] },
  { title: "Other Documents", categories: ["Other Supporting Document"] },
]

export function DocumentGallery({ items }: { items: DocumentGalleryItem[] }) {
  return (
    <div className="space-y-5">
      {DOCUMENT_GROUPS.map((group) => {
        const groupItems = items.filter((item) => group.categories.includes(item.category))
        if (groupItems.length === 0) return null

        return (
          <div key={group.title} className="space-y-2">
            <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.title}</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {groupItems.map((item, index) => (
                <div key={item.key ?? `${item.category}-${index}`}>{item.node}</div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
