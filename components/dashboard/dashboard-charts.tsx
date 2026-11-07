'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { TrendingUp, PieChart as PieIcon } from 'lucide-react'

interface DashboardChartsProps {
  monthlyCollections: { name: string, amount: number }[]
  paymentMethods: { mpesa: number, bank: number, cash: number }
}

function formatCurrencyShort(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
  return value.toString()
}

export function DashboardCharts({ monthlyCollections, paymentMethods }: DashboardChartsProps) {
  // 1. Configure the shadcn chart themes using the Tailwind v4 variables
  const areaChartConfig = {
    amount: {
      label: 'Collected',
      color: 'var(--color-chart-1)', // Maps to Blue-500
    },
  } satisfies ChartConfig

  const pieChartConfig = {
    mpesa: { label: 'M-Pesa', color: 'var(--color-chart-1)' }, // Blue-500
    bank: { label: 'Bank', color: 'var(--color-chart-2)' },    // Emerald-500
    cash: { label: 'Cash', color: 'var(--color-chart-4)' },    // Amber-500 (Skipping indigo for better contrast)
  } satisfies ChartConfig

  const pieData = [
    { name: 'mpesa', value: paymentMethods.mpesa },
    { name: 'bank', value: paymentMethods.bank },
    { name: 'cash', value: paymentMethods.cash },
  ].filter(d => d.value > 0)

  const totalMethods = pieData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
      
      {/* AREA CHART: Collection Trend */}
      <Card className="lg:col-span-2 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-heading-4">
            <TrendingUp className="h-5 w-5 text-primary" /> Collection Trend
          </CardTitle>
          <CardDescription>6-month rolling view of national collections.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={areaChartConfig} className="h-[300px] w-full">
            <AreaChart data={monthlyCollections} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-amount)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                tickFormatter={formatCurrencyShort}
              />
              <ChartTooltip 
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="var(--color-amount)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#fillAmount)" 
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* DONUT CHART: Payment Methods */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-heading-4">
            <PieIcon className="h-5 w-5 text-primary" /> Composition
          </CardTitle>
          <CardDescription>Volume by payment channel.</CardDescription>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-paragraph-small text-muted-foreground">
              No transactions yet.
            </div>
          ) : (
            <div className="h-[300px] w-full flex flex-col items-center justify-center">
              
              <ChartContainer config={pieChartConfig} className="mx-auto aspect-square max-h-[200px]">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              <div className="w-full space-y-2 mt-4">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-paragraph-small">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: `var(--color-${item.name})` }} />
                      <span className="text-muted-foreground capitalize">{item.name === 'mpesa' ? 'M-Pesa' : item.name}</span>
                    </div>
                    <span className="font-medium tabular-nums">
                      {((item.value / totalMethods) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}