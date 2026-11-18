'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatCurrency } from '@/lib/utils'

export type YoYChartRow = {
  year: string
  annual: number
  monthly: number
}

const chartConfig = {
  annual: {
    label: 'Annual',
    color: 'var(--color-primary)',
  },
  monthly: {
    label: 'Monthly',
    color: 'var(--color-emerald-500)',
  },
} satisfies ChartConfig

export function YoYComparisonChart({ data }: { data: YoYChartRow[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--color-border)"
        />
        <XAxis
          dataKey="year"
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          tickFormatter={(v) => (v === 0 ? '0' : `${Math.round(Number(v) / 1000)}k`)}
          width={50}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <Bar dataKey="annual" fill="var(--color-annual)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="monthly" fill="var(--color-monthly)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}