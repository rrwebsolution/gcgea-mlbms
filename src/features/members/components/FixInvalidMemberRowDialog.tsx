import * as React from "react"
import { AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import { OfficeCommandSelect } from "@/components/shared/OfficeCommandSelect"
import { calculateAge } from "@/utils/format"
import type { MemberImportRowResult } from "@/types"

export interface MemberRowEdit {
  first_name: string
  middle_name: string
  last_name: string
  birthdate: string
  office_name_raw: string
  position: string
  cellphone_number: string
  beneficiary_1: string
  beneficiary_2: string
}

interface FixInvalidMemberRowDialogProps {
  row: MemberImportRowResult | null
  edit?: Partial<MemberRowEdit>
  /** Distinct position values seen elsewhere in this worksheet — there is no positions master list in the backend, so the picker is built from the sheet's own data instead of an API. */
  positionOptions: string[]
  onOpenChange: (open: boolean) => void
  onSave: (rowNumber: number, values: MemberRowEdit) => void
}

const NO_POSITION = "__none__"

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

/** The wizard only ever flags surname, first_name, or birthdate as invalid (see REQUIRED_HEADERS in the import template) — matched against each row's own reasons so only the field(s) actually reported broken are called out. */
function detectInvalidFields(reasons: string[]) {
  const text = reasons.join(" ").toLowerCase()
  return {
    firstName: text.includes("first_name") || text.includes("first name"),
    lastName: text.includes("surname") || text.includes("last_name") || text.includes("last name"),
    birthdate: text.includes("birthdate"),
  }
}

export function FixInvalidMemberRowDialog({ row, edit, positionOptions, onOpenChange, onSave }: FixInvalidMemberRowDialogProps) {
  const [firstName, setFirstName] = React.useState("")
  const [middleName, setMiddleName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [birthdate, setBirthdate] = React.useState("")
  const [office, setOffice] = React.useState("")
  const [position, setPosition] = React.useState("")
  const [contact, setContact] = React.useState("")
  const [beneficiary1, setBeneficiary1] = React.useState("")
  const [beneficiary2, setBeneficiary2] = React.useState("")
  const [touched, setTouched] = React.useState(false)

  React.useEffect(() => {
    if (!row) return
    setFirstName(edit?.first_name ?? row.data.first_name ?? "")
    setMiddleName(edit?.middle_name ?? row.data.middle_name ?? "")
    setLastName(edit?.last_name ?? row.data.last_name ?? "")
    setBirthdate(edit?.birthdate ?? toDateInputValue(row.data.birthdate))
    setOffice(edit?.office_name_raw ?? row.data.resolved_office_name ?? row.data.office_name_raw ?? "")
    setPosition(edit?.position ?? row.data.position ?? "")
    setContact(edit?.cellphone_number ?? row.data.cellphone_number ?? "")
    setBeneficiary1(edit?.beneficiary_1 ?? row.data.beneficiary_1 ?? "")
    setBeneficiary2(edit?.beneficiary_2 ?? row.data.beneficiary_2 ?? "")
    setTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row])

  const flagged = detectInvalidFields(row?.reasons ?? [])
  const firstNameError = (touched || flagged.firstName) && !firstName.trim()
  const lastNameError = (touched || flagged.lastName) && !lastName.trim()
  const birthdateError = (touched || flagged.birthdate) && !birthdate.trim()
  const officeError = touched && !office.trim()
  const canSave = firstName.trim() !== "" && lastName.trim() !== "" && birthdate.trim() !== "" && office.trim() !== ""
  const previewAge = birthdate.trim() ? calculateAge(birthdate) : null

  const positionSelectOptions = [
    { value: NO_POSITION, label: "No position" },
    ...positionOptions.map((p) => ({ value: p, label: p })),
  ]

  function handleSave() {
    setTouched(true)
    if (!row || !canSave) return
    onSave(row.rowNumber, {
      first_name: firstName.trim(),
      middle_name: middleName.trim(),
      last_name: lastName.trim(),
      birthdate,
      office_name_raw: office.trim(),
      position: position.trim(),
      cellphone_number: contact.trim(),
      beneficiary_1: beneficiary1.trim(),
      beneficiary_2: beneficiary2.trim(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fix Invalid Record</DialogTitle>
          <DialogDescription>
            {row ? `Row ${row.rowNumber + 1}: ${row.reasons.join(", ")}` : ""} Correct the field(s) flagged below so this record can be imported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fix-row-first-name" className="flex items-center gap-1.5">
              First Name <span className="text-destructive">*</span>
              {flagged.firstName && <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">Invalid</span>}
            </Label>
            <Input
              id="fix-row-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              aria-invalid={firstNameError}
              className={firstNameError ? "border-destructive focus-visible:ring-destructive" : undefined}
            />
            {firstNameError && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="size-3" /> First name is required.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fix-row-middle-name">Middle Name</Label>
            <Input
              id="fix-row-middle-name"
              placeholder="Optional"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fix-row-last-name" className="flex items-center gap-1.5">
              Surname / Last Name <span className="text-destructive">*</span>
              {flagged.lastName && <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">Invalid</span>}
            </Label>
            <Input
              id="fix-row-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              aria-invalid={lastNameError}
              className={lastNameError ? "border-destructive focus-visible:ring-destructive" : undefined}
            />
            {lastNameError && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="size-3" /> Surname is required.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fix-row-birthdate" className="flex items-center gap-1.5">
              Birthdate <span className="text-destructive">*</span>
              {flagged.birthdate && <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">Invalid</span>}
            </Label>
            <Input
              id="fix-row-birthdate"
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              aria-invalid={birthdateError}
              className={birthdateError ? "border-destructive focus-visible:ring-destructive" : undefined}
            />
            {birthdateError ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="size-3" /> Birthdate is required.
              </p>
            ) : previewAge != null ? (
              <p className="text-xs text-muted-foreground">Age will be recalculated to <strong className="text-foreground">{previewAge}</strong> on save.</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fix-row-office" className="flex items-center gap-1.5">
              Office <span className="text-destructive">*</span>
              {!office.trim() && <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">Invalid</span>}
            </Label>
            <OfficeCommandSelect
              value={office}
              onValueChange={setOffice}
              valueField="name"
              placeholder="Search office…"
              className={!office.trim() ? "border-destructive focus-visible:ring-destructive" : undefined}
            />
            {officeError && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <AlertCircle className="size-3" /> Office is required.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fix-row-position">Position</Label>
            <CommandSelect
              value={position || NO_POSITION}
              onValueChange={(v) => setPosition(v === NO_POSITION ? "" : v)}
              options={positionSelectOptions}
              placeholder="Select position…"
              searchPlaceholder="Search positions seen in this worksheet…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fix-row-contact">Contact Number</Label>
            <Input id="fix-row-contact" type="tel" placeholder="Optional" value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fix-row-beneficiary-1">Beneficiary 1</Label>
            <Input id="fix-row-beneficiary-1" placeholder="Optional" value={beneficiary1} onChange={(e) => setBeneficiary1(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fix-row-beneficiary-2">Beneficiary 2</Label>
            <Input id="fix-row-beneficiary-2" placeholder="Optional" value={beneficiary2} onChange={(e) => setBeneficiary2(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save &amp; Mark Valid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
