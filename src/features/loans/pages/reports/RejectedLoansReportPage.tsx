import LoanStatusReportPage from "./LoanStatusReportPage"

export default function RejectedLoansReportPage() {
  return (
    <LoanStatusReportPage
      status="Rejected"
      title="Rejected Loans"
      description="Loan applications that were rejected, filterable by office, loan type, and date."
    />
  )
}
