import { Banknote, TrendingUp, AlertTriangle, CalendarDays } from 'lucide-react'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { StackedBar } from './stacked-bar'

interface KpiCardsProps {
  stats: {
    totalCollected: number
    totalCollectedAnnual: number
    totalCollectedMonthly: number
    thisMonthCollections: number
    thisMonthTransactionCount: number
    totalExpectedAnnual: number
    totalExpectedMonthly: number
    outstanding: number
    outstandingAnnual: number
    outstandingMonthly: number
    collectionPct: number
    compliancePct: number
    compliantChurches: number
    partialChurches: number
    overdueChurches: number
    totalChurches: number
    totalRegions: number
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function KpiCards({ stats }: KpiCardsProps) {
  const totalExpected = stats.totalExpectedAnnual + stats.totalExpectedMonthly
  const cardClasses = "h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card"

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
      
      {/* CARD 1: Total Collected with composition */}
      <Link href="/dashboard/payments" className="block">
        <Card className={cardClasses}>
          <CardHeader>
            <CardDescription>Total Collected</CardDescription>
            <CardTitle className="text-heading-1 font-bold tabular-nums">
              {formatCurrency(stats.totalCollected)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                <TrendingUp className="h-3 w-3" /> YTD
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
              {stats.collectionPct.toFixed(1)}% of {formatCurrency(totalExpected)} target
            </p>
          </CardFooter>
        </Card>
      </Link>

      {/* CARD 2: Arrears with composition */}
      <Link href="/dashboard/churches?status=Overdue" className="block">
        <Card className={cardClasses}>
          <CardHeader>
            <CardDescription>Total Arrears</CardDescription>
            <CardTitle className="text-heading-1 font-bold tabular-nums text-destructive">
              {formatCurrency(stats.outstanding)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">
                <AlertTriangle className="h-3 w-3" /> Owed
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
              {((stats.outstanding / totalExpected) * 100).toFixed(1)}% of target outstanding
            </p>
          </CardFooter>
        </Card>
      </Link>

      {/* CARD 3: Compliance Rate with church status composition */}
      <Link href="/dashboard/regions" className="block">
        <Card className={cardClasses}>
          <CardHeader>
            <CardDescription>Compliance Rate</CardDescription>
            <CardTitle className="text-heading-1 font-bold tabular-nums">
              {stats.compliancePct.toFixed(1)}%
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">
                <Banknote className="h-3 w-3" /> Rate
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
              Across {stats.totalRegions} regions
            </p>
          </CardFooter>
        </Card>
      </Link>

      {/* CARD 4: This Month's snapshot (no bar) */}
      <Link href="/dashboard/payments" className="block">
        <Card className={cardClasses}>
          <CardHeader>
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-heading-1 font-bold tabular-nums">
              {formatCurrency(stats.thisMonthCollections)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <CalendarDays className="h-3 w-3" /> Current
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <p className="line-clamp-1 flex gap-2 font-medium text-paragraph-small">
              {stats.thisMonthTransactionCount} payments received
            </p>
            <p className="text-paragraph-mini text-muted-foreground">
              vs {formatCurrency(stats.totalExpectedMonthly / 12)} expected
            </p>
          </CardFooter>
        </Card>
      </Link>

    </div>
  )
}