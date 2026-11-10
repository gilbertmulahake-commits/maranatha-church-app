'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'

interface DashboardChartsProps {
  monthlyCollections: { name: string; amount: number }[]
  complianceData: {
    compliant: number
    partial: number
    overdue: number
    na: number
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { 
    style: 'currency', 
    currency: 'KES', 
    maximumFractionDigits: 0 
  }).format(amount)
}

export function DashboardCharts({ monthlyCollections, complianceData }: DashboardChartsProps) {
  
  // Data for the Compliance Doughnut
  const pieData = [
    { name: 'Paid', value: complianceData.compliant, fill: 'var(--color-emerald-500)' },
    { name: 'Partial', value: complianceData.partial, fill: 'var(--color-amber-500)' },
    { name: 'Overdue', value: complianceData.overdue, fill: 'var(--color-rose-500)' },
    { name: 'N/A', value: complianceData.na, fill: 'var(--color-slate-300)' },
  ].filter(d => d.value > 0) // Don't render 0-value slices

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
      
      {/* Area Chart: Collection Trend */}
      <Card className="lg:col-span-2 shadow-sm">
        <CardHeader>
          <CardTitle className="text-heading-4 font-bold text-foreground">Collection Trend</CardTitle>
          <CardDescription>6-month rolling view of national collections.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={monthlyCollections} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
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
                tickFormatter={(value) => value === 0 ? '0' : `${value / 1000}k`}
                width={60}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: '1px solid var(--color-border)', 
                  backgroundColor: 'var(--color-card)',
                  boxShadow: 'var(--shadow-md)'
                }}
                labelStyle={{ fontWeight: 'bold', color: 'var(--color-foreground)', marginBottom: '4px' }}
                // FIXED: Removed the explicit `: number` type so TS infers from Recharts
                formatter={(value) => [formatCurrency(Number(value)), 'Collected']}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="var(--color-primary)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorAmount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Compliance Doughnut */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-heading-4 font-bold text-foreground">Compliance Breakdown</CardTitle>
          <CardDescription>Status of all active churches.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          {pieData.length === 0 ? (
            <p className="text-muted-foreground text-sm">No church data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="var(--color-card)" strokeWidth={2} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-card)',
                    boxShadow: 'var(--shadow-md)'
                  }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

    </div>
  )
}