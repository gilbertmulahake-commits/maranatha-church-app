import { Suspense } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { getRegionsWithStats, getRegionStats } from '@/lib/actions/region-actions'
import { CreateRegionDialog } from '@/components/regions/create-region-dialog'
import { RegionTable } from '@/components/regions/region-table'
import { RegionKpiCards } from '@/components/regions/region-kpi-cards'

async function RegionsContent() {
  // Fetch both datasets in parallel for speed
  const [regions, stats] = await Promise.all([
    getRegionsWithStats(),
    getRegionStats()
  ])

  return (
    <div className="space-y-6">
      <RegionKpiCards stats={stats} />
      <RegionTable data={regions} />
    </div>
  )
}

export default function RegionsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Regions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage the 60 regional units and monitor their performance.
            </p>
          </div>
          <CreateRegionDialog />
        </div>

        <Suspense fallback={<p className="text-sm text-muted-foreground">Fetching region data...</p>}>
          <RegionsContent />
        </Suspense>
      </div>
    </AppShell>
  )
}