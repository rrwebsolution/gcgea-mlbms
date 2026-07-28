import * as React from "react"
import { getSettings } from "@/services/settings.service"
import type { OrganizationProfileSettings } from "@/types"

export function useOrganizationSettings(): OrganizationProfileSettings {
  const [organization, setOrganization] = React.useState(() => getSettings().organization)

  React.useEffect(() => {
    function handleChange(event: Event) {
      const detail = (event as CustomEvent<{ section?: string; value?: OrganizationProfileSettings }>).detail
      if (detail?.section === "organization" && detail.value) setOrganization(detail.value)
    }
    window.addEventListener("gcgea:settings-changed", handleChange)
    return () => window.removeEventListener("gcgea:settings-changed", handleChange)
  }, [])

  return organization
}
