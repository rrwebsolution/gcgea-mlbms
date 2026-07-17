import { CheckCircle2, FilePlus, Send, ThumbsUp, XCircle } from "lucide-react"
import type { ApprovalHistoryEntry } from "@/types"
import { ActivityTimeline, type TimelineEntry } from "@/components/shared/ActivityTimeline"

function iconFor(action: string) {
  const lower = action.toLowerCase()
  if (lower.includes("reject")) return { icon: XCircle, tone: "danger" as const }
  if (lower.includes("approve") || lower.includes("released")) return { icon: CheckCircle2, tone: "success" as const }
  if (lower.includes("submit")) return { icon: Send, tone: "info" as const }
  if (lower.includes("recommend")) return { icon: ThumbsUp, tone: "warning" as const }
  return { icon: FilePlus, tone: "neutral" as const }
}

export function ApprovalTimeline({ history }: { history: ApprovalHistoryEntry[] }) {
  const entries: TimelineEntry[] = history.map((h) => ({
    id: h.id,
    title: h.action,
    description: h.remarks,
    timestamp: h.performedAt,
    actor: h.performedBy,
    ...iconFor(h.action),
  }))

  return <ActivityTimeline entries={entries} />
}
