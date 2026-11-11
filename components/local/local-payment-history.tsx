'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, Split, Printer } from 'lucide-react'
import { LocalChurchStats } from '@/lib/actions/local-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { AllocationBreakdownDialog } from '@/components/payments/allocation-breakdown-dialog'
import { toast } from 'sonner'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateString))
}

interface LocalPaymentHistoryProps {
  payments: LocalChurchStats['payments']
  activeFilter?: 'All' | 'Annual' | 'Monthly' | 'Mixed'
  onFilterChange?: (filter: 'All' | 'Annual' | 'Monthly' | 'Mixed') => void
}

export function LocalPaymentHistory({ 
  payments,
  activeFilter = 'All',
  onFilterChange
}: LocalPaymentHistoryProps) {
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('All')
  
  const [sortConfig, setSortConfig] = useState<{
    key: keyof LocalChurchStats['payments'][0]
    direction: 'asc' | 'desc'
  } | null>({ key: 'payment_date', direction: 'desc' })
  
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  const [pendingAction, setPendingAction] = useState<{ type: 'print' | 'export', format?: 'csv' | 'excel' | 'pdf' } | null>(null)

  const filteredData = useMemo(() => {
    return payments.filter((payment) => {
      const s = search.toLowerCase()
      const matchesSearch =
        payment.transaction_id.toLowerCase().includes(s) ||
        payment.payment_type.toLowerCase().includes(s) ||
        payment.payment_method.toLowerCase().includes(s)

      let matchesType = true
      if (activeFilter === 'Annual') matchesType = payment.has_annual && !payment.is_mixed
      else if (activeFilter === 'Monthly') matchesType = payment.has_monthly && !payment.is_mixed
      else if (activeFilter === 'Mixed') matchesType = payment.is_mixed

      const readableMethod = 
        payment.payment_method === 'M_Pesa' ? 'M-Pesa' :
        payment.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash'
      
      const matchesMethod = methodFilter === 'All' || readableMethod === methodFilter

      return matchesSearch && matchesType && matchesMethod
    })
  }, [payments, search, activeFilter, methodFilter])

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

  const requestSort = (key: keyof LocalChurchStats['payments'][0]) => {
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
        'Amount (KES)': p.amount_paid,
        'Type': p.is_mixed ? 'Mixed' : (p.has_annual ? 'Annual' : 'Monthly'),
        'Method': p.payment_method === 'M_Pesa' ? 'M-Pesa' : p.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash',
        'Date & Time': formatDate(p.payment_date),
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
    const sub = `Scope: ${methodFilter} | ${activeFilter}${scope === 'selected' ? ' | Selected Only' : ''}`

    if (pendingAction.type === 'print') {
      exportToPdf(`local-payments-print-${dateStr}${suffix}`, `Payment History${titleSuffix}`, sub, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`local-payments-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`local-payments-${dateStr}${suffix}`, exportData, 'Payment History')
      else if (pendingAction.format === 'pdf') exportToPdf(`local-payments-${dateStr}${suffix}`, `Payment History${titleSuffix}`, sub, exportData)
    }

    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} transactions`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else {
      const sub = `Scope: ${methodFilter} | ${activeFilter}`
      exportToPdf(`local-payments-print-${dateStr}`, 'Payment History', sub, generateExportData('all'), 'landscape', true)
    }
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const sub = `Scope: ${methodFilter} | ${activeFilter}`
      if (format === 'csv') exportToCsv(`local-payments-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`local-payments-${dateStr}`, generateExportData('all'), 'Payment History')
      if (format === 'pdf') exportToPdf(`local-payments-${dateStr}`, 'Payment History', sub, generateExportData('all'))
    }
  }

  const handleBulkExportCsv = () => { exportToCsv(`local-payments-selected-${dateStr}`, generateExportData('selected')); toast.success(`Exported ${selectedIds.length} transactions`); setSelectedIds([]); }
  const handleBulkExportExcel = () => { exportToExcel(`local-payments-selected-${dateStr}`, generateExportData('selected'), 'Selected Payments'); toast.success(`Exported ${selectedIds.length} transactions`); setSelectedIds([]); }
  const handleBulkExportPdf = () => { exportToPdf(`local-payments-selected-${dateStr}`, 'Payment History (Selected)', `Selected: ${selectedIds.length}`, generateExportData('selected')); toast.success(`Exported ${selectedIds.length} transactions`); setSelectedIds([]); }

  // FIX: Type guard instead of `as any` — no `any`, no unsafe cast
  const handleStatusFilterChange = (val: string) => {
    if (val === 'All' || val === 'Annual' || val === 'Monthly' || val === 'Mixed') {
      onFilterChange?.(val)
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-md">
        <TableToolbar
          title="Payment History"
          subtitle={`${filteredData.length} records found`}
          search={search}
          setSearch={setSearch}
          statusFilter={activeFilter}
          setStatusFilter={handleStatusFilterChange}
          statusOptions={['All', 'Annual', 'Monthly', 'Mixed']}
          selectionCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          bulkActionSlot={
            <ExportDropdown 
              onExportCsv={handleBulkExportCsv}
              onExportExcel={handleBulkExportExcel}
              onExportPdf={handleBulkExportPdf}
            />
          }
          filterSlot={
            <div className="flex items-center gap-xs w-full lg:w-auto">
              <select
                value={methodFilter}
                onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1); }}
                className="h-9 w-full lg:w-[130px] rounded-md border border-border bg-card px-3 py-1 text-paragraph-small text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="All">All Methods</option>
                <option value="M-Pesa">M-Pesa</option>
                <option value="Bank">Bank</option>
                <option value="Cash">Cash</option>
              </select>
              
              <div className="flex items-center gap-2 ml-2">
                <Button variant="outline" onClick={handleGlobalPrint} className="h-9">
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <ExportDropdown 
                  onExportCsv={() => handleGlobalExport('csv')}
                  onExportExcel={() => handleGlobalExport('excel')}
                  onExportPdf={() => handleGlobalExport('pdf')}
                  disabled={filteredData.length === 0}
                />
              </div>
            </div>
          }
        />

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <Table>
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
                <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('amount_paid')}>
                  <div className="flex items-center justify-end gap-xs">Amount <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center">Type</TableHead>
                <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center">Method</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('payment_date')}>
                  <div className="flex items-center gap-xs">Date & Time <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-paragraph-small text-muted-foreground">
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
                          <TooltipContent side="top" className="w-64 text-center">
                            Auto-allocated across Annual and Monthly dues
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge variant="outline" className={payment.has_annual ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
                          {payment.has_annual ? 'Annual' : 'Monthly'}
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