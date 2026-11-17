'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { proposeWriteOff, getChurchOutstandingForWriteOff } from '@/lib/actions/writeoff-actions'

type ChurchOption = { id: string; church_code: string; church_name: string }

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES', maximumFractionDigits: 0,
  }).format(amount)
}

export function ProposeWriteOffDialog({
  churches,
  open,
  onOpenChange,
}: {
  churches: ChurchOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [selectedChurchId, setSelectedChurchId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [reason, setReason] = useState<string>('UNCOLLECTABLE_90D')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, startSubmitTransition] = useTransition()
  
  // 🚨 NEW: State for the outstanding balance breakdown
  const [outstanding, setOutstanding] = useState<{ total: number; annual: number; monthly: number } | null>(null)
  const [isFetchingOutstanding, setIsFetchingOutstanding] = useState(false)

  const selectedChurch = churches.find((c) => c.id === selectedChurchId)
  const amountError = outstanding !== null && Number(amount) > outstanding.total

  const handleChurchChange = async (val: string | null) => {
    if (!val) return
    setSelectedChurchId(val)
    setAmount('')
    setOutstanding(null)
    setIsFetchingOutstanding(true)
    
    const res = await getChurchOutstandingForWriteOff(val)
    if (res.outstanding !== undefined) {
      setOutstanding(res.outstanding)
    }
    setIsFetchingOutstanding(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChurchId) return toast.error('Please select a church')
    if (!amount || Number(amount) <= 0) return toast.error('Amount must be greater than zero')
    if (amountError) return toast.error('Amount exceeds current outstanding balance')
    if (!notes.trim()) return toast.error('Justification notes are required for the audit trail')

    startSubmitTransition(async () => {
      const formData = new FormData()
      formData.append('church_id', selectedChurchId)
      formData.append('amount', amount)
      formData.append('reason', reason)
      formData.append('notes', notes)

      const res = await proposeWriteOff(formData)

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Write-off proposed successfully. Pending Treasurer approval.')
        onOpenChange(false)
        setSelectedChurchId('')
        setAmount('')
        setReason('UNCOLLECTABLE_90D')
        setNotes('')
        setOutstanding(null)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-heading-3 font-bold">
            Propose Write-Off
          </DialogTitle>
          <DialogDescription>
            Write off uncollectable debt. This requires National Treasurer approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="church">Church</Label>
            <Select 
              value={selectedChurchId} 
              onValueChange={handleChurchChange}
            >
              <SelectTrigger id="church" className="h-10 bg-background">
                <SelectValue placeholder="Select a church...">
                  {selectedChurch
                    ? `${selectedChurch.church_code} — ${selectedChurch.church_name}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {churches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.church_code} — {c.church_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <Label htmlFor="amount" className="pt-1">Amount to Write Off (KES)</Label>
              
              {/* 🚨 NEW: Bucket Breakdown Display */}
              {isFetchingOutstanding ? (
                <span className="text-xs text-muted-foreground animate-pulse">Fetching balance...</span>
              ) : outstanding !== null ? (
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-xs font-semibold ${outstanding.total > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                    Outstanding: {formatCurrency(outstanding.total)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Annual: {formatCurrency(outstanding.annual)} &middot; Monthly: {formatCurrency(outstanding.monthly)}
                  </span>
                </div>
              ) : null}
            </div>
            
            <Input
              id="amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className={`h-10 ${amountError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              disabled={!selectedChurchId || isFetchingOutstanding || outstanding?.total === 0}
              required
            />
            
            {amountError && (
              <p className="text-xs text-destructive font-medium">
                Amount cannot exceed the current outstanding balance.
              </p>
            )}
            {outstanding?.total === 0 && !isFetchingOutstanding && (
              <p className="text-xs text-amber-600 font-medium">
                This church has no outstanding balance to write off.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={(val) => setReason(val || 'UNCOLLECTABLE_90D')}>
              <SelectTrigger id="reason" className="h-10 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNCOLLECTABLE_90D">Uncollectable (90+ Days)</SelectItem>
                <SelectItem value="DEFUNCT">Church Defunct</SelectItem>
                <SelectItem value="DISSOLVED">Church Dissolved</SelectItem>
                <SelectItem value="COURT_ORDER">Court Order</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Justification Notes (required)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide details for the audit trail..."
              className="resize-none min-h-[100px]"
              required
            />
          </div>

          <DialogFooter className="pt-4 flex-col-reverse sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || amountError || outstanding?.total === 0}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Proposing...' : 'Propose Write-Off'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}