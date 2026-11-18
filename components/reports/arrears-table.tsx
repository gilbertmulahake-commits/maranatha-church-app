'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, Eye, Send } from 'lucide-react'
import Link from 'next/link'
import { ArrearsRow } from '@/lib/actions/report-actions'
import { sendBulkReminders } from '@/lib/actions/sms-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter
} from '@/components/ui/table'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils' // 🚨 FIX: Global formatter

export function ArrearsTable({ data }: { data: ArrearsRow[] }) {
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ArrearsRow
    direction: 'asc' | 'desc'
  } | null>({ key: 'netTotal', direction: 'desc' })

  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkLoading, setIsBulkLoading] = useState(false)
  
  const [pendingAction, setPendingAction] = useState<{ type: 'print' | 'export', format?: 'csv' | 'excel' | 'pdf' } | null>(null)

  const filteredData = useMemo(() => {
    if (!data) return []
    return data.filter((row) => {
      const s = search.toLowerCase()
      return (
        row.church_code.toLowerCase().includes(s) ||
        row.church_name.toLowerCase().includes(s) ||
        row.region_name.toLowerCase().includes(s)
      )
    })
  }, [data, search])

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

  const requestSort = (key: keyof ArrearsRow) => {
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
    else setSelectedIds(paginatedData.map(r => r.id))
  }

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const totals = useMemo(() => {
    return sortedData.reduce(
      (acc, row) => ({
        grossAnnual: acc.grossAnnual + row.grossAnnual,
        grossMonthly: acc.grossMonthly + row.grossMonthly,
        grossTotal: acc.grossTotal + row.grossTotal,
        writtenOff: acc.writtenOff + row.writtenOff,
        netTotal: acc.netTotal + row.netTotal,
      }),
      { grossAnnual: 0, grossMonthly: 0, grossTotal: 0, writtenOff: 0, netTotal: 0 }
    )
  }, [sortedData])

  const selectedTotals = useMemo(() => {
    return sortedData.filter(r => selectedIds.includes(r.id)).reduce(
      (acc, row) => ({ netTotal: acc.netTotal + row.netTotal }),
      { netTotal: 0 }
    )
  }, [sortedData, selectedIds])

  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rowsToExport = scope === 'selected'
      ? sortedData.filter(r => selectedIds.includes(r.id))
      : sortedData

    return rowsToExport.map((row) => ({
      'Church Code': row.church_code,
      'Church Name': row.church_name,
      'Region': row.region_name,
      'Status': row.is_defunct ? 'Defunct' : 'Active',
      'Gross Annual (KES)': row.grossAnnual,
      'Gross Monthly (KES)': row.grossMonthly,
      'Total Gross (KES)': row.grossTotal,
      'Written Off (KES)': row.writtenOff,
      'Net Recoverable (KES)': row.netTotal,
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return

    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const currentTotal = scope === 'selected' ? selectedTotals.netTotal : totals.netTotal
    const pdfSubtitle = `Total Net Recoverable: ${formatCurrency(currentTotal)}`
    const titleSuffix = scope === 'selected' ? ' (Selected)' : ''

    if (pendingAction.type === 'print') {
      exportToPdf(`arrears-print-${dateStr}${suffix}`, `Arrears Report${titleSuffix}`, pdfSubtitle, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`arrears-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`arrears-${dateStr}${suffix}`, exportData, 'Arrears Report')
      else if (pendingAction.format === 'pdf') exportToPdf(`arrears-${dateStr}${suffix}`, `Arrears Report${titleSuffix}`, pdfSubtitle, exportData)
    }

    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} records`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else exportToPdf(`arrears-print-${dateStr}`, 'Arrears Report', `Total Net: ${formatCurrency(totals.netTotal)}`, generateExportData('all'), 'landscape', true)
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const sub = `Total Net: ${formatCurrency(totals.netTotal)}`
      if (format === 'csv') exportToCsv(`arrears-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`arrears-${dateStr}`, generateExportData('all'), 'Arrears Report')
      if (format === 'pdf') exportToPdf(`arrears-${dateStr}`, 'Arrears Report', sub, generateExportData('all'))
    }
  }

  const handleBulkReminder = async () => {
    setIsBulkLoading(true)
    try {
      const selectedChurches = data.filter(c => selectedIds.includes(c.id))
      const recipients = selectedChurches.map(c => ({
        phone: c.contact_phone,
        name: c.church_name + ' Treasurer',
        type: 'Pastor' as const,
        annualOutstanding: c.grossAnnual,
        monthlyOutstanding: c.grossMonthly
      }))

      const res = await sendBulkReminders(recipients, 'NATIONAL')
      if (res?.error) throw new Error(res.error)
      
      toast.success(`Reminders sent to ${recipients.length} churches`)
      setSelectedIds([])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reminders'
      toast.error(message)
    } finally {
      setIsBulkLoading(false)
    }
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Outstanding Balances"
        subtitle={`${filteredData.length} churches with unpaid balances or write-offs`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search churches..."
        
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleBulkReminder} disabled={isBulkLoading} className="h-8">
              <Send className="mr-2 h-3.5 w-3.5" />
              {isBulkLoading ? 'Sending...' : 'Send Reminders'}
            </Button>
            <ExportDropdown 
              onExportCsv={() => { exportToCsv(`arrears-selected-${dateStr}`, generateExportData('selected')); setSelectedIds([]); }}
              onExportExcel={() => { exportToExcel(`arrears-selected-${dateStr}`, generateExportData('selected'), 'Selected Arrears'); setSelectedIds([]); }}
              onExportPdf={() => { exportToPdf(`arrears-selected-${dateStr}`, 'Arrears (Selected)', `Total Net: ${formatCurrency(selectedTotals.netTotal)}`, generateExportData('selected')); setSelectedIds([]); }}
            />
          </div>
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
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('church_name')}>
              <div className="flex items-center gap-xs">Church <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('region_name')}>
              <div className="flex items-center gap-xs">Region <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('grossAnnual')}>
              <div className="flex items-center justify-end gap-xs">Gross Annual <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('grossMonthly')}>
              <div className="flex items-center justify-end gap-xs">Gross Monthly <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('writtenOff')}>
              <div className="flex items-center justify-end gap-xs">Less WO <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('netTotal')}>
              <div className="flex items-center justify-end gap-xs">Net Recoverable <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-paragraph-small text-muted-foreground">
                No arrears found matching your criteria.
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
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-paragraph-small">{row.church_name}</span>
                    {row.is_defunct && <Badge variant="outline" className="bg-gray-100 text-gray-700 text-[10px] h-4">Defunct</Badge>}
                  </div>
                  <div className="font-mono text-paragraph-mini text-muted-foreground">{row.church_code}</div>
                </TableCell>
                <TableCell className="text-paragraph-small text-muted-foreground">
                  {row.region_name}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-destructive">
                  {row.grossAnnual > 0 ? formatCurrency(row.grossAnnual) : '-'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-destructive">
                  {row.grossMonthly > 0 ? formatCurrency(row.grossMonthly) : '-'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-amber-600">
                  {row.writtenOff > 0 ? `(${formatCurrency(row.writtenOff)})` : '-'}
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                  {formatCurrency(row.netTotal)}
                </TableCell>
                <TableCell className="text-center">
                  <Link href={`/dashboard/churches/${row.church_code}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter className="bg-muted/80 border-t border-border">
          <TableRow>
            <TableCell colSpan={3} className="font-bold text-foreground text-paragraph-small text-right">
              Grand Total:
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-destructive text-paragraph-small">
              {totals.grossAnnual > 0 ? formatCurrency(totals.grossAnnual) : '-'}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-destructive text-paragraph-small">
              {totals.grossMonthly > 0 ? formatCurrency(totals.grossMonthly) : '-'}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-amber-600 text-paragraph-small">
              {totals.writtenOff > 0 ? `(${formatCurrency(totals.writtenOff)})` : '-'}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-foreground text-paragraph-small">
              {formatCurrency(totals.netTotal)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </TableShell>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedData.length}
        showingItems={paginatedData.length}
        setCurrentPage={setCurrentPage}
        itemName="churches"
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
  )
}