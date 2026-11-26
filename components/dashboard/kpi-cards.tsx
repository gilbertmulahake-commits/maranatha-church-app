import { AlertTriangle, CheckCircle2, Target, Calendar, MapPin } from 'lucide-react'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

import { KpiGrid } from '@/components/ui/kpi-grid'
import { KpiValue } from '@/components/ui/kpi-value'
import { InfoTooltip } from '@/components/help/info-tooltip'
import { INFO_TOOLTIPS } from '@/lib/help/content'
import { ANNUAL_FEE, MONTHLY_FEE } from '@/lib/constants'

interface KpiCardsProps {
  stats: {
    totalCollectedAnnual: number
    totalCollectedMonthly: number
    totalExpectedAnnual: number
    totalExpectedMonthly: number
    compliantChurches: number
    partialChurches: number
    overdueChurches: number
    naChurches: number
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
    'h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card @container/card'

  const annualPct = stats.totalExpectedAnnual > 0 
    ? (stats.totalCollectedAnnual / stats.totalExpectedAnnual) * 100 
    : 0
  const annualSurplus = Math.max(0, stats.totalCollectedAnnual - stats.totalExpectedAnnual)
  const annualArrears = Math.max(0, stats.totalExpectedAnnual - stats.totalCollectedAnnual)

  const monthlyPct = stats.totalExpectedMonthly > 0 
    ? (stats.totalCollectedMonthly / stats.totalExpectedMonthly) * 100 
    : 0
  const monthlySurplus = Math.max(0, stats.totalCollectedMonthly - stats.totalExpectedMonthly)
  const monthlyArrears = Math.max(0, stats.totalExpectedMonthly - stats.totalCollectedMonthly)

  return (
    <KpiGrid>
      {/* CARD 1: Annual Bucket */}
      <Link href="/dashboard/churches?bucket=annual" className="block">
        <Card className={cardClasses}>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Annual Bucket (KES {ANNUAL_FEE.toLocaleString('en-KE')}/yr)
            </CardDescription>
            <KpiValue className={annualPct >= 100 ? 'text-emerald-600' : annualPct >= 50 ? 'text-amber-600' : 'text-destructive'}>
              {annualPct.toFixed(1)}%
            </KpiValue>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-[10px] px-2 py-0.5">
                <Target className="h-3 w-3 mr-1" /> Annual
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-xs p-4 pt-2">
            <div className="flex items-center justify-between w-full">
              <span className="text-muted-foreground">Collected:</span>
              <span className="font-bold text-foreground tabular-nums">{formatCurrency(stats.totalCollectedAnnual)}</span>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-muted-foreground">Expected:</span>
              <span className="font-medium text-foreground tabular-nums">{formatCurrency(stats.totalExpectedAnnual)}</span>
            </div>
            <p className="text-[11px] mt-1">
              {annualPct >= 100 ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Ahead by {formatCurrency(annualSurplus)}
                </span>
              ) : (
                <span className="text-destructive font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Behind by {formatCurrency(annualArrears)}
                </span>
              )}
            </p>
          </CardFooter>
        </Card>
      </Link>

      {/* CARD 2: Monthly Bucket */}
      <Link href="/dashboard/churches?bucket=monthly" className="block">
        <Card className={cardClasses}>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Monthly Bucket (KES {MONTHLY_FEE.toLocaleString('en-KE')}/mo)
            </CardDescription>
            <KpiValue className={monthlyPct >= 100 ? 'text-emerald-600' : monthlyPct >= 50 ? 'text-amber-600' : 'text-destructive'}>
              {monthlyPct.toFixed(1)}%
            </KpiValue>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px] px-2 py-0.5">
                <Calendar className="h-3 w-3 mr-1" /> Monthly
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-xs p-4 pt-2">
            <div className="flex items-center justify-between w-full">
              <span className="text-muted-foreground">Collected:</span>
              <span className="font-bold text-foreground tabular-nums">{formatCurrency(stats.totalCollectedMonthly)}</span>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-muted-foreground">Expected:</span>
              <span className="font-medium text-foreground tabular-nums">{formatCurrency(stats.totalExpectedMonthly)}</span>
            </div>
            <p className="text-[11px] mt-1">
              {monthlyPct >= 100 ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Ahead by {formatCurrency(monthlySurplus)}
                </span>
              ) : (
                <span className="text-destructive font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Behind by {formatCurrency(monthlyArrears)}
                </span>
              )}
            </p>
          </CardFooter>
        </Card>
      </Link>

      {/* CARD 3: Compliance Snapshot */}
      <Link href="/dashboard/regions" className="block">
        <Card className={cardClasses}>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              Compliance Snapshot
              <InfoTooltip
                label="Compliance Snapshot"
                content={INFO_TOOLTIPS.complianceSnapshot}
              />
            </CardDescription>
            <KpiValue className="text-foreground">
              {stats.compliantChurches} / {stats.totalChurches}
            </KpiValue>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                Fully Paid
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-xs p-4 pt-2">
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> Paid
              </span>
              <span className="font-bold text-foreground tabular-nums">{stats.compliantChurches}</span>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5 text-amber-600">
                <AlertTriangle className="h-3 w-3" /> Partial
              </span>
              <span className="font-bold text-foreground tabular-nums">{stats.partialChurches}</span>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="h-3 w-3" /> Overdue
              </span>
              <span className="font-bold text-foreground tabular-nums">{stats.overdueChurches}</span>
            </div>
            {stats.naChurches > 0 && (
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center gap-1.5 text-muted-foreground">N/A</span>
                <span className="font-bold text-muted-foreground tabular-nums">{stats.naChurches}</span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1 w-full">
              Across {stats.totalRegions} regions · {stats.totalChurches} churches
            </p>
          </CardFooter>
        </Card>
      </Link>

      {/* CARD 4: Network Overview */}
      <Link href="/dashboard/churches" className="block">
        <Card className={cardClasses}>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Network Coverage
            </CardDescription>
            <KpiValue className="text-foreground">
              {stats.totalChurches}
            </KpiValue>
            <CardAction className="shrink-0">
              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                <MapPin className="h-3 w-3 mr-1" /> {stats.totalRegions} Regions
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-xs p-4 pt-2">
            <div className="flex items-center justify-between w-full">
              <span className="text-muted-foreground">Active</span>
              <span className="font-bold text-foreground tabular-nums">{stats.totalChurches - stats.naChurches}</span>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-muted-foreground">N/A (New)</span>
              <span className="font-bold text-foreground tabular-nums">{stats.naChurches}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 w-full">
              Total registered churches
            </p>
          </CardFooter>
        </Card>
      </Link>
    </KpiGrid>
  )
}