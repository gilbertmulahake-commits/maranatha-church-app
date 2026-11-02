import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { getDashboardStats } from '@/lib/actions/dashboard-actions'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'
import { getRegionalScores } from '@/lib/actions/scoring-actions'
import { RegionalLeaderboard } from '@/components/dashboard/regional-leaderboard'

async function DashboardContent() {
  // 1. Force dynamic rendering (Next.js 16 requirement for Auth/Cookies)
  await connection()
  
  // 2. Check the user's role to enforce access control
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    // 3. Redirect Regional roles to their specific dashboard
    if (dbUser?.role === 'REGIONAL_CHAIRMAN' || dbUser?.role === 'REGIONAL_TREASURER') {
      redirect('/dashboard/regional')
    }
  }

  // 4. Fetch all data in parallel for the National Dashboard
  // (Only accessible by NATIONAL_TREASURER and NATIONAL_OVERSEER)
  const [stats, scores] = await Promise.all([
    getDashboardStats(),
    getRegionalScores(),
  ])

  return (
    <div className="space-y-6">
      {/* KPI Cards Component */}
      <KpiCards
        totalCollected={stats.totalCollected}
        totalCollectedAnnual={stats.totalCollectedAnnual}
        totalCollectedMonthly={stats.totalCollectedMonthly}
        totalExpectedAnnual={stats.totalExpectedAnnual}
        totalExpectedMonthly={stats.totalExpectedMonthly}
        outstanding={stats.outstanding}
        compliancePct={stats.compliancePct}
        totalChurches={stats.totalChurches}
        totalRegions={stats.totalRegions}
      />

      {/* Charts Component (Monthly Collections & Payment Methods) */}
      <DashboardCharts paymentMethods={stats.paymentMethods} />

      {/* Regional Leaderboard Component */}
      <RegionalLeaderboard scores={scores} />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header with Quick Action Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">National Dashboard</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Real-time overview of Maranatha Faith Assemblies Kenya collections.
            </p>
          </div>
          <Link href="/dashboard/mock-kcb">
            <Button className="bg-[#0F172A] hover:bg-[#1E293B]">
              <Zap className="mr-2 h-4 w-4" />
              Simulate Payment
            </Button>
          </Link>
        </div>

        {/* Suspense Boundary for Server-Side Data Fetching */}
        <Suspense fallback={<p className="text-sm text-[#64748B]">Loading dashboard data...</p>}>
          <DashboardContent />
        </Suspense>
      </div>
    </AppShell>
  )
}