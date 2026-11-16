'use client'

import { useState, useTransition, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { rejectUnmatched } from '@/lib/actions/reconciliation-actions'

export function RejectUnmatchedDialog({
  unmatchedId,
  bankReference,
  open,
  onOpenChange,
}: {
  unmatchedId: string
  bankReference: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleReject = () => {
    if (reason.trim().length < 5) {
      toast.error('Please provide a reason')
      return
    }
    startTransition(async () => {
      const res = await rejectUnmatched(unmatchedId, reason)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Unmatched payment rejected')
        onOpenChange(false)
        setReason('')
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-heading-3 font-bold">
            Reject transaction {bankReference}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the payment as rejected. It will remain in the audit trail but will not be reconciled into the ledger.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="reject-reason" className="text-paragraph-small font-medium">
            Reason (required)
          </Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
            placeholder="e.g., Fraudulent test transaction, wrong bank account..."
            className="min-h-[100px]"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            onClick={handleReject}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Rejecting...' : 'Reject'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}