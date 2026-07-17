import { useFieldArray, type Control, type UseFormRegister, type FieldErrors } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { MemberFormValues } from "@/schemas/member.schema"

interface BeneficiaryFieldArrayProps {
  control: Control<MemberFormValues>
  register: UseFormRegister<MemberFormValues>
  errors: FieldErrors<MemberFormValues>
}

export function BeneficiaryFieldArray({ control, register, errors }: BeneficiaryFieldArrayProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "beneficiaries" })

  return (
    <div className="space-y-4">
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
              <Input placeholder="e.g. Spouse, Child, Parent" {...register(`beneficiaries.${index}.relationship`)} aria-invalid={!!errors.beneficiaries?.[index]?.relationship} />
              {errors.beneficiaries?.[index]?.relationship && <p className="text-xs font-medium text-destructive">{errors.beneficiaries[index]?.relationship?.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Birthdate <span className="text-destructive">*</span></Label>
              <Input type="date" {...register(`beneficiaries.${index}.birthdate`)} aria-invalid={!!errors.beneficiaries?.[index]?.birthdate} />
              {errors.beneficiaries?.[index]?.birthdate && <p className="text-xs font-medium text-destructive">{errors.beneficiaries[index]?.birthdate?.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Contact Number</Label>
              <Input placeholder="09XXXXXXXXX" {...register(`beneficiaries.${index}.contactNumber`)} aria-invalid={!!errors.beneficiaries?.[index]?.contactNumber} />
              {errors.beneficiaries?.[index]?.contactNumber && <p className="text-xs font-medium text-destructive">{errors.beneficiaries[index]?.contactNumber?.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input placeholder="House/Unit No., Street, Barangay, City/Municipality" {...register(`beneficiaries.${index}.address`)} />
            </div>
            <div className="space-y-1.5">
              <Label>Share Percentage / Priority</Label>
              <Input type="number" min={0} max={100} placeholder="e.g. 50" {...register(`beneficiaries.${index}.sharePercentage`, { valueAsNumber: true })} />
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
