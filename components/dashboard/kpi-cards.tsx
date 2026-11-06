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

// ---------------------------------------------------------------------------
// Props mirror the return shape of getDashboardStats() exactly.
// Every field here is guaranteed to be a number — the server action has a
// fully-zero fallback so no `undefined` slips through to the UI.
// ---------------------------------------------------------------------------
interface KpiCardsProps {
  stats: {
    // Lifetime collected
    totalCollected: number
    totalCollectedAnnual: number
    totalCollectedMonthly: number

    // Lifetime expected (cumulative from each church's created_at)
    totalExpected: number
    totalExpectedAnnual: number
    totalExpectedMonthly: number

    // Lifetime outstanding (clamped at 0)
    outstanding: number
    outstandingAnnual: number
    outstandingMonthly: number
    collectionPct: number

    // Compliance counts (overall status)
    compliancePct: number
    compliantChurches: number
    partialChurches: number
    overdueChurches: number

    // This Month
    thisMonthCollectedAnnual: number
    thisMonthCollectedMonthly: number
    thisMonthCollections: number
    thisMonthExpected: number
    thisMonthCollectionPct: number
    thisMonthTransactionCount: number

    totalChurches: number
    totalRegions: number
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

  // Card 2 has two visual states:
  //   - Arrears (red) when the network has net unpaid obligations
  //   - Net Credit (green) when the network has overpaid overall
  // This matches the per-church logic so the portfolio view is honest.
  const netCredit = Math.max(0, stats.totalCollected - stats.totalExpected)
  const inCredit = netCredit > 0

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">

      {/* ==================================================================
          CARD 1 — Total Collected
          Footer: Annual / Monthly split + % of cumulative expected
          ================================================================== */}
      <Link href="/dashboard/payments" className="block">
        <Card className={cardClasses}>
          <CardHeader>
            <CardDescription>Total Collected</CardDescription>
            <CardTitle className="text-heading-1 font-bold tabular-nums">
              {formatCurrency(stats.totalCollected)}
            </CardTitle>
            <CardAction>
              <Badge
                variant="outline"
                className="text-emerald-600 border-emerald-200 bg-emerald-50"
              >
                <TrendingUp className="h-3 w-3" /> YTD
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <StackedBar
              segments={[
                {
                  label: `Annual ${formatCurrency(stats.totalCollectedAnnual)}`,
                  value: stats.totalCollectedAnnual,
                  color: 'bg-blue-500',
                },
                {
                  label: `Monthly ${formatCurrency(stats.totalCollectedMonthly)}`,
                  value: stats.totalCollectedMonthly,
                  color: 'bg-emerald-500',
                },
              ]}
              total={Math.max(stats.totalCollected, stats.totalExpected)}
            />
            <div className="flex flex-col gap-0.5">
              <p className="text-paragraph-mini text-foreground">
                <span className="font-medium">Annual</span>{' '}
                {formatCurrency(stats.totalCollectedAnnual)}
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span className="font-medium">Monthly</span>{' '}
                {formatCurrency(stats.totalCollectedMonthly)}
              </p>
              <p className="text-paragraph-mini text-muted-foreground">
                {stats.collectionPct.toFixed(1)}% of{' '}
                {formatCurrency(stats.totalExpected)} expected
              </p>
            </div>
          </CardFooter>
        </Card>
      </Link>

      {/* ==================================================================
          CARD 2 — Arrears / Net Credit
          Footer: Annual / Monthly arrears split + % of target outstanding
          If the network is in credit overall, the card flips to a green
          "Net Credit" state and shows the surplus instead of a phantom debt.
          ================================================================== */}
      <Link href="/dashboard/churches?status=Overdue" className="block">
        <Card className={cardClasses}>
          <CardHeader>
            <CardDescription>{inCredit ? 'Net Credit' : 'Total Arrears'}</CardDescription>
            <CardTitle
              className={`text-heading-1 font-bold tabular-nums ${
                inCredit ? 'text-emerald-600' : 'text-destructive'
              }`}
            >
              {formatCurrency(inCredit ? netCredit : stats.outstanding)}
            </CardTitle>
            <CardAction>
              {inCredit ? (
                <Badge
                  variant="outline"
                  className="text-emerald-600 border-emerald-200 bg-emerald-50"
                >
                  <CheckCircle2 className="h-3 w-3" /> In Credit
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-destructive border-destructive/20 bg-destructive/10"
                >
                  <AlertTriangle className="h-3 w-3" /> Owed
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            {!inCredit && (
              <StackedBar
                segments={[
                  {
                    label: `Annual ${formatCurrency(stats.outstandingAnnual)}`,
                    value: stats.outstandingAnnual,
                    color: 'bg-red-500',
                  },
                  {
                    label: `Monthly ${formatCurrency(stats.outstandingMonthly)}`,
                    value: stats.outstandingMonthly,
                    color: 'bg-amber-500',
                  },
                ]}
              />
            )}
            {!inCredit ? (
              <div className="flex flex-col gap-0.5">
                <p className="text-paragraph-mini text-foreground">
                  <span className="font-medium">Annual</span>{' '}
                  {formatCurrency(stats.outstandingAnnual)}
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="font-medium">Monthly</span>{' '}
                  {formatCurrency(stats.outstandingMonthly)}
                </p>
                <p className="text-paragraph-mini text-muted-foreground">
                  {stats.totalExpected > 0
                    ? ((stats.outstanding / stats.totalExpected) * 100).toFixed(1)
                    : '0.0'}
                  % of target outstanding
                </p>
              </div>
            ) : (
              <p className="text-paragraph-mini text-muted-foreground">
                All contributions are up to date across the network.
              </p>
            )}
          </CardFooter>
        </Card>
      </Link>

      {/* ==================================================================
          CARD 3 — Compliance Rate
          Footer: Paid / Partial / Overdue counts (matches the badge each
          church sees in the tables — same getPeriodStatus logic)
          ================================================================== */}
      <Link href="/dashboard/regions" className="block">
        <Card className={cardClasses}>
          <CardHeader>
            <CardDescription>Compliance Rate</CardDescription>
            <CardTitle className="text-heading-1 font-bold tabular-nums">
              {stats.compliancePct.toFixed(1)}%
            </CardTitle>
            <CardAction>
              <Badge
                variant="outline"
                className="text-primary border-primary/20 bg-primary/10"
              >
                <Banknote className="h-3 w-3" /> Rate
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <StackedBar
              segments={[
                {
                  label: `${stats.compliantChurches} paid`,
                  value: stats.compliantChurches,
                  color: 'bg-emerald-500',
                },
                {
                  label: `${stats.partialChurches} partial`,
                  value: stats.partialChurches,
                  color: 'bg-amber-500',
                },
                {
                  label: `${stats.overdueChurches} overdue`,
                  value: stats.overdueChurches,
                  color: 'bg-red-500',
                },
              ]}
            />
            <p className="text-paragraph-mini text-muted-foreground">
              Across {stats.totalRegions} regions · {stats.totalChurches} churches
            </p>
          </CardFooter>
        </Card>
      </Link>

      {/* ==================================================================
          CARD 4 — This Month
          Footer: Annual / Monthly split + % of what was due this month
          (% denominator includes arrears brought forward from last month)
          ================================================================== */}
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
            <StackedBar
              segments={[
                {
                  label: `Annual ${formatCurrency(stats.thisMonthCollectedAnnual)}`,
                  value: stats.thisMonthCollectedAnnual,
                  color: 'bg-blue-500',
                },
                {
                  label: `Monthly ${formatCurrency(stats.thisMonthCollectedMonthly)}`,
                  value: stats.thisMonthCollectedMonthly,
                  color: 'bg-emerald-500',
                },
              ]}
              total={Math.max(stats.thisMonthCollections, stats.thisMonthExpected)}
            />
            <div className="flex flex-col gap-0.5">
              <p className="text-paragraph-mini text-foreground">
                <span className="font-medium">Annual</span>{' '}
                {formatCurrency(stats.thisMonthCollectedAnnual)}
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span className="font-medium">Monthly</span>{' '}
                {formatCurrency(stats.thisMonthCollectedMonthly)}
              </p>
              <p className="text-paragraph-mini text-muted-foreground">
                {stats.thisMonthCollectionPct.toFixed(1)}% of{' '}
                {formatCurrency(stats.thisMonthExpected)} due this month
              </p>
            </div>
          </CardFooter>
        </Card>
      </Link>

    </div>
  )
}