'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  approveChurchDeletionRequest,
  getChurchDeletionImpact,
} from '@/lib/actions/church-deletion-request-actions'

type Target = {
  id: string
  church_id: string
  church_code: string
  church_name: string
}

type BlockItem = { type: string; count: number }

type ImpactSuccess = {
  userCount: number
  userEmails: string[]
  blockedBy: BlockItem[]
}

// State carries the churchId it belongs to. If the target changes (new church),
// impact.churchId no longer matches targetChurchId and currentImpact derives to
// null — the "reset" happens by derivation, not by a sync setState in the effect.
type ImpactState = { churchId: string; data: ImpactSuccess }

const BLOCK_LABELS: Record<string, string> = {
  pending_payment: 'pending payment',
  pending_writeoff: 'pending write-off',
  pending_unmatched: 'pending unmatched payment',
}

export function ApproveChurchDeletionDialog({
  target,
  onClose,
}: {
  target: Target | null
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [impact, setImpact] = useState<ImpactState | null>(null)

  const targetId = target?.id
  const targetChurchId = target?.church_id

  useEffect(() => {
    if (!targetId || !targetChurchId) return

    let cancelled = false
    getChurchDeletionImpact(targetChurchId).then((result) => {
      if (cancelled) return
      if ('error' in result) {
        toast.error(result.error)
        onClose()
        return
      }
      setImpact({
        churchId: targetChurchId,
        data: {
          userCount: result.userCount,
          userEmails: result.userEmails ?? [],
          blockedBy: result.blockedBy ?? [],
        },
      })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, targetChurchId])

  // Derived — no loading state variable, no sync setState in the effect
  const currentImpact: ImpactSuccess | null =
    targetChurchId && impact?.churchId === targetChurchId ? impact.data : null
  const loadingImpact = target !== null && currentImpact === null
  const blocked = (currentImpact?.blockedBy.length ?? 0) > 0

  const handleApprove = () => {
    if (!target) return
    const currentTarget = target
    startTransition(async () => {
      const res = await approveChurchDeletionRequest(currentTarget.id)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success(`${currentTarget.church_name} has been deleted.`)
        onClose()
        router.refresh()
      }
    })
  }

  return (
    <AlertDialog
      open={!!target}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-heading-3 font-bold">
            Delete {target?.church_name} ({target?.church_code})?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-paragraph-small text-muted-foreground">
            Approving this request will soft-delete the church and deactivate its users.
            This cannot be undone through the UI.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {loadingImpact ? (
          <p className="text-paragraph-small text-muted-foreground py-4">Loading impact…</p>
        ) : currentImpact ? (
          <div className="space-y-3 text-paragraph-small text-muted-foreground">
            <p>This will:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Soft-delete the church (removes it from all active views, dashboards,
                and reports)
              </li>
              <li>
                Deactivate {currentImpact.userCount} attached{' '}
                {currentImpact.userCount === 1 ? 'user' : 'users'}
                {currentImpact.userEmails.length > 0 && (
                  <>
                    :{' '}
                    <span className="text-foreground break-words">
                      {currentImpact.userEmails.join(', ')}
                    </span>
                  </>
                )}
              </li>
              <li>Preserve all financial records (payments, write-offs, audit trail)</li>
            </ul>
            <p className="font-medium text-foreground">
              This cannot be undone through the UI.
            </p>

            {blocked && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 space-y-1">
                <p className="font-medium text-destructive">
                  Cannot approve — church has unresolved financial exceptions:
                </p>
                <ul className="list-disc pl-5 text-destructive">
                  {currentImpact.blockedBy.map((b) => (
                    <li key={b.type}>
                      {b.count} {BLOCK_LABELS[b.type] ?? b.type}
                      {b.count === 1 ? '' : 's'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            onClick={handleApprove}
            disabled={isPending || loadingImpact || blocked}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve &amp; Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}