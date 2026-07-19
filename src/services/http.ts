/**
 * Artificial latency for mock services that haven't been migrated to the real
 * API yet. The real Axios client lives in `src/lib/api.ts` — swap a mock
 * service's `simulateDelay` calls for `api` calls as each module is migrated.
 */
export function simulateDelay<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}
