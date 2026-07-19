import * as React from "react"

interface UseAutosaveDraftOptions {
  enabled?: boolean
  delayMs?: number
}

/**
 * Debounced autosave on top of a `save` function (typically `useDraft`'s
 * `save`). Fires at most once per `delayMs` of inactivity — never on every
 * keystroke — and exposes `triggerNow` for step-change/pre-upload saves.
 */
export function useAutosaveDraft<T>(value: T, save: (value: T) => Promise<unknown>, options: UseAutosaveDraftOptions = {}) {
  const { enabled = true, delayMs = 30000 } = options
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latestValue = React.useRef(value)
  const saveRef = React.useRef(save)
  latestValue.current = value
  saveRef.current = save

  React.useEffect(() => {
    if (!enabled) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      void saveRef.current(latestValue.current)
    }, delayMs)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, delayMs])

  const triggerNow = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    return saveRef.current(latestValue.current)
  }, [])

  return { triggerNow }
}
