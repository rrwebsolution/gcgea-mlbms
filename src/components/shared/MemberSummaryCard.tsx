import { AlertTriangle, Ban, RefreshCw } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ProfileCompleteness } from "@/components/shared/ProfileCompleteness"
import { profileCompleteness } from "@/services/members.service"
import { MEMBERSHIP_STATUS_TONE } from "@/constants/status"
import { calculateDurationLabel, formatCurrency, formatDateShort, initialsFromName } from "@/utils/format"
import type { Member } from "@/types"

interface MemberSummaryCardProps {
  member: Member
  totalContributions: number
  outstandingLoanBalance: number
  activeLoanCount: number
  overdueLoanCount: number
  onChangeMember?: () => void
}

export function MemberSummaryCard({ member, totalContributions, outstandingLoanBalance, activeLoanCount, overdueLoanCount, onChangeMember }: MemberSummaryCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Avatar size="lg">
            <AvatarFallback className="bg-primary text-primary-foreground">{initialsFromName(member.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-heading text-base font-semibold text-foreground">{member.fullName}</p>
            <p className="text-sm text-muted-foreground">{member.memberNumber} · {member.position} · {member.officeName}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <StatusBadge label={member.membershipStatus} tone={MEMBERSHIP_STATUS_TONE[member.membershipStatus]} />
              {member.retireeStatus === "Retired" && <StatusBadge label="Retired" tone="gold" />}
              <ProfileCompleteness percentage={profileCompleteness(member)} />
            </div>
          </div>
        </div>
        {onChangeMember && (
          <Button variant="outline" size="sm" onClick={onChangeMember}>
            <RefreshCw /> Change Member
          </Button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Membership Date</dt>
          <dd className="text-sm font-medium text-foreground">{formatDateShort(member.membershipDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Length of Membership</dt>
          <dd className="text-sm font-medium text-foreground">{calculateDurationLabel(member.membershipDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Employment Status</dt>
          <dd className="mt-1">
            <StatusBadge
              label={member.employmentStatus?.trim() || "Not specified"}
              tone={member.employmentStatus?.trim() ? "info" : "warning"}
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Contact Number</dt>
          <dd className="text-sm font-medium text-foreground">{member.cellphoneNumber}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Total Contributions</dt>
          <dd className="text-sm font-medium text-foreground">{formatCurrency(totalContributions)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Active Loans</dt>
          <dd className="text-sm font-medium text-foreground">{activeLoanCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Outstanding Loan Balance</dt>
          <dd className={`text-sm font-medium ${outstandingLoanBalance > 0 ? "text-destructive" : "text-foreground"}`}>{formatCurrency(outstandingLoanBalance)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Overdue Status</dt>
          <dd className="text-sm font-medium text-foreground">
            {overdueLoanCount > 0 ? (
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="size-3.5" /> {overdueLoanCount} overdue
              </span>
            ) : (
              <span className="flex items-center gap-1 text-success">
                <Ban className="size-3.5" /> None
              </span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}
