import { Suspense } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { getChurches, getChurchStats } from '@/lib/actions/church-actions'
import { CreateChurchDialog } from '@/components/churches/create-church-dialog'
import { ChurchDashboard } from '@/components/churches/church-dashboard'

// 1. Accept the searchParams Promise directly here
async function ChurchesContent({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
  // 2. Await it INSIDE the Suspense boundary
  const params = await searchParams
  
  const [churches, nationalStats] = await Promise.all([
    getChurches(),
    getChurchStats()
  ])

  return (
    <ChurchDashboard 
      initialData={churches} 
      nationalStats={nationalStats} 
      initialRegionFilter={params.region} 
    />
  )
}

// 3. Don't await searchParams at the page level
export default function ChurchesPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ region?: string }> 
}) {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Churches</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage all 1,600 local churches across the regions.
            </p>
          </div>
          <CreateChurchDialog />
        </div>

        <Suspense fallback={<p className="text-sm text-muted-foreground">Fetching church data...</p>}>
          <ChurchesContent searchParams={searchParams} />
        </Suspense>
      </div>
    </AppShell>
  )
}