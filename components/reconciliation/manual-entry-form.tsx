'use client'

import { useState, useEffect, useTransition, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  createManualEntry,
  getManualEntryAllocations,
} from '@/lib/actions/manual-entry-actions'
import type { AllocationInput } from '@/lib/actions/reconciliation-actions'

type ChurchOption = { id: string; church_code: string; church_name: string }

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ManualEntryForm({ churches }: { churches: ChurchOption[] }) {
  const [churchId, setChurchId] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [method, setMethod] = useState<'Cash' | 'Cheque' | 'Bank_Transfer'>('Cash')
  const [transactionId, setTransactionId] = useState('')
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState('')

  const [allocations, setAllocations] = useState<AllocationInput[]>([])
  const [isLoadingPreview, startPreviewTransition] = useTransition()
  const [isSubmitting, startSubmitTransition] = useTransition()

  // Auto-compute allocations when church and amount change
  useEffect(() => {
    if (!churchId || amount <= 0) return
    
    // Debounce to prevent too many calls while typing
    const timer = setTimeout(() => {
      startPreviewTransition(async () => {
        const res = await getManualEntryAllocations(churchId, amount)
        if (res.error) {
          toast.error(res.error)
          setAllocations([])
        } else {
          setAllocations(res.allocations ?? [])
        }
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [churchId, amount])

  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0)
  const remaining = amount - totalAllocated
  const isOverAllocated = totalAllocated > amount + 0.01
  const requiresApproval = amount >= 20000

  const updateRow = (idx: number, patch: Partial<AllocationInput>) => {
    setAllocations((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, ...patch } : a))
    )
  }

  const removeRow = (idx: number) => {
    setAllocations((prev) => prev.filter((_, i) => i !== idx))
  }

  const addRow = () => {
    setAllocations((prev) => [
      ...prev,
      {
        allocation_type: 'Annual',
        billing_year: new Date().getFullYear(),
        billing_month: null,
        amount: 0,
      },
    ])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!churchId) return toast.error('Church is required')
    if (amount <= 0) return toast.error('Amount must be greater than zero')
    if (!transactionId) return toast.error('Reference is required')
    if (allocations.length === 0) return toast.error('Allocations are required')
    if (isOverAllocated) return toast.error('Allocations exceed amount')
    if (remaining > 0.01) return toast.error('Allocations must equal amount')

    const formData = new FormData()
    formData.set('church_id', churchId)
    formData.set('amount', amount.toString())
    formData.set('payment_method', method)
    formData.set('transaction_id', transactionId)
    formData.set('payment_date', paymentDate)
    formData.set('notes', notes)
    formData.set('allocations', JSON.stringify(allocations))

    startSubmitTransition(async () => {
      const res = await createManualEntry(formData)
      if (res.error) {
        toast.error(res.error)
      } else if ('requiresApproval' in res && res.requiresApproval) {
        toast.success('Submitted for Treasurer approval')
        resetForm()
      } else {
        toast.success('Payment created successfully')
        resetForm()
      }
    })
  }

  const resetForm = () => {
    setChurchId('')
    setAmount(0)
    setTransactionId('')
    setNotes('')
    setAllocations([])
    setPaymentDate(new Date().toISOString().split('T')[0])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Church</Label>
          <Select value={churchId} onValueChange={(val) => { if (val) setChurchId(val) }}>
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

        <div className="space-y-2">
          <Label>Amount (KES)</Label>
          <Input
            type="number"
            value={amount || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(Number(e.target.value))}
            placeholder="e.g. 5000"
          />
        </div>

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select value={method} onValueChange={(val) => { if (val) setMethod(val as 'Cash' | 'Cheque' | 'Bank_Transfer') }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
              <SelectItem value="Bank_Transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Reference / Transaction ID</Label>
          <Input
            value={transactionId}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTransactionId(e.target.value)}
            placeholder="e.g. CHQ-042"
          />
        </div>

        <div className="space-y-2">
          <Label>Payment Date</Label>
          <Input
            type="date"
            value={paymentDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPaymentDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Notes (Optional)</Label>
          <Input
            value={notes}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
            placeholder="Any additional details..."
          />
        </div>
      </div>

      {requiresApproval && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
          This payment is {formatCurrency(amount)} — above the KES 20,000 threshold. It will require National Treasurer approval before being applied.
        </div>
      )}

      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between">
          <Label className="text-heading-4 font-bold">Allocations</Label>
          {isLoadingPreview && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> computing...
            </span>
          )}
        </div>

        {allocations.length > 0 && (
          <div className="border rounded-md divide-y">
            {allocations.map((a, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_80px_100px_40px] gap-2 items-center p-2">
                <Select
                  value={a.allocation_type}
                  onValueChange={(val) => {
                    if (val) {
                      updateRow(idx, {
                        allocation_type: val as 'Annual' | 'Monthly',
                        billing_month: val === 'Annual' ? null : (a.billing_month ?? 1),
                      })
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual">Annual</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  value={a.billing_year}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateRow(idx, { billing_year: Number(e.target.value) })}
                  className="h-8 text-xs tabular-nums"
                />

                {a.allocation_type === 'Monthly' ? (
                  <Input
                    type="number"
                    min={1} max={12}
                    value={a.billing_month ?? 1}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateRow(idx, { billing_month: Number(e.target.value) })}
                    className="h-8 text-xs tabular-nums"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground text-center">—</span>
                )}

                <Input
                  type="number"
                  value={a.amount}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateRow(idx, { amount: Number(e.target.value) })}
                  className="h-8 text-xs tabular-nums"
                />

                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(idx)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
          </Button>
          <div className="text-paragraph-small text-right space-y-0.5">
            <div>
              Allocated: <strong className="tabular-nums">{formatCurrency(totalAllocated)}</strong>
            </div>
            <div className={remaining < -0.01 ? 'text-destructive' : remaining > 0.01 ? 'text-amber-600' : 'text-emerald-600'}>
              Remaining: <strong className="tabular-nums">{formatCurrency(remaining)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={isSubmitting || isOverAllocated || remaining > 0.01 || amount <= 0}>
          {isSubmitting ? 'Saving...' : requiresApproval ? 'Submit for Approval' : 'Create Payment'}
        </Button>
      </div>
    </form>
  )
}