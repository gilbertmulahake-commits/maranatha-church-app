import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { AppShell } from '@/components/layout/app-shell'
import { getRegionalStats } from '@/lib/actions/regional-actions'
import { Banknote, AlertTriangle, CheckCircle2 } from 'lucide-react'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

async function RegionalContent() {
  // Force Next.js to render this dynamically on every request
  await connection()
  
  const stats = await getRegionalStats()

    if ('error' in stats) {
        // If the user is not a Regional Chairman, kick them back to the National Dashboard
        redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">{stats.regionName} Region Dashboard</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Chairman: {stats.chairmanName}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#D1FAE5] p-2">
              <Banknote className="h-5 w-5 text-[#10B981]" />
            </div>
            <p className="text-sm font-medium text-[#64748B]">Region Collected</p>
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums text-[#0F172A]">
            {formatCurrency(stats.totalCollected)}
          </p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#FEE2E2] p-2">
              <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
            </div>
            <p className="text-sm font-medium text-[#64748B]">Region Arrears</p>
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums text-[#EF4444]">
            {formatCurrency(stats.outstanding)}
          </p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#DBEAFE] p-2">
              <CheckCircle2 className="h-5 w-5 text-[#2563EB]" />
            </div>
            <p className="text-sm font-medium text-[#64748B]">Compliance Rate</p>
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums text-[#0F172A]">
            {stats.compliancePct.toFixed(1)}%
          </p>
          <div className="mt-3 h-2 w-full rounded-full bg-[#E2E8F0]">
            <div
              className="h-2 rounded-full bg-[#2563EB]"
              style={{ width: `${Math.min(stats.compliancePct, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Churches Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E2E8F0]">
          <h3 className="text-lg font-semibold text-[#0F172A]">Churches in {stats.regionName}</h3>
          <p className="text-sm text-[#64748B]">Monitor compliance for all local churches in your region.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-[#64748B]">Church ID</th>
              <th className="px-6 py-3 text-left font-medium text-[#64748B]">Church Name</th>
              <th className="px-6 py-3 text-left font-medium text-[#64748B]">Treasurer</th>
              <th className="px-6 py-3 text-left font-medium text-[#64748B]">Amount Paid</th>
              <th className="px-6 py-3 text-left font-medium text-[#64748B]">Status</th>
            </tr>
          </thead>
          <tbody>
            {stats.churches.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-[#64748B]">
                  No churches have been added to this region yet.
                </td>
              </tr>
            ) : (
              stats.churches.map((church) => (
                <tr key={church.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-6 py-3 font-mono tabular-nums text-[#64748B]">{church.church_code}</td>
                  <td className="px-6 py-3 font-medium text-[#0F172A]">{church.church_name}</td>
                  <td className="px-6 py-3 text-[#64748B]">{church.treasurer_name}</td>
                  <td className="px-6 py-3 tabular-nums text-[#64748B]">{formatCurrency(church.amountPaid)}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      church.status === 'Paid' 
                        ? 'bg-[#D1FAE5] text-[#10B981]' 
                        : 'bg-[#FEF3C7] text-[#F59E0B]'
                    }`}>
                      {church.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function RegionalDashboardPage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-sm text-[#64748B]">Loading regional data...</p>}>
        <RegionalContent />
      </Suspense>
    </AppShell>
  )
}