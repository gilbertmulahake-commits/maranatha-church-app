import { Suspense } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { getChurches, getChurchStats } from '@/lib/actions/church-actions'
import { CreateChurchDialog } from '@/components/churches/create-church-dialog'
import { ChurchDashboard } from '@/components/churches/church-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

// 1. Accept both region and status from searchParams
async function ChurchesContent({ searchParams }: { searchParams: Promise<{ region?: string, status?: string }> }) {
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
      initialStatusFilter={params.status} // Pass status down
    />
  )
}

export default function ChurchesPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ region?: string, status?: string }> 
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

        <Suspense fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-[120px] rounded-xl" />
              <Skeleton className="h-[120px] rounded-xl" />
              <Skeleton className="h-[120px] rounded-xl" />
              <Skeleton className="h-[120px] rounded-xl" />
            </div>
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        }>
          <ChurchesContent searchParams={searchParams} />
        </Suspense>
      </div>
    </AppShell>
  )
}