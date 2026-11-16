'use client'

import { useState, useEffect, useTransition, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
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
  const [churchId, setChurchId] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [reason, setReason] = useState<string>('UNCOLLECTABLE_90D')
  const [notes, setNotes] = useState('')
  
  const [outstanding, setOutstanding] = useState<number | null>(null)
  const [isLoadingOutstanding, startOutstandingTransition] = useTransition()
  const [isSubmitting, startSubmitTransition] = useTransition()

  // Fetch outstanding balance only when there's a valid church and dialog is open
  useEffect(() => {
    if (!churchId || !open) return
    startOutstandingTransition(async () => {
      const res = await getChurchOutstandingForWriteOff(churchId)
      if (res.error) {
        toast.error(res.error)
        setOutstanding(null)
      } else {
        setOutstanding(res.outstanding ?? 0)
        setAmount(res.outstanding ?? 0)
      }
    })
  }, [churchId, open])

  const handleChurchChange = (val: string | null) => {
    if (!val) return
    if (val !== churchId) {
      setOutstanding(null)
      setAmount(0)
      setChurchId(val)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setChurchId('')
      setAmount(0)
      setNotes('')
      setOutstanding(null)
      setReason('UNCOLLECTABLE_90D')
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!churchId) return toast.error('Church is required')
    if (amount <= 0) return toast.error('Amount must be greater than zero')
    if (outstanding !== null && amount > outstanding) {
      return toast.error('Amount cannot exceed the outstanding balance')
    }
    if (notes.trim().length < 10) {
      return toast.error('Please provide at least 10 characters of justification')
    }

    const formData = new FormData()
    formData.set('church_id', churchId)
    formData.set('amount', amount.toString())
    formData.set('reason', reason)
    formData.set('notes', notes)

    startSubmitTransition(async () => {
      const res = await proposeWriteOff(formData)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Write-off proposed and submitted for Treasurer approval')
        handleOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-heading-3 font-bold">Propose Write-Off</DialogTitle>
          <DialogDescription>
            Write off uncollectable debt. This requires National Treasurer approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Church</Label>
            <Select value={churchId} onValueChange={handleChurchChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a church..." />
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

          {isLoadingOutstanding && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking balance...
            </div>
          )}

          {outstanding !== null && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              Current Outstanding: <strong className="tabular-nums">{formatCurrency(outstanding)}</strong>
            </div>
          )}

          <div className="space-y-2">
            <Label>Amount to Write Off (KES)</Label>
            <Input
              type="number"
              value={amount || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(Number(e.target.value))}
              placeholder="e.g. 5000"
              disabled={outstanding === null || outstanding === 0}
            />
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(val) => { if (val) setReason(val) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFUNCT">Church is defunct</SelectItem>
                <SelectItem value="DISSOLVED">Church dissolved</SelectItem>
                <SelectItem value="UNCOLLECTABLE_90D">Uncollectable (90+ days)</SelectItem>
                <SelectItem value="COURT_ORDER">Court order / legal</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Justification Notes (required)</Label>
            <Textarea
              value={notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Provide details for the audit trail..."
              className="min-h-[80px]"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !churchId || amount <= 0}>
              {isSubmitting ? 'Submitting...' : 'Propose Write-Off'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}