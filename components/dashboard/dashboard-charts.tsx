'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrearsAging } from './arrears-aging'

interface DashboardChartsProps {
  range: 'week' | 'month' | 'year' | 'all'
  setRange: (val: 'week' | 'month' | 'year' | 'all') => void
  monthlyCollections: { name: string; amount: number }[]
  weeklyCollections: { name: string; amount: number }[]
  yearlyCollections: { name: string; amount: number }[]
  allTimeCollections: { name: string; amount: number }[]
  aging0_30: number
  aging31_60: number
  aging61_90: number
  aging90_plus: number
  totalActionRequired: number
}

const chartConfig = {
  amount: {
    label: "Collected",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { 
    style: 'currency', 
    currency: 'KES', 
    maximumFractionDigits: 0 
  }).format(amount)
}

export function DashboardCharts({ 
  range,
  setRange,
  monthlyCollections, 
  weeklyCollections, 
  yearlyCollections, 
  allTimeCollections,
  aging0_30,
  aging31_60,
  aging61_90,
  aging90_plus,
  totalActionRequired,
}: DashboardChartsProps) {
  const trendData = {
    week: weeklyCollections,
    month: monthlyCollections,
    year: yearlyCollections,
    all: allTimeCollections
  }[range]

  const trendTotal = trendData.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="grid grid-cols-1 @[800px]/dashboard:grid-cols-12 gap-md">
      
      {/* Area Chart: Collection Trend */}
      <Card className="col-span-1 @[800px]/dashboard:col-span-6 @[1100px]/dashboard:col-span-7 shadow-sm flex flex-col @container/card">
        <CardHeader className="flex flex-col pb-6 gap-4">
          <div className="w-full space-y-1">
            <div className="flex items-center justify-between gap-4 w-full">
              <CardTitle className="flex items-center gap-2 text-heading-4 font-bold text-foreground">
                <TrendingUp className="h-4 w-4 text-primary shrink-0" /> 
                <span className="truncate">Collection Trend</span>
              </CardTitle>
              <span className="text-heading-4 font-bold text-foreground tabular-nums tracking-tight whitespace-nowrap shrink-0">
                {formatCurrency(trendTotal)}
              </span>
            </div>
            <CardDescription className="text-xs @[450px]/card:text-sm">
              {range === 'week' ? 'Current week collections.' : range === 'month' ? '6-month rolling view of collections.' : range === 'year' ? 'Current year collections.' : 'Lifetime collection history.'}
            </CardDescription>
          </div>

          <div className="hidden @[450px]/card:flex items-center gap-1 bg-muted rounded-lg p-1 h-10 w-fit">
            <Button
              variant="ghost" size="sm"
              className={cn(
                "h-8 px-4 text-sm font-medium transition-all",
                range === 'week' ? 'bg-card text-foreground font-bold shadow-sm' : 'text-muted-foreground'
              )}
              onClick={() => setRange('week')}
            >
              This Week
            </Button>
            <Button
              variant="ghost" size="sm"
              className={cn(
                "h-8 px-4 text-sm font-medium transition-all",
                range === 'month' ? 'bg-card text-foreground font-bold shadow-sm' : 'text-muted-foreground'
              )}
              onClick={() => setRange('month')}
            >
              This Month
            </Button>
            <Button
              variant="ghost" size="sm"
              className={cn(
                "h-8 px-4 text-sm font-medium transition-all",
                range === 'year' ? 'bg-card text-foreground font-bold shadow-sm' : 'text-muted-foreground'
              )}
              onClick={() => setRange('year')}
            >
              This Year
            </Button>
            <Button
              variant="ghost" size="sm"
              className={cn(
                "h-8 px-4 text-sm font-medium transition-all",
                range === 'all' ? 'bg-card text-foreground font-bold shadow-sm' : 'text-muted-foreground'
              )}
              onClick={() => setRange('all')}
            >
              All Time
            </Button>
          </div>
          
          <Select value={range} onValueChange={(val) => { if (val) setRange(val as 'week' | 'month' | 'year' | 'all') }}>
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[450px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Select range">
                {range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : range === 'year' ? 'This Year' : 'All Time'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start" sideOffset={0} className="rounded-xl">
              <SelectItem value="week" className="rounded-lg">This Week</SelectItem>
              <SelectItem value="month" className="rounded-lg">This Month</SelectItem>
              <SelectItem value="year" className="rounded-lg">This Year</SelectItem>
              <SelectItem value="all" className="rounded-lg">All Time</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        
        <CardContent className="flex-1 w-full min-h-[300px] pt-2 px-2 sm:px-6">
          <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
            <AreaChart 
              data={trendData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-amount)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis 
                dataKey="name" 
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
                tickFormatter={(value) => value === 0 ? '0' : `${value / 1000}k`}
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
              
              <Area 
                type="natural" 
                dataKey="amount" 
                stroke="var(--color-amount)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorAmount)" 
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Arrears Aging — Replaces Doughnut */}
      <ArrearsAging 
        aging0_30={aging0_30}
        aging31_60={aging31_60}
        aging61_90={aging61_90}
        aging90_plus={aging90_plus}
        totalActionRequired={totalActionRequired}
      />

    </div>
  )
}