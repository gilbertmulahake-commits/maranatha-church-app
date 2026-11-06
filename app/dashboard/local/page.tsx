import { Suspense } from 'react'
import { connection } from 'next/server'
import { AppShell } from '@/components/layout/app-shell'
import { getLocalChurchStats } from '@/lib/actions/local-actions'
import { LocalKpiCards } from '@/components/local/local-kpi-cards'
import { LocalPaymentHistory } from '@/components/local/local-payment-history'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'

async function LocalContent() {
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* KPI Cards */}
      <LocalKpiCards stats={stats} />

      {/* Payment History */}
      <LocalPaymentHistory payments={stats.payments} />
    </div>
  )
}

async function Content() {
  // Force dynamic rendering (auth-protected via AppShell)
  await connection()

  return (
    <AppShell>
      <Suspense fallback={<div className="p-xl text-muted-foreground">Loading local dashboard...</div>}>
        <LocalContent />
      </Suspense>
    </AppShell>
  )
}

export default function LocalChurchDashboardPage() {
  return (
    <Suspense fallback={<div className="p-xl text-muted-foreground">Loading...</div>}>
      <Content />
    </Suspense>
  )
}