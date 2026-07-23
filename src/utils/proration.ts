import type { BenefitTypeFyAmount, BenefitTypeProrationTier } from "@/types/benefit"

/**
 * Mirrors app/Services/BenefitProrationService.php (computeAmount/tierFor/baseAmount)
 * for a live preview while encoding a benefit application. The server remains
 * authoritative — it recomputes and overrides this on submit, since the true
 * amount depends on the member's posted contribution/Pabaon-deduction history
 * as of submission time, not whatever was loaded when the page opened.
 *
 * Per GCGEA Board Resolution No. 24-2026 (Table 1 — Core Benefits, Table 2 —
 * Cash Pabaon Program).
 */

export function tierForMonths(tiers: BenefitTypeProrationTier[], months: number): BenefitTypeProrationTier | null {
  return tiers.find((tier) => months >= tier.minMonths && (tier.maxMonths === null || months <= tier.maxMonths)) ?? null
}

/**
 * The 100%-tier peso base: the benefit type's flat maximumAmount, unless it
 * has fiscal-year-indexed amounts configured (e.g. Cash Pabaon Program), in
 * which case the base escalates by year — an unconfigured future year falls
 * back to the highest configured year (the resolution's "and beyond" catch-all).
 */
export function baseAmountFor(fyAmounts: BenefitTypeFyAmount[], maximumAmount: number, fiscalYear?: number): number {
  if (fyAmounts.length === 0) return maximumAmount

  const year = fiscalYear ?? new Date().getFullYear()
  const exact = fyAmounts.find((fy) => fy.fiscalYear === year)
  if (exact) return exact.baseAmount

  const catchAll = fyAmounts.find((fy) => fy.fiscalYear === null)
  if (catchAll) return catchAll.baseAmount

  const latestConfigured = [...fyAmounts]
    .filter((fy): fy is BenefitTypeFyAmount & { fiscalYear: number } => fy.fiscalYear !== null)
    .sort((a, b) => b.fiscalYear - a.fiscalYear)[0]

  return latestConfigured ? latestConfigured.baseAmount : maximumAmount
}

export interface ProrationPreview {
  amount: number
  tier: BenefitTypeProrationTier | null
  monthsPaid: number
}

export function computeProratedAmount(
  tiers: BenefitTypeProrationTier[],
  fyAmounts: BenefitTypeFyAmount[],
  maximumAmount: number,
  monthsPaid: number,
  fiscalYear?: number
): ProrationPreview {
  const tier = tierForMonths(tiers, monthsPaid)
  const base = baseAmountFor(fyAmounts, maximumAmount, fiscalYear)
  const amount = tier ? Math.round(base * (tier.percentage / 100) * 100) / 100 : 0

  return { amount, tier, monthsPaid }
}

/** Distinct contribution/deduction periods on record — same "count paid months" convention already used for loan eligibility (contributionPeriod Set). */
export function countDistinctPeriods(periods: string[]): number {
  return new Set(periods).size
}
