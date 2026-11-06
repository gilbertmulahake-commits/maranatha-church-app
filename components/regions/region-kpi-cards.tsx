import { AlertTriangle, Banknote, Trophy, TrendingUp } from 'lucide-react'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StackedBar } from '@/components/dashboard/stacked-bar'

interface RegionKpiProps {
  stats: {
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
    topRegionTieCount: number
  }
  onFilterChange?: (filter: string) => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function RegionKpiCards({ stats, onFilterChange }: RegionKpiProps) {
  const cardClasses = "h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card"

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
      
      {/* CARD 1: Total Collected (all regions) */}
      <Card className={cardClasses} onClick={() => onFilterChange?.('All')}>
        <CardHeader>
          <CardDescription>Total Collected</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums">
            {formatCurrency(stats.totalCollected)}
          </CardTitle>
          <CardAction>
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
          />
          <p className="text-paragraph-mini text-muted-foreground">
            Across all regions
          </p>
        </CardFooter>
      </Card>

      {/* CARD 2: Total Arrears (all regions) */}
      <Card className={cardClasses} onClick={() => onFilterChange?.('All')}>
        <CardHeader>
          <CardDescription>Total Arrears</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums text-destructive">
            {formatCurrency(stats.totalArrears)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">
              <Banknote className="h-3 w-3" /> Owed
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <StackedBar
            segments={[
              { label: `Annual ${formatCurrency(stats.totalArrearsAnnual)}`, value: stats.totalArrearsAnnual, color: 'bg-red-500' },
              { label: `Monthly ${formatCurrency(stats.totalArrearsMonthly)}`, value: stats.totalArrearsMonthly, color: 'bg-amber-500' },
            ]}
          />
          <p className="text-paragraph-mini text-muted-foreground">
            Across all regions
          </p>
        </CardFooter>
      </Card>

      {/* CARD 3: Regions At Risk */}
      <Card className={cardClasses} onClick={() => onFilterChange?.('AtRisk')}>
        <CardHeader>
          <CardDescription>Regions At Risk</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums text-amber-600">
            {stats.regionsAtRisk}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-3 w-3" /> Action
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="line-clamp-1 flex gap-2 font-medium text-paragraph-small">
            Below 50% compliance
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            Immediate follow-up required
          </p>
        </CardFooter>
      </Card>

      {/* CARD 4: Top Region (with tie handling) */}
      <Card className={cardClasses} onClick={() => onFilterChange?.('Top')}>
        <CardHeader>
          <CardDescription>Top Region</CardDescription>
          <CardTitle className="text-heading-1 font-bold truncate">
            {stats.topRegionPct === 0 ? 'None Yet' : stats.topRegionName}
          </CardTitle>
          <CardAction>
            <Badge 
              variant="outline" 
              className={
                stats.topRegionPct === 0 
                  ? 'text-muted-foreground border-border bg-muted' 
                  : 'text-emerald-600 border-emerald-200 bg-emerald-50'
              }
            >
              <Trophy className="h-3 w-3" /> 
              {stats.topRegionPct === 0 ? '0%' : `${stats.topRegionPct.toFixed(1)}%`}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="line-clamp-1 flex gap-2 font-medium text-paragraph-small">
            {stats.topRegionPct === 0 
              ? 'No collections yet'
              : stats.topRegionTieCount > 1
                ? `Tied with ${stats.topRegionTieCount - 1} other region${stats.topRegionTieCount > 2 ? 's' : ''}`
                : 'Highest compliance rate'}
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            {stats.topRegionPct === 0 
              ? 'All regions at 0%'
              : 'Click to view leaderboard'}
          </p>
        </CardFooter>
      </Card>

    </div>
  )
}