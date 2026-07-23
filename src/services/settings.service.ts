import type { AppearanceSettings, BackupHistoryEntry, SystemSettings } from "@/types"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { DEFAULT_APPEARANCE_SETTINGS, DEFAULT_SYSTEM_SETTINGS } from "@/constants/settings-defaults"
import { simulateDelay } from "./http"
import { api } from "@/lib/api"

const storedSettings = readStorage<Partial<SystemSettings>>(STORAGE_KEYS.systemSettings, DEFAULT_SYSTEM_SETTINGS)
function mergeReportTemplate(value?: Partial<SystemSettings["reportTemplate"]>): SystemSettings["reportTemplate"] {
  const defaults = DEFAULT_SYSTEM_SETTINGS.reportTemplate
  function category<K extends keyof SystemSettings["reportTemplate"]["categoryTemplates"]>(key: K) {
    const stored = value?.categoryTemplates?.[key]
    return {
      ...defaults.categoryTemplates[key],
      ...stored,
      captionStyle: {
        ...defaults.categoryTemplates[key].captionStyle,
        ...stored?.captionStyle,
      },
      noteStyle: {
        ...defaults.categoryTemplates[key].noteStyle,
        ...stored?.noteStyle,
      },
      excelTemplate: {
        ...defaults.categoryTemplates[key].excelTemplate,
        ...stored?.excelTemplate,
        captionStyle: {
          ...defaults.categoryTemplates[key].excelTemplate.captionStyle,
          ...stored?.excelTemplate?.captionStyle,
        },
        noteStyle: {
          ...defaults.categoryTemplates[key].excelTemplate.noteStyle,
          ...stored?.excelTemplate?.noteStyle,
        },
      },
    }
  }
  return {
    ...defaults,
    ...value,
    categoryTemplates: {
      member: category("member"),
      contribution: category("contribution"),
      loan: category("loan"),
      benefit: category("benefit"),
      financial: category("financial"),
    },
  }
}

let settings: SystemSettings = {
  ...DEFAULT_SYSTEM_SETTINGS,
  ...storedSettings,
  reportTemplate: mergeReportTemplate(storedSettings.reportTemplate),
}
let appearance: AppearanceSettings = {
  ...DEFAULT_APPEARANCE_SETTINGS,
  ...readStorage<Partial<AppearanceSettings>>(STORAGE_KEYS.appearanceSettings, DEFAULT_APPEARANCE_SETTINGS),
}

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

function readableTextColor(background: string): "#ffffff" | "#111827" {
  const hex = background.replace("#", "")
  if (!/^[\da-f]{6}$/i.test(hex)) return "#ffffff"

  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  const whiteContrast = 1.05 / (luminance + 0.05)
  const darkContrast = (luminance + 0.05) / 0.057

  return whiteContrast >= darkContrast ? "#ffffff" : "#111827"
}

export function applyAppearanceTheme(value: AppearanceSettings): void {
  const root = document.documentElement
  const fontFamilies: Record<AppearanceSettings["fontFamily"], string> = {
    geist: "'Geist Variable', sans-serif",
    system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    monospace: "'Cascadia Code', Consolas, monospace",
  }
  root.style.setProperty("--primary", value.primaryColor)
  root.style.setProperty("--primary-foreground", readableTextColor(value.primaryColor))
  root.style.setProperty("--gold", value.accentColor)
  root.style.setProperty("--gold-foreground", readableTextColor(value.accentColor))
  root.style.setProperty("--sidebar", value.sidebarColor)
  root.style.setProperty("--sidebar-foreground", readableTextColor(value.sidebarColor))
  root.style.setProperty("--progress-start", value.progressColorStart)
  root.style.setProperty("--progress-middle", value.progressColorMiddle)
  root.style.setProperty("--progress-end", value.progressColorEnd)
  root.style.setProperty("--font-sans", fontFamilies[value.fontFamily])
  root.style.fontSize = `${Math.min(20, Math.max(12, value.baseFontSize))}px`
  document.body.style.fontWeight = String(value.fontWeight)
  document.body.style.fontStyle = value.fontStyle
  root.style.setProperty("--radius", `${value.borderRadius}px`)
  window.dispatchEvent(new CustomEvent("gcgea:appearance-changed", { detail: value }))
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

export async function loadSystemSettings(): Promise<{ settings: SystemSettings; appearance: AppearanceSettings }> {
  const { data } = await api.get<Partial<SystemSettings> & { appearance?: AppearanceSettings }>("/system-settings")
  const serverAppearance = data.appearance
  const serverSections = { ...data }
  delete serverSections.appearance

  settings = {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...settings,
    ...serverSections,
    reportTemplate: mergeReportTemplate(serverSections.reportTemplate ?? settings.reportTemplate),
  } as SystemSettings
  appearance = { ...DEFAULT_APPEARANCE_SETTINGS, ...appearance, ...serverAppearance }
  persistSettings()
  persistAppearance()
  return { settings, appearance }
}

export async function saveSettingsSection<K extends keyof SystemSettings>(section: K, value: SystemSettings[K]): Promise<SystemSettings> {
  await api.put(`/system-settings/${section}`, { value })
  settings = { ...settings, [section]: value }
  persistSettings()
  return settings
}

export async function saveAppearance(value: AppearanceSettings): Promise<AppearanceSettings> {
  await api.put("/system-settings/appearance", { value })
  appearance = value
  persistAppearance()
  return appearance
}

export async function resetSettingsSection<K extends keyof SystemSettings>(section: K): Promise<SystemSettings> {
  await api.put(`/system-settings/${section}`, { value: DEFAULT_SYSTEM_SETTINGS[section] })
  settings = { ...settings, [section]: DEFAULT_SYSTEM_SETTINGS[section] }
  persistSettings()
  return settings
}

export async function resetAppearance(): Promise<AppearanceSettings> {
  await api.put("/system-settings/appearance", { value: DEFAULT_APPEARANCE_SETTINGS })
  appearance = DEFAULT_APPEARANCE_SETTINGS
  persistAppearance()
  return appearance
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
    await Promise.all(
      (Object.keys(parsed.settings) as (keyof SystemSettings)[]).map((section) =>
        api.put(`/system-settings/${section}`, { value: parsed.settings![section] })
      )
    )
    settings = parsed.settings
    persistSettings()
  }
  if (parsed.appearance) {
    await api.put("/system-settings/appearance", { value: parsed.appearance })
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
