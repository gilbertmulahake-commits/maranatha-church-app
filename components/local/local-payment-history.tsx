'use client'

import { useState, useMemo } from 'react'
import { Receipt } from 'lucide-react'
import { LocalChurchStats } from '@/lib/actions/local-actions'
import { Badge } from '@/components/ui/badge'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateString))
}

export function LocalPaymentHistory({ payments }: { payments: LocalChurchStats['payments'] }) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  // Standard Search Logic
  const filteredData = useMemo(() => {
    return payments.filter((p) => {
      const s = search.toLowerCase()
      return (
        p.transaction_id.toLowerCase().includes(s) ||
        p.payment_type.toLowerCase().includes(s) ||
        p.payment_method.toLowerCase().includes(s)
      )
    })
  }, [payments, search])

  // Standard Pagination Logic
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage)

  return (
    <div className="space-y-md">
      {/* STANDARD TOOLBAR */}
      <TableToolbar
        title="Payment History"
        subtitle="A complete record of all contributions received."
        search={search}
        setSearch={setSearch}
        statusFilter="All"
        setStatusFilter={() => {}}
        filterSlot={
          <div className="flex items-center gap-2 text-muted-foreground">
            <Receipt className="h-4 w-4" />
            <span className="text-paragraph-small font-medium">Ledger</span>
          </div>
        }
      />

      {/* STANDARD TABLE SHELL */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-paragraph-small">Date</TableHead>
              <TableHead className="text-paragraph-small">Transaction ID</TableHead>
              <TableHead className="text-paragraph-small text-center">Type</TableHead>
              <TableHead className="text-paragraph-small text-center">Method</TableHead>
              <TableHead className="text-right text-paragraph-small">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-paragraph-small text-muted-foreground">
                  No payments found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/50">
                  <TableCell className="text-paragraph-small text-muted-foreground">
                    {formatDate(p.payment_date)}
                  </TableCell>
                  <TableCell className="font-mono text-paragraph-small text-muted-foreground">
                    {p.transaction_id}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={p.payment_type === 'Annual' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
                      {p.payment_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-paragraph-small text-muted-foreground">
                    {p.payment_method === 'M_Pesa' ? 'M-Pesa' : p.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash'}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-emerald-600 text-paragraph-small">
                    {formatCurrency(p.amount_paid)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* STANDARD PAGINATION FOOTER */}
      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredData.length}
        showingItems={paginatedData.length}
        setCurrentPage={setCurrentPage}
        itemName="transactions"
      />
    </div>
  )
}