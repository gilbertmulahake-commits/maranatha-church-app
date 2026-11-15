'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HeroKpi } from '@/components/dashboard/hero-kpi'
import { ActionCenter } from '@/components/dashboard/action-center'
import { RecentPayments } from '@/components/dashboard/recent-payments'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { RegionalLeaderboard } from '@/components/dashboard/regional-leaderboard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

type RangeKey = 'week' | 'month' | 'year' | 'all'

interface DashboardViewProps {
  stats: Awaited<ReturnType<typeof import('@/lib/actions/dashboard-actions').getDashboardStats>>
  scores: Awaited<ReturnType<typeof import('@/lib/actions/scoring-actions').getRegionalScores>>
}

const RANGES: { value: RangeKey; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
]

function isRangeKey(val: string | null): val is RangeKey {
  return val === 'week' || val === 'month' || val === 'year' || val === 'all'
}

export function DashboardView({ stats, scores }: DashboardViewProps) {
  const [range, setRange] = useState<RangeKey>('year')

  return (
    <div className="space-y-xl @container/dashboard">
      {/* Page Header — Global Range Toggle integrated */}
      <div className="flex flex-col @[600px]/dashboard:flex-row @[600px]/dashboard:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-bold text-foreground">National Dashboard</h1>
          <p className="mt-xs text-paragraph-small text-muted-foreground">
            Real-time overview of Maranatha Faith Assemblies Kenya collections.
          </p>
        </div>
        
        <div className="flex flex-col @[450px]/dashboard:flex-row items-start @[450px]/dashboard:items-center gap-3">
          {/* Global Range Toggle (Desktop) */}
          <div className="hidden @[600px]/dashboard:flex items-center gap-1 bg-muted rounded-lg p-1 h-9">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                variant="ghost" size="sm"
                className={cn(
                  "h-7 px-3 text-xs font-medium transition-all",
                  range === r.value ? 'bg-card text-foreground font-bold shadow-sm' : 'text-muted-foreground'
                )}
                onClick={() => setRange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>

          {/* Mobile Range Select */}
          <Select
            value={range}
            onValueChange={(val) => {
              if (isRangeKey(val)) setRange(val)
            }}
          >
            <SelectTrigger className="w-full @[600px]/dashboard:hidden bg-card h-9">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent align="end" sideOffset={0}>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Link href="/dashboard/mock-kcb" className="w-full @[450px]/dashboard:w-auto">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 w-full">
              <Zap className="mr-2 h-4 w-4" />
              Simulate Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* ROW 1: COMMAND BAR */}
      <div className="grid grid-cols-1 @[800px]/dashboard:grid-cols-12 gap-md items-stretch">
        <div className="col-span-1 @[800px]/dashboard:col-span-6 @[1100px]/dashboard:col-span-7">
          <HeroKpi range={range} stats={stats} />
        </div>
        <div className="col-span-1 @[800px]/dashboard:col-span-6 @[1100px]/dashboard:col-span-5">
          <ActionCenter stats={stats} />
        </div>
      </div>

      {/* ROW 2: BUCKET HEALTH ROW */}
      <KpiCards stats={stats} />

      {/* ROW 3: ANALYTICS */}
      <DashboardCharts
        range={range}
        setRange={setRange}
        monthlyCollections={stats.monthlyCollections}
        weeklyCollections={stats.weeklyCollections}
        yearlyCollections={stats.yearlyCollections}
        allTimeCollections={stats.allTimeCollections}
        aging0_30={stats.aging0_30}
        aging31_60={stats.aging31_60}
        aging61_90={stats.aging61_90}
        aging90_plus={stats.aging90_plus}
        totalActionRequired={stats.overdueChurches + stats.partialChurches}
      />

      {/* ROW 4: ACTIVITY & ACCOUNTABILITY — Leaderboard wider on left, Live Feed on right */}
      <div className="grid grid-cols-1 @[800px]/dashboard:grid-cols-12 gap-md">
        <div className="col-span-1 @[800px]/dashboard:col-span-6 @[1100px]/dashboard:col-span-7">
          <RegionalLeaderboard scores={scores} />
        </div>
        <div className="col-span-1 @[800px]/dashboard:col-span-6 @[1100px]/dashboard:col-span-5">
          <RecentPayments transactions={stats.recentTransactions} />
        </div>
      </div>
    </div>
  )
}