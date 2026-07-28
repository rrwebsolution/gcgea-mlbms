import * as React from "react"
import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Info, Languages, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSettings } from "@/services/settings.service"
import { translateAlertText, type AlertLanguage } from "@/utils/alert-translation"

type BannerTone = "info" | "success" | "warning" | "danger"

const TONE_CONFIG: Record<BannerTone, { icon: typeof Info; classes: string }> = {
  info: { icon: Info, classes: "border-info/30 bg-info/5 text-info" },
  success: { icon: CheckCircle2, classes: "border-success/30 bg-success/5 text-success" },
  warning: { icon: AlertTriangle, classes: "border-warning/40 bg-warning/10 text-warning" },
  danger: { icon: XCircle, classes: "border-destructive/30 bg-destructive/5 text-destructive" },
}

interface AlertBannerProps {
  tone?: BannerTone
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
  titleClassName?: string
}

export function AlertBanner({ tone = "info", title, description, actions, className, titleClassName }: AlertBannerProps) {
  const { icon: Icon, classes } = TONE_CONFIG[tone]
  const [language, setLanguage] = React.useState<AlertLanguage>("en")
  const [translationsEnabled, setTranslationsEnabled] = React.useState(
    () => getSettings().general.enableAlertTranslations ?? false
  )

  React.useEffect(() => {
    function handleSettingsChanged(event: Event) {
      const detail = (event as CustomEvent<{ section: string; value: { enableAlertTranslations?: boolean } }>).detail
      if (detail.section !== "general") return
      setTranslationsEnabled(detail.value.enableAlertTranslations ?? false)
      if (!detail.value.enableAlertTranslations) setLanguage("en")
    }
    window.addEventListener("gcgea:settings-changed", handleSettingsChanged)
    return () => window.removeEventListener("gcgea:settings-changed", handleSettingsChanged)
  }, [])

  const displayedTitle = translateAlertText(title, language)
  const displayedDescription = typeof description === "string"
    ? translateAlertText(description, language)
    : description

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", classes, className)}>
      <Icon className="mt-0.5 size-4.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn("text-sm font-medium", titleClassName)}>{displayedTitle}</p>
        {displayedDescription && <div className="text-sm text-foreground/80">{displayedDescription}</div>}
        {translationsEnabled && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5" aria-label="Alert translation">
            <Languages className="size-3 opacity-60" />
            {([
              ["ceb", "Translate to Bisaya"],
              ["tl", "Translate to Tagalog"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setLanguage((current) => current === value ? "en" : value)}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] font-medium leading-4 transition-colors",
                  language === value ? "border-current bg-current/10" : "border-current/30 bg-background/60 hover:bg-current/5"
                )}
              >
                {language === value ? "Show Original English" : label}
              </button>
            ))}
          </div>
        )}
        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
      </div>
    </div>
  )
}
