'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { DefunctRow } from '@/lib/actions/report-actions'
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

export function DefunctRegisterTable({ data }: { data: DefunctRow[] }) {
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: keyof DefunctRow
    direction: 'asc' | 'desc'
  } | null>({ key: 'total_written_off', direction: 'desc' })

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
        row.region_name.toLowerCase().includes(s)
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

  const requestSort = (key: keyof DefunctRow) => {
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
    return filteredData.reduce((sum, row) => sum + row.total_written_off, 0)
  }, [filteredData])

  const selectedTotal = useMemo(() => {
    return filteredData.filter(r => selectedIds.includes(r.id)).reduce((sum, row) => sum + row.total_written_off, 0)
  }, [filteredData, selectedIds])

  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rowsToExport = scope === 'selected'
      ? filteredData.filter(r => selectedIds.includes(r.id))
      : filteredData

    return rowsToExport.map((row) => ({
      'Church Code': row.church_code,
      'Church Name': row.church_name,
      'Region': row.region_name,
      'Total Written Off (KES)': row.total_written_off,
      'Date Marked Defunct': row.date_marked_defunct ? formatDate(row.date_marked_defunct) : 'N/A',
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
      exportToPdf(`defunct-print-${dateStr}${suffix}`, `Defunct Churches${titleSuffix}`, pdfSubtitle, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`defunct-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`defunct-${dateStr}${suffix}`, exportData, 'Defunct Register')
      else if (pendingAction.format === 'pdf') exportToPdf(`defunct-${dateStr}${suffix}`, `Defunct Churches${titleSuffix}`, pdfSubtitle, exportData)
    }
    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} records`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else exportToPdf(`defunct-print-${dateStr}`, 'Defunct Churches', `Total: ${formatCurrency(totalWrittenOff)}`, generateExportData('all'), 'landscape', true)
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const sub = `Total: ${formatCurrency(totalWrittenOff)}`
      if (format === 'csv') exportToCsv(`defunct-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`defunct-${dateStr}`, generateExportData('all'), 'Defunct Register')
      if (format === 'pdf') exportToPdf(`defunct-${dateStr}`, 'Defunct Churches', sub, generateExportData('all'))
    }
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Defunct Churches"
        subtitle={`${filteredData.length} churches marked defunct`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search churches or regions..."
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
            onExportCsv={() => { exportToCsv(`defunct-selected-${dateStr}`, generateExportData('selected')); setSelectedIds([]); }}
            onExportExcel={() => { exportToExcel(`defunct-selected-${dateStr}`, generateExportData('selected'), 'Selected Defunct'); setSelectedIds([]); }}
            onExportPdf={() => { exportToPdf(`defunct-selected-${dateStr}`, 'Defunct Churches (Selected)', `Total: ${formatCurrency(selectedTotal)}`, generateExportData('selected')); setSelectedIds([]); }}
          />
        }
      />

      <TableShell>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[40px] text-center"><Checkbox checked={selectedIds.length > 0 && selectedIds.length === paginatedData.length} onCheckedChange={toggleAll} /></TableHead>
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('church_name')}>
              <div className="flex items-center gap-xs">Church <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground">Region</TableHead>
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('total_written_off')}>
              <div className="flex items-center justify-end gap-xs">Total Written Off <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Date Defunct</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-paragraph-small text-muted-foreground">No defunct churches found.</TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/50">
                <TableCell className="text-center"><Checkbox checked={selectedIds.includes(row.id)} onCheckedChange={() => toggleOne(row.id)} /></TableCell>
                <TableCell>
                  <div className="font-medium text-foreground text-paragraph-small">{row.church_name}</div>
                  <div className="font-mono text-paragraph-mini text-muted-foreground">{row.church_code}</div>
                </TableCell>
                <TableCell className="text-paragraph-small text-muted-foreground">{row.region_name}</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-amber-600">
                  {formatCurrency(row.total_written_off)}
                </TableCell>
                <TableCell className="text-right text-paragraph-small text-muted-foreground">
                  {row.date_marked_defunct ? formatDate(row.date_marked_defunct) : 'N/A'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter className="bg-muted/80 border-t border-border">
          <TableRow>
            <TableCell colSpan={3} className="font-bold text-foreground text-paragraph-small text-right">Grand Total:</TableCell>
            <TableCell className="text-right font-bold tabular-nums text-amber-600 text-paragraph-small">{formatCurrency(totalWrittenOff)}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </TableShell>

      <DataTablePagination currentPage={currentPage} totalPages={totalPages} totalItems={sortedData.length} showingItems={paginatedData.length} setCurrentPage={setCurrentPage} itemName="churches" />
      <ExportConfirmDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)} actionType={pendingAction?.type || 'export'} selectedCount={selectedIds.length} totalCount={filteredData.length} onConfirm={executeAction} />
    </div>
  )
}