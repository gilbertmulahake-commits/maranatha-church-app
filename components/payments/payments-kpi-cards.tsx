import { CreditCard, Banknote, TrendingUp, CalendarDays } from 'lucide-react'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StackedBar } from '@/components/dashboard/stacked-bar'

interface PaymentsKpiProps {
  stats: {
    totalTransactions: number
    totalVolume: number
    annualVolume: number
    monthlyVolume: number
    thisMonthVolume: number
    mpesaCount: number
    bankCount: number
    cashCount: number
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PaymentsKpiCards({ stats }: PaymentsKpiProps) {
  const cardClasses =
    'h-full bg-gradient-to-t from-primary/5 to-card'

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
      {/* CARD 1: Total Transactions */}
      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>Total Transactions</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums">
            {stats.totalTransactions.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <CreditCard className="h-3 w-3" /> Lifetime
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="line-clamp-1 flex gap-2 font-medium text-paragraph-small">
            {stats.mpesaCount} M-Pesa · {stats.bankCount} Bank · {stats.cashCount} Cash
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            All reconciled payments
          </p>
        </CardFooter>
      </Card>

      {/* CARD 2: Total Volume */}
      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>Total Volume</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums text-emerald-600">
            {formatCurrency(stats.totalVolume)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <Banknote className="h-3 w-3" /> All Time
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="line-clamp-1 flex gap-2 font-medium text-paragraph-small">
            Total value of all transactions
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            Since system initialization
          </p>
        </CardFooter>
      </Card>

      {/* CARD 3: Annual vs Monthly Split */}
      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>Volume Breakdown</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums">
            {stats.totalVolume > 0 
              ? ((stats.annualVolume / stats.totalVolume) * 100).toFixed(0) 
              : '0'}% Annual
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp className="h-3 w-3" /> Split
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <StackedBar
            segments={[
              { label: `Annual ${formatCurrency(stats.annualVolume)}`, value: stats.annualVolume, color: 'bg-blue-500' },
              { label: `Monthly ${formatCurrency(stats.monthlyVolume)}`, value: stats.monthlyVolume, color: 'bg-emerald-500' },
            ]}
            total={stats.totalVolume}
          />
          <p className="text-paragraph-mini text-muted-foreground">
            Annual vs Monthly contributions
          </p>
        </CardFooter>
      </Card>

      {/* CARD 4: This Month */}
      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>This Month</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums">
            {formatCurrency(stats.thisMonthVolume)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <CalendarDays className="h-3 w-3" /> Current
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="line-clamp-1 flex gap-2 font-medium text-paragraph-small">
            Recent inflow
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            Collected in the current calendar month
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}