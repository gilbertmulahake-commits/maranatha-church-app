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
  const cardClasses = "h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card @container/card"

  return (
    <div className="grid grid-cols-1 gap-md @[600px]:grid-cols-2">
      <Card className={cardClasses} onClick={() => onFilterChange?.('All')}>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-medium text-muted-foreground">Total Collected</CardDescription>
          <CardTitle className="text-heading-2 font-bold tabular-nums truncate mt-1 @[250px]/card:text-heading-1">
            {formatCurrency(stats.totalCollected)}
          </CardTitle>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px] px-2 py-0.5">
              <Banknote className="h-3 w-3 mr-1" /> Portfolio
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
          <StackedBar
            segments={[
              { label: `Annual ${formatCurrency(stats.totalCollectedAnnual)}`, value: stats.totalCollectedAnnual, color: 'bg-blue-500' },
              { label: `Monthly ${formatCurrency(stats.totalCollectedMonthly)}`, value: stats.totalCollectedMonthly, color: 'bg-emerald-500' },
            ]}
            total={Math.max(stats.totalCollected, stats.totalArrears + stats.totalCollected)}
          />
          <p className="text-[11px] text-muted-foreground">
            Across all regions
          </p>
        </CardFooter>
      </Card>

      <Card className={cardClasses} onClick={() => onFilterChange?.('Needs Attention')}>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-medium text-muted-foreground">Total Arrears</CardDescription>
          <CardTitle className="text-heading-2 font-bold tabular-nums text-destructive truncate mt-1 @[250px]/card:text-heading-1">
            {formatCurrency(stats.totalArrears)}
          </CardTitle>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10 text-[10px] px-2 py-0.5">
              <AlertTriangle className="h-3 w-3 mr-1" /> Owed
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
          {stats.totalArrears > 0 && (
            <StackedBar
              segments={[
                { label: `Annual ${formatCurrency(stats.totalArrearsAnnual)}`, value: stats.totalArrearsAnnual, color: 'bg-red-500' },
                { label: `Monthly ${formatCurrency(stats.totalArrearsMonthly)}`, value: stats.totalArrearsMonthly, color: 'bg-amber-500' },
              ]}
            />
          )}
          <p className="text-[11px] text-muted-foreground">
            Across all regions
          </p>
        </CardFooter>
      </Card>

      <Card className={cardClasses} onClick={() => onFilterChange?.('Needs Attention')}>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-medium text-muted-foreground">Regions At Risk</CardDescription>
          <CardTitle className="text-heading-2 font-bold tabular-nums truncate mt-1 @[250px]/card:text-heading-1">
            {stats.regionsAtRisk}
          </CardTitle>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px] px-2 py-0.5">
              <AlertTriangle className="h-3 w-3 mr-1" /> Action
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
          <p className="text-xs font-medium text-foreground">
            Below 50% compliance
          </p>
          <p className="text-[11px] text-muted-foreground">
            Immediate follow-up required
          </p>
        </CardFooter>
      </Card>

      <Card className={cardClasses}>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-medium text-muted-foreground">Top Region</CardDescription>
          <CardTitle className="text-heading-2 font-bold truncate mt-1 @[250px]/card:text-heading-1">
            {stats.topRegionName}
          </CardTitle>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10 text-[10px] px-2 py-0.5">
              <ShieldCheck className="h-3 w-3 mr-1" /> {stats.topRegionPct.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
          <p className="text-xs font-medium text-foreground">
            Highest compliance rate
          </p>
          <p className="text-[11px] text-muted-foreground">
            Click to view leaderboard
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}