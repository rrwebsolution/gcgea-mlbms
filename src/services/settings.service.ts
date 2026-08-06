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
    checkTemplate: {
      ...defaults.checkTemplate,
      ...value?.checkTemplate,
    },
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
  general: {
    ...DEFAULT_SYSTEM_SETTINGS.general,
    ...storedSettings.general,
  },
  benefit: {
    ...DEFAULT_SYSTEM_SETTINGS.benefit,
    ...storedSettings.benefit,
  },
  reportTemplate: mergeReportTemplate(storedSettings.reportTemplate),
}
// Replace the previous built-in blue/white gradients with the new solid
// theme defaults while preserving any genuinely customized color set.
function migrateDefaultProgressColors(value: AppearanceSettings): AppearanceSettings {
  const next = { ...value }
  if (
    (
      next.progressColorStart.toUpperCase() === "#2563EB"
      && next.progressColorMiddle.toUpperCase() === "#1E3A8A"
      && next.progressColorEnd.toUpperCase() === "#2563EB"
    )
    || (
      next.progressColorStart.toUpperCase() === "#FFFFFF"
      && next.progressColorMiddle.toUpperCase() === "#1E3A8A"
      && next.progressColorEnd.toUpperCase() === "#FFFFFF"
    )
  ) {
    next.progressColorStart = "#1E3A8A"
    next.progressColorMiddle = "#1E3A8A"
    next.progressColorEnd = "#1E3A8A"
  }
  if (
    next.progressDarkColorStart.toUpperCase() === "#FFFFFF"
    && next.progressDarkColorMiddle.toUpperCase() === "#1E3A8A"
    && next.progressDarkColorEnd.toUpperCase() === "#FFFFFF"
  ) {
    next.progressDarkColorMiddle = "#FFFFFF"
  }
  return next
}
let appearance: AppearanceSettings = migrateDefaultProgressColors({
  ...DEFAULT_APPEARANCE_SETTINGS,
  ...readStorage<Partial<AppearanceSettings>>(STORAGE_KEYS.appearanceSettings, DEFAULT_APPEARANCE_SETTINGS),
})
const settingsChannel = typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("gcgea:settings-values")
  : null

function publishSettingsChanged<K extends keyof SystemSettings>(section: K, value: SystemSettings[K], broadcast = true): void {
  const detail = { section, value, settings }
  window.dispatchEvent(new CustomEvent("gcgea:settings-changed", { detail }))
  if (broadcast) settingsChannel?.postMessage({ section, value })
}

if (settingsChannel) {
  settingsChannel.onmessage = (event: MessageEvent<{ section: keyof SystemSettings; value: SystemSettings[keyof SystemSettings] }>) => {
    const { section, value } = event.data
    settings = { ...settings, [section]: value }
    persistSettings()
    publishSettingsChanged(section, value, false)
  }
}
// Migrate installations that still carry the previous default font.
if (appearance.fontFamily === "geist") appearance.fontFamily = "century-gothic"

let backupHistory: BackupHistoryEntry[] = []

