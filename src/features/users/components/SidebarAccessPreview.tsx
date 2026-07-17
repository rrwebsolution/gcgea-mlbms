import { CheckCircle2, XCircle } from "lucide-react"
import { NAV_ITEMS, type NavItem } from "@/constants/navigation"
import type { PermissionCode } from "@/types"
import { cn } from "@/lib/utils"

interface SidebarAccessPreviewProps {
  effectivePermissions: PermissionCode[]
}

function isVisible(item: NavItem, granted: Set<PermissionCode>): boolean {
  if (item.children) return item.children.some((c) => isVisible(c, granted))
  return item.permission ? granted.has(item.permission) : true
}

export function SidebarAccessPreview({ effectivePermissions }: SidebarAccessPreviewProps) {
  const granted = new Set(effectivePermissions)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-sidebar px-3 py-2">
        <p className="text-xs font-semibold tracking-wide text-sidebar-foreground/70 uppercase">Sidebar preview</p>
      </div>
      <ul className="divide-y divide-border">
        {NAV_ITEMS.map((item) => {
          const visible = isVisible(item, granted)
          return (
            <li key={item.path} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className={cn("text-sm font-medium", visible ? "text-foreground" : "text-muted-foreground line-through")}>{item.label}</span>
                {visible ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <XCircle className="size-4 shrink-0 text-muted-foreground/50" />}
              </div>
              {visible && item.children && (
                <ul className="mt-1 space-y-1 border-l border-border pl-3">
                  {item.children.map((child) => {
                    const childVisible = isVisible(child, granted)
                    return (
                      <li key={child.path} className="flex items-center justify-between gap-2">
                        <span className={cn("text-xs", childVisible ? "text-foreground" : "text-muted-foreground line-through")}>{child.label}</span>
                        {childVisible ? <CheckCircle2 className="size-3 shrink-0 text-success" /> : <XCircle className="size-3 shrink-0 text-muted-foreground/40" />}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
