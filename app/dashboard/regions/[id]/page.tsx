import { Suspense } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { getSingleRegionStats } from '@/lib/actions/region-actions'
import { RegionDetailClient } from '@/components/regions/region-detail-client'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Opt out of instant navigation validation (auth via AppShell)
export const instant = false

async function RegionDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const stats = await getSingleRegionStats(resolvedParams.id)

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

      {/* Client Component handles KPI cards + table + all state */}
      <RegionDetailClient stats={stats} />
    </div>
  )
}

export default function RegionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-xl text-muted-foreground">Loading region details...</div>}>
        <RegionDetailContent params={params} />
      </Suspense>
    </AppShell>
  )
}