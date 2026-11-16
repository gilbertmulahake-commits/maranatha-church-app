'use client'

import { useState, useEffect, useTransition, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Loader2, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  resolveUnmatched,
  getSuggestedAllocations,
  type AllocationInput,
  type UnmatchedQueueRow,
} from '@/lib/actions/reconciliation-actions'

type ChurchOption = { id: string; church_code: string; church_name: string }

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ResolveUnmatchedDialog({
  item,
  churches,
  open,
  onOpenChange,
}: {
  item: UnmatchedQueueRow
  churches: ChurchOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [selectedChurchId, setSelectedChurchId] = useState<string>(
    item.suggested_church_id ?? ''
  )
  const [allocations, setAllocations] = useState<AllocationInput[]>([])
  const [isLoadingPreview, startPreviewTransition] = useTransition()
  const [isSubmitting, startSubmitTransition] = useTransition()

  // Fetch preview — only when there's a valid church and dialog is open.
  // Never calls setState synchronously outside the async callback.
  useEffect(() => {
    if (!open || !selectedChurchId) return
    startPreviewTransition(async () => {
      const res = await getSuggestedAllocations(item.id, selectedChurchId)
      if (res.error) {
        toast.error(res.error)
        setAllocations([])
      } else {
        setAllocations(res.allocations ?? [])
      }
    })
  }, [selectedChurchId, open, item.id])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAllocations([])
      setSelectedChurchId(item.suggested_church_id ?? '')
    }
    onOpenChange(newOpen)
  }

  const handleChurchChange = (val: string | null) => {
    if (!val) return
    if (val !== selectedChurchId) {
      setAllocations([])
      setSelectedChurchId(val)
    }
  }

  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0)
  const remaining = item.amount - totalAllocated
  const isOverAllocated = totalAllocated > item.amount + 0.01
  const requiresApproval = item.amount >= 20000

  const updateRow = (idx: number, patch: Partial<AllocationInput>) => {
    setAllocations((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, ...patch } : a))
    )
  }

  const removeRow = (idx: number) => {
    setAllocations((prev) => prev.filter((_, i) => i !== idx))
  }

  const addRow = () => {
    const currentYear = new Date().getFullYear()
    setAllocations((prev) => [
      ...prev,
      {
        allocation_type: 'Annual',
        billing_year: currentYear,
        billing_month: null,
        amount: 0,
      },
    ])
  }

  const handleSubmit = () => {
    if (!selectedChurchId) {
      toast.error('Please select a church')
      return
    }
    if (allocations.length === 0) {
      toast.error('At least one allocation is required')
      return
    }
    if (isOverAllocated) {
      toast.error('Allocations exceed the payment amount')
      return
    }
    if (remaining > 0.01) {
      toast.error('Allocated amount must equal the payment amount')
      return
    }

    startSubmitTransition(async () => {
      const res = await resolveUnmatched({
        unmatchedId: item.id,
        churchId: selectedChurchId,
        allocations,
      })
      if (res.error) toast.error(res.error)
      else if ('requiresApproval' in res && res.requiresApproval) {
        toast.success('Submitted for Treasurer approval')
        handleOpenChange(false)
      } else {
        toast.success('Payment resolved successfully')
        handleOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-heading-3 font-bold">
            Resolve Unmatched Payment
          </DialogTitle>
          <DialogDescription>
            Ref: {item.bank_reference} &middot; Raw: {item.raw_bill_ref} &middot; Amount:{' '}
            {formatCurrency(item.amount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Church Selector */}
          <div className="space-y-2">
            <Label htmlFor="church-select" className="text-paragraph-small font-medium">
              Assign to Church
            </Label>
            <Select value={selectedChurchId} onValueChange={handleChurchChange}>
              <SelectTrigger id="church-select" className="h-10 w-full">
                <SelectValue placeholder="Select a church..." />
              </SelectTrigger>
              <SelectContent align="start" sideOffset={0}>
                {churches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.church_code} — {c.church_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {item.suggested_church_code && item.confidence_score !== null && (
              <p className="text-[11px] text-muted-foreground">
                Suggested by Solutions Bank: {item.suggested_church_code} (
                {item.confidence_score.toFixed(0)}% confidence)
              </p>
            )}
          </div>

          {/* Four-Eyes Warning */}
          {requiresApproval && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
              This payment is {formatCurrency(item.amount)} — above the KES 20,000
              threshold. It will be submitted for National Treasurer approval rather
              than applied directly.
            </div>
          )}

          {/* Allocation Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-paragraph-small font-medium">
                Allocations
              </Label>
              {isLoadingPreview && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> computing...
                </span>
              )}
            </div>

            {allocations.length === 0 && !isLoadingPreview && selectedChurchId && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No allocations computed. Add rows manually below.
              </p>
            )}

            {allocations.length > 0 && (
              <div className="border rounded-md divide-y">
                {allocations.map((a, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_80px_80px_100px_40px] gap-2 items-center p-2"
                  >
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
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        updateRow(idx, { billing_year: Number(e.target.value) })
                      }
                      className="h-8 text-xs tabular-nums"
                      placeholder="Year"
                    />

                    {a.allocation_type === 'Monthly' ? (
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={a.billing_month ?? 1}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          updateRow(idx, { billing_month: Number(e.target.value) })
                        }
                        className="h-8 text-xs tabular-nums"
                        placeholder="Mth"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground text-center">
                        —
                      </span>
                    )}

                    <Input
                      type="number"
                      value={a.amount}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        updateRow(idx, { amount: Number(e.target.value) })
                      }
                      className="h-8 text-xs tabular-nums"
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeRow(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={addRow}>
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
        </div>

        <DialogFooter className="pt-4 gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isOverAllocated || remaining > 0.01}>
            {isSubmitting
              ? 'Saving...'
              : requiresApproval
                ? 'Submit for Approval'
                : 'Resolve Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}