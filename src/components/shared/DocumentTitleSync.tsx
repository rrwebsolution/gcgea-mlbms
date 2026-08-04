import * as React from "react"
import { useLocation } from "react-router-dom"
import { NAV_ITEMS, type NavItem } from "@/constants/navigation"

const DEFAULT_TITLE = "GCGEA Membership, Loan and Benefits Management System"

function flattenRoutes(items: NavItem[], acc: { path: string; label: string }[] = []) {
  for (const item of items) {
    acc.push({ path: item.path, label: item.label })
    if (item.children) flattenRoutes(item.children, acc)
  }
  return acc
}

// Longest path first, so a more specific route (e.g. "/loans/new") is tried
// before a broader ancestor (e.g. "/loans") when prefix-matching below.
const FLAT_ROUTES = flattenRoutes(NAV_ITEMS).sort((a, b) => b.path.length - a.path.length)

/**
 * Keeps the browser tab title in sync with the current route, e.g. "GCGEA -
 * Dashboard" — index.html's <title> only covers the very first paint before
 * this mounts. Pages without a nav entry (detail/edit sub-routes) fall back
 * to whichever nav item's path is their longest matching prefix (e.g.
 * "/loans/42/edit" still reads "GCGEA - Loan Applications"); routes with no
 * match at all (login, etc.) keep the plain default title.
 */
export function DocumentTitleSync() {
  const { pathname } = useLocation()

  React.useEffect(() => {
    const match = FLAT_ROUTES.find((route) => route.path === pathname)
      ?? FLAT_ROUTES.find((route) => route.path !== "/" && pathname.startsWith(`${route.path}/`))
    document.title = match ? `GCGEA - ${match.label}` : DEFAULT_TITLE
  }, [pathname])

  return null
}
