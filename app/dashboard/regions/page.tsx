import { Suspense } from 'react'
import { connection } from 'next/server'
import { getRegionsWithStats, getRegionStats } from '@/lib/actions/region-actions'
import { CreateRegionDialog } from '@/components/regions/create-region-dialog'
import { RegionDashboard } from '@/components/regions/region-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

import { KpiGrid } from '@/components/ui/kpi-grid'

async function RegionsContent() {
  await connection()

  const [regions, stats] = await Promise.all([
    getRegionsWithStats(),
    getRegionStats(),
  ])

  return <RegionDashboard initialData={regions} stats={stats} />
}

export default function RegionsPage() {
  return (
    <div className="space-y-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-2 font-bold text-foreground">Regions</h1>
          <p className="mt-xs text-paragraph-small text-muted-foreground">
            Manage the 60 regional units and monitor their performance.
          </p>
        </div>
        <CreateRegionDialog />
      </div>

      <Suspense
        fallback={
          <div className="space-y-xl">
            <KpiGrid>
              <Skeleton className="h-[120px] rounded-xl" />
              <Skeleton className="h-[120px] rounded-xl" />
              <Skeleton className="h-[120px] rounded-xl" />
              <Skeleton className="h-[120px] rounded-xl" />
            </KpiGrid>
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        }
      >
        <RegionsContent />
      </Suspense>
    </div>
  )
}