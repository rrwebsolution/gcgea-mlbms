import { useQuery } from "@tanstack/react-query"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { getMember } from "@/services/members.service"
import { formatDateShort } from "@/utils/format"
import type { MemberImportRowResult } from "@/types"

interface DuplicateComparisonTableProps {
  row: MemberImportRowResult
  resolution: string | undefined
  onChange: (action: string) => void
}

/**
 * Side-by-side comparison of an incoming row against its scored duplicate
 * candidates, so the reviewer can see exactly why a match was flagged
 * before choosing to create a new member, skip the row, or merge into an
 * existing one.
 */
export function DuplicateComparisonTable({ row, resolution, onChange }: DuplicateComparisonTableProps) {
  const topCandidates = row.duplicateCandidates.slice(0, 3)

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Row {row.rowNumber + 1}: {row.data.first_name} {row.data.last_name}
        </p>
        <StatusBadge label={row.category} tone={row.category === "Exact" ? "danger" : row.category === "Probable" ? "warning" : "info"} />
      </div>

      <div className="overflow-auto rounded-md border border-border/60">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-2 text-left font-medium text-muted-foreground">Field</th>
              <th className="p-2 text-left font-medium text-muted-foreground">Incoming (Sheet)</th>
              {topCandidates.map((c) => (
                <th key={c.memberId} className="p-2 text-left font-medium text-muted-foreground">
                  Existing #{c.memberId} ({c.score} pts)
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <ComparisonRow label="Name" incoming={`${row.data.first_name ?? ""} ${row.data.last_name ?? ""}`} candidates={topCandidates} field="fullName" />
            <ComparisonRow label="Birthdate" incoming={row.data.birthdate ? formatDateShort(row.data.birthdate) : "—"} candidates={topCandidates} field="birthdate" />
            <ComparisonRow label="Office" incoming={row.data.resolved_office_name ?? row.data.office_name_raw ?? "—"} candidates={topCandidates} field="officeName" />
            <ComparisonRow label="Cellphone" incoming={row.data.cellphone_number ?? "—"} candidates={topCandidates} field="cellphoneNumber" />
          </tbody>
        </table>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Matched on: {row.duplicateCandidates[0]?.matchedFields.join(", ") || "—"}</p>
        <RadioGroup value={resolution ?? ""} onValueChange={onChange} className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {topCandidates.map((c) => (
            <Label key={c.memberId} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-xs has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5">
              <RadioGroupItem value={`merge_into:${c.memberId}`} />
              Merge into #{c.memberId}
            </Label>
          ))}
          <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-xs has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5">
            <RadioGroupItem value="create_new" />
            Import as New Member
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-xs has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5">
            <RadioGroupItem value="skip" />
            Skip This Row
          </Label>
        </RadioGroup>
      </div>
    </div>
  )
}

function ComparisonRow({
  label,
  incoming,
  candidates,
  field,
}: {
  label: string
  incoming: string
  candidates: { memberId: string }[]
  field: "fullName" | "birthdate" | "officeName" | "cellphoneNumber"
}) {
  return (
    <tr className="border-t border-border/40">
      <td className="p-2 font-medium text-foreground">{label}</td>
      <td className="p-2 text-foreground">{incoming || "—"}</td>
      {candidates.map((c) => (
        <CandidateCell key={c.memberId} memberId={c.memberId} field={field} />
      ))}
    </tr>
  )
}

function CandidateCell({ memberId, field }: { memberId: string; field: "fullName" | "birthdate" | "officeName" | "cellphoneNumber" }) {
  const { data: member } = useQuery({ queryKey: ["members", memberId], queryFn: () => getMember(memberId) })

  if (!member) return <td className="p-2 text-muted-foreground">…</td>

  const value = field === "birthdate" ? formatDateShort(member.birthdate) : member[field]

  return <td className="p-2 text-muted-foreground">{value || "—"}</td>
}
