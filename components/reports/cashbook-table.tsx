'use client'

import { useState, useMemo } from 'react'
import { Eye, Printer, CheckSquare } from 'lucide-react'
import { CashbookRow } from '@/lib/actions/report-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-KE', { timeStyle: 'medium' }).format(new Date(dateString))
}

interface CashbookTableProps {
  data: CashbookRow[]
  selectedDate: Date
}

export function CashbookTable({ data = [], selectedDate }: CashbookTableProps) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewTransaction, setViewTransaction] = useState<CashbookRow | null>(null)

  // NEW: State to hold the pending action if a selection exists
  const [pendingAction, setPendingAction] = useState<{ type: 'print' | 'export', format?: 'csv' | 'excel' | 'pdf' } | null>(null)

  const filteredData = useMemo(() => {
    if (!data) return []
    return data.filter((row) => {
      const s = search.toLowerCase()
      return (
        row.transaction_id.toLowerCase().includes(s) ||
        row.church_code.toLowerCase().includes(s) ||
        row.church_name.toLowerCase().includes(s) ||
        row.payment_method.toLowerCase().includes(s)
      )
    })
  }, [data, search])

  const totalPages = Math.ceil(filteredData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage)

  const toggleAll = () => {
    if (selectedIds.length === paginatedData.length) setSelectedIds([])
    else setSelectedIds(paginatedData.map(r => r.id))
  }

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const totalCollected = useMemo(() => {
    return filteredData.reduce((sum, row) => sum + row.amount_paid, 0)
  }, [filteredData])

  const selectedTotal = useMemo(() => {
    return filteredData.filter(r => selectedIds.includes(r.id)).reduce((sum, row) => sum + row.amount_paid, 0)
  }, [filteredData, selectedIds])

  const generateExportData = (scope: 'all' | 'selected') => {
    const rowsToExport = scope === 'selected'
      ? filteredData.filter(r => selectedIds.includes(r.id))
      : filteredData

    return rowsToExport.map((row) => ({
      'Time': formatDate(row.payment_date),
      'Transaction ID': row.transaction_id,
      'Church Code': row.church_code,
      'Church Name': row.church_name,
      'Amount (KES)': row.amount_paid,
      'Type': row.payment_type,
      'Method': row.payment_method === 'M_Pesa' ? 'M-Pesa' : row.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash',
    }))
  }

  const dateStr = selectedDate.toISOString().split('T')[0]

  // --- EXECUTION (Called by the confirmation dialog) ---
  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return

    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const titleSuffix = scope === 'selected' ? ' (Selected)' : ''
    const currentTotal = scope === 'selected' ? selectedTotal : totalCollected
    const pdfSubtitle = `Date: ${selectedDate.toLocaleDateString('en-KE', { dateStyle: 'long' })} | Total: ${formatCurrency(currentTotal)}`

    if (pendingAction.type === 'print') {
      exportToPdf(`cashbook-print-${dateStr}${suffix}`, `Daily Cashbook${titleSuffix}`, pdfSubtitle, exportData, 'portrait', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`cashbook-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`cashbook-${dateStr}${suffix}`, exportData, 'Daily Cashbook')
      else if (pendingAction.format === 'pdf') exportToPdf(`cashbook-${dateStr}${suffix}`, `Daily Cashbook${titleSuffix}`, pdfSubtitle, exportData, 'portrait')
    }

    if (scope === 'selected') {
      toast.success(`Exported ${selectedIds.length} selected transactions`)
    }
    
    setPendingAction(null)
  }

  // --- INTERCEPTORS (Top Toolbar) ---
  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) {
      setPendingAction({ type: 'print' })
    } else {
      const pdfSubtitle = `Date: ${selectedDate.toLocaleDateString('en-KE', { dateStyle: 'long' })} | Total: ${formatCurrency(totalCollected)}`
      exportToPdf(`cashbook-print-${dateStr}`, 'Daily Cashbook', pdfSubtitle, generateExportData('all'), 'portrait', true)
    }
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) {
      setPendingAction({ type: 'export', format })
    } else {
      const pdfSubtitle = `Date: ${selectedDate.toLocaleDateString('en-KE', { dateStyle: 'long' })} | Total: ${formatCurrency(totalCollected)}`
      if (format === 'csv') exportToCsv(`cashbook-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`cashbook-${dateStr}`, generateExportData('all'), 'Daily Cashbook')
      if (format === 'pdf') exportToPdf(`cashbook-${dateStr}`, 'Daily Cashbook', pdfSubtitle, generateExportData('all'), 'portrait')
    }
  }

  // --- DIRECT BULK ACTIONS (Selection Bar) ---
  const handleBulkExportCsv = () => {
    exportToCsv(`cashbook-selected-${dateStr}`, generateExportData('selected'))
    toast.success(`Exported ${selectedIds.length} selected transactions`)
    setSelectedIds([])
  }
  const handleBulkExportExcel = () => {
    exportToExcel(`cashbook-selected-${dateStr}`, generateExportData('selected'), 'Selected Transactions')
    toast.success(`Exported ${selectedIds.length} selected transactions`)
    setSelectedIds([])
  }
  const handleBulkExportPdf = () => {
    const sub = `Selected: ${selectedIds.length} | Total: ${formatCurrency(selectedTotal)}`
    exportToPdf(`cashbook-selected-${dateStr}`, 'Daily Cashbook (Selected)', sub, generateExportData('selected'), 'portrait')
    toast.success(`Exported ${selectedIds.length} selected transactions`)
    setSelectedIds([])
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Daily Cashbook"
        subtitle={`${filteredData.length} transactions recorded`}
        search={search}
        setSearch={setSearch}
        selectionCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        bulkActionSlot={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-paragraph-small text-muted-foreground bg-background px-3 py-1.5 rounded-md border border-border">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span>Exporting:</span>
              <span className="font-bold text-foreground">{formatCurrency(selectedTotal)}</span>
            </div>
            <ExportDropdown 
              onExportCsv={handleBulkExportCsv}
              onExportExcel={handleBulkExportExcel}
              onExportPdf={handleBulkExportPdf}
            />
          </div>
        }
        filterSlot={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleGlobalPrint} className="h-9" disabled={filteredData.length === 0}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <ExportDropdown 
              onExportCsv={() => handleGlobalExport('csv')}
              onExportExcel={() => handleGlobalExport('excel')}
              onExportPdf={() => handleGlobalExport('pdf')}
              disabled={filteredData.length === 0}
            />
          </div>
        }
      />

      {/* Table */}
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
              <TableHead className="text-paragraph-small font-medium text-muted-foreground">Time</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground">Transaction ID</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground">Church</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center">Type</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center">Method</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Amount</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-paragraph-small text-muted-foreground">
                  No transactions recorded for this date.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  <TableCell className="text-center">
                    <Checkbox 
                      checked={selectedIds.includes(row.id)}
                      onCheckedChange={() => toggleOne(row.id)}
                    />
                  </TableCell>
                  <TableCell className="text-paragraph-small text-muted-foreground">
                    {formatDate(row.payment_date)}
                  </TableCell>
                  <TableCell className="font-mono text-paragraph-small text-foreground">
                    {row.transaction_id}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground text-paragraph-small">{row.church_name}</div>
                    <div className="font-mono text-paragraph-mini text-muted-foreground">{row.church_code}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={row.payment_type === 'Annual' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>
                      {row.payment_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-paragraph-small text-muted-foreground">
                    {row.payment_method === 'M_Pesa' ? 'M-Pesa' : row.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash'}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-emerald-600 text-paragraph-small">
                    {formatCurrency(row.amount_paid)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => setViewTransaction(row)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter className="bg-muted/80 border-t border-border">
            <TableRow>
              <TableCell colSpan={6} className="font-bold text-foreground text-paragraph-small text-right">
                Daily Total:
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-emerald-600 text-paragraph-small">
                {formatCurrency(totalCollected)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredData.length}
        showingItems={paginatedData.length}
        setCurrentPage={setCurrentPage}
        itemName="transactions"
      />

      {/* View Transaction Modal */}
      <Dialog open={!!viewTransaction} onOpenChange={(open) => !open && setViewTransaction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Ref: <span className="font-mono text-foreground">{viewTransaction?.transaction_id}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground font-medium">Church</p>
                <p className="text-foreground">{viewTransaction?.church_name} ({viewTransaction?.church_code})</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Amount</p>
                <p className="text-emerald-600 font-bold tabular-nums">{formatCurrency(viewTransaction?.amount_paid || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Payment Type</p>
                <Badge variant="outline" className="mt-1">{viewTransaction?.payment_type}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Method</p>
                <p className="text-foreground">{viewTransaction?.payment_method === 'M_Pesa' ? 'M-Pesa' : 'Bank'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground font-medium">Date & Time</p>
                <p className="text-foreground">{viewTransaction ? new Date(viewTransaction.payment_date).toLocaleString('en-KE', { dateStyle: 'long', timeStyle: 'medium' }) : ''}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NEW: Confirmation Dialog */}
      <ExportConfirmDialog 
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        actionType={pendingAction?.type || 'export'}
        selectedCount={selectedIds.length}
        totalCount={filteredData.length}
        onConfirm={executeAction}
      />
    </div>
  )
}