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
  // FIXED: Added @container/card to allow the card to respond to its own width
  const cardClasses =
    'h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card @container/card'

  const netCredit = Math.max(0, stats.totalCollected - stats.totalExpected)
  const isCollectionExceeded = stats.collectionPct > 100
  const isThisMonthExceeded = stats.thisMonthCollectionPct > 100

  return (
    <div className="grid grid-cols-1 gap-md @[600px]:grid-cols-2">
      
      {/* CARD 1: Total Collected */}
      <Link href="/dashboard/payments" className="block">
        <Card className={cardClasses}>
          {/* FIXED: Reduced padding and tightened typography */}
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">Total Collected</CardDescription>
            <CardTitle className="text-heading-2 font-bold tabular-nums truncate mt-1 @[250px]/card:text-heading-1">
              {formatCurrency(stats.totalCollected)}
            </CardTitle>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px] px-2 py-0.5">
                <TrendingUp className="h-3 w-3 mr-1" /> All Time
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
            <StackedBar
              segments={[
                { label: `Annual ${formatCurrency(stats.totalCollectedAnnual)}`, value: stats.totalCollectedAnnual, color: 'bg-blue-500' },
                { label: `Monthly ${formatCurrency(stats.totalCollectedMonthly)}`, value: stats.totalCollectedMonthly, color: 'bg-emerald-500' },
              ]}
              total={Math.max(stats.totalCollected, stats.totalExpected)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
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
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">Total Arrears</CardDescription>
            <CardTitle className="text-heading-2 font-bold tabular-nums text-destructive truncate mt-1 @[250px]/card:text-heading-1">
              {formatCurrency(stats.outstanding)}
            </CardTitle>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10 text-[10px] px-2 py-0.5">
                <AlertTriangle className="h-3 w-3 mr-1" /> Owed
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
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
                <p className="text-[11px] text-emerald-600 font-medium">All contributions are up to date.</p>
              )}
              {netCredit > 0 && (
                <p className="text-[11px] text-emerald-600 font-medium">
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
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">Compliance Rate</CardDescription>
            <CardTitle className="text-heading-2 font-bold tabular-nums truncate mt-1 @[250px]/card:text-heading-1">
              {stats.compliancePct.toFixed(1)}%
            </CardTitle>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10 text-[10px] px-2 py-0.5">
                <Banknote className="h-3 w-3 mr-1" /> Rate
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
            <StackedBar
              segments={[
                { label: `${stats.compliantChurches} paid`, value: stats.compliantChurches, color: 'bg-emerald-500' },
                { label: `${stats.partialChurches} partial`, value: stats.partialChurches, color: 'bg-amber-500' },
                { label: `${stats.overdueChurches} overdue`, value: stats.overdueChurches, color: 'bg-red-500' },
              ]}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Across {stats.totalRegions} regions · {stats.totalChurches} churches
            </p>
          </CardFooter>
        </Card>
      </Link>

      {/* CARD 4: This Month */}
      <Link href="/dashboard/payments" className="block">
        <Card className={cardClasses}>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">This Month</CardDescription>
            <CardTitle className="text-heading-2 font-bold tabular-nums truncate mt-1 @[250px]/card:text-heading-1">
              {formatCurrency(stats.thisMonthCollections)}
            </CardTitle>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                <CalendarDays className="h-3 w-3 mr-1" /> Current
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
            <StackedBar
              segments={[
                { label: `Annual ${formatCurrency(stats.thisMonthCollectedAnnual)}`, value: stats.thisMonthCollectedAnnual, color: 'bg-blue-500' },
                { label: `Monthly ${formatCurrency(stats.thisMonthCollectedMonthly)}`, value: stats.thisMonthCollectedMonthly, color: 'bg-emerald-500' },
              ]}
              total={Math.max(stats.thisMonthCollections, stats.thisMonthExpected)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
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