import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartSkeleton } from "@/components/shared/loaders/ChartSkeleton"
import { usePageRefresh } from "@/contexts/PageRefreshContext"

interface HorizontalBarChartProps {
  data: { label: string; value: number }[]
  valueLabel?: string
  color?: string
  isLoading?: boolean
}

export function HorizontalBarChart({ data, valueLabel = "Count", color = "var(--color-primary)", isLoading }: HorizontalBarChartProps) {
  const { isRefreshing } = usePageRefresh()
  const sorted = [...data].sort((a, b) => b.value - a.value)

  if (isLoading || isRefreshing) return <ChartSkeleton variant="bars-horizontal" height={Math.max(220, sorted.length * 32)} />

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 32)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fill: "var(--color-foreground)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          formatter={(value) => [value, valueLabel]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-popover)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}
