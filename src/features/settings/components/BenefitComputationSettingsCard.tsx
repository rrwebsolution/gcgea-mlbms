import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"
import { AlertBanner } from "@/components/shared/AlertBanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { listBenefitTypes, updateBenefitType } from "@/services/benefits.service"
import { formatCurrency } from "@/utils/format"
import type { BenefitType, BenefitTypeFyAmountInput, BenefitTypeProrationTierInput, ProrationBasis } from "@/types"

const CORE_BENEFITS = [
  { name: "Retirement and Separation Benefit", maximumAmount: 10_000 },
  { name: "Mortuary Cash Assistance", maximumAmount: 10_000 },
  { name: "Mortuary Cash Assistance for Nuclear Family Member", maximumAmount: 5_000 },
] as const

const CASH_PABAON_NAME = "Cash Pabaon Program"

const BEYOND_MONTHS = 99_999_999_999

const DEFAULT_TIERS: BenefitTypeProrationTierInput[] = [
  { minMonths: 12, maxMonths: 23, percentage: 35 },
  { minMonths: 24, maxMonths: 35, percentage: 45 },
  { minMonths: 36, maxMonths: 47, percentage: 55 },
  { minMonths: 48, maxMonths: 59, percentage: 65 },
  { minMonths: 60, maxMonths: 71, percentage: 75 },
  { minMonths: 72, maxMonths: 83, percentage: 85 },
  { minMonths: 84, maxMonths: 95, percentage: 95 },
  { minMonths: 96, maxMonths: BEYOND_MONTHS, percentage: 100 },
]

const DEFAULT_PABAON_TIERS: BenefitTypeProrationTierInput[] = [
  { minMonths: 12, maxMonths: 35, percentage: 12 },
  { minMonths: 36, maxMonths: 47, percentage: 15 },
  { minMonths: 48, maxMonths: 59, percentage: 20 },
  { minMonths: 60, maxMonths: 71, percentage: 35 },
  { minMonths: 72, maxMonths: 83, percentage: 40 },
  { minMonths: 84, maxMonths: 95, percentage: 45 },
  { minMonths: 96, maxMonths: 107, percentage: 50 },
  { minMonths: 108, maxMonths: 119, percentage: 55 },
  { minMonths: 120, maxMonths: 131, percentage: 65 },
  { minMonths: 132, maxMonths: 143, percentage: 70 },
  { minMonths: 144, maxMonths: 155, percentage: 75 },
  { minMonths: 156, maxMonths: 167, percentage: 80 },
  { minMonths: 168, maxMonths: 179, percentage: 90 },
  { minMonths: 180, maxMonths: BEYOND_MONTHS, percentage: 100 },
]

const DEFAULT_PABAON_FY_AMOUNTS: BenefitTypeFyAmountInput[] = [
  { fiscalYear: 2026, baseAmount: 70_000 },
  { fiscalYear: 2027, baseAmount: 80_000 },
  { fiscalYear: 2028, baseAmount: 90_000 },
  { fiscalYear: null, baseAmount: 100_000 },
]

function fullUpdatePayload(
  type: BenefitType,
  tiers: BenefitTypeProrationTierInput[],
  maximumAmount: number,
  prorationBasis: ProrationBasis = "dues",
  fyAmounts: BenefitTypeFyAmountInput[] = [],
) {
  return {
    name: type.name,
    description: type.description,
    defaultAmount: maximumAmount,
    maximumAmount,
    prorationBasis,
    prorationTiers: tiers.map((tier) => ({
      ...tier,
      // The UI uses an explicit enterprise-scale sentinel for "and beyond";
      // the existing backend stores the same meaning as NULL/open-ended.
      maxMonths: tier.maxMonths === BEYOND_MONTHS ? null : tier.maxMonths,
    })),
    fyAmounts,
    eligibilityRequirements: type.eligibilityRequirements,
    requiredMembershipMonths: type.requiredMembershipMonths,
    frequencyLimit: type.frequencyLimit,
    requiredDocuments: type.requiredDocuments,
    approvalRequired: type.approvalRequired,
    status: type.status,
  }
}

export interface BenefitComputationSettingsHandle {
  save: () => Promise<void>
}

export interface BenefitComputationSettingsCardProps {
  independentSpousalBenefitRights: boolean
  onIndependentSpousalBenefitRightsChange: (value: boolean) => void
}

