/**
 * Versioned, crash-safe localStorage helpers.
 * All GCGEA MLBMS mock-persistence keys are read/written through this module so
 * missing keys, invalid JSON, or stale schema versions fall back to caller-supplied
 * defaults instead of throwing.
 */

export const STORAGE_KEYS = {
  session: "gcgea_mock_session",
  themePreference: "gcgea_theme_preference",
  sidebarCollapsed: "gcgea_sidebar_collapsed",
  recentSearches: "gcgea_recent_searches",
  mockLoans: "gcgea_mock_loans",
  mockBenefits: "gcgea_mock_benefits",
  mockContributions: "gcgea_mock_contributions",
  systemSettings: "gcgea_system_settings",
  appearanceSettings: "gcgea_appearance_settings",
  importHistory: "gcgea_import_history",
  backupHistory: "gcgea_backup_history",
  draftRecovery: "gcgea_draft_recovery",
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

interface Envelope<T> {
  version: number
  data: T
}

// Bump whenever a persisted shape changes (e.g. new required fields on Role/SystemUser/
// LoanApplication/etc.) so browsers holding an older cached shape fall back to fresh
// mock defaults instead of crashing on missing fields.
const CURRENT_VERSION = 3

export function readStorage<T>(key: StorageKey, fallback: T, version: number = CURRENT_VERSION): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Envelope<T> | T

    if (parsed && typeof parsed === "object" && "version" in (parsed as Envelope<T>) && "data" in (parsed as Envelope<T>)) {
      const envelope = parsed as Envelope<T>
      if (envelope.version !== version) return fallback
      return envelope.data ?? fallback
    }

    // Legacy / unversioned payload — accept as-is rather than discarding user data.
    return (parsed as T) ?? fallback
  } catch {
    return fallback
  }
}

export function writeStorage<T>(key: StorageKey, data: T, version: number = CURRENT_VERSION): void {
  if (typeof window === "undefined") return
  try {
    const envelope: Envelope<T> = { version, data }
    window.localStorage.setItem(key, JSON.stringify(envelope))
  } catch {
    // Storage full or unavailable (private browsing) — fail silently, mock state
    // simply won't persist across reloads.
  }
}

export function removeStorage(key: StorageKey): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
