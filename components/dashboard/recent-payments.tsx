import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'

interface RecentPaymentsProps {
  transactions: {
    id: string
    transaction_id: string
    church_name: string
    church_code: string
    amount_paid: number
    payment_type: string
    payment_date: string
  }[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(dateString))
}

export function RecentPayments({ transactions }: RecentPaymentsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Live Feed
        </CardTitle>
        <CardDescription>
          Latest incoming contributions.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {transactions.length === 0 ? (
          <div className="px-xl text-center py-8 text-paragraph-small text-muted-foreground">
            Waiting for the first payment...
          </div>
        ) : (
          <div className="flex flex-col">
            {transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="flex items-center justify-between px-xl py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="font-medium text-foreground text-paragraph-small">
                    {tx.church_name}
                  </div>
                  <div className="flex items-center gap-2 text-paragraph-mini text-muted-foreground">
                    <span className="font-mono">{tx.church_code}</span>
                    <span>•</span>
                    <span>{formatTime(tx.payment_date)}</span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="font-bold tabular-nums text-emerald-600 text-paragraph-small">
                    {formatCurrency(tx.amount_paid)}
                  </div>
                  <Badge variant="outline" className={
                    tx.payment_type === 'Annual' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0'
                  }>
                    {tx.payment_type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}