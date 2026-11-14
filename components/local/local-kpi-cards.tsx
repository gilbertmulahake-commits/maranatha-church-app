"use client"

import { Banknote, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Card, CardAction, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LocalChurchStats } from '@/lib/actions/local-actions'
import { StackedBar } from '@/components/dashboard/stacked-bar'
import { KpiGrid } from '@/components/ui/kpi-grid'
import { KpiValue } from '@/components/ui/kpi-value'

interface Props {
  stats: LocalChurchStats
  activeFilter?: 'All' | 'Annual' | 'Monthly' | 'Mixed'
  onFilterChange?: (filter: 'All' | 'Annual' | 'Monthly' | 'Mixed') => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function LocalKpiCards({ stats, activeFilter, onFilterChange }: Props) {
  const cardClasses = "h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card @container/card"
  const activeClass = "border-primary/50 shadow-sm"

  const getBadge = (status: string) => {
    if (status === 'Paid') return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0.5"><CheckCircle className="mr-1 h-3 w-3"/> Paid</Badge>
    if (status === 'Partial') return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-2 py-0.5"><AlertTriangle className="mr-1 h-3 w-3"/> Partial</Badge>
    if (status === 'Overdue') return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px] px-2 py-0.5"><AlertTriangle className="mr-1 h-3 w-3"/> Overdue</Badge>
    return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 text-[10px] px-2 py-0.5">N/A</Badge>
  }

  const getPrimaryFigure = (outstanding: number, paid: number) => {
    if (outstanding > 0) {
      return { amount: formatCurrency(outstanding), colorClass: 'text-destructive' }
    }
    return { amount: formatCurrency(paid), colorClass: 'text-emerald-600' }
  }

  const annualDisplay = getPrimaryFigure(stats.annualOutstanding, stats.annualPaid)
  const monthlyDisplay = getPrimaryFigure(stats.monthlyOutstanding, stats.monthlyPaid)

  return (
    <KpiGrid>
      
      <Card className={`${cardClasses} ${activeFilter === 'All' ? activeClass : ''}`} onClick={() => onFilterChange?.('All')}>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-medium text-muted-foreground">Total Contributions</CardDescription>
          <KpiValue className="text-emerald-600">
            {formatCurrency(stats.totalPaid)}
          </KpiValue>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px] px-2 py-0.5">
              <Banknote className="h-3 w-3 mr-1" /> Lifetime
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
          <StackedBar
            segments={[
              { label: `Annual ${formatCurrency(stats.annualPaid)}`, value: stats.annualPaid, color: 'bg-blue-500' },
              { label: `Monthly ${formatCurrency(stats.monthlyPaid)}`, value: stats.monthlyPaid, color: 'bg-emerald-500' },
            ]}
            total={stats.totalPaid || 1}
          />
          <p className="text-[11px] text-muted-foreground">
            Click to view all transactions
          </p>
        </CardFooter>
      </Card>

      <Card className={`${cardClasses} ${activeFilter === 'Annual' ? activeClass : ''}`} onClick={() => onFilterChange?.('Annual')}>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-medium text-muted-foreground">Annual Fee</CardDescription>
          <KpiValue className={stats.annualStatus === 'N/A' ? 'text-muted-foreground' : annualDisplay.colorClass}>
            {stats.annualStatus === 'N/A' ? 'N/A' : annualDisplay.amount}
          </KpiValue>
          <CardAction className="shrink-0">
            {getBadge(stats.annualStatus)}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-xs p-4 pt-2">
          <div className="flex w-full justify-between">
            <span className="text-muted-foreground">Paid:</span>
            <span className="font-medium text-foreground">{formatCurrency(stats.annualPaid)}</span>
          </div>
          <div className="flex w-full justify-between">
            <span className="text-muted-foreground">Outstanding:</span>
            <span className={`font-medium ${stats.annualOutstanding > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {formatCurrency(stats.annualOutstanding)}
            </span>
          </div>
        </CardFooter>
      </Card>

      <Card className={`${cardClasses} ${activeFilter === 'Monthly' ? activeClass : ''}`} onClick={() => onFilterChange?.('Monthly')}>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-medium text-muted-foreground">Monthly Fees</CardDescription>
          <KpiValue className={monthlyDisplay.colorClass}>
            {monthlyDisplay.amount}
          </KpiValue>
          <CardAction className="shrink-0">
            {getBadge(stats.monthlyStatus)}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-xs p-4 pt-2">
          <div className="flex w-full justify-between">
            <span className="text-muted-foreground">Paid:</span>
            <span className="font-medium text-foreground">{formatCurrency(stats.monthlyPaid)}</span>
          </div>
          <div className="flex w-full justify-between">
            <span className="text-muted-foreground">Outstanding:</span>
            <span className={`font-medium ${stats.monthlyOutstanding > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {formatCurrency(stats.monthlyOutstanding)}
            </span>
          </div>
        </CardFooter>
      </Card>

      <Card className={`${cardClasses} ${activeFilter === 'All' ? activeClass : ''}`} onClick={() => onFilterChange?.('All')}>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-medium text-muted-foreground">Overall Compliance</CardDescription>
          <KpiValue>
            {stats.overallStatus}
          </KpiValue>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10 text-[10px] px-2 py-0.5">
              <ShieldCheck className="h-3 w-3 mr-1" /> Status
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
          <p className="text-xs font-medium text-foreground">
            {stats.overallStatus === 'Paid' ? 'Fully compliant. Thank you!' : 
             stats.overallStatus === 'Partial' ? 'Action required on one bucket.' : 
             'Please remit outstanding fees.'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Based on strict annual and monthly isolation.
          </p>
        </CardFooter>
      </Card>

    </KpiGrid>
  )
}