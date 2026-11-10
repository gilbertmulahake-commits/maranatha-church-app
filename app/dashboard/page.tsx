import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import Link from 'next/link'
import { getDashboardStats } from '@/lib/actions/dashboard-actions'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'
import { getRegionalScores } from '@/lib/actions/scoring-actions'
import { RegionalLeaderboard } from '@/components/dashboard/regional-leaderboard'
import { Skeleton } from '@/components/ui/skeleton'
import { HeroKpi } from '@/components/dashboard/hero-kpi'
import { RecentPayments } from '@/components/dashboard/recent-payments'

async function DashboardContent() {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

    if (dbUser?.role === 'REGIONAL_CHAIRMAN' || dbUser?.role === 'REGIONAL_TREASURER') {
      redirect('/dashboard/regional')
    }
    if (dbUser?.role === 'LOCAL_PASTOR' || dbUser?.role === 'CHURCH_TREASURER') {
      redirect('/dashboard/local')
    }
  }

  const [stats, scores] = await Promise.all([
    getDashboardStats(),
    getRegionalScores(),
  ])

  const yearCollectionPct =
    stats.targetAmount > 0
      ? (stats.totalCollectedThisYear / stats.targetAmount) * 100
      : 0

  return (
    <div className="space-y-xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-2 font-bold text-foreground">National Dashboard</h1>
          <p className="mt-xs text-paragraph-small text-muted-foreground">
            Real-time overview of Maranatha Faith Assemblies Kenya collections.
          </p>
        </div>
        <Link href="/dashboard/mock-kcb">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-9">
            <Zap className="mr-2 h-4 w-4" />
            Simulate Payment
          </Button>
        </Link>
      </div>

      {/* ROW 1: COMMAND BAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-md items-stretch">
        <div className="lg:col-span-8">
          <HeroKpi
            totalCollectedThisYear={stats.totalCollectedThisYear}
            targetAmount={stats.targetAmount}
            collectionPct={yearCollectionPct}
            totalExpectedThisYear={stats.totalExpectedThisYear}
          />
        </div>
        <div className="lg:col-span-4">
          <RecentPayments transactions={stats.recentTransactions} />
        </div>
      </div>

      {/* ROW 2: THE PULSE */}
      <KpiCards stats={stats} />

      {/* ROW 3: ANALYTICS */}
      <DashboardCharts
        monthlyCollections={stats.monthlyCollections}
        complianceData={{
          compliant: stats.compliantChurches,
          partial: stats.partialChurches,
          overdue: stats.overdueChurches,
          na: stats.naChurches || 0,
        }}
      />

      {/* ROW 4: ACTION CENTER */}
      <RegionalLeaderboard scores={scores} />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-xl">
          <Skeleton className="h-[60px] w-[300px]" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-md">
            <Skeleton className="h-[240px] rounded-2xl lg:col-span-8" />
            <Skeleton className="h-[240px] rounded-xl lg:col-span-4" />
          </div>
          <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
            <Skeleton className="h-[380px] rounded-xl lg:col-span-2" />
            <Skeleton className="h-[380px] rounded-xl" />
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}