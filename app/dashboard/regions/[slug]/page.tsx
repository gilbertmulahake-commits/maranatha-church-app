import { Suspense } from 'react'
import { connection } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getSingleRegionStats } from '@/lib/actions/region-actions'
// IMPORT the exact client component used on the Chairman's main dashboard
import { RegionalDashboardClient } from '@/components/regional/regional-dashboard-client'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityBackButton } from '@/components/shared/entity-back-button'

import { KpiGrid } from '@/components/ui/kpi-grid'

async function RegionDetailContent({ params }: { params: Promise<{ slug: string }> }) {
  await connection()

  const resolvedParams = await params
  
  // Convert "northern-region" back to "Northern Region"
  const regionName = resolvedParams.slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  // 1. Find the region by its name to get the actual ID
  const region = await prisma.region.findUnique({
    where: { name: regionName }
  })

  if (!region) return notFound()

  // 2. Fetch the stats using the ID
  const stats = await getSingleRegionStats(region.id)

  if ('error' in stats) {
    return <div className="p-xl text-destructive">{stats.error}</div>
  }

  return (
    <div className="space-y-xl">
      <div className="flex items-center gap-sm">
        <EntityBackButton fallbackHref="/dashboard/regions" />
        <div>
          <h1 className="text-heading-2 font-bold text-foreground">{stats.regionName} Region</h1>
          <p className="text-paragraph-small text-muted-foreground">
            Chairman: {stats.chairmanName} · Viewed as National HQ
          </p>
        </div>
      </div>

      {/* Use the Chairman's exact dashboard client component */}
      <RegionalDashboardClient stats={stats} userRole="NATIONAL" />
    </div>
  )
}

export default function RegionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-xl">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
          <KpiGrid>
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
          </KpiGrid>
          <Skeleton className="h-[500px] rounded-xl" />
        </div>
      }
    >
      <RegionDetailContent params={params} />
    </Suspense>
  )
}