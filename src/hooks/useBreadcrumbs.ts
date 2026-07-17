import { useLocation } from "react-router-dom"
import { NAV_ITEMS, type NavItem } from "@/constants/navigation"
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext"
import type { BreadcrumbEntry } from "@/components/shared/AppBreadcrumbs"

interface FlatNode {
  label: string
  path: string
  trail: BreadcrumbEntry[]
}

function flatten(items: NavItem[], trail: BreadcrumbEntry[] = []): FlatNode[] {
  let nodes: FlatNode[] = []
  for (const item of items) {
    const nextTrail = [...trail, { label: item.label, path: item.path }]
    nodes.push({ label: item.label, path: item.path, trail: nextTrail })
    if (item.children) {
      nodes = nodes.concat(flatten(item.children, trail))
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

  const prefixMatches = FLAT_NODES.filter((n) => n.path !== "/" && pathname.startsWith(n.path + "/"))
  const best = prefixMatches.sort((a, b) => b.path.length - a.path.length)[0]
  if (best) {
    return extra ? [...best.trail, { label: extra }] : [...best.trail, { label: "Details" }]
  }

  return []
}
