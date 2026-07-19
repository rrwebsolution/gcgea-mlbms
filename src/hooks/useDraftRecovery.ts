import * as React from "react"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"

export interface DraftRecoveryEntry<T> {
  formKey: string
  savedAt: string
  values: T
}

type RecoveryStore = Record<string, DraftRecoveryEntry<unknown>>

/**
 * Emergency-only offline recovery layer — localStorage is never the primary
 * draft store (the backend is), this only holds a copy from the last save
 * attempt that failed to reach the server, so nothing is silently lost.
 * Cleared as soon as a real save to the backend succeeds.
 */
export function useDraftRecovery<T>(formKey: string) {
  const [recovery, setRecovery] = React.useState<DraftRecoveryEntry<T> | null>(null)

  React.useEffect(() => {
    const store = readStorage<RecoveryStore>(STORAGE_KEYS.draftRecovery, {})
    const entry = store[formKey] as DraftRecoveryEntry<T> | undefined
    setRecovery(entry ?? null)
  }, [formKey])

  const saveRecovery = React.useCallback(
    (values: T) => {
      const store = readStorage<RecoveryStore>(STORAGE_KEYS.draftRecovery, {})
      store[formKey] = { formKey, savedAt: new Date().toISOString(), values }
      writeStorage(STORAGE_KEYS.draftRecovery, store)
    },
    [formKey]
  )

  const clearRecovery = React.useCallback(() => {
    const store = readStorage<RecoveryStore>(STORAGE_KEYS.draftRecovery, {})
    delete store[formKey]
    writeStorage(STORAGE_KEYS.draftRecovery, store)
    setRecovery(null)
  }, [formKey])

  return { recovery, saveRecovery, clearRecovery }
}
