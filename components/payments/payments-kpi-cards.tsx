"use client"

import { Banknote, TrendingUp, CalendarDays, CheckCircle2 } from 'lucide-react'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { StackedBar } from '@/components/dashboard/stacked-bar'
import { KpiGrid } from '@/components/ui/kpi-grid'
import { KpiValue } from '@/components/ui/kpi-value'

interface PaymentsStats {
  totalTransactions: number
  totalVolume: number
  annualVolume: number
  monthlyVolume: number
  thisMonthVolume: number
  mpesaCount: number
  bankCount: number
  cashCount: number
}

interface Props {
  stats: PaymentsStats
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PaymentsKpiCards({ stats }: Props) {
  const cardClasses = "h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card @container/card"

  return (
    <KpiGrid>
      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>Total Transactions</CardDescription>
          <KpiValue className="text-emerald-600">
            {stats.totalTransactions}
          </KpiValue>
          <CardAction className="shrink-0">
            <Badge variant="outline">
              <Banknote className="h-3 w-3" /> Lifetime
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="text-paragraph-small font-medium text-foreground">
            {stats.mpesaCount} M-Pesa · {stats.bankCount} Bank · {stats.cashCount} Cash
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            All reconciled payments
          </p>
        </CardFooter>
      </Card>

      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>Total Volume</CardDescription>
          <KpiValue className="text-emerald-600">
            {formatCurrency(stats.totalVolume)}
          </KpiValue>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-3 w-3" /> All Time
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="text-paragraph-small font-medium text-foreground">
            Total value of all transactions
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            Since system initialization
          </p>
        </CardFooter>
      </Card>

      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>Volume Breakdown</CardDescription>
          <KpiValue>
            {stats.totalVolume > 0 ? ((stats.annualVolume / stats.totalVolume) * 100).toFixed(0) : 0}% Annual
          </KpiValue>
          <CardAction className="shrink-0">
            <Badge variant="outline">
              <TrendingUp className="h-3 w-3" /> Split
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <StackedBar
            segments={[
              { label: 'Annual', value: stats.annualVolume, color: 'bg-blue-500' },
              { label: 'Monthly', value: stats.monthlyVolume, color: 'bg-emerald-500' },
            ]}
          />
          <p className="text-paragraph-mini text-muted-foreground">
            Annual vs Monthly contributions
          </p>
        </CardFooter>
      </Card>

      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>This Month</CardDescription>
          <KpiValue>
            {formatCurrency(stats.thisMonthVolume)}
          </KpiValue>
          <CardAction className="shrink-0">
            <Badge variant="outline">
              <CalendarDays className="h-3 w-3" /> Current
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="text-paragraph-small font-medium text-foreground">
            Recent inflow
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            Collected in the current calendar month
          </p>
        </CardFooter>
      </Card>
    </KpiGrid>
  )
}