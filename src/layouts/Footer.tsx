import { ORGANIZATION } from "@/constants/organization"

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
      © {new Date().getFullYear()} {ORGANIZATION.name} ({ORGANIZATION.acronym}). All rights reserved. — {ORGANIZATION.systemShortName}
    </footer>
  )
}
