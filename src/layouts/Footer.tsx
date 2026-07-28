import { useGeneralSettings } from "@/hooks/useGeneralSettings"
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings"

export function Footer() {
  const general = useGeneralSettings()
  const organization = useOrganizationSettings()

  return (
    <footer className="border-t border-border bg-background/70 px-4 py-3 text-center text-xs text-muted-foreground backdrop-blur-sm sm:px-6">
      © {new Date().getFullYear()} {organization.organizationName} ({organization.acronym}). All rights reserved. — {general.systemShortName}
    </footer>
  )
}
