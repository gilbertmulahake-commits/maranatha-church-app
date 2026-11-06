import { Banknote, CalendarDays, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LocalChurchStats } from '@/lib/actions/local-actions'
import { StackedBar } from '@/components/dashboard/stacked-bar'

interface Props {
  stats: LocalChurchStats
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function LocalKpiCards({ stats }: Props) {
  const cardClasses = "h-full bg-gradient-to-t from-primary/5 to-card"

  // Helper for status badges
  const getBadge = (status: string) => {
    if (status === 'Paid') return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle className="mr-1 h-3 w-3"/> Paid</Badge>
    if (status === 'Partial') return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200"><AlertTriangle className="mr-1 h-3 w-3"/> Partial</Badge>
    if (status === 'Overdue') return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200"><AlertTriangle className="mr-1 h-3 w-3"/> Overdue</Badge>
    return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">N/A</Badge>
  }

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
      
      {/* CARD 1: Total Paid */}
      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>Total Contributions</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums text-emerald-600">
            {formatCurrency(stats.totalPaid)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <Banknote className="h-3 w-3" /> Lifetime
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <StackedBar
            segments={[
              { label: `Annual ${formatCurrency(stats.annualPaid)}`, value: stats.annualPaid, color: 'bg-blue-500' },
              { label: `Monthly ${formatCurrency(stats.monthlyPaid)}`, value: stats.monthlyPaid, color: 'bg-emerald-500' },
            ]}
            total={stats.totalPaid || 1}
          />
          <p className="text-paragraph-mini text-muted-foreground">
            Annual vs Monthly split
          </p>
        </CardFooter>
      </Card>

      {/* CARD 2: Annual Status */}
      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>Annual Fee</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums">
            {stats.annualStatus === 'N/A' ? 'N/A' : formatCurrency(stats.annualOutstanding)}
          </CardTitle>
          <CardAction>
            {getBadge(stats.annualStatus)}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex w-full justify-between text-paragraph-small">
            <span className="text-muted-foreground">Paid:</span>
            <span className="font-medium text-foreground">{formatCurrency(stats.annualPaid)}</span>
          </div>
          <div className="flex w-full justify-between text-paragraph-small">
            <span className="text-muted-foreground">Outstanding:</span>
            <span className="font-medium text-destructive">{formatCurrency(stats.annualOutstanding)}</span>
          </div>
        </CardFooter>
      </Card>

      {/* CARD 3: Monthly Status */}
      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>Monthly Fees</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums">
            {formatCurrency(stats.monthlyOutstanding)}
          </CardTitle>
          <CardAction>
            {getBadge(stats.monthlyStatus)}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex w-full justify-between text-paragraph-small">
            <span className="text-muted-foreground">Paid:</span>
            <span className="font-medium text-foreground">{formatCurrency(stats.monthlyPaid)}</span>
          </div>
          <div className="flex w-full justify-between text-paragraph-small">
            <span className="text-muted-foreground">Outstanding:</span>
            <span className="font-medium text-destructive">{formatCurrency(stats.monthlyOutstanding)}</span>
          </div>
        </CardFooter>
      </Card>

      {/* CARD 4: Overall Health */}
      <Card className={cardClasses}>
        <CardHeader>
          <CardDescription>Overall Compliance</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums">
            {stats.overallStatus}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">
              <ShieldCheck className="h-3 w-3" /> Status
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="text-paragraph-small font-medium text-foreground">
            {stats.overallStatus === 'Paid' ? 'Fully compliant. Thank you!' : 
             stats.overallStatus === 'Partial' ? 'Action required on one bucket.' : 
             'Please remit outstanding fees.'}
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            Based on strict annual and monthly isolation.
          </p>
        </CardFooter>
      </Card>

    </div>
  )
}