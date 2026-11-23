'use client'

import { useState, useTransition, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { rejectChurchDeletionRequest } from '@/lib/actions/church-deletion-request-actions'

type Target = {
  id: string
  church_id: string
  church_code: string
  church_name: string
}

export function RejectChurchDeletionDialog({
  target,
  onClose,
}: {
  target: Target | null
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleClose = () => {
    if (isPending) return
    setReason('')
    setError('')
    onClose()
  }

  const handleReasonChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setReason(e.target.value)
    if (error) setError('')
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!target) return
    const trimmed = reason.trim()
    if (trimmed.length < 5) {
      setError('Please provide at least 5 characters.')
      return
    }
    setError('')
    const currentTarget = target
    startTransition(async () => {
      const res = await rejectChurchDeletionRequest(currentTarget.id, trimmed)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success('Deletion request rejected.')
        setReason('')
        onClose()
        router.refresh()
      }
    })
  }

  return (
    <Dialog
      open={!!target}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] p-6 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-heading-3 font-bold">
              Reject deletion request for {target?.church_name}?
            </DialogTitle>
            <DialogDescription className="text-paragraph-small text-muted-foreground">
              The proposer will see your reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label
              htmlFor="rejection_reason"
              className="text-paragraph-small font-medium text-foreground"
            >
              Reason for rejection
            </Label>
            <Textarea
              id="rejection_reason"
              name="rejection_reason"
              value={reason}
              onChange={handleReasonChange}
              placeholder="Explain why this request is being rejected (visible to the proposer)"
              className="min-h-[100px]"
              disabled={isPending}
            />
            {error && <p className="text-paragraph-small text-destructive">{error}</p>}
          </div>

          <DialogFooter className="pt-4 gap-2 flex-col-reverse sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || reason.trim().length < 5}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}