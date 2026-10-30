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

async function DashboardContent() {
  // Force Next.js to render this dynamically on every request
  await connection()
  
  // 1. Check the user's role
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    // 2. If they are a Regional Chairman, redirect them to the Regional Dashboard
    if (dbUser?.role === 'REGIONAL_CHAIRMAN') {
      redirect('/dashboard/regional')
    }
  }

  // 3. Otherwise, show the National Dashboard data
  const stats = await getDashboardStats()

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KpiCards
        totalCollected={stats.totalCollected}
        totalExpected={stats.totalExpected}
        outstanding={stats.outstanding}
        collectionPct={stats.collectionPct}
        totalChurches={stats.totalChurches}
        totalRegions={stats.totalRegions}
      />

      {/* Charts */}
      <DashboardCharts paymentMethods={stats.paymentMethods} />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header with Quick Action */}
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