import { Suspense } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { getRegionsWithStats, getRegionStats } from '@/lib/actions/region-actions'
import { CreateRegionDialog } from '@/components/regions/create-region-dialog'
import { RegionDashboard } from '@/components/regions/region-dashboard'

export const instant = false

async function RegionsContent() {
  const [regions, stats] = await Promise.all([
    getRegionsWithStats(),
    getRegionStats()
  ])

  return <RegionDashboard initialData={regions} stats={stats} />
}

export default function RegionsPage() {
  return (
    <AppShell>
      <div className="space-y-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-2 font-medium text-foreground">Regions</h1>
            <p className="mt-xs text-paragraph-small text-muted-foreground">
              Manage the 60 regional units and monitor their performance.
            </p>
          </div>
          <CreateRegionDialog />
        </div>

        <Suspense fallback={<p className="text-paragraph-small text-muted-foreground">Loading region data...</p>}>
          <RegionsContent />
        </Suspense>
      </div>
    </AppShell>
  )
}