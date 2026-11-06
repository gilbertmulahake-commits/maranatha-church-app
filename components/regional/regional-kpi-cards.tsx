import { Banknote, AlertTriangle, CheckCircle2, Building2 } from 'lucide-react'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RegionalStatsSuccess } from '@/lib/actions/regional-actions'
import { StackedBar } from '@/components/dashboard/stacked-bar'

interface Props {
  stats: RegionalStatsSuccess
  onFilterChange?: (status: string) => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function RegionalKpiCards({ stats, onFilterChange }: Props) {
  const totalExpected = stats.totalExpectedAnnual + stats.totalExpectedMonthly
  const collectionPct = totalExpected > 0 ? (stats.totalCollected / totalExpected) * 100 : 0

  // UNIFIED CLASSES: Identical to National Dashboard
  const cardClasses = "h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card"

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
      
      {/* CARD 1: Region Collected */}
      <Card className={cardClasses} onClick={() => onFilterChange?.('All')}>
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
      <Card className={cardClasses} onClick={() => onFilterChange?.('Overdue')}>
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
      <Card className={cardClasses} onClick={() => onFilterChange?.('Paid')}>
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

      {/* CARD 4: Total Churches */}
      <Card className={cardClasses} onClick={() => onFilterChange?.('All')}>
        <CardHeader>
          <CardDescription>Total Churches</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums">
            {stats.churches.length}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Building2 className="h-3 w-3" /> Units
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="line-clamp-1 flex gap-2 font-medium text-paragraph-small">
            Full list available below
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            Manage and monitor compliance
          </p>
        </CardFooter>
      </Card>

    </div>
  )
}