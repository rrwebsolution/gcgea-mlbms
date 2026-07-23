import { cn } from "@/lib/utils"

interface IndeterminateBarProps {
  className?: string
  /** Track thickness. Defaults to a slim 2px sliver used for card/table accents. */
  size?: "xs" | "sm"
}

/** Animated progress sliver for moments with no real percentage to report (route changes, card/table fetches). */
export function IndeterminateBar({ className, size = "xs" }: IndeterminateBarProps) {
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted",
        size === "xs" ? "h-0.5" : "h-1",
        className
      )}
    >
      <div
        className="absolute inset-y-0 w-1/3 rounded-full motion-reduce:animate-none"
        style={{
          animation: "indeterminate-bar 1.3s ease-in-out infinite",
          background: "linear-gradient(90deg, var(--progress-start, var(--primary)), var(--progress-middle, var(--gold)), var(--progress-end, var(--success)))",
        }}
      />
    </div>
  )
}