function persistSettings() {
  writeStorage(STORAGE_KEYS.systemSettings, settings)
}
function persistAppearance() {
  writeStorage(STORAGE_KEYS.appearanceSettings, appearance)
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
    "century-gothic": "'Century Gothic', CenturyGothic, AppleGothic, Arial, sans-serif",
    arial: "Arial, Helvetica, sans-serif",
    calibri: "Calibri, Candara, 'Segoe UI', sans-serif",
    verdana: "Verdana, Geneva, sans-serif",
    geist: "'Geist Variable', sans-serif",
    poppins: "Poppins, Arial, sans-serif",
    roboto: "Roboto, Arial, sans-serif",
    inter: "Inter, system-ui, sans-serif",
    "times-new-roman": "'Times New Roman', Times, serif",
    system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    monospace: "'Cascadia Code', Consolas, monospace",
  }
  root.style.setProperty("--primary", value.primaryColor)
  root.style.setProperty("--primary-foreground", readableTextColor(value.primaryColor))
  root.style.setProperty("--secondary", value.secondaryColor)
  root.style.setProperty("--secondary-foreground", readableTextColor(value.secondaryColor))
  root.style.setProperty("--gold", value.accentColor)
  root.style.setProperty("--gold-foreground", readableTextColor(value.accentColor))
  root.style.setProperty("--app-background", value.backgroundColor)
  // Sidebar colors are intentionally owned by the light/dark CSS theme so
  // navigation always follows the active theme instead of a fixed inline color.
  const isDark = root.classList.contains("dark")
  root.style.setProperty("--progress-start", isDark ? value.progressDarkColorStart : value.progressColorStart)
  root.style.setProperty("--progress-middle", isDark ? value.progressDarkColorMiddle : value.progressColorMiddle)
  root.style.setProperty("--progress-end", isDark ? value.progressDarkColorEnd : value.progressColorEnd)
  const selectedFontFamily = fontFamilies[value.fontFamily]
  root.style.setProperty("--font-sans", selectedFontFamily)
  root.style.setProperty("--font-heading", selectedFontFamily)
  // Tailwind expands the base `font-sans` apply at build time, so changing only
  // the custom property does not update the font inherited by the whole page.
  root.style.fontFamily = selectedFontFamily
  document.body.style.fontFamily = selectedFontFamily
  root.style.fontSize = `${Math.min(20, Math.max(12, value.baseFontSize))}px`
  document.body.style.fontWeight = String(value.fontWeight)
  document.body.style.fontStyle = value.fontStyle
  root.style.setProperty("--radius", `${value.borderRadius}px`)
  root.dataset.compact = value.compactMode ? "true" : "false"
  root.dataset.sidebarStyle = value.sidebarStyle
  root.dataset.logoSize = value.logoSize
  root.dataset.loginBackground = value.loginBackground
  window.dispatchEvent(new CustomEvent("gcgea:appearance-changed", { detail: value }))
}

export function getSettings(): SystemSettings {
  return settings
}

export function getAppearance(): AppearanceSettings {
  return appearance
}

export async function loadAppearance(): Promise<AppearanceSettings> {
  const { data } = await api.get<Partial<AppearanceSettings>>("/appearance-settings")
  appearance = migrateDefaultProgressColors({ ...DEFAULT_APPEARANCE_SETTINGS, ...appearance, ...data })
  persistAppearance()
  return appearance
}

export function getBackupHistory(): BackupHistoryEntry[] {
  return backupHistory
}

export interface StorageUsage {
  usedBytes: number
  totalBytes: number
}

/** Database size against the hosting plan's fixed storage cap — backs the sidebar's usage indicator. */
export async function getStorageUsage(): Promise<StorageUsage> {
  const { data } = await api.get<StorageUsage>("/system-storage-usage")
  return data
}

// A server section missing keys (e.g. a row saved before a field was added)
// must fall back to defaults for those keys, not wipe out the whole section.
function mergeServerSection<K extends keyof SystemSettings>(key: K, serverValue?: Partial<SystemSettings[K]>): SystemSettings[K] {
  return serverValue ? { ...DEFAULT_SYSTEM_SETTINGS[key], ...settings[key], ...serverValue } : settings[key]
}

function validAmount(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback
}

function normalizeRoundingRule(value: unknown): string {
  const aliases: Record<string, string> = {
    "Round to nearest centavo": "Nearest Centavo",
    "Round to nearest peso": "Nearest Peso",
    "Round up": "Round Up",
    "Round down": "Round Down",
  }
  const normalized = aliases[String(value)] ?? String(value)
  return ["Nearest Centavo", "Nearest Peso", "Round Up", "Round Down"].includes(normalized)
    ? normalized
    : "Nearest Centavo"
}

