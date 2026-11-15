import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ArrearsAgingProps {
  aging0_30: number
  aging31_60: number
  aging61_90: number
  aging90_plus: number
  totalActionRequired: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function ArrearsAging({ aging0_30, aging31_60, aging61_90, aging90_plus, totalActionRequired }: ArrearsAgingProps) {
  const total = aging0_30 + aging31_60 + aging61_90 + aging90_plus
  const criticalPct = total > 0 ? (aging90_plus / total) * 100 : 0

  const buckets = [
    { label: '0–30 days', amount: aging0_30, barColor: 'bg-emerald-500', textColor: 'text-emerald-600' },
    { label: '31–60 days', amount: aging31_60, barColor: 'bg-amber-500', textColor: 'text-amber-600' },
    { label: '61–90 days', amount: aging61_90, barColor: 'bg-rose-500', textColor: 'text-rose-600' },
    { label: '90+ days', amount: aging90_plus, barColor: 'bg-red-600', textColor: 'text-red-700' },
  ]

  const maxAmount = Math.max(...buckets.map(b => b.amount), 1)

  return (
    <Card className="col-span-1 @[800px]/dashboard:col-span-6 @[1100px]/dashboard:col-span-5 shadow-sm flex flex-col @container/aging">
      <CardHeader className="flex flex-col pb-4 gap-2">
        <div className="flex items-center justify-between gap-4 w-full">
          <CardTitle className="flex items-center gap-2 text-heading-4 font-bold text-foreground">
            <Clock className="h-4 w-4 text-primary shrink-0" /> 
            <span className="truncate">Arrears Aging</span>
          </CardTitle>
          <span className="text-sm @[450px]/aging:text-base font-bold text-destructive whitespace-nowrap shrink-0 tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
        <CardDescription className="text-xs @[450px]/aging:text-sm">
          How old is our outstanding debt?
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pt-2 pb-6 flex flex-col">
        {total === 0 ? (
          <div className="flex flex-1 items-center justify-center min-h-[240px]">
            <p className="text-muted-foreground text-sm">No arrears. All churches are up to date.</p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {buckets.map((bucket) => (
                <div key={bucket.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{bucket.label}</span>
                    <span className={cn("font-bold tabular-nums text-base tracking-tight", bucket.textColor)}>
                      {formatCurrency(bucket.amount)}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-700", bucket.barColor)}
                      style={{ width: `${(bucket.amount / maxAmount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {criticalPct > 25 && (
              <div className="mt-6 pt-4 border-t border-border/50 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">
                  {criticalPct.toFixed(0)}% of arrears are 90+ days old. Immediate escalation required.
                </p>
              </div>
            )}

            <div className="mt-auto pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground tabular-nums">{totalActionRequired}</span> churches require follow-up. Use the Action Center to send reminders.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}