import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export function RoleIndicator({ roleName, className }: { roleName: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold-foreground",
        className
      )}
    >
      <ShieldCheck className="size-3.5" />
      {roleName}
    </span>
  )
}
