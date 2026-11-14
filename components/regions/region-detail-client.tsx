'use client'

import { useState, useMemo } from 'react'
import { RegionalTable } from '@/components/regional/regional-table'

import { StackedBar } from '@/components/dashboard/stacked-bar'
import { KpiGrid } from '@/components/ui/kpi-grid'
import { KpiValue } from '@/components/ui/kpi-value'

import { Card, CardAction, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Banknote, AlertTriangle, CheckCircle2, CalendarDays, CheckCircle } from 'lucide-react'
import type { RegionalChurchData } from '@/lib/actions/regional-actions'

interface SingleRegionStats {
  regionName: string
  chairmanName: string
  totalCollected: number
  totalCollectedAnnual: number
  totalCollectedMonthly: number
  totalExpected: number
  totalExpectedAnnual: number
  totalExpectedMonthly: number
  outstanding: number
  outstandingAnnual: number
  outstandingMonthly: number
  thisMonthCollectedAnnual: number
  thisMonthCollectedMonthly: number
  thisMonthExpected: number
  thisMonthCollectionPct: number
  compliancePct: number
  compliantChurches: number
  partialChurches: number
  overdueChurches: number
  churches: RegionalChurchData[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function RegionDetailClient({ stats }: { stats: SingleRegionStats }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [periodView, setPeriodView] = useState<'month' | 'year'>('year')

  const rawCollectionPct = stats.totalExpected > 0 ? (stats.totalCollected / stats.totalExpected) * 100 : 0
  const displayCollectionPct = Math.min(rawCollectionPct, 100)
  const cardClasses = "h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card @container/card"

  const netCredit = Math.max(0, stats.totalCollected - stats.totalExpected)
  const inCredit = netCredit > 0

  let periodCompliant = 0
  let periodPartial = 0
  let periodOverdue = 0
  let periodNa = 0
  
  stats.churches.forEach((church) => {
    const s = periodView === 'year' ? church.annualStatus ?? church.status : church.monthlyStatus ?? church.status
    if (s === 'Paid') periodCompliant++
    else if (s === 'Partial') periodPartial++
    else if (s === 'Overdue') periodOverdue++
    else periodNa++
  })
  
  const periodTotal = stats.churches.length
  const periodCompliancePct = periodTotal > 0 ? (periodCompliant / periodTotal) * 100 : 0
  const viewLabel = periodView === 'year' ? 'annual view' : 'monthly view'

  const filteredChurches = useMemo(() => {
    return stats.churches.filter((church) => {
      const s = search.toLowerCase()
      const matchesSearch =
        church.church_name.toLowerCase().includes(s) ||
        church.church_code.toLowerCase().includes(s) ||
        (church.pastor_name || '').toLowerCase().includes(s)
      
      const activeStatus =
        periodView === 'year'
          ? church.annualStatus ?? church.status
          : church.monthlyStatus ?? church.status

      const matchesStatus = statusFilter === 'All' || activeStatus === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [stats.churches, search, statusFilter, periodView])

  return (
    <div className="@container space-y-xl">
      <KpiGrid>
        <Card className={cardClasses} onClick={() => setStatusFilter('All')}>
          <CardHeader>
            <CardDescription>Region Collected</CardDescription>
            <KpiValue>
              {formatCurrency(stats.totalCollected)}
            </KpiValue>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                <Banknote className="h-3 w-3" /> YTD
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <StackedBar
              segments={[
                { label: `Annual ${formatCurrency(stats.totalCollectedAnnual)}`, value: stats.totalCollectedAnnual, color: 'bg-blue-500' },
                { label: `Monthly ${formatCurrency(stats.totalCollectedMonthly)}`, value: stats.totalCollectedMonthly, color: 'bg-emerald-500' },
              ]}
              total={Math.max(stats.totalCollected, stats.totalExpected)}
            />
            <p className="text-paragraph-mini text-muted-foreground">
              {displayCollectionPct.toFixed(1)}% of {formatCurrency(stats.totalExpected)} expected
            </p>
          </CardFooter>
        </Card>

        <Card className={cardClasses} onClick={() => setStatusFilter('Overdue')}>
          <CardHeader>
            <CardDescription>{inCredit ? 'Net Credit' : 'Region Arrears'}</CardDescription>
            <KpiValue className={inCredit ? 'text-emerald-600' : 'text-destructive'}>
              {formatCurrency(inCredit ? netCredit : stats.outstanding)}
            </KpiValue>
            <CardAction className="shrink-0">
              {inCredit ? (
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                  <CheckCircle className="h-3 w-3" /> In Credit
                </Badge>
              ) : (
                <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">
                  <AlertTriangle className="h-3 w-3" /> Action
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            {!inCredit && (
              <StackedBar
                segments={[
                  { label: `Annual ${formatCurrency(stats.outstandingAnnual)}`, value: stats.outstandingAnnual, color: 'bg-red-500' },
                  { label: `Monthly ${formatCurrency(stats.outstandingMonthly)}`, value: stats.outstandingMonthly, color: 'bg-amber-500' },
                ]}
              />
            )}
            {!inCredit ? (
              <p className="text-paragraph-mini text-muted-foreground">
                View churches with arrears
              </p>
            ) : (
              <p className="text-paragraph-mini text-muted-foreground">
                All contributions are up to date in this region.
              </p>
            )}
          </CardFooter>
        </Card>

        <Card className={cardClasses} onClick={() => setStatusFilter('Paid')}>
          <CardHeader>
            <CardDescription>Compliance Rate</CardDescription>
            <KpiValue>
              {periodCompliancePct.toFixed(1)}%
            </KpiValue>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">
                <CheckCircle2 className="h-3 w-3" /> {periodView === 'year' ? 'Annual' : 'Monthly'}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <StackedBar
              segments={[
                { label: `${periodCompliant} paid`, value: periodCompliant, color: 'bg-emerald-500' },
                { label: `${periodPartial} partial`, value: periodPartial, color: 'bg-amber-500' },
                { label: `${periodOverdue} overdue`, value: periodOverdue, color: 'bg-red-500' },
                ...(periodNa > 0 ? [{ label: `${periodNa} N/A`, value: periodNa, color: 'bg-gray-400' }] : []),
              ]}
            />
            <p className="text-paragraph-mini text-muted-foreground">
              {periodTotal} churches · {viewLabel} {periodNa > 0 && `· ${periodNa} N/A`}
            </p>
          </CardFooter>
        </Card>

        <Card className={cardClasses} onClick={() => setStatusFilter('All')}>
          <CardHeader>
            <CardDescription>This Month</CardDescription>
            <KpiValue>
              {formatCurrency(stats.thisMonthCollectedAnnual + stats.thisMonthCollectedMonthly)}
            </KpiValue>
            <CardAction className="shrink-0">
              <Badge variant="outline">
                <CalendarDays className="h-3 w-3" /> Current
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <StackedBar
              segments={[
                { label: `Annual ${formatCurrency(stats.thisMonthCollectedAnnual)}`, value: stats.thisMonthCollectedAnnual, color: 'bg-blue-500' },
                { label: `Monthly ${formatCurrency(stats.thisMonthCollectedMonthly)}`, value: stats.thisMonthCollectedMonthly, color: 'bg-emerald-500' },
              ]}
              total={Math.max(stats.thisMonthCollectedAnnual + stats.thisMonthCollectedMonthly, stats.thisMonthExpected)}
            />
            <p className="text-paragraph-mini text-muted-foreground">
              {stats.thisMonthCollectionPct.toFixed(1)}% of {formatCurrency(stats.thisMonthExpected)} due this month
            </p>
          </CardFooter>
        </Card>
      </KpiGrid>

      <RegionalTable
        churches={filteredChurches}
        regionName={stats.regionName}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        userRole="NATIONAL"
        periodView={periodView}
        setPeriodView={setPeriodView}
      />
    </div>
  )
}