import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format, parseISO } from "date-fns"
import { formatCurrency } from "@/utils/format"

interface MonthlyCollectionsChartProps {
  data: { month: string; contributions: number; loanPayments: number }[]
}

function MonthTick(value: string) {
  try {
    return format(parseISO(`${value}-01`), "MMM yyyy")
  } catch {
    return value
  }
}

export function MonthlyCollectionsChart({ data }: MonthlyCollectionsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="month"
          tickFormatter={MonthTick}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "var(--color-border)" }}
        />
        <YAxis
          tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          formatter={(value, name) => [formatCurrency(Number(value)), name === "contributions" ? "Contributions" : "Loan Payments"]}
          labelFormatter={(label) => MonthTick(label as string)}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-popover)",
            fontSize: 12,
          }}
        />
        <Legend
          formatter={(value) => (value === "contributions" ? "Contributions" : "Loan Payments")}
          wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }}
        />
        <Line type="monotone" dataKey="contributions" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="loanPayments" stroke="var(--color-success)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
