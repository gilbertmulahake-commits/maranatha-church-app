'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface DashboardChartsProps {
  paymentMethods: {
    mpesa: number
    bank: number
    cash: number
  }
}

// Sample data for the bar chart (we'll make this dynamic in a later unit)
const monthlyData = [
  { name: 'Jan', amount: 0 },
  { name: 'Feb', amount: 0 },
  { name: 'Mar', amount: 0 },
  { name: 'Apr', amount: 0 },
  { name: 'May', amount: 0 },
  { name: 'Jun', amount: 0 },
]

const COLORS = ['#2563EB', '#10B981', '#F59E0B']

export function DashboardCharts({ paymentMethods }: DashboardChartsProps) {
  // Prepare data for the Pie chart
  const pieData = [
    { name: 'M-Pesa', value: paymentMethods.mpesa },
    { name: 'Bank Transfer', value: paymentMethods.bank },
    { name: 'Cash', value: paymentMethods.cash },
  ].filter((item) => item.value > 0)

  const hasPieData = pieData.length > 0

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Bar Chart: Monthly Collections */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[#0F172A]">Monthly Collections</h3>
        <p className="mb-4 text-sm text-[#64748B]">Collections trend over the last 6 months</p>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: '#F8FAFC' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
              />
              <Bar dataKey="amount" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut Chart: Payment Methods */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[#0F172A]">Payment Methods</h3>
        <p className="mb-4 text-sm text-[#64748B]">Distribution of payment channels</p>
        <div className="h-[300px] w-full">
          {hasPieData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#64748B]">
              No payment data yet. Simulate a payment to see the chart.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}