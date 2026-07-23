import LoansPage from "./LoansPage"

export default function ActiveLoansPage() {
  return (
    <LoansPage
      activeOnly
      title="Active Loans"
      description="New loans and reloans that are released or currently being amortized."
    />
  )
}
