import * as React from "react"

export type DraftSaveStatus = "idle" | "saving" | "saved" | "error"

interface UseDraftOptions<TPayload, TResult> {
  /** Existing draft id, if resuming one (e.g. from a `:id` route param). */
  draftId?: string
  create: (payload: TPayload) => Promise<TResult>
  update: (id: string, payload: TPayload) => Promise<TResult>
  getId: (result: TResult) => string
  onSaved?: (result: TResult) => void
  onError?: (error: unknown) => void
}

/**
 * Generic "update the same draft, never create twice" primitive. Once a
 * draft id exists (passed in or returned from the first save), every
 * subsequent save calls `update` instead of `create` — reused across
 * Member/Loan/Benefit draft forms instead of each page tracking this itself.
 */
export function useDraft<TPayload, TResult>({
  draftId: initialDraftId,
  create,
  update,
  getId,
  onSaved,
  onError,
}: UseDraftOptions<TPayload, TResult>) {
  const [draftId, setDraftId] = React.useState<string | undefined>(initialDraftId)
  const [status, setStatus] = React.useState<DraftSaveStatus>("idle")
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null)
  const savingRef = React.useRef(false)

  React.useEffect(() => {
    setDraftId(initialDraftId)
  }, [initialDraftId])

  const save = React.useCallback(
    async (payload: TPayload): Promise<TResult> => {
      // Guards against overlapping autosave + manual-save calls creating two drafts.
      if (savingRef.current) {
        savingRef.current = false
      }
      savingRef.current = true
      setStatus("saving")
      try {
        const result = draftId ? await update(draftId, payload) : await create(payload)
        setDraftId(getId(result))
        setStatus("saved")
        setLastSavedAt(new Date())
        onSaved?.(result)
        return result
      } catch (error) {
        setStatus("error")
        onError?.(error)
        throw error
      } finally {
        savingRef.current = false
      }
    },
    [draftId, create, update, getId, onSaved, onError]
  )

  return { draftId, status, lastSavedAt, save, setDraftId, isSaving: status === "saving" }
}
