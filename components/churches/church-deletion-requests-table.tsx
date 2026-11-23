'use client'

import { useState } from 'react'
import { Check, Inbox, X } from 'lucide-react'
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
import { SlaBadge } from '@/components/reconciliation/sla-badge'
import { ApproveChurchDeletionDialog } from './approve-church-deletion-dialog'
import { RejectChurchDeletionDialog } from './reject-church-deletion-dialog'
import type { ChurchDeletionRequestRow } from '@/lib/actions/church-deletion-request-actions'

const REASON_LABELS: Record<string, string> = {
  DISSOLVED: 'Dissolved',
  MERGED: 'Merged',
  DUPLICATE: 'Duplicate record',
  OTHER: 'Other',
}

function reasonBadge(reason: string) {
  if (reason === 'OTHER') {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5"
      >
        Needs review
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5"
    >
      Standard
    </Badge>
  )
}

function statusBadge(status: string) {
  if (status === 'Approved') {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
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

type DialogTarget = {
  id: string
  church_id: string
  church_code: string
  church_name: string
}

export function ChurchDeletionRequestsTable({
  items,
}: {
  items: ChurchDeletionRequestRow[]
}) {
  const [approveTarget, setApproveTarget] = useState<DialogTarget | null>(null)
  const [rejectTarget, setRejectTarget] = useState<DialogTarget | null>(null)

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm p-12 flex flex-col items-center justify-center gap-sm text-center">
        <Inbox className="h-10 w-10 text-muted-foreground" />
        <p className="text-paragraph-small text-muted-foreground">
          No pending deletion requests.
        </p>
      </div>
    )
  }

  return (
    <>
      <TableShell>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="text-paragraph-small">Church</TableHead>
            <TableHead className="text-paragraph-small">Region</TableHead>
            <TableHead className="text-paragraph-small">Reason</TableHead>
            <TableHead className="text-paragraph-small">Proposed By</TableHead>
            <TableHead className="text-paragraph-small">Age</TableHead>
            <TableHead className="text-paragraph-small">Status</TableHead>
            <TableHead className="text-right text-paragraph-small">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isPending = item.status === 'Pending'
            const target: DialogTarget = {
              id: item.id,
              church_id: item.church_id,
              church_code: item.church_code,
              church_name: item.church_name,
            }
            return (
              <TableRow key={item.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="font-medium text-paragraph-small">{item.church_name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {item.church_code}
                  </div>
                </TableCell>
                <TableCell className="text-paragraph-small text-muted-foreground">
                  {item.region_name}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-paragraph-small">
                      {REASON_LABELS[item.reason] ?? item.reason}
                    </span>
                    {reasonBadge(item.reason)}
                  </div>
                </TableCell>
                <TableCell className="text-paragraph-small text-muted-foreground">
                  {item.proposed_by_email || '—'}
                </TableCell>
                <TableCell>
                  <SlaBadge status={item.sla_status} ageDays={item.days_old} />
                </TableCell>
                <TableCell>{statusBadge(item.status)}</TableCell>
                <TableCell className="text-right">
                  {isPending ? (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRejectTarget(target)}
                        className="h-8 text-muted-foreground hover:bg-muted"
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Reject
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setApproveTarget(target)}
                        className="h-8 text-destructive hover:bg-destructive/10"
                      >
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Approve
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-paragraph-small">—</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </TableShell>

      <ApproveChurchDeletionDialog
        target={approveTarget}
        onClose={() => setApproveTarget(null)}
      />
      <RejectChurchDeletionDialog
        target={rejectTarget}
        onClose={() => setRejectTarget(null)}
      />
    </>
  )
}