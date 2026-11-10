import { Banknote, AlertTriangle, CheckCircle2, CalendarDays } from 'lucide-react'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RegionalStatsSuccess } from '@/lib/actions/regional-actions'
import { StackedBar } from '@/components/dashboard/stacked-bar'

interface Props {
  stats: RegionalStatsSuccess
  periodView: 'month' | 'year'
  onFilterChange?: (status: string) => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function RegionalKpiCards({ stats, periodView, onFilterChange }: Props) {
  const totalExpected = stats.totalExpected
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
  
  const netCredit = Math.max(0, stats.totalCollected - stats.totalExpected)
  const viewLabel = periodView === 'year' ? 'annual view' : 'monthly view'

  const isCollectionExceeded = (stats.totalExpected > 0 ? (stats.totalCollected / stats.totalExpected) * 100 : 0) > 100
  const isThisMonthExceeded = stats.thisMonthCollectionPct > 100

  const cardClasses =
    'h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card'

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
      <Card className={cardClasses} onClick={() => onFilterChange?.('All')}>
        <CardHeader>
          <CardDescription>Region Collected</CardDescription>
          <CardTitle className="text-heading-2 font-bold tabular-nums truncate">
            {formatCurrency(stats.totalCollected)}
          </CardTitle>
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
            total={Math.max(stats.totalCollected, totalExpected)}
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-paragraph-mini text-muted-foreground">
              {isCollectionExceeded ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Target Exceeded
                </span>
              ) : (
                `${totalExpected > 0 ? ((stats.totalCollected / totalExpected) * 100).toFixed(1) : '0.0'}% of ${formatCurrency(totalExpected)} expected`
              )}
            </p>
          </div>
        </CardFooter>
      </Card>

      <Card className={cardClasses} onClick={() => onFilterChange?.('Overdue')}>
        <CardHeader>
          <CardDescription>Region Arrears</CardDescription>
          <CardTitle className="text-heading-2 font-bold tabular-nums text-destructive truncate">
            {formatCurrency(stats.outstanding)}
          </CardTitle>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">
              <AlertTriangle className="h-3 w-3" /> Owed
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          {stats.outstanding > 0 && (
            <StackedBar
              segments={[
                { label: `Annual ${formatCurrency(stats.outstandingAnnual)}`, value: stats.outstandingAnnual, color: 'bg-red-500' },
                { label: `Monthly ${formatCurrency(stats.outstandingMonthly)}`, value: stats.outstandingMonthly, color: 'bg-amber-500' },
              ]}
            />
          )}
          <div className="flex flex-col gap-0.5">
            {stats.outstanding === 0 && (
              <p className="text-paragraph-mini text-emerald-600 font-medium">All contributions are up to date.</p>
            )}
            {netCredit > 0 && (
              <p className="text-paragraph-mini text-emerald-600 font-medium mt-1">
                Region Net Credit: {formatCurrency(netCredit)}
              </p>
            )}
          </div>
        </CardFooter>
      </Card>

      <Card className={cardClasses} onClick={() => onFilterChange?.('Paid')}>
        <CardHeader>
          <CardDescription>Compliance Rate</CardDescription>
          <CardTitle className="text-heading-2 font-bold tabular-nums truncate">
            {periodCompliancePct.toFixed(1)}%
          </CardTitle>
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

      <Card className={cardClasses} onClick={() => onFilterChange?.('All')}>
        <CardHeader>
          <CardDescription>This Month</CardDescription>
          <CardTitle className="text-heading-2 font-bold tabular-nums truncate">
            {formatCurrency(stats.thisMonthCollectedAnnual + stats.thisMonthCollectedMonthly)}
          </CardTitle>
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
          <div className="flex flex-col gap-0.5">
            <p className="text-paragraph-mini text-muted-foreground">
              {isThisMonthExceeded ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Target Exceeded
                </span>
              ) : (
                `${stats.thisMonthCollectionPct.toFixed(1)}% of ${formatCurrency(stats.thisMonthExpected)} due this month`
              )}
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}