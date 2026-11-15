'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Split } from 'lucide-react'
import { TransactionDetailModal, type Transaction } from './transaction-detail-modal'
import { cn } from '@/lib/utils'

// --- SUB-COMPONENT: The Row Architecture ---
interface LiveFeedRowProps {
  tx: Transaction
  onClick: (tx: Transaction) => void
}

function LiveFeedRow({ tx, onClick }: LiveFeedRowProps) {
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
  }

  function formatDateTime(dateString: string) {
    const d = new Date(dateString)
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(-2)
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    
    return `${weekday}, ${dd}.${mm}.${yy} ${hh}:${min}`
  }

  return (
    <div 
      onClick={() => onClick(tx)}
      // Grid layout gives the church name 1fr (all remaining space)
      className="group grid grid-cols-1 @[340px]/live-feed:grid-cols-[1fr_auto_auto] items-center gap-2 @[340px]/live-feed:gap-4 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
    >
      {/* 1. Church Info */}
      <div className="min-w-0 flex flex-col gap-1">
        <p className="font-semibold text-sm @[480px]/live-feed:text-base text-foreground leading-none truncate pr-2 group-hover:text-primary transition-colors">
          {tx.church_name}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] @[480px]/live-feed:text-xs text-muted-foreground truncate">
          <span className="font-mono font-medium">{tx.church_code}</span>
          <span>•</span>
          <span>{formatDateTime(tx.payment_date)}</span>
        </div>
      </div>

      {/* 2. Amount */}
      <div className="flex @[340px]/live-feed:justify-end items-center shrink-0">
        <span className="font-bold tabular-nums text-emerald-600 text-base @[480px]/live-feed:text-lg leading-none tracking-tight whitespace-nowrap">
          {formatCurrency(tx.amount_paid)}
        </span>
      </div>

      {/* 3. Badges (Always Horizontal) */}
      <div className="flex flex-row items-center gap-1.5 shrink-0">
        {tx.is_mixed ? (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0 h-4 w-[55px] flex justify-center">
            <Split className="mr-1 h-2.5 w-2.5" /> Mixed
          </Badge>
        ) : (
          <Badge variant="outline" className={cn(
            "text-[10px] px-1.5 py-0 h-4 w-[55px] flex justify-center",
            tx.payment_type === 'Annual' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          )}>
            {tx.payment_type}
          </Badge>
        )}
        
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0 h-4 w-[55px] flex justify-center">
          {tx.payment_method === 'M_Pesa' ? 'M-Pesa' : tx.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash'}
        </Badge>
      </div>
    </div>
  )
}

// --- MAIN COMPONENT ---
export function RecentPayments({ transactions }: { transactions: Transaction[] }) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  return (
    <>
      <Card className="h-full shadow-sm flex flex-col overflow-hidden @container/live-feed">
        <CardHeader className="p-4 border-b border-border/50 bg-muted/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-heading-4 font-bold text-foreground">
              <Activity className="h-4 w-4 text-primary" /> Live Feed
            </CardTitle>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Live</span>
            </div>
          </div>
          <CardDescription>Latest incoming contributions.</CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="flex flex-col">
            {transactions.map((tx) => (
              <LiveFeedRow key={tx.id} tx={tx} onClick={setSelectedTx} />
            ))}
            
            {transactions.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">No recent transactions.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <TransactionDetailModal 
        transaction={selectedTx} 
        onClose={() => setSelectedTx(null)} 
      />
    </>
  )
}