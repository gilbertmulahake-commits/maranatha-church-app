'use client'

import { ChurchRow } from './church-table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function ViewChurchDialog({ church, onClose }: { church: ChurchRow | null, onClose: () => void }) {
  if (!church) return null

  const totalPaid = church.annualPaid + church.monthlyPaid
  const totalOutstanding = church.annualOutstanding + church.monthlyOutstanding
  const totalExpected = totalPaid + totalOutstanding
  
  const progressPct = totalExpected > 0 ? Math.min((totalPaid / totalExpected) * 100, 100) : 0

  return (
    <Dialog open={!!church} onOpenChange={(open) => !open && onClose()}>
      {/* FIXED: Matched the exact class structure of EditChurchDialog */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{church.church_name}</DialogTitle>
          <DialogDescription className="text-paragraph-small text-muted-foreground flex items-center gap-2">
            <span className="font-mono">{church.church_code}</span>
            <span>•</span>
            <span>{church.region?.name || 'Unassigned'} Region</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex justify-between text-paragraph-small">
              <span className="text-muted-foreground font-medium">Collection Progress</span>
              <span className="font-bold text-foreground">{progressPct.toFixed(1)}%</span>
            </div>
            
            {/* FIXED: Custom Tailwind progress bar to avoid missing module */}
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all" 
                style={{ width: `${progressPct}%` }}
              />
            </div>
            
            <div className="flex justify-between text-paragraph-mini text-muted-foreground">
              <span>Paid: {formatCurrency(totalPaid)}</span>
              <span>Target: {formatCurrency(totalExpected)}</span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 p-4 rounded-xl border border-border">
              <p className="text-paragraph-mini text-muted-foreground font-medium">Total Collected</p>
              <p className="text-heading-3 font-bold text-emerald-600 tabular-nums mt-1">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="bg-muted/30 p-4 rounded-xl border border-border">
              <p className="text-paragraph-mini text-muted-foreground font-medium">Total Outstanding</p>
              <p className="text-heading-3 font-bold text-destructive tabular-nums mt-1">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
          </div>

          {/* Leader Info */}
          <div className="space-y-1 pt-2">
            <p className="text-paragraph-small font-medium text-foreground">Leadership</p>
            <div className="flex flex-col gap-1 text-paragraph-small text-muted-foreground mt-1">
              <span>Pastor: {church.pastor_name} ({church.pastor_phone})</span>
              <span>Treasurer: {church.treasurer_name} ({church.contact_phone})</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}