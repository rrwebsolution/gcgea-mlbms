import type { AmortizationEntry, InterestMethod, LoanTypeIncomeBracket } from "@/types"
import { addMonths, format } from "date-fns"

export interface LoanComputationInput {
  principal: number
  annualRatePercent: number
  termMonths: number
  processingFee: number
  interestMethod: InterestMethod
  firstDueDate: Date
  /** 1%-of-gross-style service charge, additive to processingFee — see GCGEA Resolution No. 24-2026, Table 3. */
  serviceChargePercent?: number | null
}

export interface LoanComputationResult {
  principal: number
  totalInterest: number
  processingFee: number
  serviceCharge: number
  netProceeds: number
  totalAmountPayable: number
  monthlyAmortization: number
  maturityDate: string
  schedule: AmortizationEntry[]
}

/**
 * Mirrors app/Services/LoanIncomeBracketService.php for a live preview of the
 * loanable amount while encoding an income-bracketed loan application (e.g.
 * Solidarity Cash Assistance Loan — GCGEA Resolution No. 24-2026, Table 3).
 * The server remains authoritative and recomputes this on submit.
 */
export function bracketForNetPay(brackets: LoanTypeIncomeBracket[], netPay: number): LoanTypeIncomeBracket | null {
  return brackets.find((b) => netPay >= b.minNetPay && (b.maxNetPay === null || netPay <= b.maxNetPay)) ?? null
}

export function computeLoan(input: LoanComputationInput): LoanComputationResult {
  const { principal, annualRatePercent, termMonths, processingFee, interestMethod, firstDueDate, serviceChargePercent } = input
  const serviceCharge = serviceChargePercent ? Math.round(principal * (serviceChargePercent / 100) * 100) / 100 : 0
  const monthlyRate = annualRatePercent / 100

  let totalInterest = 0
  const schedule: AmortizationEntry[] = []

  if (interestMethod === "Zero Interest") {
    const flatMonthly = Math.round((principal / termMonths) * 100) / 100
    let balance = principal
    for (let i = 1; i <= termMonths; i++) {
      const principalPortion = i === termMonths ? balance : flatMonthly
      balance = Math.max(0, balance - principalPortion)
      schedule.push({
        installmentNumber: i,
        dueDate: format(addMonths(firstDueDate, i - 1), "yyyy-MM-dd"),
        beginningBalance: i === 1 ? principal : schedule[i - 2].remainingBalance,
        principal: principalPortion,
        interest: 0,
        penalty: 0,
        amountDue: principalPortion,
        amountPaid: 0,
        remainingBalance: balance,
        status: "Upcoming",
      })
    }
  } else if (interestMethod === "Flat Interest") {
    totalInterest = Math.round(principal * monthlyRate * termMonths * 100) / 100
    const monthlyPrincipal = Math.round((principal / termMonths) * 100) / 100
    const monthlyInterest = Math.round((totalInterest / termMonths) * 100) / 100
    let balance = principal
    for (let i = 1; i <= termMonths; i++) {
      const principalPortion = i === termMonths ? balance : monthlyPrincipal
      balance = Math.max(0, balance - principalPortion)
      schedule.push({
        installmentNumber: i,
        dueDate: format(addMonths(firstDueDate, i - 1), "yyyy-MM-dd"),
        beginningBalance: i === 1 ? principal : schedule[i - 2].remainingBalance,
        principal: principalPortion,
        interest: monthlyInterest,
        penalty: 0,
        amountDue: principalPortion + monthlyInterest,
        amountPaid: 0,
        remainingBalance: balance,
        status: "Upcoming",
      })
    }
  } else {
    // Diminishing balance / custom: standard amortizing loan formula
    const r = monthlyRate
    const payment =
      r === 0
        ? principal / termMonths
        : (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1)
    let balance = principal
    for (let i = 1; i <= termMonths; i++) {
      const interestPortion = Math.round(balance * r * 100) / 100
      let principalPortion = Math.round((payment - interestPortion) * 100) / 100
      if (i === termMonths) principalPortion = balance
      balance = Math.max(0, Math.round((balance - principalPortion) * 100) / 100)
      totalInterest += interestPortion
      schedule.push({
        installmentNumber: i,
        dueDate: format(addMonths(firstDueDate, i - 1), "yyyy-MM-dd"),
        beginningBalance: i === 1 ? principal : schedule[i - 2].remainingBalance,
        principal: principalPortion,
        interest: interestPortion,
        penalty: 0,
        amountDue: principalPortion + interestPortion,
        amountPaid: 0,
        remainingBalance: balance,
        status: "Upcoming",
      })
    }
    totalInterest = Math.round(totalInterest * 100) / 100
  }

  const netProceeds = Math.round((principal - processingFee - serviceCharge) * 100) / 100
  const totalAmountPayable = Math.round((principal + totalInterest) * 100) / 100
  const monthlyAmortization = schedule.length > 0 ? schedule[0].amountDue : 0
  const maturityDate = schedule.length > 0 ? schedule[schedule.length - 1].dueDate : format(firstDueDate, "yyyy-MM-dd")

  return {
    principal,
    totalInterest,
    processingFee,
    serviceCharge,
    netProceeds,
    totalAmountPayable,
    monthlyAmortization,
    maturityDate,
    schedule,
  }
}
