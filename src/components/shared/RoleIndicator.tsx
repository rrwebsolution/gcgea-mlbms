import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export function RoleIndicator({ roleName, className }: { roleName: string; className?: string }) {
  return (
    <span
      className={cn(
        // Base layout & typography (Uppercase & slightly tracked out for a premium badge feel)
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition-colors shrink-0",
        
        // Light Mode: Crisp dark-amber text on a soft background with a light border
        "bg-amber-50 text-amber-850 border border-amber-200/60",
        // Note: If you don't have a custom amber-850, "text-amber-800" or "text-amber-900" is great
        "text-amber-800", 
        
        // Dark Mode: Slightly brighter glowing amber text with a subtle border
        "dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
        
        className
      )}
    >
      <ShieldCheck className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
      {roleName}
    </span>
  )
}