import Link from 'next/link'
import { AlertTriangle, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ActionCenterProps {
  stats: {
    outstanding: number
    outstandingAnnual: number
    outstandingMonthly: number
    overdueChurches: number
    partialChurches: number
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function ActionCenter({ stats }: ActionCenterProps) {
  const totalActionRequired = stats.overdueChurches + stats.partialChurches

  return (
    <Card className="h-full shadow-sm flex flex-col border-destructive/20 bg-gradient-to-br from-destructive/5 to-card @container/action">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-heading-4 font-bold text-destructive">
            <AlertTriangle className="h-5 w-5" /> Action Required
          </CardTitle>
        </div>
        <CardDescription>Churches with outstanding balances.</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <span className="text-3xl font-bold text-foreground tabular-nums tracking-tight">
              {formatCurrency(stats.outstanding)}
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              Owed by <strong className="text-foreground">{totalActionRequired} churches</strong> ({stats.overdueChurches} overdue, {stats.partialChurches} partial).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Annual Arrears</p>
              <p className="text-base font-bold text-destructive tabular-nums mt-1">{formatCurrency(stats.outstandingAnnual)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Monthly Arrears</p>
              <p className="text-base font-bold text-destructive tabular-nums mt-1">{formatCurrency(stats.outstandingMonthly)}</p>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <Link href="/dashboard/churches?status=Overdue" className="w-full">
            <Button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold h-10">
              <Send className="mr-2 h-4 w-4" /> Send Reminders
            </Button>
          </Link>
          <p className="text-[11px] text-center text-muted-foreground mt-2">
            Directs to the filtered Arrears list to trigger bulk SMS.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}