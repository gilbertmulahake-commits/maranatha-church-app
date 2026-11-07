import { Suspense } from 'react'
import { connection } from 'next/server'
import { getChurches, getChurchStats } from '@/lib/actions/church-actions'
import { CreateChurchDialog } from '@/components/churches/create-church-dialog'
import { ChurchDashboard } from '@/components/churches/church-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

async function ChurchesContent({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; status?: string }>
}) {
  await connection()
  const params = await searchParams

  const [churches, nationalStats] = await Promise.all([
    getChurches(),
    getChurchStats(),
  ])

  return (
    <ChurchDashboard
      initialData={churches}
      nationalStats={nationalStats}
      initialRegionFilter={params.region}
      initialStatusFilter={params.status}
    />
  )
}

export default function ChurchesPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; status?: string }>
}) {
  return (
    <div className="space-y-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-2 font-medium text-foreground">Churches</h1>
          <p className="mt-xs text-paragraph-small text-muted-foreground">
            Manage all 1,600 local churches across the regions.
          </p>
        </div>
        <CreateChurchDialog />
      </div>

      <Suspense
        fallback={
          <div className="space-y-xl">
            <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-[140px] rounded-xl" />
              <Skeleton className="h-[140px] rounded-xl" />
              <Skeleton className="h-[140px] rounded-xl" />
              <Skeleton className="h-[140px] rounded-xl" />
            </div>
            <Skeleton className="h-[600px] rounded-xl" />
          </div>
        }
      >
        <ChurchesContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}