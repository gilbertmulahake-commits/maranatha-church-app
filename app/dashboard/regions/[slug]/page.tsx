import { Suspense } from 'react'
import { connection } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getSingleRegionStats } from '@/lib/actions/region-actions'
import { RegionDetailClient } from '@/components/regions/region-detail-client'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

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
        <Link href="/dashboard/regions">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-heading-2 font-bold text-foreground">{stats.regionName} Region</h1>
          <p className="text-paragraph-small text-muted-foreground">
            Chairman: {stats.chairmanName} · Viewed as National HQ
          </p>
        </div>
      </div>

      <RegionDetailClient stats={stats} />
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
          <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
          </div>
          <Skeleton className="h-[500px] rounded-xl" />
        </div>
      }
    >
      <RegionDetailContent params={params} />
    </Suspense>
  )
}