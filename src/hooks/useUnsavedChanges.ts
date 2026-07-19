import * as React from "react"

/**
 * Dirty-state tracking + `beforeunload` guard, plus a `promptLeave()` you can
 * call from any in-app navigation (Cancel button, route change) to show a
 * confirm-style prompt instead of just the browser's native one.
 */
export function useUnsavedChanges(isDirty: boolean) {
  React.useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  const [showPrompt, setShowPrompt] = React.useState(false)
  const pendingActionRef = React.useRef<(() => void) | null>(null)

  function promptLeave(action: () => void) {
    if (isDirty) {
      pendingActionRef.current = action
      setShowPrompt(true)
    } else {
      action()
    }
  }

  function resolvePrompt(outcome: "leave" | "stay") {
    setShowPrompt(false)
    if (outcome === "leave" && pendingActionRef.current) {
      pendingActionRef.current()
    }
    pendingActionRef.current = null
  }

  return { showPrompt, promptLeave, resolvePrompt, setShowPrompt }
}
