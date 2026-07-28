import { APPROVAL_NAV_PERMISSIONS, NAV_ITEMS, type NavItem } from "@/constants/navigation"
import type { PermissionCode } from "@/types"

function firstAccessiblePath(items: NavItem[], granted: Set<PermissionCode>): string | undefined {
  for (const item of items) {
    if (item.children) {
      const childPath = firstAccessiblePath(item.children, granted)
      if (childPath) return childPath
      continue
    }

    if (item.anyOf?.some((code) => granted.has(code))) return item.path
    if (!item.permission || granted.has(item.permission)) return item.path
  }

  return undefined
}

/** Returns a real page the signed-in user can open instead of assuming Dashboard access. */
export function getLandingPage(permissions: PermissionCode[]): string {
  const granted = new Set(permissions)

  if (granted.has("dashboard.view")) return "/dashboard"

  const modulePath = firstAccessiblePath(NAV_ITEMS, granted)
  if (modulePath) return modulePath

  if (APPROVAL_NAV_PERMISSIONS.some((code) => granted.has(code))) return "/my-approvals"

  // Every authenticated account can access its own profile.
  return "/profile"
}
