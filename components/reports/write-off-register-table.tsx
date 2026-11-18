'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { WriteOffRow } from '@/lib/actions/report-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter
} from '@/components/ui/table'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'

export function WriteOffRegisterTable({ data }: { data: WriteOffRow[] }) {
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: keyof WriteOffRow
    direction: 'asc' | 'desc'
  } | null>({ key: 'approved_at', direction: 'desc' })

  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<{ type: 'print' | 'export', format?: 'csv' | 'excel' | 'pdf' } | null>(null)

  const filteredData = useMemo(() => {
    if (!data) return []
    return data.filter((row) => {
      const s = search.toLowerCase()
      return (
        row.church_code.toLowerCase().includes(s) ||
        row.church_name.toLowerCase().includes(s) ||
        row.reason.toLowerCase().includes(s)
      )
    })
  }, [data, search])

  const sortedData = useMemo(() => {
    const sortableItems = [...filteredData]
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] || ''
        const bValue = b[sortConfig.key] || ''
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortableItems
  }, [filteredData, sortConfig])

  const requestSort = (key: keyof WriteOffRow) => {
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

  const totalWrittenOff = useMemo(() => {
    return filteredData.reduce((sum, row) => sum + row.amount, 0)
  }, [filteredData])

  const selectedTotal = useMemo(() => {
    return filteredData.filter(r => selectedIds.includes(r.id)).reduce((sum, row) => sum + row.amount, 0)
  }, [filteredData, selectedIds])

  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rowsToExport = scope === 'selected'
      ? filteredData.filter(r => selectedIds.includes(r.id))
      : filteredData

    return rowsToExport.map((row) => ({
      'Church Code': row.church_code,
      'Church Name': row.church_name,
      'Amount (KES)': row.amount,
      'Reason': row.reason,
      'Proposed Date': formatDate(row.proposed_at),
      'Approved Date': row.approved_at ? formatDate(row.approved_at) : 'N/A',
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return
    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const titleSuffix = scope === 'selected' ? ' (Selected)' : ''
    const currentTotal = scope === 'selected' ? selectedTotal : totalWrittenOff
    const pdfSubtitle = `Total Written Off: ${formatCurrency(currentTotal)}`

    if (pendingAction.type === 'print') {
      exportToPdf(`writeoffs-print-${dateStr}${suffix}`, `Write-Off Register${titleSuffix}`, pdfSubtitle, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`writeoffs-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`writeoffs-${dateStr}${suffix}`, exportData, 'Write-Off Register')
      else if (pendingAction.format === 'pdf') exportToPdf(`writeoffs-${dateStr}${suffix}`, `Write-Off Register${titleSuffix}`, pdfSubtitle, exportData)
    }
    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} records`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else exportToPdf(`writeoffs-print-${dateStr}`, 'Write-Off Register', `Total: ${formatCurrency(totalWrittenOff)}`, generateExportData('all'), 'landscape', true)
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const sub = `Total: ${formatCurrency(totalWrittenOff)}`
      if (format === 'csv') exportToCsv(`writeoffs-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`writeoffs-${dateStr}`, generateExportData('all'), 'Write-Off Register')
      if (format === 'pdf') exportToPdf(`writeoffs-${dateStr}`, 'Write-Off Register', sub, generateExportData('all'))
    }
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Write-Off Register"
        subtitle={`${filteredData.length} approved write-offs`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search churches or reasons..."
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
            onExportCsv={() => { exportToCsv(`writeoffs-selected-${dateStr}`, generateExportData('selected')); setSelectedIds([]); }}
            onExportExcel={() => { exportToExcel(`writeoffs-selected-${dateStr}`, generateExportData('selected'), 'Selected Write-Offs'); setSelectedIds([]); }}
            onExportPdf={() => { exportToPdf(`writeoffs-selected-${dateStr}`, 'Write-Off Register (Selected)', `Total: ${formatCurrency(selectedTotal)}`, generateExportData('selected')); setSelectedIds([]); }}
          />
        }
      />

      <TableShell>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[40px] text-center">
              <Checkbox checked={selectedIds.length > 0 && selectedIds.length === paginatedData.length} onCheckedChange={toggleAll} />
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('church_name')}>
              <div className="flex items-center gap-xs">Church <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('amount')}>
              <div className="flex items-center justify-end gap-xs">Amount <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground">Reason</TableHead>
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('approved_at')}>
              <div className="flex items-center gap-xs">Approved Date <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-paragraph-small text-muted-foreground">No write-offs found.</TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/50">
                <TableCell className="text-center"><Checkbox checked={selectedIds.includes(row.id)} onCheckedChange={() => toggleOne(row.id)} /></TableCell>
                <TableCell>
                  <div className="font-medium text-foreground text-paragraph-small">{row.church_name}</div>
                  <div className="font-mono text-paragraph-mini text-muted-foreground">{row.church_code}</div>
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-amber-600">
                  {formatCurrency(row.amount)}
                </TableCell>
                <TableCell className="text-paragraph-small text-muted-foreground">{row.reason}</TableCell>
                <TableCell className="text-paragraph-small text-muted-foreground">{row.approved_at ? formatDate(row.approved_at) : 'N/A'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter className="bg-muted/80 border-t border-border">
          <TableRow>
            <TableCell colSpan={2} className="font-bold text-foreground text-paragraph-small text-right">Grand Total:</TableCell>
            <TableCell className="text-right font-bold tabular-nums text-amber-600 text-paragraph-small">{formatCurrency(totalWrittenOff)}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableFooter>
      </TableShell>

      <DataTablePagination currentPage={currentPage} totalPages={totalPages} totalItems={sortedData.length} showingItems={paginatedData.length} setCurrentPage={setCurrentPage} itemName="records" />
      <ExportConfirmDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)} actionType={pendingAction?.type || 'export'} selectedCount={selectedIds.length} totalCount={filteredData.length} onConfirm={executeAction} />
    </div>
  )
}