'use client'

import { useState, useTransition } from 'react'
import { PendingApprovalRow } from '@/lib/actions/manual-entry-actions'
import { approvePendingPayment, rejectPendingPayment } from '@/lib/actions/manual-entry-actions'
import { approveWriteOff, rejectWriteOff } from '@/lib/actions/writeoff-actions'
import { TableShell } from '@/components/ui/table-shell'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Check, X, Clock } from 'lucide-react'
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES', maximumFractionDigits: 0,
  }).format(amount)
}

export function PendingApprovalsTable({ items }: { items: PendingApprovalRow[] }) {
  const [isPending, startTransition] = useTransition()
  const [rejectItem, setRejectItem] = useState<PendingApprovalRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  
  // Add search state
  const [search, setSearch] = useState('')

  const filteredItems = items.filter((item) => {
    const s = search.toLowerCase()
    return (
      item.church_code.toLowerCase().includes(s) ||
      item.church_name.toLowerCase().includes(s) ||
      item.type.toLowerCase().includes(s) ||
      item.proposed_by.toLowerCase().includes(s)
    )
  })

  const handleApprove = (item: PendingApprovalRow) => {
    startTransition(async () => {
      const res = item.type === 'payment'
        ? await approvePendingPayment(item.id)
        : await approveWriteOff(item.id)
      
      if (res.error) toast.error(res.error)
      else toast.success('Approved successfully')
    })
  }

  const handleReject = () => {
    if (!rejectItem || rejectReason.length < 5) {
      toast.error('Please provide a reason')
      return
    }
    startTransition(async () => {
      const res = rejectItem.type === 'payment'
        ? await rejectPendingPayment(rejectItem.id, rejectReason)
        : await rejectWriteOff(rejectItem.id, rejectReason)
      
      if (res.error) toast.error(res.error)
      else {
        toast.success('Rejected successfully')
        setRejectItem(null)
        setRejectReason('')
      }
    })
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Pending Approvals"
        subtitle={`${filteredItems.length} items awaiting your sign-off`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by church or type..."
      />

      <TableShell>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="text-paragraph-small">Type</TableHead>
            <TableHead className="text-paragraph-small">Church</TableHead>
            <TableHead className="text-paragraph-small text-right">Amount</TableHead>
            <TableHead className="text-paragraph-small">Proposed By</TableHead>
            <TableHead className="text-paragraph-small">Age</TableHead>
            <TableHead className="text-paragraph-small text-center w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                No pending approvals found matching your search.
              </TableCell>
            </TableRow>
          ) : (
            filteredItems.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50">
                <TableCell>
                  <Badge variant="outline" className={item.type === 'payment' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}>
                    {item.type === 'payment' ? 'Payment' : 'Write-Off'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-paragraph-small">{item.church_name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{item.church_code}</div>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-paragraph-small">
                  {formatCurrency(item.amount)}
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                  {item.proposed_by}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-paragraph-small text-muted-foreground">
                    <Clock className="h-3 w-3" /> {item.days_old}d
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost" size="sm" className="h-8 w-8 p-0"
                      onClick={() => handleApprove(item)}
                      disabled={isPending}
                      title="Approve"
                    >
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="h-8 w-8 p-0"
                      onClick={() => setRejectItem(item)}
                      disabled={isPending}
                      title="Reject"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableShell>

      <Dialog open={!!rejectItem} onOpenChange={(o) => !o && setRejectItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-heading-3 font-bold">Reject Item</DialogTitle>
            <DialogDescription>
              Rejecting {rejectItem?.type} for {rejectItem?.church_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Textarea
              value={rejectReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectItem(null)}>Cancel</Button>
            <Button onClick={handleReject} disabled={isPending} className="bg-destructive text-destructive-foreground">
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}