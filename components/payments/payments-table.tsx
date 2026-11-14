'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, Split } from 'lucide-react'
import { PaymentRow } from '@/lib/actions/payment-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
// Single-source-of-truth table frame + responsive print button.
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
// Unit 15i: Replaced native <select> with shadcn <Select> (Base UI variant).
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { AllocationBreakdownDialog } from './allocation-breakdown-dialog'
import { toast } from 'sonner'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateString))
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

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  const [pendingAction, setPendingAction] = useState<{ type: 'print' | 'export', format?: 'csv' | 'excel' | 'pdf' } | null>(null)

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
    const sortableItems = [...filteredData]
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

  const toggleAll = () => {
    if (selectedIds.length === paginatedData.length) setSelectedIds([])
    else setSelectedIds(paginatedData.map(p => p.id))
  }

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rowsToExport = scope === 'selected' 
      ? sortedData.filter(p => selectedIds.includes(p.id))
      : sortedData

    return rowsToExport.map((p) => {
      const allocationSummary = p.allocations.length > 0 
        ? p.allocations.map(a => `${a.allocation_type} ${a.billing_month ? a.billing_month + '/' : ''}${a.billing_year}`).join(', ')
        : 'None'

      return {
        'Transaction ID': p.transaction_id,
        'Church Code': p.church_code,
        'Church Name': p.church_name,
        'Amount (KES)': p.amount_paid,
        'Type': p.is_mixed ? 'Mixed' : p.payment_type,
        'Method': p.payment_method === 'M_Pesa' ? 'M-Pesa' : p.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash',
        'Date & Time': formatDate(p.payment_date),
        'Status': p.status,
        'Allocations Breakdown': allocationSummary
      }
    })
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return

    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const titleSuffix = scope === 'selected' ? ' (Selected)' : ''
    const sub = `Scope: ${methodFilter} | ${typeFilter}${scope === 'selected' ? ' | Selected Only' : ''}`

    if (pendingAction.type === 'print') {
      exportToPdf(`payments-print-${dateStr}${suffix}`, `Transaction Ledger${titleSuffix}`, sub, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`payments-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`payments-${dateStr}${suffix}`, exportData, 'Payments Ledger')
      else if (pendingAction.format === 'pdf') exportToPdf(`payments-${dateStr}${suffix}`, `Transaction Ledger${titleSuffix}`, sub, exportData)
    }

    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} transactions`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else {
      const sub = `Scope: ${methodFilter} | ${typeFilter}`
      exportToPdf(`payments-print-${dateStr}`, 'Transaction Ledger', sub, generateExportData('all'), 'landscape', true)
    }
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const sub = `Scope: ${methodFilter} | ${typeFilter}`
      if (format === 'csv') exportToCsv(`payments-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`payments-${dateStr}`, generateExportData('all'), 'Payments Ledger')
      if (format === 'pdf') exportToPdf(`payments-${dateStr}`, 'Transaction Ledger', sub, generateExportData('all'))
    }
  }

  const handleBulkExportCsv = () => { exportToCsv(`payments-selected-${dateStr}`, generateExportData('selected')); toast.success(`Exported ${selectedIds.length} transactions`); setSelectedIds([]); }
  const handleBulkExportExcel = () => { exportToExcel(`payments-selected-${dateStr}`, generateExportData('selected'), 'Selected Payments'); toast.success(`Exported ${selectedIds.length} transactions`); setSelectedIds([]); }
  const handleBulkExportPdf = () => { exportToPdf(`payments-selected-${dateStr}`, 'Transaction Ledger (Selected)', `Selected: ${selectedIds.length}`, generateExportData('selected')); toast.success(`Exported ${selectedIds.length} transactions`); setSelectedIds([]); }

  return (
    <TooltipProvider>
      <div className="space-y-md">
        <TableToolbar
          title="Transaction Ledger"
          subtitle={`${filteredData.length} records found`}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search transactions..."
          
          filter={
            <Select 
              value={methodFilter} 
              onValueChange={(val) => { setMethodFilter(val as string); setCurrentPage(1); }}
            >
              <SelectTrigger className="h-9 w-full bg-card text-xs">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Methods</SelectItem>
                <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                <SelectItem value="Bank">Bank</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          }

          sort={
            <Select 
              value={typeFilter} 
              onValueChange={(val) => { setTypeFilter(val as string); setCurrentPage(1); }}
            >
              <SelectTrigger className="h-9 w-full bg-card text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {['All', 'Annual', 'Monthly', 'Mixed'].map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }

          actions={
            <div className="flex items-center gap-2 w-full @[600px]:w-auto justify-end">
              <PrintButton onClick={handleGlobalPrint} disabled={filteredData.length === 0} />
              <div className="shrink-0">
                <ExportDropdown 
                  onExportCsv={() => handleGlobalExport('csv')}
                  onExportExcel={() => handleGlobalExport('excel')}
                  onExportPdf={() => handleGlobalExport('pdf')}
                  disabled={filteredData.length === 0}
                />
              </div>
            </div>
          }

          selectionCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          bulkActionSlot={
            <ExportDropdown 
              onExportCsv={handleBulkExportCsv}
              onExportExcel={handleBulkExportExcel}
              onExportPdf={handleBulkExportPdf}
            />
          }
        />

        <TableShell>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[40px] text-center">
                <Checkbox 
                  checked={selectedIds.length > 0 && selectedIds.length === paginatedData.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('transaction_id')}>
                <div className="flex items-center gap-xs">Transaction ID <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('church_name')}>
                <div className="flex items-center gap-xs">Church <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('amount_paid')}>
                <div className="flex items-center justify-end gap-xs">Amount <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center">Type</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center">Method</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('payment_date')}>
                <div className="flex items-center gap-xs">Date & Time <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center">Status</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-paragraph-small text-muted-foreground">
                  No transactions found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-muted/50">
                  <TableCell className="text-center">
                    <Checkbox 
                      checked={selectedIds.includes(payment.id)}
                      onCheckedChange={() => toggleOne(payment.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-paragraph-small text-muted-foreground">
                    {payment.transaction_id}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground text-paragraph-small">{payment.church_name}</div>
                    <div className="font-mono text-paragraph-mini text-muted-foreground">{payment.church_code}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-emerald-600 text-paragraph-small">
                    {formatCurrency(payment.amount_paid)}
                  </TableCell>
                  <TableCell className="text-center">
                    {payment.is_mixed ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 cursor-help">
                              <Split className="mr-1 h-3 w-3" /> Mixed
                            </Badge>
                          }
                        />
                        <TooltipContent side="top" className="text-center">
                          Auto-allocated across Annual and Monthly dues
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant="outline" className={payment.payment_type === 'Annual' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
                        {payment.payment_type}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-paragraph-small text-muted-foreground">
                    {payment.payment_method === 'M_Pesa' ? 'M-Pesa' : payment.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash'}
                  </TableCell>
                  <TableCell className="text-paragraph-small text-muted-foreground">
                    {formatDate(payment.payment_date)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={payment.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}>
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <AllocationBreakdownDialog 
                      transactionId={payment.transaction_id}
                      totalAmount={payment.amount_paid}
                      allocations={payment.allocations || []}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableShell>

        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedData.length}
          showingItems={paginatedData.length}
          setCurrentPage={setCurrentPage}
          itemName="transactions"
        />

        <ExportConfirmDialog 
          open={!!pendingAction}
          onOpenChange={(open) => !open && setPendingAction(null)}
          actionType={pendingAction?.type || 'export'}
          selectedCount={selectedIds.length}
          totalCount={filteredData.length}
          onConfirm={executeAction}
        />
      </div>
    </TooltipProvider>
  )
}