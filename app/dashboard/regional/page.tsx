import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { AppShell } from '@/components/layout/app-shell'
import { getRegionalStats } from '@/lib/actions/regional-actions'
import { RegionalDashboardClient } from '@/components/regional/regional-dashboard-client'

async function RegionalContent() {
  await connection()
  
  const stats = await getRegionalStats()

  if ('error' in stats) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">{stats.regionName} Region Dashboard</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Chairman: {stats.chairmanName}
        </p>
      </div>
      <RegionalDashboardClient stats={stats} />
    </div>
  )
}

async function Content() {
  await connection()

  return (
    <AppShell>
      <Suspense fallback={<div className="p-xl text-muted-foreground">Loading regional data...</div>}>
        <RegionalContent />
      </Suspense>
    </AppShell>
  )
}

export default function RegionalDashboardPage() {
  return (
    <Suspense fallback={<div className="p-xl text-muted-foreground">Loading...</div>}>
      <Content />
    </Suspense>
  )
}