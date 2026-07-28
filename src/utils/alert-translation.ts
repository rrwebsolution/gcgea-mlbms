export type AlertLanguage = "en" | "ceb" | "tl"

const EXACT: Record<Exclude<AlertLanguage, "en">, Record<string, string>> = {
  ceb: {
    "Cannot submit": "Dili mahimong isumite",
    "Incomplete information": "Kulang ang impormasyon",
    "Eligibility override not available": "Dili magamit ang eligibility override",
    "Fully Paid Monthly Dues — Not Eligible": "Kompletong Bayad sa Monthly Dues — Dili Kwalipikado",
    "Monthly Dues": "Binuwan nga Bayranan",
    "No member selected": "Walay napiling miyembro",
    "Already paid": "Nabayran na",
    "Select at least one office.": "Pagpili og labing menos usa ka opisina.",
  },
  tl: {
    "Cannot submit": "Hindi maaaring isumite",
    "Incomplete information": "Kulang ang impormasyon",
    "Eligibility override not available": "Hindi magagamit ang eligibility override",
    "Fully Paid Monthly Dues — Not Eligible": "Ganap na Bayad na Monthly Dues — Hindi Kwalipikado",
    "Monthly Dues": "Buwanang Bayarin",
    "No member selected": "Walang napiling miyembro",
    "Already paid": "Bayad na",
    "Select at least one office.": "Pumili ng kahit isang opisina.",
  },
}

const PHRASES: Record<Exclude<AlertLanguage, "en">, Array<[RegExp, string]>> = {
  ceb: [
    [/\bmember\(s\)\b/gi, "miyembro"],
    [/\bmembers\b/gi, "mga miyembro"],
    [/\bmember\b/gi, "miyembro"],
    [/\balready paid\b/gi, "nabayran na"],
    [/\bautomatically excluded\b/gi, "awtomatikong gitangtang"],
    [/\bwill not be included\b/gi, "dili iapil"],
    [/\brequired\b/gi, "gikinahanglan"],
    [/\bselected\b/gi, "napili"],
    [/\bmissing\b/gi, "kulang"],
    [/\bmonth\(s\)\b/gi, "bulan"],
    [/\bmonths\b/gi, "mga bulan"],
    [/\bmonth\b/gi, "bulan"],
    [/\bfor this month\b/gi, "alang niining bulana"],
    [/\bPlease\b/gi, "Palihog"],
    [/\bNo\b/gi, "Walay"],
  ],
  tl: [
    [/\bmember\(s\)\b/gi, "miyembro"],
    [/\bmembers\b/gi, "mga miyembro"],
    [/\bmember\b/gi, "miyembro"],
    [/\balready paid\b/gi, "bayad na"],
    [/\bautomatically excluded\b/gi, "awtomatikong inalis"],
    [/\bwill not be included\b/gi, "hindi isasama"],
    [/\brequired\b/gi, "kinakailangan"],
    [/\bselected\b/gi, "napili"],
    [/\bmissing\b/gi, "kulang"],
    [/\bmonth\(s\)\b/gi, "buwan"],
    [/\bmonths\b/gi, "mga buwan"],
    [/\bmonth\b/gi, "buwan"],
    [/\bfor this month\b/gi, "para sa buwang ito"],
    [/\bPlease\b/gi, "Mangyaring"],
    [/\bNo\b/gi, "Walang"],
  ],
}

export function translateAlertText(text: string, language: AlertLanguage): string {
  if (language === "en") return text
  const exact = EXACT[language][text]
  if (exact) return exact
  return PHRASES[language].reduce((translated, [pattern, replacement]) => translated.replace(pattern, replacement), text)
}
