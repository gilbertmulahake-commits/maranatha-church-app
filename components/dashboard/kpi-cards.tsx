import { Banknote, TrendingUp, AlertTriangle, CalendarDays, CheckCircle2 } from 'lucide-react'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { StackedBar } from './stacked-bar'

interface KpiCardsProps {
  stats: {
    totalCollected: number
    totalCollectedAnnual: number
    totalCollectedMonthly: number
    totalExpected: number
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

    thisMonthCollectedAnnual: number
    thisMonthCollectedMonthly: number
    thisMonthCollections: number
    thisMonthExpected: number
    thisMonthCollectionPct: number
    thisMonthTransactionCount: number
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function KpiCards({ stats }: KpiCardsProps) {
  const cardClasses =
    'h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card'

  const netCredit = Math.max(0, stats.totalCollected - stats.totalExpected)
  const isCollectionExceeded = stats.collectionPct > 100
  const isThisMonthExceeded = stats.thisMonthCollectionPct > 100

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
      
      {/* CARD 1: Total Collected */}
      <Link href="/dashboard/payments" className="block">
        <Card className={cardClasses}>
          <CardHeader>
            <CardDescription>Total Collected</CardDescription>
            <CardTitle className="text-heading-2 font-bold tabular-nums truncate">
              {formatCurrency(stats.totalCollected)}
            </CardTitle>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                {/* FIXED: Changed YTD to All Time */}
                <TrendingUp className="h-3 w-3" /> All Time
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm pt-2">
            <StackedBar
              segments={[
                { label: `Annual ${formatCurrency(stats.totalCollectedAnnual)}`, value: stats.totalCollectedAnnual, color: 'bg-blue-500' },
                { label: `Monthly ${formatCurrency(stats.totalCollectedMonthly)}`, value: stats.totalCollectedMonthly, color: 'bg-emerald-500' },
              ]}
              total={Math.max(stats.totalCollected, stats.totalExpected)}
            />
            <p className="text-paragraph-mini text-muted-foreground mt-1">
              {isCollectionExceeded ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Target Exceeded
                </span>
              ) : (
                `${stats.collectionPct.toFixed(1)}% of ${formatCurrency(stats.totalExpected)} expected`
              )}
            </p>
          </CardFooter>
        </Card>
      </Link>

      {/* CARD 2: Total Arrears (Gross) */}
      <Link href="/dashboard/churches?status=Overdue" className="block">
        <Card className={cardClasses}>
          <CardHeader>
            <CardDescription>Total Arrears</CardDescription>
            <CardTitle className="text-heading-2 font-bold tabular-nums text-destructive truncate">
              {formatCurrency(stats.outstanding)}
            </CardTitle>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">
                <AlertTriangle className="h-3 w-3" /> Owed
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm pt-2">
            {stats.outstanding > 0 && (
              <StackedBar
                segments={[
                  { label: `Annual ${formatCurrency(stats.outstandingAnnual)}`, value: stats.outstandingAnnual, color: 'bg-red-500' },
                  { label: `Monthly ${formatCurrency(stats.outstandingMonthly)}`, value: stats.outstandingMonthly, color: 'bg-amber-500' },
                ]}
              />
            )}
            <div className="flex flex-col gap-1 w-full mt-1">
              {stats.outstanding === 0 && (
                <p className="text-paragraph-mini text-emerald-600 font-medium">All contributions are up to date.</p>
              )}
              {netCredit > 0 && (
                <p className="text-paragraph-mini text-emerald-600 font-medium">
                  All-Time Net Credit: {formatCurrency(netCredit)}
                </p>
              )}
            </div>
          </CardFooter>
        </Card>
      </Link>

      {/* CARD 3: Compliance Rate */}
      <Link href="/dashboard/regions" className="block">
        <Card className={cardClasses}>
          <CardHeader>
            <CardDescription>Compliance Rate</CardDescription>
            <CardTitle className="text-heading-2 font-bold tabular-nums truncate">
              {stats.compliancePct.toFixed(1)}%
            </CardTitle>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">
                <Banknote className="h-3 w-3" /> Rate
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm pt-2">
            <StackedBar
              segments={[
                { label: `${stats.compliantChurches} paid`, value: stats.compliantChurches, color: 'bg-emerald-500' },
                { label: `${stats.partialChurches} partial`, value: stats.partialChurches, color: 'bg-amber-500' },
                { label: `${stats.overdueChurches} overdue`, value: stats.overdueChurches, color: 'bg-red-500' },
              ]}
            />
            <p className="text-paragraph-mini text-muted-foreground mt-1">
              Across {stats.totalRegions} regions · {stats.totalChurches} churches
            </p>
          </CardFooter>
        </Card>
      </Link>

      {/* CARD 4: This Month */}
      <Link href="/dashboard/payments" className="block">
        <Card className={cardClasses}>
          <CardHeader>
            <CardDescription>This Month</CardDescription>
            <CardTitle className="text-heading-2 font-bold tabular-nums truncate">
              {formatCurrency(stats.thisMonthCollections)}
            </CardTitle>
            <CardAction className="shrink-0">
              <Badge variant="outline">
                <CalendarDays className="h-3 w-3" /> Current
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm pt-2">
            <StackedBar
              segments={[
                { label: `Annual ${formatCurrency(stats.thisMonthCollectedAnnual)}`, value: stats.thisMonthCollectedAnnual, color: 'bg-blue-500' },
                { label: `Monthly ${formatCurrency(stats.thisMonthCollectedMonthly)}`, value: stats.thisMonthCollectedMonthly, color: 'bg-emerald-500' },
              ]}
              total={Math.max(stats.thisMonthCollections, stats.thisMonthExpected)}
            />
            <p className="text-paragraph-mini text-muted-foreground mt-1">
              {isThisMonthExceeded ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Target Exceeded
                </span>
              ) : (
                `${stats.thisMonthCollectionPct.toFixed(1)}% of ${formatCurrency(stats.thisMonthExpected)} due this month`
              )}
            </p>
          </CardFooter>
        </Card>
      </Link>

    </div>
  )
}