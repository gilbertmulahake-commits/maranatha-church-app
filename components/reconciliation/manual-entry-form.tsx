'use client'

import { useState, useEffect, useTransition, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createManualEntry, getManualEntryAllocations } from '@/lib/actions/manual-entry-actions'
import type { AllocationInput } from '@/lib/actions/reconciliation-actions'

type ChurchOption = { id: string; church_code: string; church_name: string }

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── STANDARDIZED COMPONENT: Allocation Row Card ──────────────────────────────
function AllocationRow({
  allocation,
  index,
  onUpdate,
  onRemove,
}: {
  allocation: AllocationInput
  index: number
  onUpdate: (idx: number, patch: Partial<AllocationInput>) => void
  onRemove: (idx: number) => void
}) {
  return (
    <div className="flex flex-col gap-2.5 p-2.5 sm:grid sm:grid-cols-[130px_70px_70px_minmax(100px,1fr)_32px] sm:items-center sm:gap-1.5 sm:p-2">
      <div className="flex flex-col gap-1 sm:block">
        <span className="text-[11px] font-medium text-muted-foreground sm:hidden">Type</span>
        <Select
          value={allocation.allocation_type}
          onValueChange={(val) => {
            if (val) {
              onUpdate(index, {
                allocation_type: val as 'Annual' | 'Monthly',
                billing_month: val === 'Annual' ? null : (allocation.billing_month ?? 1),
              })
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs w-full sm:w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Annual">Annual</SelectItem>
            <SelectItem value="Monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={`grid gap-2 sm:contents ${allocation.allocation_type === 'Monthly' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="flex flex-col gap-1 sm:block">
          <span className="text-[11px] font-medium text-muted-foreground sm:hidden">Year</span>
          <Input
            type="number"
            value={allocation.billing_year}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onUpdate(index, { billing_year: Number(e.target.value) })
            }
            className="h-8 text-xs tabular-nums w-full sm:w-[70px]"
            placeholder="Year"
          />
        </div>
        
        <div className={`${allocation.allocation_type === 'Monthly' ? 'flex flex-col gap-1' : 'hidden sm:block'}`}>
          <span className="text-[11px] font-medium text-muted-foreground sm:hidden">Month</span>
          {allocation.allocation_type === 'Monthly' ? (
            <Input
              type="number"
              min={1}
              max={12}
              value={allocation.billing_month ?? 1}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onUpdate(index, { billing_month: Number(e.target.value) })
              }
              className="h-8 text-xs tabular-nums w-full sm:w-[70px]"
              placeholder="Mth"
            />
          ) : (
            <div className="hidden sm:flex h-8 items-center justify-center text-xs text-muted-foreground w-[70px]">—</div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 w-full sm:w-auto sm:contents">
        <span className="text-[11px] font-medium text-muted-foreground sm:hidden">Amount</span>
        <div className="flex items-center gap-2 w-full sm:contents">
          <Input
            type="number"
            value={allocation.amount}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onUpdate(index, { amount: Number(e.target.value) })
            }
            className="h-8 text-xs tabular-nums w-full sm:w-full"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto sm:ml-0"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
// ──────────────────────────────────────────────────────────────────────────────

export function ManualEntryForm({ churches }: { churches: ChurchOption[] }) {
  const [selectedChurchId, setSelectedChurchId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash')
  const [transactionId, setTransactionId] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState<string>('')
  
  const [allocations, setAllocations] = useState<AllocationInput[]>([])
  const [isLoadingPreview, startPreviewTransition] = useTransition()
  const [isSubmitting, startSubmitTransition] = useTransition()

  // FIXED: Removed synchronous setState from the effect body
  useEffect(() => {
    const numericAmount = Number(amount)
    if (!selectedChurchId || !numericAmount || numericAmount <= 0) {
      return
    }

    const timer = setTimeout(() => {
      startPreviewTransition(async () => {
        const res = await getManualEntryAllocations(selectedChurchId, numericAmount)
        if (res.error) {
          toast.error(res.error)
          setAllocations([])
        } else {
          setAllocations(res.allocations ?? [])
        }
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [selectedChurchId, amount])

  // FIXED: Moved the clearing logic to the event handlers
  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setAmount(val)
    const num = Number(val)
    if (!val || num <= 0) {
      setAllocations([])
    }
  }

  const handleChurchChange = (val: string | null) => {
    if (val) {
      setSelectedChurchId(val)
      setAllocations([]) // Clear old allocations immediately when church changes
    }
  }

  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0)
  const numericAmount = Number(amount) || 0
  const remaining = numericAmount - totalAllocated
  const isOverAllocated = totalAllocated > numericAmount + 0.01

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
    if (!selectedChurchId) return toast.error('Please select a church')
    if (numericAmount <= 0) return toast.error('Amount must be greater than zero')
    if (!transactionId) return toast.error('Reference is required')
    if (allocations.length === 0) return toast.error('At least one allocation is required')
    if (isOverAllocated) return toast.error('Allocations exceed the payment amount')
    if (remaining > 0.01) return toast.error('Allocated amount must equal the payment amount')

    startSubmitTransition(async () => {
      const formData = new FormData()
      formData.append('church_id', selectedChurchId)
      formData.append('amount', amount)
      formData.append('payment_method', paymentMethod)
      formData.append('transaction_id', transactionId)
      formData.append('payment_date', paymentDate)
      formData.append('notes', notes)
      formData.append('allocations', JSON.stringify(allocations))

      const res = await createManualEntry(formData)
      
      if (res.error) {
        toast.error(res.error)
      } else if ('requiresApproval' in res && res.requiresApproval) {
        toast.success('Submitted for Treasurer approval')
        setAmount('')
        setTransactionId('')
        setNotes('')
        setAllocations([])
      } else {
        toast.success('Payment recorded successfully')
        setAmount('')
        setTransactionId('')
        setNotes('')
        setAllocations([])
      }
    })
  }

  return (
    // Same structure as MockKcbForm (which we know works) — no max-width constraint
    <div className="grid grid-cols-1 w-full items-start">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-heading-4 font-bold text-foreground">Manual Payment Entry</CardTitle>
          <CardDescription>
            Record a cash, cheque, or direct bank transfer payment. Entries above KES 20,000 will require Treasurer approval.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="church">Church</Label>
              <Select 
                value={selectedChurchId} 
                onValueChange={handleChurchChange} // FIXED: Using the new handler
              >
                <SelectTrigger id="church" className="h-10 bg-background">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={handleAmountChange} // FIXED: Using the new handler
                  className="h-10"
                  placeholder="e.g. 5000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v || 'Cash')}>
                  <SelectTrigger id="method" className="h-10 bg-background">
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
                <Label htmlFor="date">Payment Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ref">Transaction Reference</Label>
                <Input
                  id="ref"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="h-10"
                  placeholder="e.g. Cash Receipt #123"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-10"
                  placeholder="Any additional details..."
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Allocations</Label>
                {isLoadingPreview && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> computing...
                  </span>
                )}
              </div>

              {allocations.length === 0 && !isLoadingPreview && numericAmount > 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
                  No allocations computed. Add rows manually below.
                </p>
              )}

              {allocations.length > 0 && (
                <div className="border rounded-md divide-y sm:divide-y-0 sm:border-0">
                  <div className="hidden sm:grid sm:grid-cols-[130px_70px_70px_minmax(100px,1fr)_32px] gap-1.5 p-2 bg-muted/50 rounded-t-md text-[11px] font-medium text-muted-foreground mb-1">
                    <span>Type</span>
                    <span>Year</span>
                    <span>Month</span>
                    <span>Amount</span>
                    <span></span>
                  </div>
                  
                  <div className="sm:border sm:rounded-md sm:divide-y bg-muted/10 sm:bg-transparent">
                    {allocations.map((a, idx) => (
                      <AllocationRow
                        key={idx}
                        allocation={a}
                        index={idx}
                        onUpdate={updateRow}
                        onRemove={removeRow}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full sm:w-auto h-8 text-xs">
                  <Plus className="mr-1 h-3 w-3" /> Add Row
                </Button>
                <div className="text-sm text-left sm:text-right space-y-1 p-3 sm:p-0 bg-muted/30 sm:bg-transparent rounded-md sm:rounded-none">
                  <div>
                    Allocated: <strong className="tabular-nums">{formatCurrency(totalAllocated)}</strong>
                  </div>
                  <div className={remaining < -0.01 ? 'text-destructive' : remaining > 0.01 ? 'text-amber-600' : 'text-emerald-600'}>
                    Remaining: <strong className="tabular-nums">{formatCurrency(remaining)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 pt-6 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isOverAllocated || remaining > 0.01}>
              {isSubmitting ? 'Submitting...' : numericAmount >= 20000 ? 'Submit for Approval' : 'Record Payment'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}