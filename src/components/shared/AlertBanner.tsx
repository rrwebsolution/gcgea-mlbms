import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

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
}

export function AlertBanner({ tone = "info", title, description, actions, className }: AlertBannerProps) {
  const { icon: Icon, classes } = TONE_CONFIG[tone]

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", classes, className)}>
      <Icon className="mt-0.5 size-4.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <div className="text-sm text-foreground/80">{description}</div>}
        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
      </div>
    </div>
  )
}
