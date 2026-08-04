import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ReportGenerateButtonProps {
  onGenerate: () => void | Promise<void>
  disabled?: boolean
}

export function ReportGenerateButton({ onGenerate, disabled }: ReportGenerateButtonProps) {
  const [isGenerating, setIsGenerating] = React.useState(false)

  async function handleClick() {
    if (isGenerating) return
    setIsGenerating(true)
    const startedAt = Date.now()
    try {
      await onGenerate()
    } finally {
      const remaining = Math.max(0, 450 - (Date.now() - startedAt))
      window.setTimeout(() => setIsGenerating(false), remaining)
    }
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={disabled || isGenerating} aria-busy={isGenerating}>
      {isGenerating && <Loader2 className="animate-spin" />}
      {isGenerating ? "Generating..." : "Generate"}
    </Button>
  )
}
