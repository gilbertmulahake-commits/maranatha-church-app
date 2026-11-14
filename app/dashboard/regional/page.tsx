import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { getRegionalStats } from '@/lib/actions/regional-actions'
import { RegionalDashboardClient } from '@/components/regional/regional-dashboard-client'
import { Skeleton } from '@/components/ui/skeleton'

import { KpiGrid } from '@/components/ui/kpi-grid'

async function RegionalContent() {
  await connection()

  const stats = await getRegionalStats()

  if ('error' in stats) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">{stats.regionName} Region</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Chairman: {stats.chairmanName}
        </p>
      </div>

      <RegionalDashboardClient stats={stats} />
    </div>
  )
}

export default function RegionalDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-xl">
          <Skeleton className="h-[60px] w-[250px]" />
          <KpiGrid>
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
          </KpiGrid>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      }
    >
      <RegionalContent />
    </Suspense>
  )
}