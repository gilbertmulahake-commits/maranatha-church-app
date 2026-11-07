import { Suspense } from 'react'
import { connection } from 'next/server'
import { getLocalChurchStats } from '@/lib/actions/local-actions'
import { LocalDashboardClient } from '@/components/local/local-dashboard-client'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

async function LocalContent() {
  await connection()

  const stats = await getLocalChurchStats()

  if ('error' in stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-full">
          <MapPin className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-heading-3 font-medium text-foreground">Access Error</h2>
          <p className="text-paragraph-small text-muted-foreground mt-1">{stats.error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-xl" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Contextual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-heading-2 font-bold text-foreground">{stats.churchName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="font-mono">{stats.churchCode}</Badge>
            <span className="text-paragraph-small text-muted-foreground">•</span>
            <span className="text-paragraph-small text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {stats.regionName} Region
            </span>
          </div>
        </div>
      </div>

      {/* New Client Wrapper handles the filtering */}
      <LocalDashboardClient stats={stats} />
    </div>
  )
}

export default function LocalChurchDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-xl">
          <Skeleton className="h-[80px] w-[300px]" />
          <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      }
    >
      <LocalContent />
    </Suspense>
  )
}