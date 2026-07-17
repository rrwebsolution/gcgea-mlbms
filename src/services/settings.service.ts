import type { AppearanceSettings, BackupHistoryEntry, SystemSettings } from "@/types"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { DEFAULT_APPEARANCE_SETTINGS, DEFAULT_SYSTEM_SETTINGS } from "@/constants/settings-defaults"
import { simulateDelay } from "./http"

let settings: SystemSettings = readStorage<SystemSettings>(STORAGE_KEYS.systemSettings, DEFAULT_SYSTEM_SETTINGS)
let appearance: AppearanceSettings = readStorage<AppearanceSettings>(STORAGE_KEYS.appearanceSettings, DEFAULT_APPEARANCE_SETTINGS)

const SEED_BACKUP_HISTORY: BackupHistoryEntry[] = [
  { id: "bk-01", name: "gcgea-mlbms-backup-2026-07-15.json", date: "2026-07-15T02:00:00", type: "Automatic", size: "1.8 MB", status: "Completed", createdBy: "System" },
  { id: "bk-02", name: "gcgea-mlbms-backup-2026-07-08.json", date: "2026-07-08T02:00:00", type: "Automatic", size: "1.7 MB", status: "Completed", createdBy: "System" },
  { id: "bk-03", name: "gcgea-mlbms-backup-manual-2026-06-30.json", date: "2026-06-30T15:22:00", type: "Manual", size: "1.7 MB", status: "Completed", createdBy: "Maria Corazon D. Santos" },
]
let backupHistory: BackupHistoryEntry[] = readStorage<BackupHistoryEntry[]>(STORAGE_KEYS.backupHistory, SEED_BACKUP_HISTORY)

function persistSettings() {
  writeStorage(STORAGE_KEYS.systemSettings, settings)
}
function persistAppearance() {
  writeStorage(STORAGE_KEYS.appearanceSettings, appearance)
}
function persistBackupHistory() {
  writeStorage(STORAGE_KEYS.backupHistory, backupHistory)
}

export function getSettings(): SystemSettings {
  return settings
}

export function getAppearance(): AppearanceSettings {
  return appearance
}

export function getBackupHistory(): BackupHistoryEntry[] {
  return backupHistory
}

export async function saveSettingsSection<K extends keyof SystemSettings>(section: K, value: SystemSettings[K]): Promise<SystemSettings> {
  settings = { ...settings, [section]: value }
  persistSettings()
  return simulateDelay(settings, 400)
}

export async function saveAppearance(value: AppearanceSettings): Promise<AppearanceSettings> {
  appearance = value
  persistAppearance()
  return simulateDelay(appearance, 300)
}

export async function resetSettingsSection<K extends keyof SystemSettings>(section: K): Promise<SystemSettings> {
  settings = { ...settings, [section]: DEFAULT_SYSTEM_SETTINGS[section] }
  persistSettings()
  return simulateDelay(settings, 300)
}

export async function resetAppearance(): Promise<AppearanceSettings> {
  appearance = DEFAULT_APPEARANCE_SETTINGS
  persistAppearance()
  return simulateDelay(appearance, 300)
}

export function downloadSettingsBackup(): void {
  const payload = { settings, appearance, exportedAt: new Date().toISOString() }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `gcgea-mlbms-settings-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function restoreSettingsFromJson(json: string): Promise<void> {
  const parsed = JSON.parse(json) as { settings?: SystemSettings; appearance?: AppearanceSettings }
  if (parsed.settings) {
    settings = parsed.settings
    persistSettings()
  }
  if (parsed.appearance) {
    appearance = parsed.appearance
    persistAppearance()
  }
  await simulateDelay(null, 400)
}

export async function createMockBackup(createdBy: string, type: "Manual" | "Automatic" = "Manual"): Promise<BackupHistoryEntry> {
  const entry: BackupHistoryEntry = {
    id: `bk-${Date.now()}`,
    name: `gcgea-mlbms-backup-${type === "Manual" ? "manual-" : ""}${new Date().toISOString().slice(0, 10)}.json`,
    date: new Date().toISOString(),
    type,
    size: `${(1.6 + Math.random() * 0.6).toFixed(1)} MB`,
    status: "Completed",
    createdBy,
  }
  backupHistory = [entry, ...backupHistory]
  persistBackupHistory()
  return simulateDelay(entry, 900)
}

export async function deleteBackupEntry(id: string): Promise<void> {
  backupHistory = backupHistory.filter((b) => b.id !== id)
  persistBackupHistory()
  await simulateDelay(null, 300)
}
