import * as React from "react"
import { getSettings } from "@/services/settings.service"
import type { GeneralSettings } from "@/types"

export function useGeneralSettings(): GeneralSettings {
  const [general, setGeneral] = React.useState(() => getSettings().general)

  React.useEffect(() => {
    function handleChange(event: Event) {
      const detail = (event as CustomEvent<{ section?: string; value?: GeneralSettings }>).detail
      if (detail?.section === "general" && detail.value) setGeneral(detail.value)
    }
    window.addEventListener("gcgea:settings-changed", handleChange)
    return () => window.removeEventListener("gcgea:settings-changed", handleChange)
  }, [])

  React.useEffect(() => {
    document.title = general.systemShortName
  }, [general.systemShortName])

  return general
}
