'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Split, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export interface Transaction {
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

interface TransactionDetailModalProps {
  transaction: Transaction | null
  onClose: () => void
}

export function TransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  if (!transaction) return null

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-heading-2 font-bold tracking-tight">Transaction Details</DialogTitle>
          <DialogDescription>
            Ref: <span className="font-mono text-foreground">{transaction.transaction_id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Church Info */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Church Profile</p>
            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border">
              <div>
                <p className="font-semibold text-foreground">{transaction.church_name}</p>
                <p className="font-mono text-sm text-muted-foreground">{transaction.church_code}</p>
              </div>
              <Link href={`/dashboard/churches/${transaction.church_code}`}>
                <Button variant="outline" size="sm" className="h-8">
                  View Profile <ExternalLink className="ml-1.5 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Transaction Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Amount</p>
              <p className="text-lg font-bold text-emerald-600 tabular-nums">
                {formatCurrency(transaction.amount_paid)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Date & Time</p>
              <p className="text-sm text-foreground">{formatDateTime(transaction.payment_date)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Type</p>
              {transaction.is_mixed ? (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  <Split className="mr-1 h-3 w-3" /> Mixed
                </Badge>
              ) : (
                <Badge variant="outline" className={transaction.payment_type === 'Annual' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>
                  {transaction.payment_type}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Method</p>
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                {transaction.payment_method === 'M_Pesa' ? 'M-Pesa' : transaction.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash'}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}