import { useController, useFieldArray, useWatch, type Control, type UseFormRegister, type FieldErrors } from "react-hook-form"
import { HeartHandshake, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CommandSelect } from "@/components/shared/CommandSelect"
import type { MemberFormValues } from "@/schemas/member.schema"

const MARRIED_RELATIONSHIP_OPTIONS = [
  "Legal Spouse",
  "Legitimate Unmarried Child",
  "Legally Adopted Unmarried Child",
].map((relationship) => ({ value: relationship, label: relationship }))

const UNMARRIED_RELATIONSHIP_OPTIONS = [
  "Living Father",
  "Living Mother",
  "Single Brother",
  "Single Sister",
].map((relationship) => ({ value: relationship, label: relationship }))

interface BeneficiaryFieldArrayProps {
  control: Control<MemberFormValues>
  register: UseFormRegister<MemberFormValues>
  errors: FieldErrors<MemberFormValues>
  civilStatus: MemberFormValues["civilStatus"]
}

export function BeneficiaryFieldArray({ control, register, errors, civilStatus }: BeneficiaryFieldArrayProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "beneficiaries" })
  const beneficiaries = useWatch({ control, name: "beneficiaries" }) ?? []
  const isMarried = civilStatus === "Married"
  const singleSiblingCount = beneficiaries.filter((beneficiary) =>
    ["Single Brother", "Single Sister"].includes(beneficiary.relationship)
  ).length
  const relationshipOptions = isMarried
    ? MARRIED_RELATIONSHIP_OPTIONS
    : UNMARRIED_RELATIONSHIP_OPTIONS

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-foreground/80">
        <HeartHandshake className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          {isMarried
            ? "Nuclear-family setup for a married member: legal spouse and legitimate or legally adopted unmarried children."
            : "Nuclear-family setup for an unmarried member: living parent/s and a maximum of three single brothers or sisters. Sibling mortuary order follows First ₱15,000, Second ₱10,000, and Third ₱5,000 by default."}
        </p>
      </div>
      {(errors.beneficiaries as { message?: string } | undefined)?.message && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
          {(errors.beneficiaries as { message?: string }).message}
        </p>
      )}
      {fields.length === 0 && <p className="text-sm text-muted-foreground">No beneficiaries added yet.</p>}
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Beneficiary {index + 1}</p>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)} aria-label="Remove beneficiary">
              <Trash2 />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Maria Dela Cruz" {...register(`beneficiaries.${index}.fullName`)} aria-invalid={!!errors.beneficiaries?.[index]?.fullName} />
              {errors.beneficiaries?.[index]?.fullName && <p className="text-xs font-medium text-destructive">{errors.beneficiaries[index]?.fullName?.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Relationship <span className="text-destructive">*</span></Label>
              <RelationshipCommandField
                control={control}
                index={index}
                hasError={!!errors.beneficiaries?.[index]?.relationship}
                options={relationshipOptions}
                singleSiblingLimitReached={!isMarried && singleSiblingCount >= 3}
              />
              {errors.beneficiaries?.[index]?.relationship && <p className="text-xs font-medium text-destructive">{errors.beneficiaries[index]?.relationship?.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Birthdate <span className="text-destructive">*</span></Label>
              <Input type="date" {...register(`beneficiaries.${index}.birthdate`)} aria-invalid={!!errors.beneficiaries?.[index]?.birthdate} />
              {errors.beneficiaries?.[index]?.birthdate && <p className="text-xs font-medium text-destructive">{errors.beneficiaries[index]?.birthdate?.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Contact Number <span className="text-muted-foreground">(Optional)</span></Label>
              <Input placeholder="09XXXXXXXXX" {...register(`beneficiaries.${index}.contactNumber`)} aria-invalid={!!errors.beneficiaries?.[index]?.contactNumber} />
              {errors.beneficiaries?.[index]?.contactNumber && <p className="text-xs font-medium text-destructive">{errors.beneficiaries[index]?.contactNumber?.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address <span className="text-destructive">*</span></Label>
              <Input
                placeholder="House/Unit No., Street, Barangay, City/Municipality"
                {...register(`beneficiaries.${index}.address`)}
                aria-invalid={!!errors.beneficiaries?.[index]?.address}
              />
              {errors.beneficiaries?.[index]?.address && (
                <p className="text-xs font-medium text-destructive">{errors.beneficiaries[index]?.address?.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Share Percentage / Priority <span className="text-muted-foreground">(Optional)</span></Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 50"
                {...register(`beneficiaries.${index}.sharePercentage`, {
                  setValueAs: (value) => value === "" || value == null ? undefined : Number(value),
                })}
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ fullName: "", relationship: "", birthdate: "", contactNumber: "", address: "", sharePercentage: undefined })}
      >
        <Plus />
        Add Beneficiary
      </Button>
    </div>
  )
}

function RelationshipCommandField({
  control,
  index,
  hasError,
  options: configuredOptions,
  singleSiblingLimitReached,
}: {
  control: Control<MemberFormValues>
  index: number
  hasError: boolean
  options: { value: string; label: string }[]
  singleSiblingLimitReached: boolean
}) {
  const { field } = useController({
    control,
    name: `beneficiaries.${index}.relationship`,
  })

  const siblingValues = ["Single Brother", "Single Sister"]
  const availableOptions = singleSiblingLimitReached && !siblingValues.includes(field.value)
    ? configuredOptions.filter((option) => !siblingValues.includes(option.value))
    : configuredOptions
  const options = field.value && !availableOptions.some((option) => option.value === field.value)
    ? [{ value: field.value, label: `${field.value} (review required)` }, ...availableOptions]
    : availableOptions

  return (
    <div aria-invalid={hasError}>
      <CommandSelect
        value={field.value}
        onValueChange={field.onChange}
        options={options}
        placeholder="Select relationship"
        searchPlaceholder="Search relationship…"
        emptyText="No relationship found."
      />
    </div>
  )
}
