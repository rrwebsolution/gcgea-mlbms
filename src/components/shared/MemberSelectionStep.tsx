import type { ReactNode } from "react"
import { MemberSearchSelect } from "@/components/shared/MemberSearchSelect"
import { MemberSummaryCard } from "@/components/shared/MemberSummaryCard"
import { EmptyState } from "@/components/shared/EmptyState"
import { UserSearch } from "lucide-react"
import type { Member } from "@/types"

interface MemberSelectionStepProps {
  selectedMemberId: string | undefined
  member: Member | undefined
  onSelect: (memberId: string) => void
  totalContributions: number
  outstandingLoanBalance: number
  activeLoanCount: number
  overdueLoanCount: number
  extra?: ReactNode
}

export function MemberSelectionStep({
  selectedMemberId,
  member,
  onSelect,
  totalContributions,
  outstandingLoanBalance,
  activeLoanCount,
  overdueLoanCount,
  extra,
}: MemberSelectionStepProps) {
  return (
    <div className="space-y-4">
      <div className="max-w-lg">
        <MemberSearchSelect value={selectedMemberId} onSelect={onSelect} placeholder="Search by member number, name, office, or position…" />
      </div>
      {member ? (
        <div className="space-y-4">
          <MemberSummaryCard
            member={member}
            totalContributions={totalContributions}
            outstandingLoanBalance={outstandingLoanBalance}
            activeLoanCount={activeLoanCount}
            overdueLoanCount={overdueLoanCount}
            onChangeMember={() => onSelect("")}
          />
          {extra}
        </div>
      ) : (
        <EmptyState icon={UserSearch} title="No member selected" description="Search and select the member this application is being encoded for." />
      )}
    </div>
  )
}
