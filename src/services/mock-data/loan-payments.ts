import type { LoanPayment } from "@/types"
import { MOCK_LOANS, MOCK_LOAN_SCHEDULES } from "./loans"

const RECEIVERS = ["Danilo T. Quiñones", "Erwin S. Cabahug"]

let counter = 1
const payments: LoanPayment[] = []

for (const loan of MOCK_LOANS) {
  const schedule = MOCK_LOAN_SCHEDULES[loan.id] ?? []
  const paidEntries = schedule.filter((s) => s.status === "Paid")
  // Only generate individual payment records for the last 3 paid installments per loan to keep the list realistic
  const recent = paidEntries.slice(-3)
  recent.forEach((entry, idx) => {
    const year = new Date(entry.dueDate).getFullYear()
    payments.push({
      id: `pay-${String(counter).padStart(3, "0")}`,
      paymentReferenceNumber: `GCGEA-PAY-${year}-${String(counter).padStart(6, "0")}`,
      memberId: loan.memberId,
      memberName: loan.memberName,
      loanApplicationId: loan.id,
      loanApplicationNumber: loan.applicationNumber,
      paymentDate: entry.dueDate,
      amountPaid: entry.amountPaid,
      principalPortion: entry.principal,
      interestPortion: entry.interest,
      penalty: entry.penalty,
      paymentMethod: "Payroll Deduction",
      payrollReference: `PR-${year}-${String(entry.installmentNumber).padStart(2, "0")}`,
      officialReceiptNumber: `OR-${year}-${String(counter).padStart(5, "0")}`,
      receivedBy: RECEIVERS[counter % RECEIVERS.length],
      remarks: idx === recent.length - 1 ? "Latest posted amortization." : undefined,
      status: "Posted",
      createdAt: entry.dueDate,
    })
    counter++
  })
}

// One voided payment example for the void-transaction UI
payments.push({
  id: `pay-${String(counter).padStart(3, "0")}`,
  paymentReferenceNumber: `GCGEA-PAY-2026-${String(counter).padStart(6, "0")}`,
  memberId: MOCK_LOANS[0].memberId,
  memberName: MOCK_LOANS[0].memberName,
  loanApplicationId: MOCK_LOANS[0].id,
  loanApplicationNumber: MOCK_LOANS[0].applicationNumber,
  paymentDate: "2026-05-15",
  amountPaid: 3200,
  principalPortion: 2600,
  interestPortion: 600,
  penalty: 0,
  paymentMethod: "Cash",
  officialReceiptNumber: "OR-2026-00099",
  receivedBy: "Danilo T. Quiñones",
  remarks: "Duplicate entry",
  status: "Voided",
  voidReason: "Recorded twice due to encoding error; corrected posting made separately.",
  createdAt: "2026-05-15",
})
counter++

export const MOCK_LOAN_PAYMENTS: LoanPayment[] = payments.sort(
  (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
)
