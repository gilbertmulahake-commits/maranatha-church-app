'use client'

import { useState } from 'react'
import { UnmatchedQueueRow } from '@/lib/actions/reconciliation-actions'
import { TableShell } from '@/components/ui/table-shell'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SlaBadge } from './sla-badge'
import { ResolveUnmatchedDialog } from './resolve-dialog'
import { RejectUnmatchedDialog } from './reject-dialog'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Eye, X } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils' // 🚨 FIX: Global formatters

type ChurchOption = { id: string; church_code: string; church_name: string }

export function UnmatchedTable({
  items,
  churches,
}: {
  items: UnmatchedQueueRow[]
  churches: ChurchOption[]
}) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [resolveItem, setResolveItem] = useState<UnmatchedQueueRow | null>(null)
  const [rejectItem, setRejectItem] = useState<UnmatchedQueueRow | null>(null)
  const rowsPerPage = 15

  const filtered = items.filter((i) => {
    const s = search.toLowerCase()
    return (
      i.bank_reference.toLowerCase().includes(s) ||
      i.raw_bill_ref.toLowerCase().includes(s) ||
      (i.suggested_church_code ?? '').toLowerCase().includes(s) ||
      (i.suggested_church_name ?? '').toLowerCase().includes(s)
    )
  })

  const totalPages = Math.ceil(filtered.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginated = filtered.slice(startIndex, startIndex + rowsPerPage)

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Unmatched Payments"
        subtitle={`${filtered.length} pending items`}
        search={search}
        onSearchChange={(val) => {
          setSearch(val)
          setCurrentPage(1)
        }}
        searchPlaceholder="Search by reference or suggested church..."
      />

      <TableShell>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="text-paragraph-small">Bank Ref</TableHead>
            <TableHead className="text-paragraph-small">Raw Bill Ref</TableHead>
            <TableHead className="text-paragraph-small text-right">Amount</TableHead>
            <TableHead className="text-paragraph-small">Payer</TableHead>
            <TableHead className="text-paragraph-small">Suggested Match</TableHead>
            <TableHead className="text-paragraph-small">Age</TableHead>
            <TableHead className="text-paragraph-small">Received</TableHead>
            <TableHead className="text-paragraph-small text-center w-[140px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-paragraph-small text-muted-foreground">
                No unmatched payments found.
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50">
                <TableCell className="font-mono text-paragraph-small">
                  {item.bank_reference}
                </TableCell>
                <TableCell className="font-mono text-paragraph-small text-muted-foreground">
                  {item.raw_bill_ref}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-paragraph-small">
                  {formatCurrency(item.amount)}
                </TableCell>
                <TableCell className="font-mono text-paragraph-small text-muted-foreground">
                  {item.payer_phone || '—'}
                </TableCell>
                <TableCell>
                  {item.suggested_church_code ? (
                    <div className="flex flex-col">
                      <span className="text-paragraph-small font-medium">
                        {item.suggested_church_code}
                      </span>
                      <Badge
                        variant="outline"
                        className="w-fit text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {item.confidence_score?.toFixed(0)}% match
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-paragraph-small text-muted-foreground">
                      No suggestion
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <SlaBadge status={item.sla_status} ageDays={item.age_days} />
                </TableCell>
                <TableCell className="text-paragraph-small text-muted-foreground tabular-nums">
                  {formatDateTime(item.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setResolveItem(item)}
                      title="Resolve"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setRejectItem(item)}
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

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        showingItems={paginated.length}
        setCurrentPage={setCurrentPage}
        itemName="items"
      />

      {resolveItem && (
        <ResolveUnmatchedDialog
          item={resolveItem}
          churches={churches}
          open={!!resolveItem}
          onOpenChange={(o) => !o && setResolveItem(null)}
        />
      )}
      {rejectItem && (
        <RejectUnmatchedDialog
          unmatchedId={rejectItem.id}
          bankReference={rejectItem.bank_reference}
          open={!!rejectItem}
          onOpenChange={(o) => !o && setRejectItem(null)}
        />
      )}
    </div>
  )
}