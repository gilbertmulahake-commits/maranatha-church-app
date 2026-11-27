'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableShell } from '@/components/ui/table-shell'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  cancelChurchDeletionRequest,
  type ChurchDeletionRequestRow,
} from '@/lib/actions/church-deletion-request-actions'
import { formatDateTime } from '@/lib/utils'

const REASON_LABELS: Record<string, string> = {
  DISSOLVED: 'Dissolved',
  MERGED: 'Merged',
  DUPLICATE: 'Duplicate record',
  OTHER: 'Other',
}

function statusBadge(status: string) {
  if (status === 'Approved') {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-700 border-emerald-200"
      >
        Approved
      </Badge>
    )
  }
  if (status === 'Rejected') {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        Rejected
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
      Pending
    </Badge>
  )
}

export function MyDeletionRequestsTable({
  items,
}: {
  items: ChurchDeletionRequestRow[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [withdrawTarget, setWithdrawTarget] =
    useState<ChurchDeletionRequestRow | null>(null)

  const handleWithdraw = () => {
    if (!withdrawTarget) return
    const target = withdrawTarget
    startTransition(async () => {
      const res = await cancelChurchDeletionRequest(target.id)
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success('Deletion request withdrawn.')
        setWithdrawTarget(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-md">
      <TableShell>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="text-paragraph-small">Church</TableHead>
            <TableHead className="text-paragraph-small">Reason</TableHead>
            <TableHead className="text-paragraph-small">Status</TableHead>
            <TableHead className="text-paragraph-small">Requested</TableHead>
            <TableHead className="text-paragraph-small">Reviewed</TableHead>
            <TableHead className="text-paragraph-small">Rejection Reason</TableHead>
            <TableHead className="text-right text-paragraph-small">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-12 text-paragraph-small text-muted-foreground"
              >
                You have not submitted any deletion requests.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="font-medium text-paragraph-small">
                    {item.church_name}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {item.church_code}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-paragraph-small">
                    {REASON_LABELS[item.reason] ?? item.reason}
                  </span>
                </TableCell>
                <TableCell>{statusBadge(item.status)}</TableCell>
                <TableCell className="text-paragraph-small text-muted-foreground tabular-nums">
                  {formatDateTime(item.proposed_at)}
                </TableCell>
                <TableCell className="text-paragraph-small text-muted-foreground tabular-nums">
                  {item.reviewed_at ? formatDateTime(item.reviewed_at) : '—'}
                </TableCell>
                <TableCell>
                  {item.rejection_reason ? (
                    <div
                      className="text-paragraph-small text-muted-foreground line-clamp-2 max-w-[200px]"
                      title={item.rejection_reason}
                    >
                      {item.rejection_reason}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {item.status === 'Pending' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWithdrawTarget(item)}
                      disabled={isPending}
                      className="h-8 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Withdraw
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-paragraph-small">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableShell>

      <AlertDialog
        open={!!withdrawTarget}
        onOpenChange={(open) => !open && setWithdrawTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw deletion request?</AlertDialogTitle>
            <AlertDialogDescription>
              {withdrawTarget
                ? `Your request to delete ${withdrawTarget.church_name} (${withdrawTarget.church_code}) will be withdrawn. The church will remain active.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Keep request</AlertDialogCancel>
            <Button
              onClick={handleWithdraw}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Withdraw
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}