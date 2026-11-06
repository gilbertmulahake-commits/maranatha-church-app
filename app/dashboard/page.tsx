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
import { Skeleton } from '@/components/ui/skeleton'

async function DashboardContent() {
  await connection()
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

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

  return (
    <div className="space-y-xl">
      <KpiCards stats={stats} />
      <DashboardCharts 
        paymentMethods={stats.paymentMethods} 
        monthlyCollections={stats.monthlyCollections} 
      />
      <RegionalLeaderboard scores={scores} />
    </div>
  )
}

async function Content() {
  // Force this route to render dynamically (auth-protected via AppShell)
  await connection()

  return (
    <AppShell>
      <div className="space-y-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-2 font-medium text-foreground">National Dashboard</h1>
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

        <Suspense fallback={
          <div className="space-y-xl">
            <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-[120px] rounded-xl" />
              <Skeleton className="h-[120px] rounded-xl" />
              <Skeleton className="h-[120px] rounded-xl" />
              <Skeleton className="h-[120px] rounded-xl" />
            </div>
            <div className="grid grid-cols-1 gap-xl md:grid-cols-2">
              <Skeleton className="h-[350px] rounded-xl" />
              <Skeleton className="h-[350px] rounded-xl" />
            </div>
            <Skeleton className="h-[300px] rounded-xl" />
          </div>
        }>
          <DashboardContent />
        </Suspense>
      </div>
    </AppShell>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-xl text-muted-foreground">Loading dashboard...</div>}>
      <Content />
    </Suspense>
  )
}