import { ORGANIZATION } from "@/constants/organization"

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/70 px-4 py-3 text-center text-xs text-muted-foreground backdrop-blur-sm sm:px-6">
      © {new Date().getFullYear()} {ORGANIZATION.name} ({ORGANIZATION.acronym}). All rights reserved. — {ORGANIZATION.systemShortName}
    </footer>
  )
}