export const BenefitComputationSettingsCard = React.forwardRef<BenefitComputationSettingsHandle, BenefitComputationSettingsCardProps>(function BenefitComputationSettingsCard(
  { independentSpousalBenefitRights, onIndependentSpousalBenefitRightsChange },
  ref
) {
  const queryClient = useQueryClient()
  const { data: benefitTypes = [] } = useQuery({ queryKey: ["benefit-types"], queryFn: listBenefitTypes })
  const configuredTypes = CORE_BENEFITS.map((definition) => ({
    ...definition,
    type: benefitTypes.find((type) => type.name === definition.name),
  }))
  const sourceTiers = configuredTypes.find((entry) => entry.type)?.type?.prorationTiers
  const [tiers, setTiers] = React.useState<BenefitTypeProrationTierInput[]>(DEFAULT_TIERS)

  const pabaonType = benefitTypes.find((type) => type.name === CASH_PABAON_NAME)
  const sourcePabaonTiers = pabaonType?.prorationTiers
  const sourceFyAmounts = pabaonType?.fyAmounts
  const [pabaonTiers, setPabaonTiers] = React.useState<BenefitTypeProrationTierInput[]>(DEFAULT_PABAON_TIERS)
  const [fyAmounts, setFyAmounts] = React.useState<BenefitTypeFyAmountInput[]>(DEFAULT_PABAON_FY_AMOUNTS)

  React.useEffect(() => {
    if (sourceTiers?.length) {
      setTiers(sourceTiers.map((tier) => ({
        minMonths: tier.minMonths,
        maxMonths: tier.maxMonths ?? BEYOND_MONTHS,
        percentage: tier.percentage,
      })))
    }
  }, [sourceTiers])

  React.useEffect(() => {
    if (sourcePabaonTiers?.length) {
      setPabaonTiers(sourcePabaonTiers.map((tier) => ({
        minMonths: tier.minMonths,
        maxMonths: tier.maxMonths ?? BEYOND_MONTHS,
        percentage: tier.percentage,
      })))
    }
  }, [sourcePabaonTiers])

  React.useEffect(() => {
    if (sourceFyAmounts?.length) {
      setFyAmounts(sourceFyAmounts.map((amount) => ({ fiscalYear: amount.fiscalYear, baseAmount: amount.baseAmount })))
    }
  }, [sourceFyAmounts])

  const invalidRange = tiers.some((tier, index) =>
    tier.minMonths < 0
    || (tier.maxMonths != null && tier.maxMonths < tier.minMonths)
    || tier.percentage < 0
    || tier.percentage > 100
    || (index > 0 && tier.minMonths !== (tiers[index - 1].maxMonths ?? tier.minMonths - 1) + 1)
  )

  const invalidPabaonRange = pabaonTiers.some((tier, index) =>
    tier.minMonths < 0
    || (tier.maxMonths != null && tier.maxMonths < tier.minMonths)
    || tier.percentage < 0
    || tier.percentage > 100
    || (index > 0 && tier.minMonths !== (pabaonTiers[index - 1].maxMonths ?? tier.minMonths - 1) + 1)
  )

  const invalidFyAmounts = fyAmounts.some((amount) => amount.baseAmount < 0)
    || new Set(fyAmounts.map((amount) => amount.fiscalYear)).size !== fyAmounts.length

  const pabaonMaximumAmount = fyAmounts.find((amount) => amount.fiscalYear == null)?.baseAmount
    ?? Math.max(0, ...fyAmounts.map((amount) => amount.baseAmount))

  const saveMutation = useMutation({
    mutationFn: async () => {
      const missing = configuredTypes.filter((entry) => !entry.type)
      if (missing.length) throw new Error(`Missing benefit type: ${missing.map((entry) => entry.name).join(", ")}`)
      if (!pabaonType) throw new Error(`Missing benefit type: ${CASH_PABAON_NAME}`)
      return Promise.all([
        ...configuredTypes.map((entry) =>
          updateBenefitType(entry.type!.id, fullUpdatePayload(entry.type!, tiers, entry.maximumAmount))
        ),
        updateBenefitType(pabaonType.id, fullUpdatePayload(pabaonType, pabaonTiers, pabaonMaximumAmount, "pabaon", fyAmounts)),
      ])
    },
    onSuccess: async (updatedTypes) => {
      queryClient.setQueryData<BenefitType[]>(["benefit-types"], (current = []) => {
        const updates = new Map(updatedTypes.map((type) => [type.id, type]))
        return current.map((type) => updates.get(type.id) ?? type)
      })
      await queryClient.refetchQueries({ queryKey: ["benefit-types"], type: "all" })
    },
  })

  React.useImperativeHandle(ref, () => ({
    save: async () => {
      if (invalidRange || invalidPabaonRange) throw new Error("Fix the benefit computation month ranges before saving.")
      if (invalidFyAmounts) throw new Error("Fix the Cash Pabaon Program fiscal year amounts before saving.")
      await saveMutation.mutateAsync()
    },
  }), [invalidRange, invalidPabaonRange, invalidFyAmounts, saveMutation])

  function updateTier(index: number, patch: Partial<BenefitTypeProrationTierInput>) {
    setTiers((current) => current.map((tier, tierIndex) => tierIndex === index ? { ...tier, ...patch } : tier))
  }

  function addTier() {
    setTiers((current) => {
      if (current.length === 0) return [{ minMonths: 0, maxMonths: BEYOND_MONTHS, percentage: 100 }]
      const next = current.map((tier) => ({ ...tier }))
      const last = next[next.length - 1]
      const nextMin = last.minMonths + 12
      last.maxMonths = nextMin - 1
      return [...next, { minMonths: nextMin, maxMonths: BEYOND_MONTHS, percentage: 100 }]
    })
  }

  function removeTier(index: number) {
    setTiers((current) => {
      if (current.length <= 1) return current
      const next = current.filter((_, tierIndex) => tierIndex !== index).map((tier) => ({ ...tier }))
      for (let tierIndex = 0; tierIndex < next.length - 1; tierIndex += 1) {
        next[tierIndex].maxMonths = next[tierIndex + 1].minMonths - 1
      }
      next[next.length - 1].maxMonths = BEYOND_MONTHS
      return next
    })
  }

  function updatePabaonTier(index: number, patch: Partial<BenefitTypeProrationTierInput>) {
    setPabaonTiers((current) => current.map((tier, tierIndex) => tierIndex === index ? { ...tier, ...patch } : tier))
  }

  function addPabaonTier() {
    setPabaonTiers((current) => {
      if (current.length === 0) return [{ minMonths: 0, maxMonths: BEYOND_MONTHS, percentage: 100 }]
      const next = current.map((tier) => ({ ...tier }))
      const last = next[next.length - 1]
      const nextMin = last.minMonths + 12
      last.maxMonths = nextMin - 1
      return [...next, { minMonths: nextMin, maxMonths: BEYOND_MONTHS, percentage: 100 }]
    })
  }

  function removePabaonTier(index: number) {
    setPabaonTiers((current) => {
      if (current.length <= 1) return current
      const next = current.filter((_, tierIndex) => tierIndex !== index).map((tier) => ({ ...tier }))
      for (let tierIndex = 0; tierIndex < next.length - 1; tierIndex += 1) {
        next[tierIndex].maxMonths = next[tierIndex + 1].minMonths - 1
      }
      next[next.length - 1].maxMonths = BEYOND_MONTHS
      return next
    })
  }

  function updateFyAmount(index: number, patch: Partial<BenefitTypeFyAmountInput>) {
    setFyAmounts((current) => current.map((amount, amountIndex) => amountIndex === index ? { ...amount, ...patch } : amount))
  }

  function addFyAmount() {
    setFyAmounts((current) => {
      const numericYears = current.filter((amount) => amount.fiscalYear != null).map((amount) => amount.fiscalYear as number)
      const nextYear = numericYears.length ? Math.max(...numericYears) + 1 : new Date().getFullYear()
      const catchAll = current.find((amount) => amount.fiscalYear == null)
      const rest = current.filter((amount) => amount.fiscalYear != null)
      const newEntry: BenefitTypeFyAmountInput = { fiscalYear: nextYear, baseAmount: catchAll?.baseAmount ?? 0 }
      return catchAll ? [...rest, newEntry, catchAll] : [...rest, newEntry]
    })
  }

  function removeFyAmount(index: number) {
    setFyAmounts((current) => {
      if (current.length <= 1) return current
      return current.filter((_, amountIndex) => amountIndex !== index)
    })
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <Tabs defaultValue="core">
        <div className="border-b p-5 pb-0">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="core">Core Benefits</TabsTrigger>
            <TabsTrigger value="pabaon">Cash Pabaon Program</TabsTrigger>
            <TabsTrigger value="rights">Nuclear Family Rights</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="core" className="mt-0">
      <div className="border-b p-5">
        <div>
          <h3 className="font-semibold">THE CORE BENEFITS OF THE ASSOCIATION</h3>
          <p className="mt-1 text-sm font-medium">Core Benefits of Good Standing GCGEA Members</p>
          <p className="mt-1 max-w-4xl text-xs leading-relaxed text-muted-foreground">
            Good Standing: ₱100.00 monthly dues are current; ₱200.00 Cash Pabaon contributions are current;
            continuous paid monthly contributions; no delinquent obligations; no suspension; active membership;
            and no pending termination.
          </p>
        </div>
      </div>

      <Tabs defaultValue="retirement" className="p-4 pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="retirement">Retirement / Separation</TabsTrigger>
            <TabsTrigger value="mortuary">Mortuary Member</TabsTrigger>
            <TabsTrigger value="nuclear">Nuclear Family</TabsTrigger>
          </TabsList>
          <Button type="button" size="sm" variant="outline" onClick={addTier}>
            <Plus className="size-4" /> Add Row
          </Button>
        </div>

        {[
          { value: "retirement", title: "Retirement and Separation Benefits", maximum: 10_000 },
          { value: "mortuary", title: "Mortuary Cash Assistance", maximum: 10_000 },
          { value: "nuclear", title: "Mortuary Cash Assistance for Nuclear Family Member", maximum: 5_000 },
        ].map((benefit) => (
          <TabsContent key={benefit.value} value={benefit.value} className="mt-0">
            <AlertBanner
              className="mb-4"
              tone="info"
              title={`${benefit.title} — ${formatCurrency(benefit.maximum)} Maximum`}
              titleClassName={benefit.value === "nuclear" ? "text-xs sm:text-[13px]" : undefined}
              description="Benefit Amount = Maximum Benefit × the percentage corresponding to the member's qualified contribution months."
            />
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>Monthly Dues Contributions (₱100.00 per month)</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead className="max-w-52 whitespace-normal text-[10px] leading-tight">
                      {benefit.title} ({formatCurrency(benefit.maximum)})
                    </TableHead>
                    <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((tier, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex min-w-56 items-center gap-2">
                          <Input className="h-8 w-20" type="number" min={0} value={tier.minMonths} onChange={(event) => updateTier(index, { minMonths: Number(event.target.value) })} />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            className="h-8 w-24"
                            type="number"
                            min={tier.minMonths}
                            value={tier.maxMonths ?? BEYOND_MONTHS}
                            onChange={(event) => updateTier(index, { maxMonths: Number(event.target.value) })}
                          />
                          <span className="text-muted-foreground">{tier.maxMonths === BEYOND_MONTHS ? "months and beyond" : "months contributions"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input className="h-8 w-20" type="number" min={0} max={100} value={tier.percentage} onChange={(event) => updateTier(index, { percentage: Number(event.target.value) })} />
                          <span>%</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(benefit.maximum * tier.percentage / 100)}</TableCell>
                      <TableCell className="w-12">
                        <Button type="button" variant="ghost" size="icon-sm" disabled={tiers.length <= 1} onClick={() => removeTier(index)} aria-label={`Remove tier ${index + 1}`}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="space-y-3 border-t bg-muted/10 px-5 py-4 text-xs leading-relaxed text-muted-foreground">
        <p className="italic">
          (One contribution month means one calendar month for which the prescribed dues have been fully paid
          through payroll deduction or direct payment duly receipted by the Treasurer.)
        </p>
        <p>
          Benefits shall apply only to claims whose qualifying event occurs after the effectivity of this
          Resolution unless otherwise expressly authorized by the Board.
        </p>
        <ol className="list-inside list-decimal space-y-1 font-medium text-foreground/90">
          <li>Retirement and Separation Benefits – Ten Thousand Pesos (Php. 10,000.00) Maximum</li>
          <li>Mortuary Cash Assistance – Ten Thousand Pesos (Php. 10,000.00) Maximum</li>
          <li>Mortuary Cash Assistance for Nuclear Family Member – Five Thousand Pesos (Php. 5,000.00) Maximum</li>
        </ol>
        <p className="font-semibold text-foreground">Table 1 – Prorate Core Benefits</p>
      </div>
      {invalidRange && <p className="border-t bg-destructive/5 px-5 py-3 text-sm text-destructive">Month ranges must be continuous and percentages must be between 0% and 100%.</p>}
        </TabsContent>

        <TabsContent value="pabaon" className="mt-0">
      <div className="border-b p-5">
        <div>
          <h3 className="font-semibold">THE GCGEA CASH PABAON PROGRAM</h3>
          <p className="mt-1 text-sm font-medium">Pabaon Benefit = Maximum Benefit for the Fiscal Year × Percentage</p>
          <p className="mt-1 max-w-4xl text-xs leading-relaxed text-muted-foreground">
            This table follows the same computation as the Core Benefits above, but instead of a fixed maximum
            benefit, the maximum benefit depends on the Fiscal Year (FY) of the claim. Only the maximum benefit
            changes each fiscal year; the applicable percentage is determined by the member&apos;s total number of
            paid Cash Pabaon contribution months.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-semibold">Fiscal Year Maximum Benefits</h4>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={addFyAmount}>
              <Plus className="size-4" /> Add Fiscal Year
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={addPabaonTier}>
              <Plus className="size-4" /> Add Row
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fiscal Year</TableHead>
                <TableHead>Maximum Benefit</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fyAmounts.map((amount, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {amount.fiscalYear == null ? (
                      <span className="text-sm font-medium text-muted-foreground">and beyond</span>
                    ) : (
                      <Input
                        className="h-8 w-24"
                        type="number"
                        value={amount.fiscalYear}
                        onChange={(event) => updateFyAmount(index, { fiscalYear: Number(event.target.value) })}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-32"
                      type="number"
                      min={0}
                      value={amount.baseAmount}
                      onChange={(event) => updateFyAmount(index, { baseAmount: Number(event.target.value) })}
                    />
                  </TableCell>
                  <TableCell className="w-12">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={fyAmounts.length <= 1 || amount.fiscalYear == null}
                      onClick={() => removeFyAmount(index)}
                      aria-label={`Remove fiscal year ${index + 1}`}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-sm text-muted-foreground">
          To make benefits more equitable by recognizing members who have contributed for intermediate periods,
          here is the prorate of Cash Pabaon Program:
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Total Monthly Pabaon Contributions (₱200.00 per month)</TableHead>
                <TableHead>Percentage</TableHead>
                {fyAmounts.map((amount, fyIndex) => (
                  <TableHead key={fyIndex} className="max-w-32 whitespace-normal text-[10px] leading-tight">
                    {amount.fiscalYear == null ? "and Beyond" : `FY ${amount.fiscalYear}`} ({formatCurrency(amount.baseAmount)})
                  </TableHead>
                ))}
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pabaonTiers.map((tier, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex min-w-56 items-center gap-2">
                      <Input className="h-8 w-20" type="number" min={0} value={tier.minMonths} onChange={(event) => updatePabaonTier(index, { minMonths: Number(event.target.value) })} />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        className="h-8 w-24"
                        type="number"
                        min={tier.minMonths}
                        value={tier.maxMonths ?? BEYOND_MONTHS}
                        onChange={(event) => updatePabaonTier(index, { maxMonths: Number(event.target.value) })}
                      />
                      <span className="text-muted-foreground">{tier.maxMonths === BEYOND_MONTHS ? "months and beyond" : "months contributions"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input className="h-8 w-20" type="number" min={0} max={100} value={tier.percentage} onChange={(event) => updatePabaonTier(index, { percentage: Number(event.target.value) })} />
                      <span>%</span>
                    </div>
                  </TableCell>
                  {fyAmounts.map((amount, fyIndex) => (
                    <TableCell key={fyIndex} className="font-semibold">{formatCurrency(amount.baseAmount * tier.percentage / 100)}</TableCell>
                  ))}
                  <TableCell className="w-12">
                    <Button type="button" variant="ghost" size="icon-sm" disabled={pabaonTiers.length <= 1} onClick={() => removePabaonTier(index)} aria-label={`Remove tier ${index + 1}`}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-3 border-t bg-muted/10 px-5 py-4 text-xs leading-relaxed text-muted-foreground">
        <p className="italic">
          (One Pabaon contribution month means one calendar month for which the prescribed ₱200.00 Cash Pabaon
          deduction has been fully posted through payroll.)
        </p>
        <p>
          Benefits shall apply only to claims whose qualifying event occurs after the effectivity of this
          Resolution unless otherwise expressly authorized by the Board.
        </p>
        <div>
          <p className="font-medium text-foreground/90">The Cash Pabaon Program benefit may be claimed by:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>
              A good standing GCGEA member upon retirement (members aged between 60 to 65 years old) or separation
              from the Association (59 years old and below, or separation due to promotion) – following Table No. 2
              Prorate Cash Pabaon.
            </li>
            <li>
              A good standing GCGEA member&apos;s qualified nuclear family in the event of the member&apos;s death.
              Qualified beneficiaries shall include the legal spouse, legitimate or legally adopted unmarried
              children regardless of age, or, in the case of an unmarried GCGEA member, his or her parent or
              sibling – following Table No. 2 Prorate Cash Pabaon.
            </li>
          </ul>
        </div>
        <p>
          Entitlement to the benefit shall be subject to the member&apos;s full compliance with all Association
          policies and requirements, including the complete settlement of all financial and other obligations with
          GCGEA.
        </p>
        <p>
          <span className="font-medium text-foreground/90">Financial Sustainability.</span> The benefit schedules
          prescribed under this Resolution shall be subject to the continuing financial capability of the
          Association. Before any increase in benefit amounts takes effect, the Treasurer shall certify the
          availability of funds, the Auditor shall verify the financial condition of the Association, and the
          Board of Directors shall determine, through a duly approved Resolution, that the Association&apos;s
          reserve funds and projected revenues are sufficient to sustain the increased benefits without prejudice
          to existing obligations.
        </p>
        <div>
          <p className="font-medium text-foreground/90">1) The Cash Pabaon Mortuary for Nuclear Family Member.</p>
          <p className="mt-1">
            The mortuary benefit for nuclear family member, as defined by the association guidelines particularly
            on Article 5 of Resolution No. 35 series of 2014, the nuclear family members are: the legal wife or
            legal husband, and the legitimate or legally adopted unmarried children who are not married irrespective
            of age. The amount of nuclear mortuary assistance of an unmarried member covers the living parent/s and
            a maximum of Three (3) Single Brothers or Sisters with the following breakdown:
          </p>
          <ol className="mt-1 list-inside list-[lower-roman] space-y-1">
            <li>First sibling – Fifteen Thousand Pesos (Php. 15,000.00).</li>
            <li>Second sibling – Ten Thousand Pesos (Php. 10,000.00).</li>
            <li>Third and Last Sibling – Five Thousand Pesos (Php. 5,000.00).</li>
          </ol>
        </div>
        <p className="font-semibold text-foreground">Table 2 – Prorate Cash Pabaon Program</p>
      </div>
      {(invalidPabaonRange || invalidFyAmounts) && (
        <p className="border-t bg-destructive/5 px-5 py-3 text-sm text-destructive">
          Month ranges must be continuous, percentages must be between 0% and 100%, and fiscal years must be unique.
        </p>
      )}
        </TabsContent>

        <TabsContent value="rights" className="mt-0">
      <div className="border-b p-5">
        <h3 className="font-semibold">RIGHTS OF GCGEA MEMBERS WITHIN THE SAME NUCLEAR FAMILY</h3>
        <p className="mt-1 max-w-4xl text-xs leading-relaxed text-muted-foreground">
          In the event that two regular GCGEA members are legally married to each other and are both members in
          good standing, each member shall have an independent and separate right to receive all benefits,
          privileges, and entitlements provided by the Association. Membership rights and benefits shall be
          personal to each member and shall not be affected by the membership status of the other spouse.
        </p>
      </div>
      <div className="p-5">
        <label className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card p-4 hover:border-border transition-all duration-200 cursor-pointer shadow-sm/5">
          <span className="space-y-0.5">
            <span className="block text-sm font-semibold text-foreground">Independent Spousal Benefit Rights</span>
            <span className="block text-xs text-muted-foreground leading-normal">
              When enabled, a member&apos;s benefit eligibility is evaluated solely on their own standing and is
              never reduced or disqualified because of their spouse&apos;s membership status or claims.
            </span>
          </span>
          <Switch checked={independentSpousalBenefitRights} onCheckedChange={onIndependentSpousalBenefitRightsChange} className="mt-0.5" />
        </label>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  )
})
