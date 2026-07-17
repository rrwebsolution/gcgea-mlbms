import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { LOAN_STATUS_TONE, type StatusTone } from "@/constants/status"

interface LoanStatusChartProps {
  data: { status: string; count: number }[]
}

const TONE_COLOR: Record<StatusTone, string> = {
  neutral: "var(--color-muted-foreground)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-destructive)",
  info: "var(--color-info)",
  gold: "var(--color-gold)",
}

export function LoanStatusChart({ data }: LoanStatusChartProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count)

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 32)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="status"
          width={100}
          tick={{ fill: "var(--color-foreground)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          formatter={(value) => [value, "Applications"]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-popover)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: "right", fill: "var(--color-muted-foreground)", fontSize: 11 }}>
          {sorted.map((entry) => (
            <Cell key={entry.status} fill={TONE_COLOR[LOAN_STATUS_TONE[entry.status] ?? "neutral"]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