export async function loadSystemSettings(): Promise<{ settings: SystemSettings; appearance: AppearanceSettings }> {
  const { data } = await api.get<Partial<SystemSettings> & { appearance?: AppearanceSettings }>("/system-settings")
  const serverAppearance = data.appearance
  const serverSections = { ...data }
  delete serverSections.appearance
  if (serverSections.general) {
    serverSections.general = {
      ...serverSections.general,
      timeZone: serverSections.general.timeZone?.split(" ")[0] || DEFAULT_SYSTEM_SETTINGS.general.timeZone,
      currency: serverSections.general.currency?.startsWith("USD") ? "USD" : "PHP",
    }
  }

  const mergedBenefit = mergeServerSection("benefit", serverSections.benefit)
  settings = {
    ...DEFAULT_SYSTEM_SETTINGS,
    ...settings,
    general: mergeServerSection("general", serverSections.general),
    organization: mergeServerSection("organization", serverSections.organization),
    numbering: mergeServerSection("numbering", serverSections.numbering),
    loan: {
      ...mergeServerSection("loan", serverSections.loan),
      roundingRule: normalizeRoundingRule(mergeServerSection("loan", serverSections.loan).roundingRule),
    },
    contribution: mergeServerSection("contribution", serverSections.contribution),
    benefit: {
      ...mergedBenefit,
      nuclearFamilyParentAmount: validAmount(mergedBenefit.nuclearFamilyParentAmount, DEFAULT_SYSTEM_SETTINGS.benefit.nuclearFamilyParentAmount),
      nuclearFamilyFirstSiblingAmount: validAmount(mergedBenefit.nuclearFamilyFirstSiblingAmount, DEFAULT_SYSTEM_SETTINGS.benefit.nuclearFamilyFirstSiblingAmount),
      nuclearFamilySecondSiblingAmount: validAmount(mergedBenefit.nuclearFamilySecondSiblingAmount, DEFAULT_SYSTEM_SETTINGS.benefit.nuclearFamilySecondSiblingAmount),
      nuclearFamilyThirdSiblingAmount: validAmount(mergedBenefit.nuclearFamilyThirdSiblingAmount, DEFAULT_SYSTEM_SETTINGS.benefit.nuclearFamilyThirdSiblingAmount),
    },
    notification: mergeServerSection("notification", serverSections.notification),
    security: mergeServerSection("security", serverSections.security),
    backup: mergeServerSection("backup", serverSections.backup),
    reportTemplate: mergeReportTemplate(serverSections.reportTemplate ?? settings.reportTemplate),
  } as SystemSettings
  appearance = migrateDefaultProgressColors({ ...DEFAULT_APPEARANCE_SETTINGS, ...appearance, ...serverAppearance })
  persistSettings()
  persistAppearance()
  return { settings, appearance }
}

export async function saveSettingsSection<K extends keyof SystemSettings>(section: K, value: SystemSettings[K]): Promise<SystemSettings> {
  const { data } = await api.put<SystemSettings[K]>(`/system-settings/${section}`, { value })
  const savedValue = section === "reportTemplate"
    ? mergeReportTemplate(data as Partial<SystemSettings["reportTemplate"]>) as SystemSettings[K]
    : data
  settings = { ...settings, [section]: savedValue }
  persistSettings()
  publishSettingsChanged(section, savedValue)
  return settings
}

export async function saveAppearance(value: AppearanceSettings): Promise<AppearanceSettings> {
  await api.put("/system-settings/appearance", { value })
  appearance = value
  persistAppearance()
  return appearance
}

export async function resetSettingsSection<K extends keyof SystemSettings>(section: K): Promise<SystemSettings> {
  const { data } = await api.put<SystemSettings[K]>(`/system-settings/${section}`, { value: DEFAULT_SYSTEM_SETTINGS[section] })
  const resetValue = section === "reportTemplate"
    ? mergeReportTemplate(data as Partial<SystemSettings["reportTemplate"]>) as SystemSettings[K]
    : data
  settings = { ...settings, [section]: resetValue }
  persistSettings()
  publishSettingsChanged(section, settings[section])
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

export async function listBackups(): Promise<BackupHistoryEntry[]> {
  const { data } = await api.get<BackupHistoryEntry[]>("/system-backups")
  backupHistory = data
  return data
}

export async function createBackup(): Promise<BackupHistoryEntry> {
  const { data } = await api.post<BackupHistoryEntry>("/system-backups")
  backupHistory = [data, ...backupHistory]
  return data
}

export async function downloadBackup(id: string, name: string): Promise<void> {
  const response = await api.get(`/system-backups/${id}/download`, { responseType: "blob" })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export async function deleteBackupEntry(id: string): Promise<void> {
  await api.delete(`/system-backups/${id}`)
  backupHistory = backupHistory.filter((b) => b.id !== id)
}
