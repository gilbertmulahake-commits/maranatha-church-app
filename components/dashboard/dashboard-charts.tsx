'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface DashboardChartsProps {
  paymentMethods: { mpesa: number; bank: number; cash: number }
  monthlyCollections: { name: string; amount: number }[]
}

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']

export function DashboardCharts({ paymentMethods, monthlyCollections }: DashboardChartsProps) {
  const pieData = [
    { name: 'M-Pesa', value: paymentMethods.mpesa },
    { name: 'Bank Transfer', value: paymentMethods.bank },
    { name: 'Cash', value: paymentMethods.cash },
  ].filter((item) => item.value > 0)

  const hasPieData = pieData.length > 0

  return (
    <div className="space-y-xl">
      {/* Full-Width Bar Chart */}
      <div className="rounded-xl border border-border bg-card p-xl shadow-sm">
        <h3 className="text-heading-4 font-medium text-foreground">Monthly Collections</h3>
        <p className="mb-md text-paragraph-small text-muted-foreground">Collections trend over the last 6 months</p>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyCollections}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                formatter={(value) => [`KES ${Number(value || 0).toLocaleString()}`, 'Collected']}
              />
              <Bar dataKey="amount" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2-Column Grid: Pie Chart & Leaderboard (or other viz) */}
      <div className="grid grid-cols-1 gap-xl md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-xl shadow-sm">
          <h3 className="text-heading-4 font-medium text-foreground">Payment Methods</h3>
          <p className="mb-md text-paragraph-small text-muted-foreground">Distribution of payment channels</p>
          <div className="h-[300px] w-full">
            {hasPieData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--foreground)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-paragraph-small text-muted-foreground">
                No payment data yet. Simulate a payment to see the chart.
              </div>
            )}
          </div>
        </div>

        {/* Placeholder for the leaderboard or other viz to be placed here */}
        <div className="rounded-xl border border-border bg-card p-xl shadow-sm flex items-center justify-center">
          <p className="text-paragraph-small text-muted-foreground">Leaderboard will be moved here</p>
        </div>
      </div>
    </div>
  )
}