'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { InactiveChurchRow } from '@/lib/actions/report-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

export function InactiveChurchesTable({ data }: { data: InactiveChurchRow[] }) {
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: keyof InactiveChurchRow
    direction: 'asc' | 'desc'
  } | null>({ key: 'days_inactive', direction: 'desc' })

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

  const requestSort = (key: keyof InactiveChurchRow) => {
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

  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rowsToExport = scope === 'selected'
      ? filteredData.filter(r => selectedIds.includes(r.id))
      : filteredData

    return rowsToExport.map((row) => ({
      'Church Code': row.church_code,
      'Church Name': row.church_name,
      'Region': row.region_name,
      'Last Payment Date': row.last_payment_date ? formatDate(row.last_payment_date) : 'Never',
      'Days Inactive': row.days_inactive,
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return
    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const titleSuffix = scope === 'selected' ? ' (Selected)' : ''
    const pdfSubtitle = `Filter: No payment in 6 months`

    if (pendingAction.type === 'print') {
      exportToPdf(`inactive-print-${dateStr}${suffix}`, `Inactive Churches${titleSuffix}`, pdfSubtitle, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`inactive-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`inactive-${dateStr}${suffix}`, exportData, 'Inactive Churches')
      else if (pendingAction.format === 'pdf') exportToPdf(`inactive-${dateStr}${suffix}`, `Inactive Churches${titleSuffix}`, pdfSubtitle, exportData)
    }
    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} records`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else exportToPdf(`inactive-print-${dateStr}`, 'Inactive Churches', 'Filter: 6+ months', generateExportData('all'), 'landscape', true)
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const sub = `Filter: 6+ months`
      if (format === 'csv') exportToCsv(`inactive-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`inactive-${dateStr}`, generateExportData('all'), 'Inactive Churches')
      if (format === 'pdf') exportToPdf(`inactive-${dateStr}`, 'Inactive Churches', sub, generateExportData('all'))
    }
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Inactive Churches"
        subtitle={`${filteredData.length} churches without a payment in 6+ months`}
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
            onExportCsv={() => { exportToCsv(`inactive-selected-${dateStr}`, generateExportData('selected')); setSelectedIds([]); }}
            onExportExcel={() => { exportToExcel(`inactive-selected-${dateStr}`, generateExportData('selected'), 'Selected Inactive'); setSelectedIds([]); }}
            onExportPdf={() => { exportToPdf(`inactive-selected-${dateStr}`, 'Inactive Churches (Selected)', 'Filter: 6+ months', generateExportData('selected')); setSelectedIds([]); }}
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
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Last Payment</TableHead>
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('days_inactive')}>
              <div className="flex items-center justify-end gap-xs">Days Inactive <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-paragraph-small text-muted-foreground">No inactive churches found.</TableCell>
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
                <TableCell className="text-right text-paragraph-small text-muted-foreground">
                  {row.last_payment_date ? formatDate(row.last_payment_date) : 'Never'}
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-destructive">
                  {row.days_inactive}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableShell>

      <DataTablePagination currentPage={currentPage} totalPages={totalPages} totalItems={sortedData.length} showingItems={paginatedData.length} setCurrentPage={setCurrentPage} itemName="churches" />
      <ExportConfirmDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)} actionType={pendingAction?.type || 'export'} selectedCount={selectedIds.length} totalCount={filteredData.length} onConfirm={executeAction} />
    </div>
  )
}