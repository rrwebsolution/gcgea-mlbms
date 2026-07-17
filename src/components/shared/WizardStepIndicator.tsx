import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface WizardStepIndicatorProps {
  steps: string[]
  currentStep: number
}

export function WizardStepIndicator({ steps, currentStep }: WizardStepIndicatorProps) {
  return (
    <ol className="flex flex-wrap items-center gap-y-3 text-xs">
      {steps.map((step, idx) => {
        const stepNumber = idx + 1
        const isComplete = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep
        return (
          <li key={step} className="flex items-center">
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
                isCurrent ? "bg-primary text-primary-foreground" : isComplete ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
              )}
            >
              {isComplete ? <Check className="size-3" /> : <span>{stepNumber}</span>}
              {step}
            </span>
            {idx < steps.length - 1 && <span className="mx-1.5 h-px w-4 bg-border sm:w-6" />}
          </li>
        )
      })}
    </ol>
  )
}
