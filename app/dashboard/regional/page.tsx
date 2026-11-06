import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { AppShell } from '@/components/layout/app-shell'
import { getRegionalStats } from '@/lib/actions/regional-actions'
import { RegionalDashboardClient } from '@/components/regional/regional-dashboard-client'
import { Skeleton } from '@/components/ui/skeleton'

async function RegionalContent() {
  await connection()
  
  const stats = await getRegionalStats()

  if ('error' in stats) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{stats.regionName} Region Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chairman: {stats.chairmanName}
        </p>
      </div>
      
      {/* This client component contains BOTH the KPI cards and the full Table */}
      <RegionalDashboardClient stats={stats} />
    </div>
  )
}

export default function RegionalDashboardPage() {
  return (
    <AppShell>
      <Suspense fallback={
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-[250px] mb-2" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[120px] rounded-xl" />
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      }>
        <RegionalContent />
      </Suspense>
    </AppShell>
  )
}