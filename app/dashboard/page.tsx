import { AppShell } from '@/components/layout/app-shell'

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">National Dashboard</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Welcome to the Maranatha Faith Assemblies collection system.
          </p>
        </div>

        {/* Placeholder for KPI Cards (will be built in Unit 06) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-[#64748B]">Total Collected</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[#0F172A]">KES 0</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-[#64748B]">Target</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[#0F172A]">KES 17.6M</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-[#64748B]">Active Churches</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[#0F172A]">0</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-[#64748B]">Compliance Rate</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[#0F172A]">0%</p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}