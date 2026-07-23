import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type FormFieldKind = "text" | "select" | "date" | "textarea" | "checkbox"

const DEFAULT_FIELDS: FormFieldKind[] = ["text", "text", "select", "date", "text", "select"]

interface FormSkeletonProps {
  /** Field kinds to render, in order. Defaults to a representative mix of textbox/dropdown/date. */
  fields?: FormFieldKind[]
  columns?: 1 | 2 | 3
  /** Circular skeleton for a profile picture field. */
  showAvatar?: boolean
  /** Dashed-border skeleton for a document/file upload area. */
  showUpload?: boolean
  /** Skeleton Save/Cancel button row at the bottom. */
  showActions?: boolean
  className?: string
}

const COLUMN_CLASS: Record<NonNullable<FormSkeletonProps["columns"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
}

/** Skeleton stand-in for a form while its initial data (edit mode) is being fetched. */
export function FormSkeleton({ fields = DEFAULT_FIELDS, columns = 2, showAvatar, showUpload, showActions = true, className }: FormSkeletonProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {showAvatar && (
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      )}

      <div className={cn("grid gap-4", COLUMN_CLASS[columns])}>
        {fields.map((kind, i) => (
          <FormFieldSkeleton key={i} kind={kind} />
        ))}
      </div>

      {showUpload && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-6">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      )}

      {showActions && (
        <div className="flex justify-end gap-2 pt-1">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      )}
    </div>
  )
}

function FormFieldSkeleton({ kind }: { kind: FormFieldKind }) {
  if (kind === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="size-4 rounded-sm" />
        <Skeleton className="h-3.5 w-32" />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className={cn("w-full rounded-md", kind === "textarea" ? "h-20" : "h-9")} />
    </div>
  )
}
