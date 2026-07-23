import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChartSkeleton } from "@/components/shared/loaders/ChartSkeleton"
import { usePageRefresh } from "@/contexts/PageRefreshContext"

interface MembershipGrowthChartProps {
  data: { year: string; count: number }[]
  isLoading?: boolean
}

export function MembershipGrowthChart({ data, isLoading }: MembershipGrowthChartProps) {
  const { isRefreshing } = usePageRefresh()
  if (isLoading || isRefreshing) return <ChartSkeleton variant="area" height={260} />

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="membershipGrowthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="year" tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
        <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false} width={36} />
        <Tooltip
          formatter={(value) => [value, "Cumulative Members"]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-popover)",
            fontSize: 12,
          }}
        />
        <Area type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} fill="url(#membershipGrowthFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
