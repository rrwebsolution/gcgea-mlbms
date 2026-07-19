import { useLocation } from "react-router-dom"
import { NAV_ITEMS, type NavItem } from "@/constants/navigation"
import { REPORT_ROUTES } from "@/constants/reports"
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext"
import type { BreadcrumbEntry } from "@/components/shared/AppBreadcrumbs"

interface FlatNode {
  label: string
  path: string
  trail: BreadcrumbEntry[]
}

/** Pages that aren't part of the sidebar nav (personal/account pages, or report hub pages not in REPORT_ROUTES). */
const STATIC_TRAILS: Record<string, BreadcrumbEntry[]> = {
  "/profile": [{ label: "My Profile" }],
  "/change-password": [{ label: "Change Password" }],
  "/notifications": [{ label: "Notifications" }],
  "/reports/contributions": [{ label: "Reports", path: "/reports" }, { label: "Contribution Reports" }],
}

const REPORT_TRAILS: Record<string, BreadcrumbEntry[]> = Object.fromEntries(
  Object.entries(REPORT_ROUTES).flatMap(([category, reports]) =>
    Object.entries(reports ?? {}).map(([reportName, path]) => [
      path,
      [{ label: "Reports", path: "/reports" }, { label: category }, { label: reportName }],
    ])
  )
)

function flatten(items: NavItem[], trail: BreadcrumbEntry[] = []): FlatNode[] {
  let nodes: FlatNode[] = []
  for (const item of items) {
    // Only treat a group's own path as a real link if it actually resolves to one of its
    // children's routes (e.g. "Member Management" doubles as the "All Members" list page).
    // Pure section headers like "Administration" have no page of their own, so they render
    // as plain (non-clickable) breadcrumb text instead of a dead link.
    const ownPathIsRoutable = !item.children || item.children.some((c) => c.path === item.path)
    const nextTrail = [...trail, { label: item.label, path: ownPathIsRoutable ? item.path : undefined }]
    nodes.push({ label: item.label, path: item.path, trail: nextTrail })
    if (item.children) {
      nodes = nodes.concat(flatten(item.children, nextTrail))
    }
  }
  return nodes
}

const FLAT_NODES = flatten(NAV_ITEMS)

export function useBreadcrumbs(): BreadcrumbEntry[] {
  const location = useLocation()
  const { extra } = useBreadcrumbContext()
  const pathname = location.pathname

  const exact = FLAT_NODES.find((n) => n.path === pathname)
  if (exact) {
    const trail = exact.trail
    if (extra) return [...trail.slice(0, -1), { ...trail[trail.length - 1] }, { label: extra }]
    return trail
  }

  if (REPORT_TRAILS[pathname]) return REPORT_TRAILS[pathname]
  if (STATIC_TRAILS[pathname]) return STATIC_TRAILS[pathname]

  const prefixMatches = FLAT_NODES.filter((n) => n.path !== "/" && pathname.startsWith(n.path + "/"))
  const best = prefixMatches.sort((a, b) => b.path.length - a.path.length)[0]
  if (best) {
    return extra ? [...best.trail, { label: extra }] : [...best.trail, { label: "Details" }]
  }

  return []
}
