'use client'

import {
  useEffect,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  proposeChurchDeletion,
  getPendingRequestForChurch,
} from '@/lib/actions/church-deletion-request-actions'

type DeletionReason = 'DISSOLVED' | 'MERGED' | 'DUPLICATE' | 'OTHER'

/**
 * Single source of truth for the display labels of the four deletion reasons.
 * Used both in the `<SelectItem>` children AND in the `<SelectValue>` fallback
 * (explicit — Base UI renders raw values otherwise; see
 * `code-standards.md` § "Region & Status Filter Display Sweep").
 */
const REASON_LABELS: Record<DeletionReason, string> = {
  DISSOLVED: 'Dissolved',
  MERGED: 'Merged',
  DUPLICATE: 'Duplicate record',
  OTHER: 'Other (requires detailed justification)',
}

type ChurchTarget = {
  id: string
  church_code: string
  church_name: string
}

type BlockedPending = {
  id: string
  proposedAt: string
  daysOld: number
}

// `checkState` carries the churchId it belongs to so a target change derives
// back to "not-checked" without a sync setState in the effect body (per
// `code-standards.md` § "react-hooks/set-state-in-effect").
type CheckState = {
  churchId: string
  pending: BlockedPending | null
}

export function RequestChurchDeletionDialog({
  open,
  onOpenChange,
  church,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  church: ChurchTarget | null
}) {
  const router = useRouter()
  const [reason, setReason] = useState<DeletionReason | ''>('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checkState, setCheckState] = useState<CheckState | null>(null)
  const [isPending, startTransition] = useTransition()

  const churchId = church?.id

  // Reset on close — event handler, not setState-in-effect (per
  // `code-standards.md` § "react-hooks/set-state-in-effect").
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason('')
      setNotes('')
      setError(null)
      setCheckState(null)
    }
    onOpenChange(next)
  }

  // Defensive duplicate pre-check on open — the parent B5b wiring will
  // already disable the menu item, but the spec mandates a backstop and
  // a direct URL/manual trigger could bypass the UI gate. Async fetch →
  // setState in callback, so no `set-state-in-effect` violation.
  useEffect(() => {
    if (!open || !churchId) return
    let cancelled = false
    getPendingRequestForChurch(churchId)
      .then((pending) => {
        if (!cancelled) setCheckState({ churchId, pending })
      })
      .catch(() => {
        if (!cancelled) setCheckState({ churchId, pending: null })
      })
    return () => {
      cancelled = true
    }
  }, [open, churchId])

  // Derived state — no loading variable, no sync setState in the effect.
  // Explicit `checkState !== null &&` is required so TS narrows in the true
  // branch — `checkState?.churchId === churchId` alone doesn't narrow because
  // churchId is `string | undefined` and the undefined === undefined case
  // isn't ruled out.
  const blockedPending: BlockedPending | null =
    checkState !== null && checkState.churchId === churchId
      ? checkState.pending
      : null
  const isCheckingDuplicate =
    open && !!churchId && checkState?.churchId !== churchId

  const isOther = reason === 'OTHER'
  const trimmedNotesLength = notes.trim().length
  const notesTooShort = isOther && trimmedNotesLength < 100
  const submitDisabled =
    isPending ||
    isCheckingDuplicate ||
    !reason ||
    notesTooShort ||
    blockedPending !== null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!church) return
    if (!reason) {
      setError('Please select a reason.')
      return
    }
    if (isOther && trimmedNotesLength < 100) {
      setError(
        'Non-standard deletions require at least 100 characters of justification.'
      )
      return
    }
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append('reason', reason)
      formData.append('notes', notes)
      const res = await proposeChurchDeletion(church.id, formData)
      if ('error' in res) {
        setError(res.error)
        toast.error(res.error)
      } else {
        toast.success(
          'Deletion request submitted. Pending National approval.'
        )
        handleOpenChange(false)
        router.refresh()
      }
    })
  }

  if (!church) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-heading-2 font-bold tracking-tight">
            Request church deletion
          </DialogTitle>
          <DialogDescription>
            {church.church_name} &middot; {church.church_code}
          </DialogDescription>
        </DialogHeader>

        {blockedPending ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-paragraph-small font-medium text-amber-900">
                A pending deletion request for this church was submitted{' '}
                {blockedPending.daysOld} day
                {blockedPending.daysOld === 1 ? '' : 's'} ago.
              </p>
              <p className="mt-1 text-paragraph-small text-amber-700">
                You can withdraw it from &ldquo;My Deletion Requests&rdquo; on
                the regional dashboard, or wait for National review.
              </p>
            </div>
            <DialogFooter className="pt-4 flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="deletion-reason">Reason for deletion</Label>
              <Select
                value={reason || undefined}
                onValueChange={(val) => {
                  if (val) {
                    setReason(val as DeletionReason)
                    setError(null)
                  }
                }}
                disabled={isPending || isCheckingDuplicate}
              >
                <SelectTrigger id="deletion-reason" className="h-10 bg-background">
                  <SelectValue placeholder="Select a reason...">
                    {reason ? REASON_LABELS[reason] : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISSOLVED">{REASON_LABELS.DISSOLVED}</SelectItem>
                  <SelectItem value="MERGED">{REASON_LABELS.MERGED}</SelectItem>
                  <SelectItem value="DUPLICATE">{REASON_LABELS.DUPLICATE}</SelectItem>
                  <SelectItem value="OTHER">{REASON_LABELS.OTHER}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deletion-notes">Additional context for the approver</Label>
              <Textarea
                id="deletion-notes"
                value={notes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  setNotes(e.target.value)
                  if (error) setError(null)
                }}
                placeholder={
                  isOther
                    ? 'Explain the non-standard circumstances in detail...'
                    : 'Optional context for the National reviewer...'
                }
                className="resize-none min-h-[120px]"
                maxLength={500}
                disabled={isPending || isCheckingDuplicate}
              />
              <p className="text-paragraph-small text-muted-foreground">
                {isOther
                  ? 'Required (min 100 characters). This request will be flagged for closer review.'
                  : 'Optional. Max 500 characters.'}
              </p>
              {isOther && (
                <p
                  className={`text-paragraph-small tabular-nums ${
                    notesTooShort ? 'text-destructive' : 'text-emerald-600'
                  }`}
                >
                  {trimmedNotesLength} / 100 characters minimum
                </p>
              )}
              {error && (
                <p className="text-paragraph-small text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter className="pt-4 flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitDisabled}
                className="w-full sm:w-auto"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Submitting...' : 'Submit request'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}