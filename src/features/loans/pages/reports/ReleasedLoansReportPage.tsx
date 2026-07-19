import LoanStatusReportPage from "./LoanStatusReportPage"

export default function ReleasedLoansReportPage() {
  return (
    <LoanStatusReportPage
      status="Released"
      title="Released Loans"
      description="Loan applications that have been released to members, filterable by office, loan type, and date."
    />
  )
}
