'use client'

import { useState } from 'react'
import { WriteOffRow } from '@/lib/actions/writeoff-actions'
import { TableShell } from '@/components/ui/table-shell'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProposeWriteOffDialog } from './propose-writeoff-dialog'
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

type ChurchOption = { id: string; church_code: string; church_name: string }

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES', maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(iso))
}

function getStatusBadge(status: string) {
  if (status === 'Approved') return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>
  if (status === 'Rejected') return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>
  return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
}

export function WriteOffTable({
  items,
  churches,
}: {
  items: WriteOffRow[]
  churches: ChurchOption[]
}) {
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const filtered = items.filter((i) => {
    const s = search.toLowerCase()
    return (
      i.church_code.toLowerCase().includes(s) ||
      i.church_name.toLowerCase().includes(s) ||
      i.reason.toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Write-Off Register"
        subtitle={`${filtered.length} total records`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by church or reason..."
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            Propose Write-Off
          </Button>
        }
      />

      <TableShell>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="text-paragraph-small">Church</TableHead>
            <TableHead className="text-paragraph-small text-right">Amount</TableHead>
            <TableHead className="text-paragraph-small">Reason</TableHead>
            <TableHead className="text-paragraph-small">Status</TableHead>
            <TableHead className="text-paragraph-small">Proposed By</TableHead>
            <TableHead className="text-paragraph-small">Approved By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                No write-offs recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="font-medium text-paragraph-small">{item.church_name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{item.church_code}</div>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-paragraph-small">
                  {formatCurrency(item.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {item.reason.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell>
                  <div className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                    {item.proposed_by}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatDate(item.proposed_at)}
                  </div>
                </TableCell>
                <TableCell>
                  {item.approved_by ? (
                    <>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                        {item.approved_by}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.approved_at ? formatDate(item.approved_at) : '—'}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableShell>

      <ProposeWriteOffDialog 
        churches={churches}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  )
}