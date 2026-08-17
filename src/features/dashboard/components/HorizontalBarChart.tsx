import * as React from "react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts"
import { ChartSkeleton } from "@/components/shared/loaders/ChartSkeleton"
import { usePageRefresh } from "@/contexts/PageRefreshContext"
import { ChartEmptyState } from "@/features/dashboard/components/ChartEmptyState"

interface HorizontalBarChartProps {
  data: { label: string; value: number }[]
  valueLabel?: string
  color?: string
  isLoading?: boolean
}

// Custom Glassmorphic Tooltip
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { label: string; value: number } }>
  valueLabel: string
}

function CustomTooltip({ active, payload, valueLabel }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const current = payload[0]

  return (
    <div className="min-w-[140px] rounded-xl border border-border/80 bg-popover/95 p-2.5 shadow-lg backdrop-blur-md">
      <p className="truncate text-xs font-semibold text-foreground">
        {current.payload.label}
      </p>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" />
          <span>{valueLabel}</span>
        </div>
        <span className="font-mono font-bold text-foreground">
          {new Intl.NumberFormat().format(current.value)}
        </span>
      </div>
    </div>
  )
}

export function HorizontalBarChart({
  data,
  valueLabel = "Count",
  color = "var(--color-primary)",
  isLoading,
}: HorizontalBarChartProps) {
  const { isRefreshing } = usePageRefresh()
  const sorted = React.useMemo(() => [...data].sort((a, b) => b.value - a.value), [data])
  const chartHeight = Math.max(220, sorted.length * 36)

  if (isLoading || isRefreshing) {
    return <ChartSkeleton variant="bars-horizontal" height={chartHeight} />
  }

  if (sorted.length === 0 || sorted.every((item) => item.value === 0)) {
    return <ChartEmptyState label={`No ${valueLabel.toLowerCase()} data available`} />
  }

  const gradientId = `bar-gradient-${Math.random().toString(36).slice(2, 7)}`

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 4 }}
          barCategoryGap="22%"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
          </defs>

          <XAxis type="number" hide />

          <YAxis
            type="category"
            dataKey="label"
            width={140}
            tick={{ fill: "currentColor", fontSize: 12 }}
            className="text-muted-foreground font-medium"
            tickLine={false}
            axisLine={false}
          />

          <Tooltip
            cursor={{ fill: "var(--color-muted)", opacity: 0.35, rx: 6 }}
            content={<CustomTooltip valueLabel={valueLabel} />}
          />

          <Bar
            dataKey="value"
            fill={`url(#${gradientId})`}
            radius={[0, 6, 6, 0]}
            maxBarSize={20}
            className="transition-all duration-300 hover:opacity-90"
          >
            {sorted.map((_, index) => (
              <Cell key={`cell-${index}`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}