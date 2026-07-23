import * as React from "react"
import { useIsFetching } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

/** Sub-100ms fetches shouldn't flicker the bar into view at all. */
const SHOW_DELAY_MS = 120
/** Once shown, stay visible at least this long so it never looks like a stray blink. */
const MIN_VISIBLE_MS = 400

/**
 * Thin top-of-viewport progress bar driven by real in-flight react-query requests —
 * not route changes themselves, which are instant in this SPA. Replaces a full-page
 * overlay for in-app navigation so it never stacks on top of each page's own skeleton.
 */
export function RouteProgressBar() {
  const isFetching = useIsFetching() > 0
  const [visible, setVisible] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const shownAtRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (isFetching) {
      const showTimer = setTimeout(() => {
        shownAtRef.current = Date.now()
        setProgress(12)
        setVisible(true)
      }, SHOW_DELAY_MS)
      return () => clearTimeout(showTimer)
    }

    if (!visible) return
    const elapsed = shownAtRef.current ? Date.now() - shownAtRef.current : MIN_VISIBLE_MS
    setProgress(100)
    const hideTimer = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, Math.max(220, MIN_VISIBLE_MS - elapsed))
    return () => clearTimeout(hideTimer)
  }, [isFetching, visible])

  React.useEffect(() => {
    if (!visible || !isFetching) return
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(92, current + Math.max(1, (92 - current) * 0.12)))
    }, 180)
    return () => window.clearInterval(timer)
  }, [visible, isFetching])

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 top-0 z-[90] h-0.5 overflow-hidden bg-transparent transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        className="h-full transition-[width] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, var(--progress-start, var(--primary)), var(--progress-middle, var(--gold)), var(--progress-end, var(--success)))",
        }}
      />
    </div>
  )
}
