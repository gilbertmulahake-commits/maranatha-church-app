import { AlertTriangle, TrendingUp, Banknote, Trophy } from 'lucide-react'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface RegionKpiProps {
  stats: {
    totalArrears: number
    averageCompliance: number
    regionsAtRisk: number
    topRegionName: string
    topRegionPct: number
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function RegionKpiCards({ stats }: RegionKpiProps) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4">
      
      {/* 1. Total Regional Arrears */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Regional Arrears</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-destructive @[250px]/card:text-3xl">
            {formatCurrency(stats.totalArrears)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">
              <Banknote className="h-3 w-3" /> Owed
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Outstanding collections
          </div>
          <div className="text-muted-foreground">Across all regions</div>
        </CardFooter>
      </Card>

      {/* 2. Average Compliance Rate */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Average Compliance</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.averageCompliance.toFixed(1)}%
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">
              <TrendingUp className="h-3 w-3" /> Rate
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            National health
          </div>
          <div className="text-muted-foreground">Average across regions</div>
        </CardFooter>
      </Card>

      {/* 3. Regions At Risk */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Regions At Risk</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-amber-600 @[250px]/card:text-3xl">
            {stats.regionsAtRisk}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-3 w-3" /> Action
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Below 50% compliance
          </div>
          <div className="text-muted-foreground">Immediate follow-up</div>
        </CardFooter>
      </Card>

      {/* 4. Top Performing Region */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Top Region</CardDescription>
          <CardTitle className="text-2xl font-semibold truncate @[250px]/card:text-3xl">
            {stats.topRegionName}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <Trophy className="h-3 w-3" /> {stats.topRegionPct.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Best performing
          </div>
          <div className="text-muted-foreground">Highest compliance rate</div>
        </CardFooter>
      </Card>

    </div>
  )
}