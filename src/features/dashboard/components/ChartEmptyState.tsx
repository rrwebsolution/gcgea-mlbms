import { BarChart3 } from "lucide-react"

export function ChartEmptyState({ label = "No data available" }: { label?: string }) {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/10 px-4 text-center">
      <BarChart3 className="size-8 text-muted-foreground/50" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground/70">Data will appear here once records are available.</p>
    </div>
  )
}
