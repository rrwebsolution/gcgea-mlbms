import { getSettings } from "@/services/settings.service"

function generalFormatting() {
  const general = getSettings().general
  const locale = general.defaultLanguage === "Tagalog" ? "fil-PH" : "en-PH"
  return { general, locale }
}

export function formatCurrency(amount: number): string {
  const { general, locale } = generalFormatting()
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: general.currency === "USD" ? "USD" : "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "—"
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "—"
  const { general, locale } = generalFormatting()
  const formats: Record<string, Intl.DateTimeFormatOptions> = {
    "MMMM d, yyyy": { year: "numeric", month: "long", day: "numeric" },
    "MMM d, yyyy": { year: "numeric", month: "short", day: "numeric" },
    "MM/dd/yyyy": { year: "numeric", month: "2-digit", day: "2-digit" },
    "dd/MM/yyyy": { year: "numeric", month: "2-digit", day: "2-digit" },
  }
  const localeForFormat = general.dateFormat === "dd/MM/yyyy" ? "en-GB" : locale
  return new Intl.DateTimeFormat(localeForFormat, {
    ...(formats[general.dateFormat] ?? formats["MMMM d, yyyy"]),
    timeZone: general.timeZone,
  }).format(date)
}

export function formatDateShort(dateString?: string): string {
  if (!dateString) return "—"
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "—"
  const { general, locale } = generalFormatting()
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: general.timeZone,
  }).format(date)
}

export function formatMonthYear(dateString?: string): string {
  if (!dateString) return "â€”"
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "â€”"
  const { general, locale } = generalFormatting()
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: general.timeZone,
  }).format(date)
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return "—"
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "—"
  const { general, locale } = generalFormatting()
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: general.timeZone,
  }).format(date)
}

export function calculateAge(birthdate: string, asOf: Date = new Date()): number {
  const bd = new Date(birthdate)
  if (Number.isNaN(bd.getTime())) return 0
  let age = asOf.getFullYear() - bd.getFullYear()
  const monthDiff = asOf.getMonth() - bd.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < bd.getDate())) {
    age--
  }
  return age
}

export function calculateDurationLabel(startDate: string, asOf: Date = new Date()): string {
  const start = new Date(startDate)
  if (Number.isNaN(start.getTime())) return "—"
  let years = asOf.getFullYear() - start.getFullYear()
  let months = asOf.getMonth() - start.getMonth()
  if (asOf.getDate() < start.getDate()) months--
  if (months < 0) {
    years--
    months += 12
  }
  if (years <= 0 && months <= 0) return "Less than a month"
  const parts: string[] = []
  if (years > 0) parts.push(`${years} yr${years !== 1 ? "s" : ""}`)
  if (months > 0) parts.push(`${months} mo${months !== 1 ? "s" : ""}`)
  return parts.join(", ")
}

export function calculateDurationMonths(startDate: string, asOf: Date = new Date()): number {
  const start = new Date(startDate)
  if (Number.isNaN(start.getTime())) return 0
  return (
    (asOf.getFullYear() - start.getFullYear()) * 12 +
    (asOf.getMonth() - start.getMonth())
  )
}

export function formatPhilippineMobile(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`
}

export function initialsFromName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
