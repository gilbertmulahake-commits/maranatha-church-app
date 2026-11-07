'use client'

import { useState, useMemo } from 'react'
import {
  ArrowUpDown,
  Download
} from 'lucide-react'
import { PaymentRow } from '@/lib/actions/payment-actions'
import { exportToCsv } from '@/lib/utils/export'
import { Button } from '@/components/ui/button'
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
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString))
}

export function PaymentsTable({ data }: { data: PaymentRow[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [methodFilter, setMethodFilter] = useState<string>('All')
  
  const [sortConfig, setSortConfig] = useState<{
    key: keyof PaymentRow
    direction: 'asc' | 'desc'
  } | null>({ key: 'payment_date', direction: 'desc' })
  
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  const filteredData = useMemo(() => {
    return data.filter((payment) => {
      const s = search.toLowerCase()
      const matchesSearch =
        payment.transaction_id.toLowerCase().includes(s) ||
        payment.church_code.toLowerCase().includes(s) ||
        payment.church_name.toLowerCase().includes(s)

      const matchesType = typeFilter === 'All' || payment.payment_type === typeFilter
      
      const readableMethod = 
        payment.payment_method === 'M_Pesa' ? 'M-Pesa' :
        payment.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash'
      
      const matchesMethod = methodFilter === 'All' || readableMethod === methodFilter

      return matchesSearch && matchesType && matchesMethod
    })
  }, [data, search, typeFilter, methodFilter])

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData]
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortableItems
  }, [filteredData, sortConfig])

  const requestSort = (key: keyof PaymentRow) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const totalPages = Math.ceil(sortedData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage)

  const handleExport = () => {
    const exportData = sortedData.map((p) => ({
      'Transaction ID': p.transaction_id,
      'Church Code': p.church_code,
      'Church Name': p.church_name,
      'Amount (KES)': p.amount_paid,
      'Type': p.payment_type,
      'Method': p.payment_method === 'M_Pesa' ? 'M-Pesa' : p.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash',
      'Date': formatDate(p.payment_date),
      'Status': p.status
    }))
    const date = new Date().toISOString().split('T')[0]
    exportToCsv(`payments-ledger-${date}`, exportData)
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Transaction Ledger"
        subtitle={`${filteredData.length} records found`}
        search={search}
        setSearch={setSearch}
        statusFilter={typeFilter}
        setStatusFilter={setTypeFilter}
        statusOptions={['All', 'Annual', 'Monthly']}
        filterSlot={
          <div className="flex items-center gap-xs w-full lg:w-auto">
            <span className="text-paragraph-small text-muted-foreground whitespace-nowrap">
              Method:
            </span>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9 w-full lg:w-[130px] rounded-md border border-border bg-card px-3 py-1 text-paragraph-small text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All</option>
              <option value="M-Pesa">M-Pesa</option>
              <option value="Bank">Bank</option>
              <option value="Cash">Cash</option>
            </select>
            
            <Button 
              variant="outline" 
              onClick={handleExport} 
              disabled={filteredData.length === 0}
              className="h-9 ml-2"
            >
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small"
                onClick={() => requestSort('transaction_id')}
              >
                <div className="flex items-center gap-xs">
                  Transaction ID <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small"
                onClick={() => requestSort('church_name')}
              >
                <div className="flex items-center gap-xs">
                  Church <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small text-right"
                onClick={() => requestSort('amount_paid')}
              >
                <div className="flex items-center justify-end gap-xs">
                  Amount <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-paragraph-small text-center">Type</TableHead>
              <TableHead className="text-paragraph-small text-center">Method</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small"
                onClick={() => requestSort('payment_date')}
              >
                <div className="flex items-center gap-xs">
                  Date & Time <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-paragraph-small text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-paragraph-small text-muted-foreground"
                >
                  No transactions found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-paragraph-small text-muted-foreground">
                    {payment.transaction_id}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground text-paragraph-small">
                      {payment.church_name}
                    </div>
                    <div className="font-mono text-paragraph-mini text-muted-foreground">
                      {payment.church_code}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-emerald-600 text-paragraph-small">
                    {formatCurrency(payment.amount_paid)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        payment.payment_type === 'Annual'
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      }
                    >
                      {payment.payment_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-paragraph-small text-muted-foreground">
                    {payment.payment_method === 'M_Pesa' ? 'M-Pesa' : 
                     payment.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash'}
                  </TableCell>
                  <TableCell className="text-paragraph-small text-muted-foreground">
                    {formatDate(payment.payment_date)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        payment.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                      }
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedData.length}
        showingItems={paginatedData.length}
        setCurrentPage={setCurrentPage}
        itemName="transactions"
      />
    </div>
  )
}