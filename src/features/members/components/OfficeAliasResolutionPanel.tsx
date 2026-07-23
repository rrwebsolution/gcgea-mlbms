import * as React from "react"
import { Check, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { OfficeCommandSelect } from "@/components/shared/OfficeCommandSelect"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { useAuth } from "@/contexts/AuthContext"
import type { UnresolvedOfficeGroup } from "@/types"

interface OfficeAliasResolutionPanelProps {
  groups: UnresolvedOfficeGroup[]
  onResolve: (input: { rawText: string; officeId?: string; newOffice?: { code: string; name: string }; saveAsAlias: boolean }) => Promise<void>
}

export function OfficeAliasResolutionPanel({ groups, onResolve }: OfficeAliasResolutionPanelProps) {
  const { hasPermission } = useAuth()
  const canManageOffices = hasPermission("member_import.manage_offices")

  if (groups.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-4 text-sm text-success">
        <Check className="size-4" /> Every office name in this worksheet was recognized. No mapping needed.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <OfficeGroupRow key={group.normalizedText} group={group} onResolve={onResolve} canManageOffices={canManageOffices} />
      ))}
    </div>
  )
}

function OfficeGroupRow({
  group,
  onResolve,
  canManageOffices,
}: {
  group: UnresolvedOfficeGroup
  onResolve: OfficeAliasResolutionPanelProps["onResolve"]
  canManageOffices: boolean
}) {
  const [mode, setMode] = React.useState<"existing" | "new">("existing")
  const [officeId, setOfficeId] = React.useState("")
  const [newCode, setNewCode] = React.useState("")
  const [newName, setNewName] = React.useState("")
  const [saveAsAlias, setSaveAsAlias] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [resolved, setResolved] = React.useState(false)

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      if (mode === "existing") {
        await onResolve({ rawText: group.rawText, officeId, saveAsAlias })
      } else {
        await onResolve({ rawText: group.rawText, newOffice: { code: newCode, name: newName }, saveAsAlias })
      }
      setResolved(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = mode === "existing" ? !!officeId : newCode.trim() !== "" && newName.trim() !== ""

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">&quot;{group.rawText}&quot;</p>
          <p className="text-xs text-muted-foreground">
            {group.rowCount} row{group.rowCount === 1 ? "" : "s"} affected (rows {group.rowNumbers.map((n) => n + 1).join(", ")})
          </p>
        </div>
        {resolved && <StatusBadge label="Resolved" tone="success" />}
      </div>

      {!resolved && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={mode === "existing" ? "default" : "outline"} onClick={() => setMode("existing")}>
              Match Existing Office
            </Button>
            {canManageOffices && (
              <Button type="button" size="sm" variant={mode === "new" ? "default" : "outline"} onClick={() => setMode("new")}>
                <Plus className="size-3.5" /> Create New Office
              </Button>
            )}
          </div>

          {mode === "existing" ? (
            <OfficeCommandSelect value={officeId} onValueChange={setOfficeId} valueField="id" placeholder="Select the matching office…" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`new-office-code-${group.normalizedText}`}>Office Code</Label>
                <Input id={`new-office-code-${group.normalizedText}`} value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. CDRRMO" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`new-office-name-${group.normalizedText}`}>Office Name</Label>
                <Input id={`new-office-name-${group.normalizedText}`} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full office name" />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={saveAsAlias} onCheckedChange={(v) => setSaveAsAlias(!!v)} />
            Remember this mapping for future imports
          </label>

          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? "Applying…" : "Apply to All Matching Rows"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
