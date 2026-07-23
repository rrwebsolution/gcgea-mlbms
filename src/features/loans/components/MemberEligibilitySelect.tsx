import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { listMembers } from "@/services/members.service"
import { getLoanSettings } from "@/services/loan-settings.service"
import { calculateDurationMonths } from "@/utils/format"
import { isRegistrationApproved } from "@/utils/eligibility"
import { cn } from "@/lib/utils"
import type { Member } from "@/types"

type EligibilityFilter = "eligible" | "ineligible" | "all"

interface MemberEligibilityInfo {
  eligible: boolean
  completedMonths: number
  requiredMonths: number
  eligibleOn: string
}

function eligibilityFor(member: Member, requiredMonths: number): MemberEligibilityInfo {
  const completedMonths = calculateDurationMonths(member.membershipDate)
  const registrationApproved = isRegistrationApproved(member)
  const eligible = registrationApproved && member.membershipStatus === "Active" && completedMonths >= requiredMonths

  const membershipDate = new Date(member.membershipDate)
  const eligibleOnDate = new Date(membershipDate)
  eligibleOnDate.setMonth(eligibleOnDate.getMonth() + requiredMonths)

  return { eligible, completedMonths, requiredMonths, eligibleOn: eligibleOnDate.toISOString().slice(0, 10) }
}

interface MemberEligibilitySelectProps {
  value?: string
  onSelect: (memberId: string) => void
  selectedMember?: Member
  disabled?: boolean
}

/**
 * Member selector for Create Loan Application — shows approved and active
 * members, disables anyone short of the configured minimum membership
 * duration (src/services/loan-settings.service.ts, never hardcoded here),
 * and displays "X of Y months completed" / "Eligible after {date}".
 */
export function MemberEligibilitySelect({ value, onSelect, selectedMember, disabled }: MemberEligibilitySelectProps) {
  const [open, setOpen] = React.useState(false)
  const [filter, setFilter] = React.useState<EligibilityFilter>("eligible")

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["members", "search-select", "Active"],
    queryFn: () => listMembers({ perPage: 200, membershipStatus: "Active" }),
  })
  const { data: loanSettings } = useQuery({ queryKey: ["loan-settings"], queryFn: getLoanSettings })

  const requiredMonths = loanSettings?.minimumMembershipMonths ?? 6
  const members = membersData?.data ?? []
  const approvedMembers = members.filter((m) => isRegistrationApproved(m))

  const visibleMembers = approvedMembers.filter((m) => {
    const { eligible } = eligibilityFor(m, requiredMonths)
    if (filter === "eligible") return eligible
    if (filter === "ineligible") return !eligible
    return true
  })

  const selected = members.find((m) => m.id === value) ?? (selectedMember?.id === value ? selectedMember : undefined)

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger disabled={disabled} render={<Button variant="outline" className="w-full flex-1 justify-between font-normal" />}>
            {selected ? (
              <span className="flex min-w-0 items-center gap-2">
                <User className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {selected.fullName} <span className="text-muted-foreground">· {selected.memberNumber}</span>
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Search by member number, name, office, or position…</span>
            )}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-[--anchor-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Type a name or member number…" />
              <CommandList>
                <CommandEmpty>{isLoading ? "Loading members…" : "No member found."}</CommandEmpty>
                <CommandGroup>
                  {visibleMembers.map((member) => {
                    const info = eligibilityFor(member, requiredMonths)
                    return (
                      <CommandItem
                        key={member.id}
                        disabled={!info.eligible}
                        value={`${member.fullName} ${member.memberNumber} ${member.employeeNumber} ${member.officeName} ${member.position}`}
                        onSelect={() => {
                          if (!info.eligible) return
                          onSelect(member.id)
                          setOpen(false)
                        }}
                      >
                        <Check className={cn("size-4", member.id === value ? "opacity-100" : "opacity-0")} />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{member.fullName}</span>
                          <span className="text-xs text-muted-foreground">
                            {member.memberNumber} · {member.officeName}
                          </span>
                          <span className={cn("text-xs", info.eligible ? "text-success" : "text-destructive")}>
                            {info.eligible
                              ? `Active Member — ${info.completedMonths} month(s) of membership (minimum ${info.requiredMonths} required)`
                              : `Active Member — ${info.completedMonths} of ${info.requiredMonths} required months completed · Eligible after: ${info.eligibleOn}`}
                          </span>
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <CommandSelect
          className="w-full sm:w-56"
          value={filter}
          onValueChange={(v) => setFilter(v as EligibilityFilter)}
          options={[
            { value: "eligible", label: "Eligible Members" },
            { value: "ineligible", label: "Ineligible Members" },
            { value: "all", label: "All Approved Members" },
          ]}
          hideSearch
        />
      </div>
    </div>
  )
}
