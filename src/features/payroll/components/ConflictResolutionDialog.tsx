import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { MemberSearchSelect } from "@/components/shared/MemberSearchSelect"
import type { PayrollImportRowResult } from "@/types"

interface ConflictResolutionDialogProps {
  row: PayrollImportRowResult | null
  onOpenChange: (open: boolean) => void
  onResolve: (rowNumber: number, memberId: string) => void
}

/**
 * Resolution modal for any Invalid row the automatic matcher couldn't
 * confidently place: rows where the sheet's NAME column matched more than
 * one member (candidates offered as quick picks) as well as rows it
 * couldn't match at all ("Unknown Member" — no candidates, name typo, maiden
 * name, employee not yet registered, etc.). Both cases resolve the same way:
 * pick or search for the correct member.
 */
export function ConflictResolutionDialog({ row, onOpenChange, onResolve }: ConflictResolutionDialogProps) {
  const [selected, setSelected] = React.useState<string>("")

  React.useEffect(() => {
    setSelected("")
  }, [row])

  const name = row?.data.name ?? ""
  const hasCandidates = (row?.matchCandidates.length ?? 0) > 0

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Member Match</DialogTitle>
          <DialogDescription>
            {hasCandidates
              ? <>Row {row ? row.rowNumber + 1 : ""}: multiple members match &quot;{String(name)}&quot;. Select the correct member for this row.</>
              : <>Row {row ? row.rowNumber + 1 : ""}: &quot;{String(name)}&quot; didn&apos;t match any member on file. Search for the correct member below.</>}
          </DialogDescription>
        </DialogHeader>

        {hasCandidates && (
          <RadioGroup value={selected} onValueChange={setSelected} className="space-y-2">
            {row?.matchCandidates.map((c) => (
              <Label
                key={c.id}
                htmlFor={`candidate-${c.id}`}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm hover:bg-muted/50 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
              >
                <RadioGroupItem value={c.id} id={`candidate-${c.id}`} className="mt-0.5" />
                <span className="flex flex-col">
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.memberNumber ?? "No member number"} · {c.officeName ?? "No office on record"}
                  </span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        )}

        <div className="space-y-1.5">
          <Label>{hasCandidates ? "Not one of these? Search for a different member" : "Search for the correct member"}</Label>
          <MemberSearchSelect
            value={hasCandidates && row?.matchCandidates.some((c) => c.id === selected) ? undefined : selected || undefined}
            onSelect={setSelected}
            placeholder="Search by name or member number…"
            // The payroll sheet may reference a member who's since gone
            // Inactive/Suspended/etc. — search every member regardless of
            // status, not just Active ones.
            membershipStatus={null}
            perPage={1000}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (row && selected) onResolve(row.rowNumber, selected)
            }}
          >
            Use This Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
