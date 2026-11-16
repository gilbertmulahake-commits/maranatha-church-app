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
    // DESKTOP GRID: Smart column sizing [Type] [Year] [Month] [Amount (expands)] [Delete (tight)]
    <div className="flex flex-col gap-2.5 p-2.5 sm:grid sm:grid-cols-[130px_70px_70px_minmax(100px,1fr)_32px] sm:items-center sm:gap-1.5 sm:p-2">
      {/* Type Selector */}
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

      {/* Year & Month Container */}
      <div className={`grid gap-2 sm:contents ${allocation.allocation_type === 'Monthly' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Year Field */}
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
        
        {/* Month Field — Label and Input disappear together on mobile */}
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

      {/* Amount & Delete */}
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

  const selectedChurch = churches.find((c) => c.id === selectedChurchId)

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
      {/* EXPANDED WIDTH: sm:max-w-[600px] gives the 5-column table room to breathe */}
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[600px] p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-heading-3 font-bold">
            Resolve Unmatched Payment
          </DialogTitle>
          <DialogDescription>
            Ref: {item.bank_reference} &middot; Raw: {item.raw_bill_ref} &middot; Amount:{' '}
            {formatCurrency(item.amount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Church Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="church-select" className="text-paragraph-small font-medium">
              Assign to Church
            </Label>
            <Select value={selectedChurchId} onValueChange={handleChurchChange}>
              <SelectTrigger id="church-select" className="h-9 w-full bg-background text-xs">
                <SelectValue placeholder="Select a church...">
                  {selectedChurch
                    ? `${selectedChurch.church_code} — ${selectedChurch.church_name}`
                    : undefined}
                </SelectValue>
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
              <p className="text-[11px] text-muted-foreground pt-0.5">
                Suggested by Solutions Bank: {item.suggested_church_code} (
                {item.confidence_score.toFixed(0)}% confidence)
              </p>
            )}
          </div>

          {/* Four-Eyes Warning */}
          {requiresApproval && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
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
              <p className="text-xs text-muted-foreground py-2 text-center">
                No allocations computed. Add rows manually below.
              </p>
            )}

            {allocations.length > 0 && (
              <div className="border rounded-md divide-y sm:divide-y-0 sm:border-0">
                {/* UPDATED HEADER: Matches the new 130/70/70/1fr/32 grid */}
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={addRow} className="w-full sm:w-auto h-8 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Add Row
              </Button>
              <div className="text-[11px] sm:text-xs text-left sm:text-right space-y-0.5 p-2 sm:p-0 bg-muted/30 sm:bg-transparent rounded-md sm:rounded-none">
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

        <DialogFooter className="pt-2 flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting} className="w-full sm:w-auto h-9">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isOverAllocated || remaining > 0.01} className="w-full sm:w-auto h-9">
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