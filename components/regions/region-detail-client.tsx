'use client'

import { useState, useMemo } from 'react'
import { RegionalTable } from '@/components/regional/regional-table'
import { StackedBar } from '@/components/dashboard/stacked-bar'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Banknote, AlertTriangle, CheckCircle2 } from 'lucide-react'

// Types from the server action
interface SingleRegionStats {
  regionName: string
  chairmanName: string
  totalCollected: number
  totalCollectedAnnual: number
  totalCollectedMonthly: number
  totalThisMonth: number
  totalExpectedAnnual: number
  totalExpectedMonthly: number
  outstanding: number
  outstandingAnnual: number
  outstandingMonthly: number
  compliancePct: number
  compliantChurches: number
  partialChurches: number
  overdueChurches: number
  churches: any[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function RegionDetailClient({ stats }: { stats: SingleRegionStats }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)

  const totalExpected = stats.totalExpectedAnnual + stats.totalExpectedMonthly
  const collectionPct = totalExpected > 0 ? (stats.totalCollected / totalExpected) * 100 : 0
  
  // UNIFIED CLASSES (Matches Regional Dashboard)
  const cardClasses = "h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card"

  // Filter the churches based on search + status (table-level filtering)
  const filteredChurches = useMemo(() => {
    return stats.churches.filter((church) => {
      const s = search.toLowerCase()
      const matchesSearch =
        church.church_name.toLowerCase().includes(s) ||
        church.church_code.toLowerCase().includes(s) ||
        (church.pastor_name || '').toLowerCase().includes(s)
      const matchesStatus = statusFilter === 'All' || church.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [stats.churches, search, statusFilter])

  return (
    <div className="space-y-xl">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
        
        {/* CARD 1: Region Collected */}
        <Card className={cardClasses} onClick={() => setStatusFilter('All')}>
          <CardHeader>
            <CardDescription>Region Collected</CardDescription>
            <CardTitle className="text-heading-1 font-bold tabular-nums">
              {formatCurrency(stats.totalCollected)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                <Banknote className="h-3 w-3" /> All
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <StackedBar
              segments={[
                { label: `Annual ${formatCurrency(stats.totalCollectedAnnual)}`, value: stats.totalCollectedAnnual, color: 'bg-blue-500' },
                { label: `Monthly ${formatCurrency(stats.totalCollectedMonthly)}`, value: stats.totalCollectedMonthly, color: 'bg-emerald-500' },
              ]}
              total={totalExpected}
            />
            <p className="text-paragraph-mini text-muted-foreground">
              {collectionPct.toFixed(1)}% of {formatCurrency(totalExpected)} expected
            </p>
          </CardFooter>
        </Card>

        {/* CARD 2: Region Arrears */}
        <Card className={cardClasses} onClick={() => setStatusFilter('Overdue')}>
          <CardHeader>
            <CardDescription>Region Arrears</CardDescription>
            <CardTitle className="text-heading-1 font-bold tabular-nums text-destructive">
              {formatCurrency(stats.outstanding)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">
                <AlertTriangle className="h-3 w-3" /> Action
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <StackedBar
              segments={[
                { label: `Annual ${formatCurrency(stats.outstandingAnnual)}`, value: stats.outstandingAnnual, color: 'bg-red-500' },
                { label: `Monthly ${formatCurrency(stats.outstandingMonthly)}`, value: stats.outstandingMonthly, color: 'bg-amber-500' },
              ]}
            />
            <p className="text-paragraph-mini text-muted-foreground">
              View churches with arrears
            </p>
          </CardFooter>
        </Card>

        {/* CARD 3: Compliance Rate */}
        <Card className={cardClasses} onClick={() => setStatusFilter('Paid')}>
          <CardHeader>
            <CardDescription>Compliance Rate</CardDescription>
            <CardTitle className="text-heading-1 font-bold tabular-nums">
              {stats.compliancePct.toFixed(1)}%
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">
                <CheckCircle2 className="h-3 w-3" /> Paid
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <StackedBar
              segments={[
                { label: `${stats.compliantChurches} paid`, value: stats.compliantChurches, color: 'bg-emerald-500' },
                { label: `${stats.partialChurches} partial`, value: stats.partialChurches, color: 'bg-amber-500' },
                { label: `${stats.overdueChurches} overdue`, value: stats.overdueChurches, color: 'bg-red-500' },
              ]}
            />
            <p className="text-paragraph-mini text-muted-foreground">
              Monitored in this region
            </p>
          </CardFooter>
        </Card>

        {/* CARD 4: This Month */}
        <Card className={cardClasses}>
          <CardHeader>
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-heading-1 font-bold tabular-nums">
              {formatCurrency(stats.totalThisMonth)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <p className="text-paragraph-mini text-muted-foreground">
              New collections this month
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Table with real filter state */}
      <RegionalTable
        churches={filteredChurches}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        userRole="NATIONAL"
      />
    </div>
  )
}