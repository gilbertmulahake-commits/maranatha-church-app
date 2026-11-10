'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Split } from 'lucide-react'

interface Transaction {
  id: string
  transaction_id: string
  church_name: string
  church_code: string
  amount_paid: number
  payment_type: string
  payment_method: string
  payment_date: string
  is_mixed: boolean
}

export function RecentPayments({ transactions }: { transactions: Transaction[] }) {
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
  }

  function formatTime(dateString: string) {
    return new Intl.DateTimeFormat('en-KE', { timeStyle: 'short' }).format(new Date(dateString))
  }

  return (
    <Card className="h-full shadow-sm flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-heading-4 font-bold text-foreground">
          <Activity className="h-4 w-4 text-primary" /> Live Feed
        </CardTitle>
        <CardDescription>Latest incoming contributions.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
              <div className="space-y-1">
                <p className="font-medium text-sm text-foreground leading-none">{tx.church_name}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-mono">{tx.church_code}</span>
                  <span>•</span>
                  <span>{formatTime(tx.payment_date)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="font-bold tabular-nums text-emerald-600 text-sm">
                  {formatCurrency(tx.amount_paid)}
                </span>
                <div className="flex items-center gap-1">
                  {/* Payment Type Badge */}
                  {tx.is_mixed ? (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0 h-4">
                      <Split className="mr-0.5 h-2.5 w-2.5" /> Mixed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${tx.payment_type === 'Annual' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {tx.payment_type}
                    </Badge>
                  )}
                  
                  {/* Payment Method Badge */}
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0 h-4">
                    {tx.payment_method === 'M_Pesa' ? 'M-Pesa' : tx.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No recent transactions.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}