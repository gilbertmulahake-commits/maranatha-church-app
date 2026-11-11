"use client"

import { Banknote, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StackedBar } from '@/components/dashboard/stacked-bar'

interface RegionStats {
  totalCollected: number
  totalCollectedAnnual: number
  totalCollectedMonthly: number
  totalArrears: number
  totalArrearsAnnual: number
  totalArrearsMonthly: number
  averageCompliance: number
  regionsAtRisk: number
  topRegionName: string
  topRegionPct: number
}

interface Props {
  stats: RegionStats
  onFilterChange?: (status: string) => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function RegionKpiCards({ stats, onFilterChange }: Props) {
  const cardClasses = "h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card"

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
      <Card className={cardClasses} onClick={() => onFilterChange?.('All')}>
        <CardHeader>
          <CardDescription>Total Collected</CardDescription>
          <CardTitle className="text-heading-2 font-bold tabular-nums truncate">
            {formatCurrency(stats.totalCollected)}
          </CardTitle>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <Banknote className="h-3 w-3" /> Portfolio
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <StackedBar
            segments={[
              { label: `Annual ${formatCurrency(stats.totalCollectedAnnual)}`, value: stats.totalCollectedAnnual, color: 'bg-blue-500' },
              { label: `Monthly ${formatCurrency(stats.totalCollectedMonthly)}`, value: stats.totalCollectedMonthly, color: 'bg-emerald-500' },
            ]}
            total={Math.max(stats.totalCollected, stats.totalArrears + stats.totalCollected)}
          />
          <p className="text-paragraph-mini text-muted-foreground">
            Across all regions
          </p>
        </CardFooter>
      </Card>

      <Card className={cardClasses} onClick={() => onFilterChange?.('Needs Attention')}>
        <CardHeader>
          <CardDescription>Total Arrears</CardDescription>
          <CardTitle className="text-heading-2 font-bold tabular-nums text-destructive truncate">
            {formatCurrency(stats.totalArrears)}
          </CardTitle>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">
              <AlertTriangle className="h-3 w-3" /> Owed
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          {stats.totalArrears > 0 && (
            <StackedBar
              segments={[
                { label: `Annual ${formatCurrency(stats.totalArrearsAnnual)}`, value: stats.totalArrearsAnnual, color: 'bg-red-500' },
                { label: `Monthly ${formatCurrency(stats.totalArrearsMonthly)}`, value: stats.totalArrearsMonthly, color: 'bg-amber-500' },
              ]}
            />
          )}
          <p className="text-paragraph-mini text-muted-foreground">
            Across all regions
          </p>
        </CardFooter>
      </Card>

      <Card className={cardClasses} onClick={() => onFilterChange?.('Needs Attention')}>
        <CardHeader>
          <CardDescription>Regions At Risk</CardDescription>
          <CardTitle className="text-heading-2 font-bold tabular-nums truncate">
            {stats.regionsAtRisk}
          </CardTitle>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-3 w-3" /> Action
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="text-paragraph-small font-medium text-foreground">
            Below 50% compliance
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            Immediate follow-up required
          </p>
        </CardFooter>
      </Card>

      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>Top Region</CardDescription>
          <CardTitle className="text-heading-2 font-bold truncate">
            {stats.topRegionName}
          </CardTitle>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">
              <ShieldCheck className="h-3 w-3" /> {stats.topRegionPct.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="text-paragraph-small font-medium text-foreground">
            Highest compliance rate
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            Click to view leaderboard
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}